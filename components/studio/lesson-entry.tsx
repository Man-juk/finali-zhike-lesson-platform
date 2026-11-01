'use client';
import { useRouter } from 'next/navigation';
import { FilePlus2, History, RotateCcw, ArrowRight, type LucideIcon } from 'lucide-react';

/**
 * 教案设计 · 入口选择页
 * ---------------------------------------------------------------
 * 位于 Stepper 步骤条之前。三张毛玻璃卡片横向并排，整体垂直居中。
 * 每张卡片通过 router.push 同步 URL（/?m=design&entry=…），
 * 保证刷新 / 分享链接后仍能落到同一个入口状态。
 */

export type LessonEntryChoice = 'new' | 'resume' | 'history';

type EntryCard = {
  key: LessonEntryChoice;
  icon: LucideIcon;
  index: string;
  title: string;
  desc: string;
  cta: string;
};

const CARDS: EntryCard[] = [
  {
    key: 'new',
    icon: FilePlus2,
    index: '01',
    title: '新建教案',
    desc: '从零开始，设定教学目标与环节。',
    cta: '开始设计',
  },
  {
    key: 'resume',
    icon: RotateCcw,
    index: '02',
    title: '继续上次',
    desc: '恢复您未完成的草稿，接着上次的进度往下走。',
    cta: '恢复草稿',
  },
  {
    key: 'history',
    icon: History,
    index: '03',
    title: '历史教案',
    desc: '查看并管理过去生成的所有教案记录。',
    cta: '浏览记录',
  },
];

export default function LessonEntry({
  hasDraft,
  lastDraftTitle,
  onNew,
  onResume,
  onHistory,
}: {
  hasDraft: boolean;
  lastDraftTitle?: string;
  onNew: () => void;
  onResume: () => void;
  onHistory: () => void;
}) {
  const router = useRouter();

  /** 状态更新 + URL 同步，两者保持一致。 */
  function choose(choice: LessonEntryChoice, run: () => void) {
    run();
    if (choice === 'history') router.push('/?m=history');
    else router.push(`/?m=design&entry=${choice}`);
  }

  return (
    <section className="lesson-entry" aria-label="教案设计入口">
      <div className="lesson-entry-cards">
        {CARDS.map(({ key, icon: Icon, index, title, desc, cta }) => (
          <button
            key={key}
            type="button"
            className="entry-card lg-surface"
            onClick={() =>
              choose(key, key === 'new' ? onNew : key === 'resume' ? onResume : onHistory)
            }
          >
            <span className="entry-card-index">{index}</span>
            <span className="entry-card-icon">
              <Icon size={30} strokeWidth={1.6} />
            </span>
            <h3>{title}</h3>
            <p>{desc}</p>

            {key === 'resume' && (
              <span className="entry-card-hint">
                {hasDraft ? (
                  <>
                    上次编辑：
                    <b>{lastDraftTitle || '未命名草稿'}</b>
                  </>
                ) : (
                  <>暂无未完成的草稿</>
                )}
              </span>
            )}

            <span className="entry-card-cta">
              {cta}
              <ArrowRight size={15} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
