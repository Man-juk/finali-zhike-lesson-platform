'use client';

import { useRouter } from 'next/navigation';
import {
  Plus,
  Radar,
  FileText,
  CalendarDays,
  ArrowUpRight,
  ShieldCheck,
  Info,
} from 'lucide-react';

/* ------------------------------------------------------------------ *
 * 首页 · 极简大色块网格（Bento Grid）
 *
 * 布局：一个 CSS Grid 容器，用 1px 的 gap + 容器底色把区块分隔成
 *       「瑞士网格」式的极细白线；单元格本身铺满页面蓝，
 *       只有 gap 漏出容器的半透明白，因此线宽恒为 1px 且完美闭合。
 *
 *       左：大区块（4fr，跨两行）—— 品牌 + 大标题 + 功能介绍
 *       右：2×2 四个等大区块（3fr + 3fr）
 *
 * 本组件只负责渲染与派发导航意图，不发起任何请求。
 * ------------------------------------------------------------------ */

export type BentoCell = {
  key: string;
  index: string;
  title: string;
  hint: string;
  icon: React.ReactNode;
  /** 右上角超大图标的额外类名（用于区分色阶） */
  tone?: 'light' | 'faint';
  /** 标记为 Coming Soon，不绑定业务逻辑 */
  comingSoon?: boolean;
};

export function BentoGrid({
  onNavigate,
  onNew,
  connected,
  onOpenInfo,
}: {
  onNavigate: (m: 'knowledge' | 'design' | 'materials') => void;
  onNew: () => void;
  connected: boolean;
  onOpenInfo: () => void;
}) {
  const router = useRouter();
  const cells: BentoCell[] = [
    {
      key: 'design',
      index: '01',
      title: '教案设计',
      hint: '从主题出发，生成一堂好课',
      icon: <Plus strokeWidth={1} />,
    },
    {
      key: 'knowledge',
      index: '02',
      title: '知识检索',
      hint: '检索华东师大图谱词汇与语法',
      icon: <Radar strokeWidth={1} />,
    },
    {
      key: 'materials',
      index: '03',
      title: '教学材料',
      hint: '查看生成的练习、卡片与任务单',
      icon: <FileText strokeWidth={1} />,
    },
    {
      key: 'timetable',
      index: '04',
      title: '课程表',
      hint: '排课系统：把教案排入周课表',
      icon: <CalendarDays strokeWidth={1} />,
    },
  ];

  return (
    <div className="bento">
      {/* ==================== 主网格 ==================== */}
      <div className="bento-grid">
        {/* ---------- 左：大区块 ---------- */}
        <section className="bento-cell bento-hero" aria-label="工作台">
          <header className="bento-hero-top">
            <span className="bento-logo">
              <span className="bento-logo-mark">智</span>
              <span className="bento-logo-text">
                智课
                <small>ZHÌKE STUDIO</small>
              </span>
            </span>
            <span className="bento-hero-index">WORKSPACE / 01</span>
          </header>

          <div className="bento-hero-body">
            <h1 className="bento-hero-title">工作台</h1>
          </div>

          <footer className="bento-hero-foot">
            <p className="bento-hero-lead">让知识有依据，让教学有温度。</p>
            <p className="bento-hero-desc">
              基于知识图谱的智能中文教案设计与备课工作台
            </p>
            <div className="bento-hero-actions">
              <button className="bento-hero-cta" onClick={onNew}>
                开始新教案
                <ArrowUpRight size={18} />
              </button>
              <span className={'bento-hero-status ' + (connected ? 'on' : '')}>
                <ShieldCheck size={14} />
                {connected ? '知识图谱已连接' : '尚未连接知识图谱'}
              </span>
            </div>
            <button className="bento-hero-info" onClick={onOpenInfo}>
              <Info size={13} />
              数据来源与使用说明
            </button>
          </footer>
        </section>

        {/* ---------- 右：2×2 四个区块 ---------- */}
        {cells.map((cell) => {
          const isLive = !cell.comingSoon;
          const body = (
            <>
              <span className="bento-cell-index">{cell.index}</span>
              <span className={'bento-cell-icon ' + (cell.tone ?? 'light')}>
                {cell.icon}
              </span>
              <div className="bento-cell-body">
                <h2 className="bento-cell-title">{cell.title}</h2>
                {cell.hint && <p className="bento-cell-hint">{cell.hint}</p>}
              </div>
              {cell.comingSoon && (
                <span className="bento-cell-badge">Coming Soon</span>
              )}
            </>
          );

          return isLive ? (
            <button
              key={cell.key}
              type="button"
              className="bento-cell bento-tile"
              onClick={() => {
                if (cell.key === 'timetable') router.push('/schedule');
                else onNavigate(cell.key as 'design' | 'knowledge' | 'materials');
              }}
            >
              {body}
            </button>
          ) : (
            <div key={cell.key} className="bento-cell bento-tile is-soon">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
