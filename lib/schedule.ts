import { draftSchema } from './workspace';

/* ------------------------------------------------------------------ *
 * 课程表（排课系统）· 数据层
 *
 * 排课数据独立存放在 localStorage 的 'zhike-schedule' 键，
 * 与教案工作台的 'zhike-workspace' 完全隔离，互不覆盖。
 *
 * 课表本体用一个扁平字典表示：
 *   key   —— 槽位坐标，格式 `${dayIndex}-${periodIndex}`，例如 "2-4"
 *   value —— 挂载在该槽位上的教案信息
 * ------------------------------------------------------------------ */

/** 排课数据在 localStorage 中的键名。 */
export const SCHEDULE_KEY = 'zhike-schedule';

/** 工作台草稿在 localStorage 中的键名（用于读取教案池）。 */
export const WORKSPACE_KEY = 'zhike-workspace';

/** 星期表头，从星期一到星期日。 */
export const DAYS = [
  '星期一',
  '星期二',
  '星期三',
  '星期四',
  '星期五',
  '星期六',
  '星期日',
] as const;

/** 每天的节次。 */
export const PERIODS = [
  '第1节',
  '第2节',
  '第3节',
  '第4节',
  '第5节',
  '第6节',
] as const;

/** 单元格高度（px），同时作为「一节课」的视觉尺度。 */
export const CELL_HEIGHT = 88;

export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type PeriodIndex = 0 | 1 | 2 | 3 | 4 | 5;

/** 槽位坐标：日索引 + 节索引。 */
export type SlotKey = string;

/** 挂在某个槽位上的排课记录。 */
export type ScheduleEntry = {
  /** 课表格子里显示的教案名（宋体）。可为空 —— 允许只排课型/时间/地点。 */
  title: string;
  /** 对应教案池里的哪一条（用于追溯来源）；未选教案时为空。 */
  poolId: string;
  /** 排课时间戳（ISO 字符串）。 */
  placedAt: string;
  /** 课型，如「综合课」「听说课」。 */
  lessonType: string;
  /** 上课时间，如「08:00 - 09:40」。 */
  time: string;
  /** 上课地点，如「教二 302」。 */
  location: string;
};

/** 课表本体：槽位坐标 → 排课记录。 */
export type ScheduleData = Record<SlotKey, ScheduleEntry>;

/** 新建一条排课记录（全部字段可空）。 */
export function emptyEntry(): ScheduleEntry {
  return {
    title: '',
    poolId: '',
    placedAt: new Date().toISOString(),
    lessonType: '',
    time: '',
    location: '',
  };
}

/** 教案池中的一条候选教案。 */
export type LessonItem = {
  id: string;
  title: string;
  /** 副信息，如课时长度 / 等级体系。 */
  meta: string;
  /** 来源：真实历史草稿 or 内置示例。 */
  origin: 'history' | 'sample';
};

/** 构造槽位坐标。 */
export function slotKey(day: number, period: number): SlotKey {
  return `${day}-${period}`;
}

/** 解析槽位坐标。 */
export function parseSlot(key: SlotKey): { day: number; period: number } {
  const [d, p] = key.split('-');
  return { day: Number(d), period: Number(p) };
}

/** 槽位的人类可读名称，例如「星期三 · 第4节」。 */
export function slotLabel(key: SlotKey): string {
  const { day, period } = parseSlot(key);
  const d = DAYS[day] ?? '—';
  const p = PERIODS[period] ?? '—';
  return `${d} · ${p}`;
}

/* ------------------------------------------------------------------ *
 * 持久化
 * ------------------------------------------------------------------ */

/** 从 localStorage 读取课表；无数据或数据损坏时返回空表。 */
export function loadSchedule(): ScheduleData {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SCHEDULE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: ScheduleData = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d+-\d+$/.test(key)) continue;
      if (!value || typeof value !== 'object') continue;
      const v = value as Partial<ScheduleEntry>;
      const title = typeof v.title === 'string' ? v.title.trim() : '';
      const poolId = typeof v.poolId === 'string' ? v.poolId : '';
      const lessonType = typeof v.lessonType === 'string' ? v.lessonType.trim() : '';
      const time = typeof v.time === 'string' ? v.time.trim() : '';
      const location = typeof v.location === 'string' ? v.location.trim() : '';
      // 整条记录全空则视为已删除，丢弃
      if (!title && !poolId && !lessonType && !time && !location) continue;
      out[key] = {
        title: title.slice(0, 150),
        poolId: poolId.slice(0, 200),
        placedAt:
          typeof v.placedAt === 'string' ? v.placedAt : new Date().toISOString(),
        lessonType: lessonType.slice(0, 40),
        time: time.slice(0, 60),
        location: location.slice(0, 80),
      };
    }
    return out;
  } catch {
    return {};
  }
}

/** 把课表写入 localStorage；写入失败（例如隐私模式）时静默忽略。 */
export function saveSchedule(data: ScheduleData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SCHEDULE_KEY, JSON.stringify(data));
  } catch {
    /* 隐私模式下可能写入失败，忽略即可 */
  }
}

/* ------------------------------------------------------------------ *
 * 教案池
 * ------------------------------------------------------------------ */

/** 内置示例教案：当浏览器里没有任何历史草稿时使用。 */
export const SAMPLE_LESSONS: LessonItem[] = [
  { id: 'sample-hsk3-baziju', title: 'HSK3 把字句', meta: '45 分钟 · HSK 3.0', origin: 'sample' },
  { id: 'sample-spring-festival', title: '春节文化课', meta: '45 分钟 · 《等级标准》', origin: 'sample' },
  { id: 'sample-compare', title: '比一比：比较句型', meta: '45 分钟 · HSK 3.0', origin: 'sample' },
  { id: 'sample-politeness', title: '校园礼貌用语', meta: '40 分钟 · HSK 2.0', origin: 'sample' },
];

/**
 * 读取教案池：优先取工作台 localStorage 里的历史草稿与当前草稿，
 * 用 draftSchema 校验（脏数据直接跳过），没有可用条目时回落到内置示例。
 */
export function loadLessonPool(): LessonItem[] {
  if (typeof window === 'undefined') return SAMPLE_LESSONS;

  const items: LessonItem[] = [];
  const seen = new Set<string>();

  try {
    const raw = window.localStorage.getItem(WORKSPACE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as unknown;
      if (stored && typeof stored === 'object') {
        const s = stored as {
          draft?: unknown;
          history?: unknown;
        };

        const candidates: unknown[] = [];
        if (Array.isArray(s.history)) candidates.push(...s.history);
        if (s.draft) candidates.push(s.draft);

        for (const candidate of candidates) {
          const parsed = draftSchema.safeParse(candidate);
          if (!parsed.success) continue;
          const d = parsed.data;
          const title = d.lesson.title?.trim();
          if (!title) continue;
          if (seen.has(title)) continue;
          seen.add(title);
          items.push({
            id: `draft-${d.createdAt}-${items.length}`,
            title: title.slice(0, 150),
            meta: `${d.brief.minutes} 分钟${d.brief.audience?.level ? ` · HSK ${d.brief.audience.level} 级` : ''} · ${
              d.source === 'template' ? '模板草稿' : 'AI 教案'
            }`,
            origin: 'history',
          });
        }
      }
    }
  } catch {
    /* 解析失败时落到示例数据 */
  }

  return items.length ? items : SAMPLE_LESSONS;
}

/* ------------------------------------------------------------------ *
 * 课型
 * ------------------------------------------------------------------ */

/** 课型（固定三个选项）。 */
export const LESSON_TYPES = ['综合课', '读写课', '听说课'] as const;

/* ------------------------------------------------------------------ *
 * 顶部数据栏
 * ------------------------------------------------------------------ */

/** 把「最后更新」格式化为中文年月，例如「2026年10月」。 */
export function formatMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

/** 统计当前已排课的节数。 */
export function countPlaced(data: ScheduleData): number {
  return Object.keys(data).length;
}
