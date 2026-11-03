import Home from '@/components/studio/home-client';
import { moduleTitles, type Module } from '@/lib/modules';

/**
 * 工作台首页（服务端组件）
 * ----------------------------------------------------------------------
 * 这里只负责解析 URL 查询参数，再把结果作为初始状态传给客户端组件。
 *
 * 为什么不能让客户端自己读 window.location：
 *   客户端组件在服务端渲染时 window 根本不存在，只能回落默认值；
 *   浏览器水合时又会读到真实查询参数。两次渲染的结果不同，
 *   React 便报「Hydration failed」。
 *
 *   具体表现是导航栏：服务端按回落值渲染 2 项（dashboard 变体），
 *   客户端按 ?m=design 渲染 6 项（full 变体），
 *   差异最终指向 <Icon size={18} /> 那一行——那只是症状，不是病灶。
 *   ModuleNav 本身是纯展示组件，服务端与客户端拿到的是同一个图标映射
 *   （DASHBOARD_TABS / FULL_TABS 为模块级常量），
 *   不存在随机渲染，也不需要 suppressHydrationWarning。
 *
 * 改由服务端读取 searchParams 后作为 props 下发，
 * 两端拿到的是同一份数据，水合自然保持一致。
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const rawModule = params.m;
  const initialModule: Module =
    typeof rawModule === 'string' && rawModule in moduleTitles
      ? (rawModule as Module)
      : 'dashboard';

  const rawEntry = params.entry;
  const initialEntry: 'new' | 'resume' | null =
    rawEntry === 'new' || rawEntry === 'resume' ? rawEntry : null;

  return <Home initialModule={initialModule} initialEntry={initialEntry} />;
}
