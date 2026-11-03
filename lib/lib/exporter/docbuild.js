import { D, buildDocx } from './docx.js';

/** 目标按领域分组：教案集里都是「认知领域 / 技能领域 …」分条列 */
function groupObjectives(objectives) {
  const groups = new Map();
  for (const o of objectives) {
    const key = o.domain || o.category || '教学目标';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  }
  return [...groups.entries()];
}

/** 技能领域按听说读写分段 */
const SKILL_SEGMENTS = [
  { key: 'listen', label: '听' },
  { key: 'speak', label: '说' },
  { key: 'read', label: '读' },
  { key: 'write', label: '写' },
];

const SKILL_KEYWORDS = {
  listen: /听|录音|语速|连读|声调/,
  speak: /说|表达|口头|交际|对话|朗读|复述|汇报|表演|叙述|成段/,
  read: /读|阅读|略读|扫读|默读|语篇|篇章/,
  write: /写|书面|笔头|仿写|练笔|作文|短文|段落/,
};

const COGNITIVE_KEYWORDS = /认知|识记|掌握|理解|知识|词汇|语法|字词|辨认|记忆|规则|结构/;
const AFFECTIVE_KEYWORDS = /情感|态度|兴趣|意愿|情绪|认同|尊重|乐于|愿意|喜欢|合作|文化理解/;

/** 目标文本：附上评分标准 */
function objectiveText(g) {
  return g.criteria ? `${g.text}（${g.criteria}）` : g.text;
}

/**
 * 列表编号：数组只有一条时不加编号，直接输出文本；
 * 有多条时才按 1. 2. 3. 编号。
 *
 * 单条列表加“1.”看起来像漏了后续项，反而分散注意力，所以这里只做纯文本。
 *
 * @param {number} index 当前项下标
 * @param {number} total 数组总长度
 * @returns {string} 形如 "1. " 的编号前缀；total <= 1 时为空串
 */
function listNumber(index, total) {
  return total > 1 ? `${index + 1}. ` : '';
}

/**
 * 带名称的编号：形如「练习 1」「练习」。
 * 单条时去掉数字，只保留名称。
 */
function listLabel(index, total, label) {
  return total > 1 ? `${label} ${index + 1}` : label;
}

/** 技能类目标归入听 / 说 / 读 / 写 */
function skillBucket(text) {
  if (SKILL_KEYWORDS.listen.test(text)) return 'listen';
  if (SKILL_KEYWORDS.speak.test(text)) return 'speak';
  if (SKILL_KEYWORDS.read.test(text)) return 'read';
  if (SKILL_KEYWORDS.write.test(text)) return 'write';
  return 'speak';
}

/**
 * 把目标归入认知 / 技能 / 情感三个领域：
 * 先看领域名，再看内容关键词，都没有就按内容强行归类。
 */
function classifyObjectives(objectives = []) {
  const cognitive = [];
  const skill = { listen: [], speak: [], read: [], write: [] };
  const affective = [];

  for (const o of objectives) {
    const domain = String(o.domain || o.category || '');
    const text = String(o.text || '');
    const isSkillText =
      SKILL_KEYWORDS.listen.test(text) || SKILL_KEYWORDS.speak.test(text) ||
      SKILL_KEYWORDS.read.test(text) || SKILL_KEYWORDS.write.test(text);

    if (/情感|态度|兴趣|意愿|情绪/.test(domain) || (!isSkillText && AFFECTIVE_KEYWORDS.test(text))) {
      affective.push(o);
      continue;
    }
    if (/技能|微技能|言语表达|听力|口语|阅读|写作|书面/.test(domain)) {
      skill[skillBucket(text)].push(o);
      continue;
    }
    if (/认知|知识|语言知识/.test(domain) || (COGNITIVE_KEYWORDS.test(text) && !isSkillText)) {
      cognitive.push(o);
      continue;
    }
    // 没有明确分类：按内容强行归类
    if (isSkillText) skill[skillBucket(text)].push(o);
    else if (COGNITIVE_KEYWORDS.test(text)) cognitive.push(o);
    else affective.push(o);
  }

  return { cognitive, skill, affective };
}

/** 中文序数：教案章节可能超过 16 个（读写课含评价量表、偏误、核验事项） */
const CN_NUMS = [
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '二十一', '二十二', '二十三', '二十四', '二十五',
];

function numbered() {
  let n = 0;
  return (title) => {
    const label = CN_NUMS[n] || String(n + 1);
    n += 1;
    return D.heading(`${label}、${title}`, 1);
  };
}

export function buildTeacherDocx(ctx) {
  const { lesson, settings } = ctx;
  const brief = ctx.brief || {};
  const parts = [];
  const H = numbered();

  // ---- 文首：标题 + 作者（居中）----
  parts.push(D.title(lesson.title, lesson.author || ''));

  // ---- 一、教学对象 ----
  parts.push(H('教学对象'));
  parts.push(D.para(brief.audience || '某国学生', { indent: false }));

  // ---- 二、参考教材 ----
  parts.push(H('参考教材'));
  const referenceMaterial =
    lesson.referenceMaterial || brief.referenceMaterial || ctx.referenceMaterial || '《HSK标准教程》及本课配套资源';
  parts.push(D.para(referenceMaterial, { indent: false }));

  // ---- 三、课型 ----
  parts.push(H('课型'));
  parts.push(D.para(ctx.courseType?.name || '—', { indent: false }));

  // ---- 四、课时 ----
  parts.push(H('课时'));
  parts.push(D.para(`${brief.minutes || 0} 分钟。`, { indent: false }));

  // ---- 五、教学目标（认知 / 技能 / 情感）----
  parts.push(H('教学目标'));
  const { cognitive, skill, affective } = classifyObjectives(lesson.objectives);
  parts.push(D.heading('（一）认知领域', 2));
  if (cognitive.length) {
    cognitive.forEach((g, i) => parts.push(D.para(`${listNumber(i, cognitive.length)}${objectiveText(g)}`, { indent: false, after: 60 })));
  } else {
    parts.push(D.para('能理解本课主题相关的核心词汇与表达。', { indent: false, after: 60 }));
  }

  parts.push(D.heading('（二）技能领域', 2));
  const skillAny = SKILL_SEGMENTS.some((s) => skill[s.key].length);
  if (skillAny) {
    // 编号按领域重置：技能领域内 1、2、3 连续，不因听说读写分段而重新计数
    const skillTotal = SKILL_SEGMENTS.reduce((sum, s) => sum + skill[s.key].length, 0);
    let skillSeq = 0;
    for (const seg of SKILL_SEGMENTS) {
      const items = skill[seg.key];
      if (!items.length) continue;
      parts.push(D.para(seg.label, { indent: false, bold: true, after: 40 }));
      items.forEach((g) => {
        parts.push(D.para(`${listNumber(skillSeq, skillTotal)}${objectiveText(g)}`, { indent: false, after: 60 }));
        skillSeq += 1;
      });
    }
  } else {
    parts.push(D.para('能围绕本课主题完成相应的听、说、读、写任务。', { indent: false, after: 60 }));
  }

  parts.push(D.heading('（三）情感领域', 2));
  if (affective.length) {
    affective.forEach((g, i) => parts.push(D.para(`${listNumber(i, affective.length)}${objectiveText(g)}`, { indent: false, after: 60 })));
  } else {
    parts.push(D.para('愿意在真实情境中使用汉语表达，对本课文化内容保持兴趣。', { indent: false, after: 60 }));
  }

  // ---- 六、教学重点与难点 ----
  parts.push(H('教学重点与难点'));
  if (lesson.keyPoints.length) {
    parts.push(D.heading('（一）教学重点', 2));
    lesson.keyPoints.forEach((k, i) => parts.push(D.para(`${listNumber(i, lesson.keyPoints.length)}${k}`, { indent: false, after: 60 })));
  }
  if (lesson.difficulties.length) {
    parts.push(D.heading(lesson.keyPoints.length ? '（二）教学难点' : '（一）教学难点', 2));
    lesson.difficulties.forEach((d, i) => parts.push(D.para(`${listNumber(i, lesson.difficulties.length)}${d}`, { indent: false, after: 60 })));
  }

  // ---- 教学步骤：综合课 / 听说课统一三栏 ----
  parts.push(H('教学步骤'));
  parts.push(
    D.table(
      ['环节（含时间）', '教师语言/行为', '教学说明'],
      lesson.stages.map((s) => [
        `${s.name}（${s.minutes}′）`,
        [s.teacher ? `师：${s.teacher}` : '', s.students ? `生：${s.students}` : ''].filter(Boolean).join('\n'),
        s.purpose,
      ]),
      [2200, 4800, 2640],
    ),
  );
  const total = lesson.stages.reduce((sum, s) => sum + s.minutes, 0);
  parts.push(D.para(`环节时长合计：${total} 分钟`, { indent: false }));

  // ---- 教学步骤明细：把每个环节的子步骤（提问与参考答案）展开 ----
  const detailed = lesson.stages.filter((s) => (s.subSteps || []).length);
  if (detailed.length) {
    parts.push(D.heading('（教学步骤明细）', 2));
    detailed.forEach((s, i) => {
      // 只有一个环节时不必标序号
      const stageNo = detailed.length > 1 && s.no ? `${s.no}、` : '';
      parts.push(D.para(`${stageNo}${s.name}（${s.minutes} 分钟）`, { indent: false, bold: true, after: 40 }));
      if (s.content) parts.push(D.para(`教学内容：${s.content}`, { indent: false, after: 30 }));
      (s.subSteps || []).forEach((x, k) => {
        const no = (s.subSteps || []).length > 1 ? `${x.no}. ` : '';
        parts.push(D.para(`${no}${x.text}`, { indent: false, after: 20 }));
        if (x.answer) parts.push(D.para(`参考：${x.answer}`, { indent: false, after: 30 }));
      });
    });
  }

  // ---- 附录一：教学资料（正文到教学步骤明细为止）----
  const hasAppendix1 =
    lesson.vocabulary.length ||
    lesson.grammar.length ||
    lesson.culture.length ||
    lesson.materials.length ||
    lesson.board ||
    lesson.exercises.length ||
    lesson.homework.length ||
    lesson.assessment.length ||
    lesson.errors.length;
  if (hasAppendix1 || lesson.notes) parts.push(D.pageBreak());

  if (hasAppendix1) {
    parts.push(D.heading('附录一 教学资料', 1));

    if (lesson.vocabulary.length) {
      parts.push(D.heading('核心词汇', 2));
      parts.push(
        D.table(
          ['词语', '拼音', '释义', '用法 / 搭配', '例句'],
          lesson.vocabulary.map((v) => [
            v.word,
            v.pinyin || '—',
            v.meaning && !/待.{0,4}核验/.test(v.meaning) ? v.meaning : '释义待教师核验',
            v.usage,
            (v.examples || []).join('\n'),
          ]),
          [900, 1100, 2600, 2000, 3040],
        ),
      );
      parts.push(D.para('注：释义与例句均取自知识图谱原文，未作改写。', { indent: false }));
    }

    if (lesson.grammar.length) {
      parts.push(D.heading('语法点', 2));
      lesson.grammar.forEach((g, i) => {
        parts.push(D.heading(`${listNumber(i, lesson.grammar.length)}${g.name}`, 2));
        if (g.structure) parts.push(D.para(`结构：${g.structure}`, { indent: false }));
        if (g.type) parts.push(D.para(`类型：${g.type}${g.level ? `　等级：HSK ${g.level}` : ''}`, { indent: false }));
        if (g.explanation) parts.push(D.para(`说明：${g.explanation}`));
        if ((g.examples || []).length) {
          g.examples.forEach((e, k) => parts.push(D.para(`${listLabel(k, g.examples.length, '例')}：${e}`, { indent: false, after: 50 })));
        } else {
          parts.push(D.para('（本语法点图谱未返回例句，课堂前请按需补充。）', { indent: false }));
        }
        if (g.tip) parts.push(D.para(`提示：${g.tip}`, { indent: false }));
      });
      parts.push(D.para('注：结构式与例句均取自知识图谱原文。', { indent: false }));
    }

    if (lesson.culture.length) {
      parts.push(D.heading('文化点', 2));
      lesson.culture.forEach((c, i) => {
        parts.push(D.heading(`${listNumber(i, lesson.culture.length)}${c.title}`, 2));
        parts.push(D.para(c.content));
        if (c.link) parts.push(D.para(`课堂结合：${c.link}`, { indent: false }));
      });
    }

    if (lesson.materials.length) {
      parts.push(D.heading('配套教学材料', 2));
      lesson.materials.forEach((m, i) => {
        parts.push(D.heading(`${listNumber(i, lesson.materials.length)}${m.title}`, 3));
        parts.push(D.para(m.content));
      });
    }

    if (lesson.board) {
      parts.push(D.heading('板书设计', 2));
      String(lesson.board)
        .split('\n')
        .forEach((line) => parts.push(D.para(line, { indent: false, after: 40 })));
    }

    if (lesson.exercises.length) {
      parts.push(D.heading('课堂练习与参考答案', 2));
      lesson.exercises.forEach((e, i) => {
        parts.push(D.heading(listLabel(i, lesson.exercises.length, '练习'), 2));
        parts.push(D.para(e.question));
        if (e.basedOn) parts.push(D.para(`依据：${e.basedOn}`, { indent: false, after: 40 }));
        parts.push(D.para(`参考答案 / 评分标准：${e.answer}`, { indent: false }));
      });
    }

    if (lesson.homework.length) {
      parts.push(D.heading('作业设计', 2));
      parts.push(D.table(['层次', '任务'], lesson.homework.map((h) => [h.level, h.task]), [1200, 8440]));
    }

    if (lesson.assessment.length) {
      parts.push(D.heading('评价量表', 2));
      parts.push(D.table(['评价维度', '评分标准'], lesson.assessment.map((a) => [a.item, a.criteria]), [1800, 7840]));
    }

    if (lesson.errors.length) {
      parts.push(D.heading('偏误预判与应对', 2));
      parts.push(D.table(['预判偏误', '成因分析', '课堂应对'], lesson.errors.map((e) => [e.error, e.analysis, e.strategy]), [2200, 3000, 4440]));
    }
  }

  if (lesson.notes) {
    parts.push(D.heading('附录二 待核验事项', 1));
    parts.push(D.para(lesson.notes));
  }

  parts.push(D.spacer());
  parts.push(D.para('教师审核签字：________________　　　日期：________年____月____日', { indent: false }));
  if (settings?.export?.footer) parts.push(D.para(settings.export.footer, { indent: false }));

  return buildDocx({
    body: parts.join(''),
    title: lesson.title,
    subject: `${ctx.courseType?.name || ''} ${ctx.topic?.title || ''}`,
    author: lesson.author || settings?.export?.teacher || settings?.export?.school || '智课 Pro',
    keywords: [ctx.topic?.level1, ctx.topic?.level2, ctx.topic?.anchor].filter(Boolean).join(','),
  });
}

export function buildStudentDocx(ctx) {
  const { lesson, settings } = ctx;
  const parts = [];
  const H = numbered();

  parts.push(D.title(lesson.title, '学生学习任务单 · 智课 Pro'));
  parts.push(D.para('班级：____________　　姓名：____________　　日期：____年__月__日', { indent: false, after: 180 }));

  if (ctx.passage) {
    parts.push(H('课文'));
    String(ctx.passage)
      .split('\n')
      .forEach((line) => parts.push(D.para(line, { indent: false, after: 40 })));
  }

  parts.push(H('本课目标'));
  for (const [domain, items] of groupObjectives(lesson.objectives)) {
    if (lesson.objectives.length > 3) parts.push(D.para(`〔${domain}〕`, { indent: false, bold: true, after: 20 }));
    items.forEach((g, i) => {
      parts.push(D.para(`${listNumber(i, items.length)}${g.text}${g.criteria ? `（${g.criteria}）` : ''}`, { indent: false, after: 50 }));
    });
  }

  if (lesson.vocabulary.length) {
    parts.push(H('核心词汇'));
    parts.push(
      D.table(
        ['词语', '拼音', '释义（先自己写，再对照）', '例句'],
        lesson.vocabulary.map((v) => [v.word, v.pinyin || '', '________________________', (v.examples || [])[0] || '']),
        [1200, 1400, 3000, 4040],
      ),
    );
  }

  if (lesson.grammar.length) {
    parts.push(H('语言点提示'));
    lesson.grammar.forEach((g) => {
      parts.push(D.para(`${g.name}${g.structure ? `　结构：${g.structure}` : ''}`, { indent: false, bold: true, after: 40 }));
      const ex = (g.examples || [])[0];
      if (ex) parts.push(D.para(`例：${ex}`, { indent: false }));
    });
  }

  parts.push(H('课堂任务'));
  lesson.stages.forEach((s, i) => {
    parts.push(D.para(`${listNumber(i, lesson.stages.length)}${s.name}（${s.minutes} 分钟）`, { indent: false, bold: true, after: 30 }));
    if (s.content) parts.push(D.para(`内容：${s.content}`, { indent: false, after: 20 }));
    if (s.students) parts.push(D.para(s.students));
    // 听力课的听前问题先印出来，学生带着问题听
    if ((s.subSteps || []).length && /听/.test(s.name || '')) {
      parts.push(D.para('听前问题：', { indent: false, bold: true, after: 20 }));
      s.subSteps.forEach((x, k) => {
        const no = s.subSteps.length > 1 ? `${x.no}. ` : '';
        parts.push(D.para(`${no}${x.text}`, { indent: false, after: 15 }));
      });
    }
    parts.push(D.para('完成情况：____________________________________', { indent: false, after: 70 }));
  });

  if (lesson.exercises.length) {
    parts.push(H('课堂练习'));
    lesson.exercises.forEach((e, i) => {
      parts.push(D.para(`${listNumber(i, lesson.exercises.length)}${e.question}`, { indent: false, after: 30 }));
      parts.push(D.para('答：____________________________________________________________', { indent: false, after: 90 }));
    });
  }

  if (lesson.materials.length) {
    parts.push(H('配套教学材料'));
    lesson.materials.forEach((material, index) => {
      parts.push(D.heading(`${listNumber(index, lesson.materials.length)}${material.title}`, 2));
      parts.push(D.para(material.content));
    });
  }

  if (lesson.homework.length) {
    parts.push(H('课后作业'));
    lesson.homework.forEach((h) => {
      parts.push(D.para(`【${h.level}】${h.task}`, { indent: false, after: 70 }));
    });
  }

  parts.push(D.spacer());
  parts.push(D.para('本节课我的收获：________________________________________________________', { indent: false }));
  parts.push(D.para('我还想问的问题：________________________________________________________', { indent: false }));
  if (settings?.export?.footer) parts.push(D.para(settings.export.footer, { indent: false }));

  return buildDocx({
    body: parts.join(''),
    title: `${lesson.title} 学生学习任务单`,
    subject: `${ctx.courseType?.name || ''} ${ctx.topic?.title || ''}`,
    author: lesson.author || settings?.export?.teacher || settings?.export?.school || '智课 Pro',
  });
}

export function safeFileName(name) {
  return String(name || '教案')
    .replace(/[\\/:*?"<>|\r\n\t]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}
