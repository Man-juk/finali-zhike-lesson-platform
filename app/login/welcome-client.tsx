'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { TongueIcon } from '@/components/studio/tongue';
import { setLoggedIn, safeNext } from '@/lib/login-gate';

gsap.registerPlugin(useGSAP);

/**
 * 欢迎 / 登录页 —— 左表单 + 右真实地球
 *
 * 布局：全屏纯白背景，内容区限宽居中（max-w-5xl），
 *       左半区毛玻璃登录卡片，右半区可拖拽的 3D 地球。
 *
 * SSR 安全：EarthGlobe 通过 next/dynamic 的 ssr:false 只在浏览器加载
 *           （WebGL 依赖浏览器环境），服务端渲染时留空，不会白屏；
 *           表单与布局完全由服务端渲染输出。
 */

// three-globe 依赖 WebGL，必须 ssr:false（仅在 Client Component 中有效）
const EarthGlobe = dynamic(() => import('./earth-globe'), {
  ssr: false,
  loading: () => <div className="welcome-earth-loading" aria-hidden="true" />,
});

async function api(path: string, data?: unknown) {
  const r = await fetch(path, {
    method: data ? 'POST' : 'GET',
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const d = await r.json() as any;
  if (!r.ok) throw Error(d.error?.message || d.message || d.error || '请求失败，请稍后重试。');
  return d;
}

export default function WelcomeClient({ next }: { next?: string }) {
  const router = useRouter();
  const scope = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // 表单柔和淡入（与地球入场并行）
  useGSAP(() => {
    const root = scope.current;
    if (!root) return;
    const card = root.querySelector('.welcome-card');
    const globe = root.querySelector('.welcome-earth-wrap');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set([card, globe], { opacity: 1, y: 0, scale: 1 });
      return;
    }

    gsap.set(card, { opacity: 0, y: 26 });
    gsap.set(globe, { opacity: 0, scale: 0.94 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to(card, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 0.15);
    tl.to(globe, { opacity: 1, scale: 1, duration: 1.2, ease: 'power2.out' }, 0.3);

    return () => { tl.kill(); };
  }, { scope });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await api('/api/kg/login', { username, password });
      setPassword('');
      setLoggedIn();
      router.replace(safeNext(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试。');
    } finally {
      setBusy(false);
    }
  }

  function enter() {
    setLoggedIn();
    router.replace(safeNext(next));
  }

  return (
    <main className="welcome-page" ref={scope}>
      <div className="welcome-stage">
      {/* ==================== 左栏：毛玻璃登录卡片 ==================== */}
      <section className="welcome-pane-form">
        <div className="welcome-card">
          <div className="welcome-brand">
            <span className="welcome-brand-mark"><TongueIcon size={22} /></span>
            <span className="welcome-brand-name">智课<small>ZHÌKE STUDIO</small></span>
          </div>

          <div className="welcome-heading">
            <p className="eyebrow">WELCOME TO ZHÌKE</p>
            <h1>欢迎使用智课</h1>
            <p className="welcome-sub">连接你的国际中文教育知识图谱账号，让每一个教学环节都有据可依。</p>
          </div>

          <form onSubmit={submit}>
            <label className="field">
              图谱账号
              <input
                name="username"
                autoComplete="username"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="kg.chineseplus.net 账号"
              />
            </label>
            <label className="field">
              密码
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="请输入密码"
              />
            </label>

            {error && <div className="message error" role="alert">{error}</div>}

            <button className="welcome-submit" type="submit" disabled={busy}>
              {busy ? '正在连接知识图谱…' : '登录并进入工作台'}
            </button>

            <button className="welcome-ghost" type="button" onClick={enter} disabled={busy}>
              暂不登录，先进入工作台
            </button>
          </form>
        </div>
      </section>

      {/* ==================== 右栏：真实地球 ==================== */}
      <section className="welcome-pane-art" aria-hidden="true">
        <div className="welcome-earth-wrap">
          <EarthGlobe size={460} />
        </div>
      </section>
      </div>
    </main>
  );
}
