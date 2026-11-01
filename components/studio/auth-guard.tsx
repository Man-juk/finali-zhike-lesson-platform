'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isLoggedIn } from '@/lib/login-gate';

/**
 * 登录守卫：未登录时跳转 /login，并带上当前路径以便登录后跳回。
 * 校验在客户端进行（登录状态目前存于本地），因此首帧先不渲染内容，
 * 避免出现“先看到工作台再被弹走”的闪烁。
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      setAllowed(true);
      return;
    }
    router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`);
  }, [pathname, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
