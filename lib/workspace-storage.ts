import { draftSchema, knowledgeSchema } from './workspace';
import { freshBriefForNewLesson, normalizeBrief, pruneKnowledgeToBrief, type Brief, type Knowledge } from './lesson';
export const WORKSPACE_KEY = 'zhike-workspace';

export type WorkspaceFlow = 'new' | 'working';

type StoredDraft = NonNullable<ReturnType<typeof draftSchema.safeParse>['data']>;

export type WorkspaceSnapshot = {
  version: 2;
  brief: Brief;
  knowledge: Knowledge[];
  draft: StoredDraft | null;
  history: StoredDraft[];
  flow?: WorkspaceFlow;
};

export function readWorkspaceSnapshot(): WorkspaceSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    if (parsed.version !== 2) return null;
    return parsed as WorkspaceSnapshot;
  } catch {
    return null;
  }
}

export function writeWorkspaceSnapshot(snap: Omit<WorkspaceSnapshot, 'version'>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      WORKSPACE_KEY,
      JSON.stringify({ version: 2, ...snap } satisfies WorkspaceSnapshot),
    );
  } catch {
    /* privacy mode / quota */
  }
}

/** 新建教案：清空知识指定与核验，保留历史版本列表（可选）。 */
export function emptyWorkspaceForNewLesson(history: WorkspaceSnapshot['history'] = []): WorkspaceSnapshot {
  const brief = freshBriefForNewLesson();
  return { version: 2, brief, knowledge: [], draft: null, history, flow: 'new' };
}

export function parseStoredHistory(raw: unknown): WorkspaceSnapshot['history'] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((d: unknown) => draftSchema.safeParse(d).success).slice(0, 8) as WorkspaceSnapshot['history'];
}

export function parseStoredKnowledge(raw: unknown, brief: Brief): Knowledge[] {
  if (!Array.isArray(raw)) return [];
  const loaded = raw.filter((k: unknown) => knowledgeSchema.safeParse(k).success) as Knowledge[];
  return pruneKnowledgeToBrief(loaded, brief);
}

export function restoreBriefFromStorage(raw: unknown): Brief | null {
  return normalizeBrief(raw);
}

