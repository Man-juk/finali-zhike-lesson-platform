'use client';
import {
  LayoutDashboard,
  Network,
  BookOpen,
  Files,
  CalendarDays,
  Settings2,
  type LucideIcon,
} from 'lucide-react';

import { moduleTitles, type Module } from '@/lib/modules';

/**
 * Module 与 moduleTitles 定义在 @/lib/modules（服务端/客户端共用模块），
 * 这里再导出一次，保留原有 import 路径不变。
 */
export { moduleTitles, type Module };

/** 顶部胶囊的一个导航项。href 为真实路径，点击即跳转。 */
export type CapsuleTab = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

/** 工作台页：胶囊内只显示「工作台」「设置」。 */
const DASHBOARD_TABS: CapsuleTab[] = [
  { key: 'dashboard', label: '工作台', href: '/', icon: LayoutDashboard },
  { key: 'account', label: '设置', href: '/?m=account', icon: Settings2 },
];

/** 其余页面：胶囊内显示完整六项，顺序固定。 */
const FULL_TABS: CapsuleTab[] = [
  { key: 'dashboard', label: '工作台', href: '/', icon: LayoutDashboard },
  { key: 'design', label: '教案设计', href: '/?m=design', icon: BookOpen },
  { key: 'knowledge', label: '知识检索', href: '/?m=knowledge', icon: Network },
  { key: 'materials', label: '教学材料', href: '/?m=materials', icon: Files },
  { key: 'schedule', label: '课程表', href: '/schedule', icon: CalendarDays },
  { key: 'account', label: '设置', href: '/?m=account', icon: Settings2 },
];

/**
 * 顶部胶囊导航。
 * - variant='dashboard'：仅「工作台 / 设置」
 * - variant='full'：完整六项
 *
 * 容器与每个文字项均为自适应宽度（width:auto + padding），不设固定宽度。
 */
export function ModuleNav({
  active,
  variant = 'full',
}: {
  active: string;
  variant?: 'dashboard' | 'full';
}) {
  const tabs = variant === 'dashboard' ? DASHBOARD_TABS : FULL_TABS;
  return (
    <nav className="module-nav" aria-label="网站功能模块">
      {tabs.map(({ key, label, href, icon: Icon }) => (
        <a
          key={key}
          href={href}
          className={'nav-item' + (active === key ? ' active' : '')}
          aria-current={active === key ? 'page' : undefined}
        >
          <Icon size={18} />
          {label}
        </a>
      ))}
    </nav>
  );
}
