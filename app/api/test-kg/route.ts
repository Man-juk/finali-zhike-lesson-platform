import { json } from '@/lib/server';

/**
 * 图谱连通性诊断接口（临时排查用）。
 *
 * 目的：把「连接图谱一直提示超时」拆成可定位的几层，
 * 一次性给出到底是 DNS、TLS、TCP 还是应用层的问题。
 *
 * 检查项：
 * · DNS 解析：能否把 kg.chineseplus.net 解析成 IP
 * · TCP/TLS：用 Node 的 tls 模块单独握手，绕开 fetch 的报错包装
 * · 真实 POST：用与 lib/server.ts 的 kg() 完全一致的写法发一次登录请求
 * · 环境：代理变量、Node 版本、证书信任链
 *
 * 不接受任何凭据，只用固定的占位账号探测，因此不会泄露或污染真实账号。
 */

const KG_HOST = 'kg.chineseplus.net';
const KG_BASE = 'https://kg.chineseplus.net/out/api/';

type Probe = {
  name: string;
  ok: boolean;
  elapsedMs: number;
  detail: unknown;
};

/** 把任意异常压成可读的诊断信息，保留底层 cause（错误码在这里）。 */
function describeError(e: unknown) {
  const err = e as {
    name?: string;
    message?: string;
    code?: string;
    errno?: string;
    syscall?: string;
    hostname?: string;
    cause?: unknown;
    stack?: string;
  };
  const out: Record<string, unknown> = {
    name: err?.name,
    message: err?.message,
  };
  if (err?.code) out.code = err.code;
  if (err?.errno) out.errno = err.errno;
  if (err?.syscall) out.syscall = err.syscall;
  if (err?.hostname) out.hostname = err.hostname;
  // fetch 的真实原因（DNS/TLS/连接被拒）都藏在 cause 里，必须展开。
  if (err?.cause) {
    const c = err.cause as { name?: string; message?: string; code?: string };
    out.cause = { name: c?.name, message: c?.message, code: c?.code };
  }
  return out;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ ok: boolean; elapsedMs: number; result?: T; error?: unknown }> {
  const started = Date.now();
  try {
    const result = await fn();
    return { ok: true, elapsedMs: Date.now() - started, result };
  } catch (e) {
    return { ok: false, elapsedMs: Date.now() - started, error: describeError(e) };
  }
}

export async function GET() {
  const probes: Probe[] = [];

  // 0. 运行环境：代理变量是这类「浏览器通、服务端不通」问题的头号嫌疑。
  const proxyEnv: Record<string, string | undefined> = {};
  for (const key of [
    'HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy',
    'ALL_PROXY', 'all_proxy', 'NO_PROXY', 'no_proxy',
    'NODE_TLS_REJECT_UNAUTHORIZED', 'NODE_EXTRA_CA_CERTS',
    'NODE_OPTIONS', 'NODE_USE_ENV_PROXY',
  ]) {
    if (process.env[key] !== undefined) proxyEnv[key] = process.env[key];
  }
  probes.push({
    name: 'environment',
    ok: true,
    elapsedMs: 0,
    detail: {
      node: process.version,
      proxyEnv,
      // Node 18+ 的 fetch 会读取 HTTP_PROXY/HTTPS_PROXY（NODE_USE_ENV_PROXY=1 时）。
      // 这里把「是否有代理变量」单独标出来，方便一眼判断。
      hasProxyEnv: Object.keys(proxyEnv).some(k => /proxy/i.test(k) && process.env[k]),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // 1. DNS 解析。失败说明是域名/DNS 问题，与证书、超时无关。
  const dns = await timed(async () => {
    const { promises: dnsPromises } = await import('node:dns');
    const { address, family } = await dnsPromises.lookup(KG_HOST);
    return { address, family, all: (await dnsPromises.lookup(KG_HOST, { all: true })).map(r => ({ address: r.address, family: r.family })) };
  });
  probes.push({ name: 'dns', ok: dns.ok, elapsedMs: dns.elapsedMs, detail: dns.ok ? dns.result : dns.error });

  // 2. TLS 握手（独立于 fetch）。这里能分清「证书不被信任」与「连不上」。
  const tls = await timed(async () => {
    const tlsMod = await import('node:tls');
    return await new Promise<{ authorized: boolean; authorizationError?: string; protocol?: string; peerSubject?: string; issuer?: string; validTo?: string }>((resolve, reject) => {
      const socket = tlsMod.connect(
        { host: KG_HOST, port: 443, servername: KG_HOST, rejectUnauthorized: true },
        () => {
          const cert = socket.getPeerCertificate();
          resolve({
            authorized: socket.authorized,
            authorizationError: socket.authorizationError ? String(socket.authorizationError) : undefined,
            protocol: socket.getProtocol() ?? undefined,
            peerSubject: cert?.subject?.CN ? String(cert.subject.CN) : undefined,
            issuer: cert?.issuer?.CN ? String(cert.issuer.CN) : undefined,
            validTo: cert?.valid_to ? String(cert.valid_to) : undefined,
          });
          socket.end();
        },
      );
      socket.setTimeout(15000, () => { socket.destroy(); reject(Object.assign(new Error('TLS handshake timed out'), { code: 'ETIMEDOUT' })); });
      socket.on('error', reject);
    });
  });
  probes.push({ name: 'tls', ok: tls.ok, elapsedMs: tls.elapsedMs, detail: tls.ok ? tls.result : tls.error });

  // 2b. 关键判别项：用 rejectUnauthorized:false 再连一次。
  //     · 连不上            → 网络/端口问题
  //     · 连得上但 authorized=false → 证书校验问题（Node 不信任这张证书）
  //     这正是「curl 通、Node fetch 不通」最常见的原因：
  //     curl 走 macOS 系统钥匙串，Node 用自带 CA 证书包，两者信任的根证书不同。
  const tlsInsecure = await timed(async () => {
    const tlsMod = await import('node:tls');
    return await new Promise<{ connected: boolean; authorized: boolean; authorizationError?: string; subjectCN?: string; issuerCN?: string; validTo?: string }>((resolve, reject) => {
      const socket = tlsMod.connect(
        { host: KG_HOST, port: 443, servername: KG_HOST, rejectUnauthorized: false },
        () => {
          const cert = socket.getPeerCertificate();
          resolve({
            connected: true,
            authorized: socket.authorized,
            authorizationError: socket.authorizationError ? String(socket.authorizationError) : undefined,
            subjectCN: cert?.subject?.CN ? String(cert.subject.CN) : undefined,
            issuerCN: cert?.issuer?.CN ? String(cert.issuer.CN) : undefined,
            validTo: cert?.valid_to ? String(cert.valid_to) : undefined,
          });
          socket.end();
        },
      );
      socket.setTimeout(15000, () => { socket.destroy(); reject(Object.assign(new Error('TLS handshake timed out'), { code: 'ETIMEDOUT' })); });
      socket.on('error', reject);
    });
  });
  probes.push({ name: 'tls-insecure', ok: tlsInsecure.ok, elapsedMs: tlsInsecure.elapsedMs, detail: tlsInsecure.ok ? tlsInsecure.result : tlsInsecure.error });

  // 3. 真实 POST：与 lib/server.ts 的 kg() 使用完全一致的 URL / headers / body / 超时。
  //    用来确认「服务端的 fetch 到底能不能打通」。
  const login = await timed(async () => {
    const r = await fetch(KG_BASE + 'auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '__connectivity_probe__', password: '__connectivity_probe__' }),
      signal: AbortSignal.timeout(25000),
    });
    const text = await r.text();
    return { status: r.status, statusText: r.statusText, body: text.slice(0, 500) };
  });
  probes.push({ name: 'post-login', ok: login.ok, elapsedMs: login.elapsedMs, detail: login.ok ? login.result : login.error });

  // 3a. Next.js 会用 createPatchedFetcher 覆盖 globalThis.fetch（patch-fetch.js）。
  //     记录当前 globalThis.fetch 的身份，便于判断走的是原生实现还是 Next 的包装层。
  const fetchImpl = await timed(async () => {
    const fn = globalThis.fetch as { name?: string };
    const require = await import('node:module').then(m => m.createRequire(import.meta.url));
    return {
      fetchName: fn.name,
      // Next 的包装函数名是 createPatchedFetcher 的返回值，通常不是 'fetch'。
      patchedByNext: fn.name !== 'fetch',
      undiciInstalled: (() => { try { require.resolve('undici'); return true; } catch { return false; } })(),
    };
  });
  probes.push({ name: 'fetch-implementation', ok: fetchImpl.ok, elapsedMs: fetchImpl.elapsedMs, detail: fetchImpl.ok ? fetchImpl.result : fetchImpl.error });

  // 3b. Node 的 CA 证书包与 macOS 系统钥匙串是两份独立的信任源。
  //     Node 只认自己 bundled 的 Mozilla CA 列表；系统钥匙串里手动装过的根证书它看不见。
  //     如果证书是「企业自签 / 私有 CA 签发」，就必然出现
  //     「curl 通（走系统钥匙串）但 Node fetch 报 CERT_HAS_EXPIRED / UNABLE_TO_VERIFY_LEAF_SIGNATURE」。
  const caInfo = await timed(async () => {
    const tlsMod = await import('node:tls');
    // Node 自带的根证书数量（来自 bundled Mozilla CA）
    const roots = tlsMod.getCACertificates ? tlsMod.getCACertificates('default') : [];
    return {
      nodeBundledRootCount: roots.length,
      // 是否设置了额外的 CA 目录
      extraCaCerts: process.env.NODE_EXTRA_CA_CERTS ?? null,
      rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? '(default true)',
    };
  });
  probes.push({ name: 'ca-trust-store', ok: caInfo.ok, elapsedMs: caInfo.elapsedMs, detail: caInfo.ok ? caInfo.result : caInfo.error });

  // 3b. 原生 https.request：绕开 fetch/undici，直接走 Node 的 TLS 栈。
  //     这一项和 post-login 的差值很关键：
  //     · 原生成功 + fetch 失败 → 是 fetch/undici 层的问题（代理、Dispatcher、证书链）
  //     · 两者都失败          → 是网络/证书本身的问题
  const native = await timed(async () => {
    const https = await import('node:https');
    const payload = JSON.stringify({ username: '__connectivity_probe__', password: '__connectivity_probe__' });
    return await new Promise<{ status: number; body: string; socketRemoteAddress?: string; tlsProtocol?: string }>((resolve, reject) => {
      const req = https.request(
        {
          host: KG_HOST,
          path: '/out/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
          timeout: 25000,
        },
        res => {
          let data = '';
          res.on('data', c => { data += c; });
          res.on('end', () => resolve({
            status: res.statusCode ?? 0,
            body: data.slice(0, 500),
            socketRemoteAddress: res.socket?.remoteAddress,
            tlsProtocol: (res.socket as import('node:tls').TLSSocket | undefined)?.getProtocol?.() ?? undefined,
          }));
        },
      );
      req.on('timeout', () => { req.destroy(Object.assign(new Error('request timed out'), { code: 'ETIMEDOUT' })); });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  });
  probes.push({ name: 'native-https-post', ok: native.ok, elapsedMs: native.elapsedMs, detail: native.ok ? native.result : native.error });

  // 4. 真实 POST：带 Bearer 的 execute-cypher 探测，用来看「登录之后」的查询链路。
  //    无 token 时图谱应返回 401 —— 收到 401 就证明整条链路是通的。
  const cypher = await timed(async () => {
    const r = await fetch(KG_BASE + 'intelligent/execute-cypher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer __probe__' },
      body: JSON.stringify({ cypher: 'MATCH (n:Word) RETURN n LIMIT 1', parameters: {}, limit: 1 }),
      signal: AbortSignal.timeout(25000),
    });
    const text = await r.text();
    return { status: r.status, statusText: r.statusText, body: text.slice(0, 500) };
  });
  probes.push({ name: 'post-cypher', ok: cypher.ok, elapsedMs: cypher.elapsedMs, detail: cypher.ok ? cypher.result : cypher.error });

  // 结论：把最可能的原因直接说出来，省去人工读 probe 的时间。
  const dnsOk = probes.find(p => p.name === 'dns')?.ok;
  const tlsProbe = probes.find(p => p.name === 'tls');
  const tlsInsecureProbe = probes.find(p => p.name === 'tls-insecure');
  const loginProbe = probes.find(p => p.name === 'post-login');
  const nativeProbe = probes.find(p => p.name === 'native-https-post');
  const tlsDetail = tlsProbe?.detail as { authorized?: boolean; authorizationError?: string } | undefined;
  const tlsInsecureDetail = tlsInsecureProbe?.detail as { connected?: boolean; authorized?: boolean; authorizationError?: string; issuerCN?: string; validTo?: string } | undefined;
  const fetchErr = (loginProbe && !loginProbe.ok ? loginProbe.detail : null) as { cause?: { code?: string }; code?: string } | null;
  const fetchCode = fetchErr?.cause?.code ?? fetchErr?.code;

  let verdict: string;
  if (!dnsOk) {
    verdict = 'DNS 解析失败：本机无法把 ' + KG_HOST + ' 解析成 IP。请检查 DNS / hosts / 防火墙。';
  } else if (tlsInsecureDetail?.connected && tlsInsecureDetail.authorized === false) {
    verdict = '定位到证书信任问题：TCP/TLS 连得上，但 Node 不信任这张证书（authorizationError: ' + String(tlsInsecureDetail.authorizationError) + '，签发者 ' + String(tlsInsecureDetail.issuerCN) + '，有效期至 ' + String(tlsInsecureDetail.validTo) + '）。Node 用自带 CA 包，不读 macOS 系统钥匙串，所以 curl（走系统钥匙串）能通而 Node fetch 不通。修复：把该根证书导出为 PEM，用 NODE_EXTRA_CA_CERTS=/绝对路径/根证书.pem 启动 Node。';
  } else if (tlsProbe && !tlsProbe.ok) {
    verdict = 'TLS 握手失败：DNS 正常，但握手阶段报错。证书过期或不受信任会走到这里，错误码见 tls.detail。';
  } else if (tlsDetail && tlsDetail.authorized === false) {
    verdict = '证书不受信任：TLS 握手成功但证书校验未通过（authorizationError: ' + String(tlsDetail.authorizationError) + '）。';
  } else if (nativeProbe && !nativeProbe.ok && loginProbe && !loginProbe.ok) {
    verdict = '原生 https.request 与 fetch 同时失败：网络层本身不通（错误码见 native-https-post.detail）。';
  } else if (nativeProbe && nativeProbe.ok && loginProbe && !loginProbe.ok) {
    verdict = '关键差异：原生 https.request 成功，但 fetch 失败（错误码 ' + String(fetchCode) + '）。说明网络和证书都没问题，问题出在 fetch/undici 这一层 —— 优先排查 HTTP_PROXY/HTTPS_PROXY 环境变量、NODE_USE_ENV_PROXY、NODE_EXTRA_CA_CERTS 与全局 Dispatcher。';
  } else if (loginProbe && !loginProbe.ok) {
    verdict = 'TCP/TLS 正常但 HTTP POST 失败：见 post-login.detail 的底层错误码。';
  } else {
    verdict = '网络链路正常：DNS、证书、POST 全部打通。若网页仍提示超时，问题不在网络层，请看 post-login 的 HTTP 状态码。';
  }

  return json({
    ok: probes.every(p => p.ok),
    verdict,
    host: KG_HOST,
    endpoint: KG_BASE,
    probes,
  });
}
