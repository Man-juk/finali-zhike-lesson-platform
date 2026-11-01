# 智课 · AI 教学设计工作台

> 面向国际中文教育的智能教案生成与排课系统
> 接入 **华东师范大学国际中文教育知识图谱** 与 **DeepSeek API**，从教学需求输入到规范排版的 Word 教案与学期课程表，一站式完成备课。

---

## 项目简介

「智课」是一个基于 Next.js App Router 构建的**国际中文教师备课工作台**。教师在统一的玻璃拟态（glassmorphism）界面中填写教学需求，系统连接华东师范大学国际中文教育知识图谱（`kg.chineseplus.net`）检索权威知识点原文，经教师逐条**确认**后，将已核验的图谱原文作为证据包提交给 DeepSeek 生成教案，最后按严格的中文教案规范排版导出为 Word 文档，并可把多份教案排入周课表管理一学期的教学安排。

系统的核心原则是**证据可溯源**：知识释义与例句只使用图谱返回的原文，教学活动由 AI 设计，所有生成内容在导出前必须通过结构校验（存在占位语则禁止导出），使用前需由教师审核。

---

## 核心功能

### 1. 教学设计工作台（玻璃拟态界面）

- 全站采用 **liquid glass / glassmorphism** 视觉语言：毛玻璃容器、半透明叠加层、柔和光晕与景深背景，响应式适配桌面与移动端。
- 样式以**手写 CSS** 为主（`app/globals.css` 约 2000 行 + 局部 CSS Modules），Tailwind CSS v4 通过 `@import 'tailwindcss'` 接入 PostCSS 构建管线，作为工具类补充。
- 教学需求表单采用**组合式输入面板**：`教学对象` 由国籍 / 年龄 / 语言水平组合而成，`课型`、`课时长度`、`班级人数`、参考教材等字段通过统一的 `--field-h` 高度变量，实现跨 input、select、复合按钮的**亚像素级对齐**。
- GSAP 驱动界面动效：登录页地球入场动画、教案纸张展开、进度条与标注位移动画，统一通过 `gsap.context()` 管理，组件卸载即自动回滚。

### 2. 教案生成

- 覆盖教学目标（认知 / 技能 / 情感三领域）、教学重难点、教学过程（分环节活动、师生行为、组织形式、产出与评价）、板书与课后反思等完整结构。
- 基于 **Zod** 的输入校验与**版本化提示词**（`zhike-grounded-2.3`），对标题、证据边界、目标领域、占位语等设有硬约束，确保生成结果严格符合标准教案格式。
- 生成前自动执行结构体检：目标是否与知识点关联、课时数是否匹配、是否残留占位内容。
- 支持多轮修订、历史会话与教案版本回溯；草稿可导出 **JSON 备份**并重新导入。

### 3. Word 导出（严格排版引擎）

- 内置**自研文档排版引擎** `lib/lib/exporter/`，基于 `docx` 库构建，输出符合中文教案规范排版的 `.docx`。
- 提供三种成品：**教师教案**、**学生学习任务单**、**知识依据**，均使用同一套标准结构排版引擎。
- 排版细节包括：教学目标按领域分组、技能领域按「听说读写」分段、教学步骤六栏表格（环节 / 时间 / 教学内容 / 教师行为 / 学生行为 / 教学说明）、评价量表多维度三档描述、字号字距与页边距统一。
- 按**课型**切换范式：综合课、听力/听说课、读写课各有独立的环节序列与提示词范式，未知课型回落为综合课范式。
- 成品教案不得带占位语：一旦检测到未填内容，直接阻止导出并提示教师补写。

### 4. 知识检索与确认

- 服务端代理华东师大知识图谱的 Cypher 查询接口（`intelligent/execute-cypher`），按 `Word / Grammar / Character` 三类节点检索词、语法、汉字条目。
- 教师在**证据面板**中逐条核对图谱原文：释义、例句、所属级别、关联知识点与检索记录（完整保留 Cypher 语句与参数）。
- 未匹配或未经确认的条目**不进入**模型证据包；授权等级缺失时不予杜撰，仅标记为不可用。
- 配套**图谱例句文字卡**：把选定例句渲染为可直接用于课堂展示的图片。

### 5. 课程表排期

- 将生成的教案排入周课表（周一至周日 × 第 1–6 节），管理一学期的教学安排。
- 课表格子可记录教案名、课型、上课时间与上课地点；教案池自动读取工作台历史草稿，无草稿时回落为内置示例。
- 支持**教学环节时长分配**可视化：以 AntV G2 渲染横向堆叠条，G2 不可用时降级为等价的 CSS 堆叠条（数据一致）。

### 6. 账号与配额

- 基于 **better-auth** 的站内账号体系：管理员分配账号、禁用自助注册、登录限流、密码重置（可选接入 Resend 邮件）。
- 加密 Cookie 会话（AES-GCM）存储图谱访问令牌与生成配额，密钥来自 `SESSION_SECRET`，服务端不落库明文。
- 每个图谱账号在当前浏览器每天最多 10 次生成，失败与自动修复同样计次。

---

## 技术栈

| 分类 | 技术 | 说明 |
| --- | --- | --- |
| 框架 | **Next.js 16.3.4**（App Router） | React Server Components、Route Handlers |
| UI | **React 19.2.6** / TypeScript 5.9 | 全栈同构，App Router 分层架构 |
| 样式 | **Tailwind CSS 4.2.1** + 自定义 CSS | PostCSS 工具类管线 + 手写玻璃拟态主题与 CSS Modules |
| 动效 | **GSAP 3.15** / `@gsap/react` | 入场动画、纸张展开、进度反馈 |
| 3D / 可视化 | **three.js** / `react-globe.gl` / **@antv/g2** | 登录页地球、课时分配堆叠条 |
| 数据库 | **Drizzle ORM 0.45** + **@libsql/client** | SQLite（本地）或 Turso（线上），原生 SQL 迁移 |
| 鉴权 | **better-auth 1.7** + `@better-auth/drizzle-adapter` | 站内账号、会话、限流 |
| 文档 | **docx 9.5** | Word 导出（配合自研排版引擎） |
| 模型 | **DeepSeek API** | `deepseek-flash`，JSON 模式输出，110s 超时保护 |
| 校验 | **Zod 4.5** | 教学需求与生成结果的结构校验 |
| 字体 | `@fontsource-variable/noto-sans-sc`、`noto-serif-sc`、`zhi-mang-xing` | 思源黑体 / 思源宋体 / 芝麻行楷 |
| 图标 | **lucide-react** | 界面图标 |

---

## 本地启动指南

### 1. 环境要求

| 依赖 | 版本要求 |
| --- | --- |
| Node.js | **22.13.0 及以上**（`package.json` 中 `engines.node >= 22.13.0`） |
| pnpm | **10 及以上**（项目锁定 `pnpm@10.28.2`） |

```sh
node -v   # 需 >= v22.13.0
pnpm -v   # 需 >= 10
```

### 2. 安装依赖

```sh
pnpm install
```

### 3. 配置环境变量

复制示例文件并按需填写：

```sh
cp .env.example .env.local
```

`.env.local` 中的关键配置项：

| 变量 | 是否必需 | 说明 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | **必需** | DeepSeek API Key，用于生成教案。缺失时生成接口返回 503「模型服务尚未配置」 |
| `DEEPSEEK_MODEL` | 建议 | 模型名称，默认 `deepseek-flash` |
| `SESSION_SECRET` | **必需** | 至少 32 位随机字符串，用于 AES-GCM 加密图谱会话 Cookie 与生成配额 Cookie。示例：`openssl rand -base64 48` |
| `BETTER_AUTH_SECRET` | 使用站内账号时必需 | better-auth 密钥，同样建议 32 位以上随机值 |
| `AUTH_BASE_URL` | 建议 | 网站实际访问地址，默认 `http://127.0.0.1:5173`。跨域来源校验与 Cookie `secure` 属性依赖此项 |
| `DATABASE_URL` | 使用站内账号时必需 | 本地可填 `file:local.db`；线上必须使用持久化的 libSQL / Turso 地址 |
| `DATABASE_AUTH_TOKEN` | 线上必填 | Turso / libSQL 远程数据库的鉴权令牌，本地 `file:` 模式留空 |
| `ADMIN_SETUP_SECRET` | 仅首次初始化 | 初始化管理员账号时使用（需 32 位以上，通过 `x-setup-secret` 请求头提交）。**初始化完成后请从 `.env.local` 中移除** |
| `GRAPH_NODE_COUNT` | 可选 | 图谱规模回落值，默认 `350000`，首页展示并标注为平台规模 |
| `APP_ALLOWED_ORIGINS` | 可选 | 额外允许访问的来源，多个地址以英文逗号分隔 |
| `IMAGE_API_KEY` | 可选 | 图片服务暂未启用，留空即可 |

> **关于知识图谱账号密码**
> 图谱账号**不需要**配置在环境变量中。系统在登录页由用户**自行填写**自己的华东师大知识图谱账号与密码，由服务端代理调用 `kg.chineseplus.net` 的 `auth/login` 接口换取访问令牌，并以 AES-GCM 加密形式存入 HttpOnly Cookie。
>
> **关于站内账号**
> 站内账号体系（better-auth）依赖数据库。首次使用请执行数据库迁移，并通过 `ADMIN_SETUP_SECRET` 初始化管理员。若暂不需要站内账号，仅需配置 `DEEPSEEK_API_KEY` 与 `SESSION_SECRET` 即可体验核心流程——教案草稿与课表本身保存在浏览器 `localStorage`，不依赖数据库。
>
> **关于邮件与图片服务**
> 密码重置邮件需管理员额外配置 `RESEND_API_KEY` 与 `MAIL_FROM`；教学图片工坊需配置 `IMAGE_BASE_URL` / `IMAGE_API_KEY` / `IMAGE_MODEL`（必须为 HTTPS）。二者默认关闭。

### 4. 初始化数据库（可选，使用站内账号时需要）

```sh
pnpm db:migrate
```

迁移脚本会按 `drizzle/` 目录下的 `.sql` 文件顺序建表，并记录已执行的迁移，重复执行安全。

### 5. 启动开发环境

```sh
pnpm dev
```

开发服务器监听 `http://127.0.0.1:5173`（脚本中固定 `--hostname 127.0.0.1 --port 5173`），浏览器打开该地址即可。

### 6. 生产环境构建

```sh
pnpm build   # next build --webpack
pnpm start   # next start --hostname 127.0.0.1 --port 5173
```

### 7. 全部脚本

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动开发服务器（端口 5173） |
| `pnpm build` | 生产构建（Webpack 模式） |
| `pnpm start` | 启动生产服务器（端口 5173） |
| `pnpm test` | 运行单元测试（`node --test tests/*.test.mjs`） |
| `pnpm test:integration` | 运行集成测试 |
| `pnpm db:migrate` | 执行数据库迁移 |

---

## 目录结构说明

```text
zhike-lesson-platform-main/
├── app/                        # Next.js App Router 根目录
│   ├── api/                    # Route Handlers（后端接口）
│   │   ├── auth/[...all]/      # better-auth 认证处理
│   │   ├── kg/                 # 知识图谱代理：login / logout / search / stats
│   │   ├── lesson/             # 教案生成（POST）
│   │   ├── workspaces/         # 草稿与修订版本持久化
│   │   ├── account/            # 站内账号登录 / 当前用户
│   │   ├── admin/              # 管理员：账号管理、用量、系统初始化
│   │   ├── dashboard/          # 工作台数据聚合
│   │   ├── media/              # 媒体服务契约（图片 / 语音，默认关闭）
│   │   └── status/             # 服务与模型状态探测
│   ├── login/                  # 登录页（地球动画 + 图谱账号连接）
│   ├── preview/                # 教案预览页（GSAP 动效）
│   ├── schedule/               # 课程表排期页
│   ├── reset-password/         # 密码重置页
│   ├── globals.css             # 全局样式：玻璃拟态主题、表单变量、动效关键帧
│   ├── layout.tsx              # 根布局（字体、元信息）
│   └── page.tsx                # 首页：教学设计工作台主界面
│
├── components/
│   └── studio/                 # 工作台业务组件
│       ├── navigation.tsx      # 顶部导航
│       ├── lesson-entry.tsx    # 教学需求表单
│       ├── audience-picker.tsx # 教学对象组合式输入面板
│       ├── evidence.tsx        # 图谱检索与逐条确认面板 + 例句文字卡渲染
│       ├── duration.tsx        # 教学环节时长分配可视化（AntV G2）
│       ├── schedule.tsx        # 课程表排期
│       ├── account.tsx         # 账号中心
│       ├── admin.tsx           # 管理后台界面
│       ├── auth-guard.tsx      # 登录态守卫
│       ├── media.tsx           # 教学图片工坊
│       ├── tongue.tsx          # 品牌标识「木铎」线性图标
│       └── motion.tsx          # GSAP 动效封装（context 自动回滚）
│
├── lib/
│   ├── server.ts               # 服务端基础设施：配置、加密会话、图谱请求、生成配额
│   ├── auth.ts                 # better-auth 实例与角色鉴权
│   ├── accounts.ts             # 站内账号管理
│   ├── lesson.ts               # 教学需求 Zod 模型、课型 / 教学对象定义、旧数据迁移
│   ├── evidence.ts             # 证据包组装、提示词版本、formatAudience
│   ├── graph.ts                # 知识图谱 Cypher 查询与节点归一化
│   ├── model.ts                # DeepSeek / 兼容模型服务调用（JSON 模式）
│   ├── export.ts               # 导出编排：Draft → API 响应 → Word
│   ├── schedule.ts             # 排课数据层（localStorage）与教案池
│   ├── workspace.ts            # 草稿与修订版本 schema
│   ├── usage.ts                # 用量统计
│   ├── request-origin.ts       # 跨域来源校验
│   ├── media-provider.ts       # 媒体服务适配层（图片 / 语音）
│   └── lib/                    # 文档导出子系统
│       ├── doc-export.ts       # 导出类型定义与入口
│       └── exporter/           # ★ Word 排版引擎
│           ├── docbuild.js     #   教案 / 学习任务单结构构建（目标分组、技能分段）
│           ├── docx.js         #   docx 底层封装与样式常量
│           └── shapes.js       #   课型范式定义（综合 / 听力 / 读写）
│
├── db/
│   ├── schema.ts               # Drizzle 表结构（用户、会话、工作台、修订、用量）
│   └── index.ts                # libSQL 客户端与 Drizzle 实例（惰性初始化）
│
├── drizzle/                    # 原生 SQL 迁移文件
├── scripts/migrate.mjs         # 迁移执行器
├── tests/                      # 单元测试与集成测试
├── public/                     # favicon 与字体文件（芝麻行楷 woff2）
├── .env.example                # 环境变量模板
└── package.json                # 依赖与脚本定义
```

---

## 数据与隐私

- 图谱访问令牌与生成配额**只以加密 Cookie 形式**保存在浏览器端，密钥来自 `SESSION_SECRET`，服务端不落库明文。
- 教案草稿与课表保存在浏览器 `localStorage`（`zhike-workspace` / `zhike-schedule`），两者互不覆盖；登录后可选同步到服务端工作台。
- 知识释义与例句严格使用图谱返回的原文；教学活动由 AI 生成，**使用前必须由教师审核**。
- 本地数据库文件（`*.db`）与所有 `.env*` 文件均已加入 `.gitignore`，不会随仓库提交。

---

## 许可

本项目为私有项目，版权归项目所有者所有。
