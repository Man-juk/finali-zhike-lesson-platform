import type { Metadata } from 'next';
import '@fontsource-variable/noto-sans-sc';
import '@fontsource-variable/noto-serif-sc';
import './globals.css';
export const metadata:Metadata={title:'智课 · 中文教案工作台',description:'以知识图谱为依据，让每一个教学环节有据可循。国际中文教案设计、知识核验与配套材料。'};

/**
 * 根布局
 * ----------------------------------------------------------------------
 * 液态玻璃的效果完全由 CSS 实现（app/globals.css 的 .lg-surface）：
 * 透光靠 backdrop-filter，切边靠 1px 描边 + 0.5px 顶部亮线，
 * 掠射高光靠 ::after 的斜向白光带。
 *
 * 这里不需要挂任何 SVG 滤镜或额外图层——
 * 玻璃是「透光层」，不是「折射层」，页面底色是弥散的青瓷白即可。
 *
 * 注意：欢迎页（/login）与课程表图纸页（/schedule）不使用 .lg-surface，
 * 保持各自的布局与观感不变。
 */
export default function RootLayout({children}:{children:React.ReactNode}){
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
