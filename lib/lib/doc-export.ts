import { buildTeacherDocx, buildStudentDocx } from './exporter/docbuild.js';

/* ------------------------------------------------------------------ *
 * 一、接口返回结构（app/api/lesson/route.ts 的 JSON body）
 * ------------------------------------------------------------------ */

export type ApiKnowledge = {
  id: string;
  kind: 'Word' | 'Grammar' | 'Character' | 'Idiom';
  name: string;
  pinyin?: string;
  role: '核心' | '复习' | '拓展' | '排除';
  verified: boolean;
  detail: string;
  example: string;
  levels: string[];
  relations: { type: string; name: string; detail: string }[];
  query?: string;
  checkedAt?: string;
  rawDetail?: string;
  rawExample?: string;
  selectedMeaning?: string;
  selectedExamples?: string[];
  scopeConfirmed?: boolean;
  evidence?: { standard: string; parameters: { terms: string[] }; queries: string[] };
};

export type ApiGoal = { id: string; domain?: '认知领域' | '技能领域' | '情感领域'; text: string; knowledgeIds: string[] };
export type ApiActivity = {
  id: string;
  title: string;
  minutes: number;
  goalIds: string[];
  knowledgeIds: string[];
  teacher: string;
  students: string;
  grouping: string;
  output: string;
  assessment: string;
};
export type ApiMaterial = { title: string; content: string };
export type ApiExercise = { question: string; answer: string; goalIds: string[]; knowledgeIds: string[] };

export type ApiLesson = {
  title: string;
  goals: ApiGoal[];
  difficulties?: { text: string }[];
  activities: ApiActivity[];
  materials: ApiMaterial[];
  exercises: ApiExercise[];
  board: string;
  homework: string;
  notes: string;
};

export type ApiResponse = {
  lesson: ApiLesson;
  knowledge: ApiKnowledge[];
  brief?: {
    audience?: string;
    referenceMaterial?: string;
    minutes?: number;
    level?: string;
    standard?: string;
    students?: number;
    mode?: string;
    courseType?: string;
  };
  source?: string;
  createdAt?: string;
  promptVersion?: string;
  model?: string;
  reviewed?: boolean;
  validationWarnings?: string[];
};

/* ------------------------------------------------------------------ *
 * 二、排版引擎（exporter/docbuild.js → buildTeacherDocx）需要的结构
 * ------------------------------------------------------------------ */

export type EngineObjective = { domain: string; text: string; criteria?: string };
export type EngineSubStep = { no: string; text: string; answer?: string };
export type EngineStage = {
  name: string;
  minutes: number;
  content?: string;
  teacher?: string;
  students?: string;
  purpose?: string;
  no?: string;
  subSteps?: EngineSubStep[];
};
export type EngineVocabulary = {
  word: string;
  pinyin?: string;
  meaning?: string;
  usage?: string;
  examples?: string[];
};
export type EngineGrammar = {
  name: string;
  structure?: string;
  type?: string;
  level?: string;
  explanation?: string;
  examples?: string[];
  tip?: string;
};
export type EngineExercise = { type?: string; question: string; answer: string; basedOn?: string };
export type EngineHomework = { level: string; task: string };
export type EngineAssessment = { item: string; criteria: string };
export type EngineError = { error: string; analysis: string; strategy: string };
export type EngineCulture = { title: string; content: string; link?: string };

export type EngineMaterial = { title: string; content: string };

export type EngineLesson = {
  title: string;
  author?: string;
  referenceMaterial?: string;
  objectives: EngineObjective[];
  stages: EngineStage[];
  keyPoints: string[];
  difficulties: string[];
  materials: EngineMaterial[];
  vocabulary: EngineVocabulary[];
  grammar: EngineGrammar[];
  culture: EngineCulture[];
  exercises: EngineExercise[];
  homework: EngineHomework[];
  assessment: EngineAssessment[];
  errors: EngineError[];
  board: string;
  notes: string;
};

export type EngineCtx = {
  lesson: EngineLesson;
  brief?: { audience?: string; minutes?: number; referenceMaterial?: string };
  courseType?: { code?: string; name?: string };
  topic?: { title?: string; level1?: string; level2?: string; anchor?: string };
  settings?: { export?: { footer?: string; teacher?: string; school?: string } };
  passage?: string;
  referenceMaterial?: string;
};

/* ------------------------------------------------------------------ *
 * 三、映射选项（可选覆盖默认推导结果）
 * ------------------------------------------------------------------ */

export type ExportOptions = {
  /** 目标领域名，默认「教学目标」 */
  objectiveDomain?: string;
  /** 教学重点；不传则由核心知识推导 */
  keyPoints?: string[];
  /** 教学难点；不传则留空，引擎会显示「（待补充）」 */
  difficulties?: string[];
  /** 作业；不传则从 lesson.homework 文本解析 */
  homework?: EngineHomework[];
  /** 作者署名 */
  author?: string;
  /** 教学对象 */
  audience?: string;
  /** 参考教材 */
  referenceMaterial?: string;
  /** 课型名称 */
  courseType?: string;
  /** 页脚 */
  footer?: string;
  /** 覆盖单个环节的「教学内容」 */
  stageContent?: Record<string, string>;
};

/* ------------------------------------------------------------------ *
 * 四、工具函数
 * ------------------------------------------------------------------ */

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const arr = <T,>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);

/** 取参与本次教学的核心知识（已排除 role==='排除' 的条目） */
function usableKnowledge(knowledge: ApiKnowledge[]): ApiKnowledge[] {
  return arr(knowledge).filter((k) => k && k.role !== '排除');
}

function coreKnowledge(knowledge: ApiKnowledge[]): ApiKnowledge[] {
  return usableKnowledge(knowledge).filter((k) => k.role === '核心');
}

function meaningOf(k: ApiKnowledge): string {
  return str(k.selectedMeaning) || str(k.rawDetail) || str(k.detail);
}

function examplesOf(k: ApiKnowledge): string[] {
  const picked = arr(k.selectedExamples).map((s) => str(s)).filter(Boolean);
  if (picked.length) return picked;
  return [str(k.rawExample) || str(k.example)].filter(Boolean);
}

/**
 * 把接口的 homework 自由文本拆成引擎要的「层次 / 任务」二维表。
 * 识别 基础/必做/拓展/选做/提高 等层次标记，否则整体作为一条。
 */
function parseHomework(text: string): EngineHomework[] {
  const raw = str(text);
  if (!raw) return [];
  const LEVEL = /(基础|必做|拓展|选做|提高|分层|基础任务|拓展任务)/;
  const chunks = raw
    .split(/\n+|[；;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const rows: EngineHomework[] = [];
  for (const chunk of chunks) {
    const m = chunk.match(LEVEL);
    if (m && chunk.length > m[0].length + 1) {
      const level = m[0];
      const task = chunk.slice(m.index! + m[0].length).replace(/^[:：、\s-]+/, '').trim();
      rows.push({ level, task: task || chunk });
    } else {
      rows.push({ level: '课后任务', task: chunk });
    }
  }
  return rows.length ? rows : [{ level: '课后任务', task: raw }];
}

/** 环节序号（一、二、三…），与引擎的「环节（含时间）」列对齐 */
const CN_NUMS = [
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
];

/* ------------------------------------------------------------------ *
 * 五、核心映射：apiResponse → engine ctx
 * ------------------------------------------------------------------ */

export function toEngineCtx(apiResponse: ApiResponse, options: ExportOptions = {}): EngineCtx {
  const lesson = apiResponse?.lesson;
  if (!lesson) throw new Error('导出失败：接口返回中没有 lesson 字段。');

  const knowledge = usableKnowledge(apiResponse.knowledge || []);
  const core = coreKnowledge(apiResponse.knowledge || []);
  const goals = arr(lesson.goals);
  const activities = arr(lesson.activities);
  const exercises = arr(lesson.exercises);

  const defaultDomain = options.objectiveDomain || '教学目标';
  const goalText = (id: string): string => goals.find((g) => g.id === id)?.text || '';

  /* --- goals → objectives（保留模型给出的三领域分类） --- */
  const objectives: EngineObjective[] = goals.map((g) => ({
    domain: g.domain || defaultDomain,
    text: str(g.text) || '（目标描述缺失，待教师补充）',
  }));

  /* --- activities → stages --- */
  const stages: EngineStage[] = activities.map((a, i) => {
    const name = str(a.title) || `环节 ${i + 1}`;
    const content =
      options.stageContent?.[a.id] ??
      [str(a.grouping) ? `分组：${str(a.grouping)}` : '', str(a.output) ? `产出：${str(a.output)}` : '']
        .filter(Boolean)
        .join('\n');
    return {
      no: CN_NUMS[i] || String(i + 1),
      name,
      minutes: Number.isFinite(a.minutes) ? a.minutes : 0,
      content,
      teacher: str(a.teacher),
      students: str(a.students),
      purpose: str(a.assessment),
      subSteps: [],
    };
  });

  /* --- knowledge → vocabulary / grammar --- */
  const vocabulary: EngineVocabulary[] = core.map((k) => ({
    word: str(k.name),
    pinyin: str(k.pinyin),
    meaning: meaningOf(k),
    usage: '',
    examples: examplesOf(k),
  }));

  const grammar: EngineGrammar[] = knowledge
    .filter((k) => k.kind === 'Grammar')
    .map((k) => ({
      name: str(k.name),
      explanation: meaningOf(k),
      examples: examplesOf(k),
    }));

  /* --- exercises → exercises --- */
  const engineExercises: EngineExercise[] = exercises.map((e, i) => {
    const basedOn = arr(e.goalIds)
      .map((id) => goalText(id))
      .filter(Boolean)
      .join('；');
    return {
      type: `练习 ${i + 1}`,
      question: str(e.question),
      answer: str(e.answer),
      basedOn: basedOn || undefined,
    };
  });

  /* --- 作业 --- */
  const homework = options.homework?.length ? options.homework : parseHomework(lesson.homework);

  /* --- 重点 / 难点 --- */
  const keyPoints =
    options.keyPoints?.length
      ? options.keyPoints
      : core.map((k) => `理解并使用「${str(k.name)}」的释义与图谱原句（${str(k.role)}知识）`);

  const difficulties = options.difficulties
    ? [...options.difficulties]
    : arr(lesson.difficulties)
        .map((d) => str(d.text))
        .filter(Boolean);

  /* --- 评价量表：由各环节的评价方式汇总 --- */
  const assessment: EngineAssessment[] = activities
    .filter((a) => str(a.assessment))
    .map((a) => ({ item: `${str(a.title) || '课堂环节'}`, criteria: str(a.assessment) }));

  /* --- 组装引擎 lesson --- */
  const audience = options.audience || str(apiResponse.brief?.audience);
  const referenceMaterial =
    options.referenceMaterial || str(apiResponse.brief?.referenceMaterial);

  const engineLesson: EngineLesson = {
    title: str(lesson.title) || '教学设计',
    author: options.author,
    referenceMaterial,
    objectives,
    stages,
    keyPoints,
    difficulties,
    materials: arr(lesson.materials)
      .map((m) => ({ title: str(m.title), content: str(m.content) }))
      .filter((m) => m.title || m.content),
    vocabulary,
    grammar,
    culture: [],
    exercises: engineExercises,
    homework,
    assessment,
    errors: [],
    board: str(lesson.board),
    notes: str(lesson.notes),
  };

  const totalMinutes = stages.reduce((sum, s) => sum + (s.minutes || 0), 0);

  const ctx: EngineCtx = {
    lesson: engineLesson,
    brief: {
      audience: audience || '国际中文学习者',
      minutes: apiResponse.brief?.minutes ?? totalMinutes,
      referenceMaterial,
    },
    courseType: { name: options.courseType || '综合课' },
    topic: { title: str(lesson.title) },
    settings: options.footer ? { export: { footer: options.footer } } : undefined,
  };

  return ctx;
}

/* ------------------------------------------------------------------ *
 * 六、对外主函数
 * ------------------------------------------------------------------ */

/**
 * 把 /api/lesson 的返回体转换成 Word（.docx）二进制。
 *
 * @param apiResponse 接口返回的 JSON（{ lesson, knowledge, ... }）
 * @param options    可选的人工覆盖项
 * @returns Node Buffer，可直接写入 HTTP Response
 */
export function exportToDocx(apiResponse: ApiResponse, options: ExportOptions = {}): Uint8Array {
  const ctx = toEngineCtx(apiResponse, options);
  return buildTeacherDocx(ctx as any) as unknown as Uint8Array;
}

/** 学生学习任务单（同一套引擎，排版不同） */
export function exportStudentDocx(apiResponse: ApiResponse, options: ExportOptions = {}): Uint8Array {
  const ctx = toEngineCtx(apiResponse, options);
  return buildStudentDocx(ctx as any) as unknown as Uint8Array;
}

/** 供路由使用的 Response 包装（Node runtime） */
export function exportToDocxResponse(apiResponse: ApiResponse, options: ExportOptions = {}): Response {
  const ctx = toEngineCtx(apiResponse, options);
  const buf = buildTeacherDocx(ctx as any) as unknown as Uint8Array;
  const filename = `${(ctx.lesson.title || '教案').replace(/[\\/:*?"<>|]/g, '-')}.docx`;
  return new Response(buf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}
