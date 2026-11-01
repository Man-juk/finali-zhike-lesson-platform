'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Sparkles, Droplet } from 'lucide-react';
import gsap from 'gsap';
import styles from './preview.module.css';

/**
 * /preview · 液态玻璃（Liquid Glass）效果预览
 *
 * 临时路由，仅用于视觉确认。样式全部收敛在本目录的 CSS Module 中，
 * 不改动 app/globals.css，也不触碰任何正式页面。
 *
 * 已选定的全站视觉方向：青瓷白（Céladon）
 *   背景 #EFF5F4 / 卡片 #FFFFFF / 主文字 #12211F / 次要文字 #5A6B68 / 强调 #096B6A
 */

const TIERS = [
  {
    key: 'mist',
    name: '薄雾 Mist',
    use: '大面积背景板 · 列表容器',
    body: '最厚实、最接近实体亚克力的质感。边缘几乎不透光，适合承载大块留白，缺点是压住了背后的弥散光晕。',
    spec:
      'background: linear-gradient(140deg, rgba(255,255,255,.72), rgba(255,255,255,.52))\nbackdrop-filter: blur(30px) saturate(140%)',
  },
  {
    key: 'soft',
    name: '柔光 Soft',
    use: '工作台 Bento 卡片 · 主内容区',
    body: '平衡点。足够通透让背景光晕透上来，又有足够的白色漫反射保证正文对比度。这是工作台卡片的主力配方。',
    spec:
      'background: linear-gradient(140deg, rgba(255,255,255,.50), rgba(255,255,255,.20))\nbackdrop-filter: blur(22px) saturate(190%)',
  },
  {
    key: 'clear',
    name: '澄澈 Clear',
    use: '叠加层 · 浮层 · 悬浮菜单',
    body: '极度通透，几乎只剩折射与描边。适合压在内容之上做层级区分，但不适合放小字号正文。',
    spec:
      'background: linear-gradient(140deg, rgba(255,255,255,.28), rgba(255,255,255,.06))\nbackdrop-filter: blur(12px) saturate(220%)',
  },
  {
    key: 'thick',
    name: '厚晶 Thick',
    use: '主按钮 · 强调面板 · 高亮区',
    body: '带轻微提亮，边缘高光最强，读起来像一块打磨过的青瓷或水晶。最适合需要被一眼看到的地方。',
    spec:
      'background: linear-gradient(140deg, rgba(255,255,255,.86), rgba(255,255,255,.64))\nbackdrop-filter: blur(40px) saturate(160%) brightness(1.04)',
  },
] as const;

const LIQUID_NOTES = [
  '边缘折射：伪元素用 backdrop-filter: invert(1) blur(4px) 并用 mask 只保留 1.5px 边框，于是玻璃棱边会把背后的颜色反相——这是液态玻璃最关键的视觉线索。',
  '镜面高光：已按需求移除指针跟随高光效果，玻璃仅保留静态的切边折射与掠射高光。',
  '掠射高光：悬停时一道斜向白色光带从左上扫到右下（background-position 位移 + 一次动画）。',
  '双层内阴影：inset 顶部 1px 亮线模拟上缘受光，inset 底部 1px 暗线模拟下缘厚度。',
  '饱和度补偿：backdrop-filter 的 saturate(180~220%) 把背后被模糊的色彩重新拉开，避免玻璃发灰。',
];

/* ------------------------------------------------------------------ *
 * 主按钮配色方案
 *
 * 当前方案死板的原因：渐变三档色相完全相同（都是 179°），
 * 明度差也只有 8% 左右 —— 视觉上就是一块"色板"，没有生命感。
 *
 * 四个替代方案从两个方向破局：
 *   1) 换色相家族 —— 翡翠 / 苔原 / 苔痕 / 青→翠 各有自己的绿
 *   2) 换明度跨度 + 换字色 —— 亮色玻璃底配深墨字，能用更高饱和度
 *
 * 所有方案的最差一档文字对比度均已按 WCAG AA 校验。
 * ------------------------------------------------------------------ */
const BUTTON_COLORS = [
  {
    key: 'current',
    name: '当前 · 静青',
    badge: '现状',
    stops: ['#0A7A78', '#096B6A', '#075A59'],
    ink: '#FFFFFF',
    link: '#096B6A',
    cls: 'btnCurrent',
    note: '三档同色相 179°，明度仅差 8%，读起来是一块色板。这是"死板"的技术原因。',
  },
  {
    key: 'shift',
    name: '青→翠',
    badge: '同族改良',
    stops: ['#10786F', '#0E7350', '#0A5A38'],
    ink: '#FFFFFF',
    link: '#0E7350',
    cls: 'btnShift',
    note: '保留青瓷家族身份，但让色相从 176° 漂移到 155°，明度跨度拉大到 12%。改动最小，最接近现有品牌。',
  },
  {
    key: 'fern',
    name: '苔痕 Fern',
    badge: '沉稳',
    stops: ['#307E47', '#206F3C', '#145C31'],
    ink: '#FFFFFF',
    link: '#206F3C',
    cls: 'btnFern',
    note: '带灰的深森林绿，饱和度最低、最不张扬。色相 138°→144° 微漂移，最接近"学术沉淀感"。',
  },
  {
    key: 'jade',
    name: '翡翠 Jade',
    badge: '推荐 · 明快',
    stops: ['#7FE0C0', '#4FC9A0', '#2FB183'],
    ink: '#12211F',
    link: '#1B7657',
    cls: 'btnJade',
    note: '亮色玻璃底配深墨字。这正是 Apple 液态玻璃强调按钮的做法——底色通透鲜艳，文字用深墨。饱和度上限被彻底打开。',
  },
  {
    key: 'moss',
    name: '苔原 Moss',
    badge: '明快 · 偏黄',
    stops: ['#B6E58A', '#93D160', '#6FB93C'],
    ink: '#12211F',
    link: '#3A701B',
    cls: 'btnMoss',
    note: '同属亮玻璃底，但色相拉到 91° 附近，是偏黄的嫩芽绿。更有春天感和亲和力，比翡翠更活泼。',
  },
] as const;

export default function PreviewPage() {
  const [liquid, setLiquid] = useState(true);
  const [switchOn, setSwitchOn] = useState(true);
  const scope = useRef<HTMLDivElement>(null);

  /* 入场：玻璃卡片依次落位 */
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-reveal]',
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.07,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={scope} className={styles.page + (liquid ? ' ' + styles.liquid : '')}>
      {/* 真实位移折射滤镜：把玻璃背后像素按边缘法线方向推开，形成液态玻璃的凸起折射。
          仅 Chrome / Edge 支持 backdrop-filter: url()，其他浏览器自动回落到普通毛玻璃。 */}
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      >
        <defs>
          <filter id="liquidGlass" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008 0.016"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feGaussianBlur in="noise" stdDeviation="1.5" result="softNoise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="softNoise"
              scale="58"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feGaussianBlur in="displaced" stdDeviation="0.3" result="smooth" />
            <feColorMatrix
              in="smooth"
              type="matrix"
              values="
                1.04 0    0    0 0
                0    1.05 0    0 0
                0    0    1.02 0 0
                0    0    0    1 0"
              result="graded"
            />
            <feComposite in="graded" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>

      {/* ---------------- 页头 ---------------- */}
      <header className={styles.head} data-reveal>
        <span className={styles.eyebrow}>
          <Droplet size={13} />
          LIQUID GLASS · 青瓷白 CELADON
        </span>
        <h1>液态玻璃效果预览</h1>
        <p>
          这是 <strong>方案 C · 青瓷白</strong> 的玻璃层效果验证页。背景是弥散光晕与彩色折射源，
          所有卡片都采用 <code style={{ fontSize: 12, opacity: 0.8 }}>backdrop-filter</code> 实时折射背后的画面。
          打开下方的「液态玻璃」开关，可以对比普通毛玻璃与带边缘折射、镜面高光、掠射光带的完整液态效果。
          本页为临时路由，确认后即删除。
        </p>
      </header>

      {/* ---------------- 工具条 ---------------- */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarInner + ' ' + styles.glass} data-glass>
          <span className={styles.spec} data-spec />
          <button
            type="button"
            className={styles.toggle + (liquid ? ' ' + styles.toggleOn : '')}
            onClick={() => setLiquid((v) => !v)}
          >
            <Sparkles size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
            液态玻璃 {liquid ? '开' : '关'}
          </button>
          <button
            type="button"
            className={styles.toggle + (!liquid ? ' ' + styles.toggleOn : '')}
            onClick={() => setLiquid(false)}
          >
            普通毛玻璃
          </button>
          <span className={styles.toolbarHint}>
            {liquid ? '边缘折射 + 镜面高光 + 掠射光带' : '仅 blur + saturate'}
          </span>
        </div>
      </div>

      {/* ---------------- 四种玻璃配方 ---------------- */}
      <section className={styles.section}>
        <div className={styles.sectionHead} data-reveal>
          <span className={styles.sectionNum}>01</span>
          <h2>四种玻璃配方</h2>
        </div>
        <p className={styles.sectionDesc} data-reveal>
          同一套青瓷白背景之上，玻璃的厚度与模糊强度决定信息层级。下面的四块同时平铺，
          可以直观看出「厚 / 薄」以及「透 / 不透」对可读性的影响。
        </p>
        <div className={styles.tiers}>
          {TIERS.map((t) => (
            <article
              key={t.key}
              className={
                styles.glass + ' ' + styles.tier + ' ' + styles['tier' + t.key[0].toUpperCase() + t.key.slice(1)]
              }
              data-glass
              data-reveal
            >
              <span className={styles.spec} data-spec />
              <h3 className={styles.tierName}>{t.name}</h3>
              <p className={styles.tierUse}>{t.use}</p>
              <p className={styles.tierBody}>{t.body}</p>
              <pre className={styles.tierSpec}>{t.spec}</pre>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------- 大样本：Bento 工作台 ---------------- */}
      <section className={styles.section}>
        <div className={styles.sectionHead} data-reveal>
          <span className={styles.sectionNum}>02</span>
          <h2>工作台整屏效果</h2>
        </div>
        <p className={styles.sectionDesc} data-reveal>
          用当前的 Bento 网格结构（左侧大区块 + 右侧 2×2）套上青瓷白与玻璃层，
          对照即将替换掉的克莱因蓝全屏版本。把鼠标移到任意卡片上，可以看到高光跟随。
        </p>

        <div className={styles.glass + ' ' + styles.showcase} data-glass data-reveal>
          <span className={styles.spec} data-spec />
          <div className={styles.showcaseGrid}>
            <div>
              <h3>让知识有依据，让教学有温度。</h3>
              <p>
                基于知识图谱的智能中文教案设计与备课工作台。整屏改为浅色青瓷底，
                顶部弥散青蓝光晕，网格之间用 1px 半透明线分隔，卡片全部换成透光的玻璃层。
              </p>
              <div className={styles.showcaseStats}>
                <div className={styles.stat}>
                  <b>4</b>
                  <span>功能区块</span>
                </div>
                <div className={styles.stat}>
                  <b>1px</b>
                  <span>网格分隔线</span>
                </div>
                <div className={styles.stat}>
                  <b>22px</b>
                  <span>玻璃模糊半径</span>
                </div>
                <div className={styles.stat}>
                  <b>AA</b>
                  <span>全文本对比度达标</span>
                </div>
              </div>
            </div>

            <div className={styles.bento}>
              <div className={styles.bentoCell + ' ' + styles.bentoHero}>
                <span className={styles.bentoIdx}>WORKSPACE / 01</span>
                <div className={styles.bentoTitle}>工作台</div>
                <div className={styles.bentoFoot}>
                  <p className={styles.bentoLead}>让知识有依据，让教学有温度。</p>
                  <button type="button" className={styles.btn + ' ' + styles.btnPrimary}>
                    开始新教案
                  </button>
                </div>
              </div>
              {[
                { i: '01', t: '教案设计', h: '从主题出发，生成一堂好课' },
                { i: '02', t: '知识检索', h: '检索华东师大图谱词汇与语法' },
                { i: '03', t: '教学材料', h: '查看生成的练习、卡片与任务单' },
                { i: '04', t: '课程表', h: '排课系统：把教案排入周课表' },
              ].map((c) => (
                <div key={c.i} className={styles.bentoCell + ' ' + styles.bentoTile}>
                  <span className={styles.bentoIdx}>{c.i}</span>
                  <div className={styles.bentoTitle}>{c.t}</div>
                  <p className={styles.bentoHint}>{c.h}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 组件样本 ---------------- */}
      <section className={styles.section}>
        <div className={styles.sectionHead} data-reveal>
          <span className={styles.sectionNum}>03</span>
          <h2>玻璃组件样本</h2>
        </div>
        <p className={styles.sectionDesc} data-reveal>
          全站重构时，这些玻璃配方会对应到现有的真实组件：顶部胶囊导航、主按钮、
          输入框、标签、开关。全部为玻璃层，不改动任何交互逻辑。
        </p>

        <div className={styles.components}>
          <div className={styles.glass + ' ' + styles.compCard} data-glass data-reveal>
            <span className={styles.spec} data-spec />
            <p className={styles.compTitle}>按钮</p>
            <div className={styles.compRow}>
              <button type="button" className={styles.btn + ' ' + styles.btnPrimary}>
                主按钮
              </button>
              <button type="button" className={styles.btn}>
                次按钮
              </button>
            </div>
          </div>

          <div className={styles.glass + ' ' + styles.compCard} data-glass data-reveal>
            <span className={styles.spec} data-spec />
            <p className={styles.compTitle}>胶囊导航</p>
            <div className={styles.compRow}>
              <div className={styles.pill}>
                <button type="button" className={styles.pillItem + ' ' + styles.pillItemOn}>
                  工作台
                </button>
                <button type="button" className={styles.pillItem}>
                  设置
                </button>
              </div>
            </div>
          </div>

          <div className={styles.glass + ' ' + styles.compCard} data-glass data-reveal>
            <span className={styles.spec} data-spec />
            <p className={styles.compTitle}>输入框</p>
            <div className={styles.compRow} style={{ width: '100%' }}>
              <input
                className={styles.field}
                placeholder="请输入主题，例如：高中语文《赤壁赋》"
              />
            </div>
          </div>

          <div className={styles.glass + ' ' + styles.compCard} data-glass data-reveal>
            <span className={styles.spec} data-spec />
            <p className={styles.compTitle}>标签</p>
            <div className={styles.compRow}>
              <span className={styles.chip}>核心</span>
              <span className={styles.chip + ' ' + styles.chipQuiet}>辅助</span>
              <span className={styles.chip + ' ' + styles.chipQuiet}>排除</span>
            </div>
          </div>

          <div className={styles.glass + ' ' + styles.compCard} data-glass data-reveal>
            <span className={styles.spec} data-spec />
            <p className={styles.compTitle}>开关</p>
            <div className={styles.compRow}>
              <button
                type="button"
                aria-pressed={switchOn}
                className={styles.switch + (switchOn ? '' : ' ' + styles.switchOff)}
                onClick={() => setSwitchOn((v) => !v)}
              />
              <span style={{ fontSize: 12.5, color: 'var(--g-muted)' }}>
                自动保存草稿
              </span>
            </div>
          </div>

          <div className={styles.glass + ' ' + styles.compCard} data-glass data-reveal>
            <span className={styles.spec} data-spec />
            <p className={styles.compTitle}>提示条</p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.85,
                color: 'var(--g-ink)',
                opacity: 0.85,
              }}
            >
              核验完成：匹配 12 个节点，2 个词条待核验。
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- 主按钮配色方案 ---------------- */}
      <section className={styles.section}>
        <div className={styles.sectionHead} data-reveal>
          <span className={styles.sectionNum}>04</span>
          <h2>主按钮配色方案</h2>
        </div>
        <p className={styles.sectionDesc} data-reveal>
          当前按钮死板的技术原因：渐变三档色相完全相同（都是 179°），
          明度跨度只有 8%，视觉上就是一块色板。下面的四个替代方案从「换色相家族」
          和「换明度跨度 + 换字色」两个方向破局。所有方案的最差一档文字对比度均已通过 WCAG AA 校验。
        </p>

        <div className={styles.colorGrid}>
          {BUTTON_COLORS.map((c) => (
            <article
              key={c.key}
              className={styles.glass + ' ' + styles.colorCard}
              data-glass
              data-reveal
            >
              <span className={styles.spec} data-spec />
              <div className={styles.colorName}>
                <b>{c.name}</b>
                <span>{c.badge}</span>
              </div>

              <div className={styles.colorSwatches}>
                {c.stops.map((s) => (
                  <i key={s} style={{ background: s }} />
                ))}
              </div>

              <div className={styles.colorButtons}>
                <button type="button" className={styles.btn + ' ' + styles[c.cls]}>
                  开始新教案
                </button>
                <button type="button" className={styles.btn}>
                  次按钮
                </button>
              </div>

              <p className={styles.colorNote}>{c.note}</p>

              <div className={styles.colorMeta}>
                <em>按钮渐变</em> {c.stops.join(' → ')}
                <br />
                <em>文字</em> {c.ink}
                <br />
                <em>链接色</em> {c.link}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------- 实现说明 ---------------- */}
      <div className={styles.footnote}>
        <div className={styles.glass + ' ' + styles.footnoteInner} data-glass data-reveal>
          <span className={styles.spec} data-spec />
          <h3>液态玻璃是怎么做出来的</h3>
          <ul>
            {LIQUID_NOTES.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <a className={styles.backLink} href="/">
            <ArrowLeft size={14} />
            返回工作台
          </a>
        </div>
      </div>
    </div>
  );
}
