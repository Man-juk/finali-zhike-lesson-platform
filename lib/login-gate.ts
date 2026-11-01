/**
 * 登录状态（前端临时版）。
 *
 * 当前不接入真实鉴权：点击「进入工作台」即写入本地标记。
 * 标记同时写入 localStorage 与 cookie，保证刷新后不丢失，
 * 且后续接入服务端会话时只需替换这两个读写点。
 */
export const LOGIN_KEY = 'zhike-login';

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LOGIN_KEY) === '1';
  } catch {
    return false;
  }
}

export function setLoggedIn(): void {
  try {
    localStorage.setItem(LOGIN_KEY, '1');
  } catch {
    /* 隐私模式下可能写入失败，忽略即可 */
  }
  try {
    document.cookie = `${LOGIN_KEY}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  } catch {
    /* cookie 不可用时忽略 */
  }
}

export function clearLoggedIn(): void {
  try {
    localStorage.removeItem(LOGIN_KEY);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${LOGIN_KEY}=; path=/; max-age=0; samesite=lax`;
  } catch {
    /* ignore */
  }
}

/** 只允许站内相对路径，避免开放重定向。 */
export function safeNext(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  const v = raw.trim();
  if (!v.startsWith('/') || v.startsWith('//')) return fallback;
  return v;
}
