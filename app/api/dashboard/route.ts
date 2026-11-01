import { json, session, config, failure } from '@/lib/server';
import { kg } from '@/lib/server';
import { auth } from '@/lib/auth';

/**
 * 首页工作台聚合数据。
 * - nodeCount：图谱节点数。优先真实 Cypher 计数，平台未授权全库统计时回落到
 *   GRAPH_NODE_COUNT 配置常量，并以 source 标明来源，前台据此标注，不冒充实时结果。
 * - cloudLessons：已登录用户的云端教案数（未登录为 null）。
 * - pending（待审核知识点数）由前端本机草稿计算，不在此返回。
 */
export async function GET(req: Request) {
  try {
    const s = await session(false);
    const raw = config().GRAPH_NODE_COUNT;
    const configured = Number(raw);
    const fallback = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : null;

    // 未登录时无法调用图谱统计接口，直接使用回落常量。
    if (!s) {
      return json({
        nodeCount: fallback,
        nodeSource: fallback ? 'configured' : 'unavailable',
        connected: false,
        cloudLessons: null,
      });
    }

    let nodeCount = fallback;
    let nodeSource: 'live' | 'configured' | 'unavailable' = fallback ? 'configured' : 'unavailable';
    try {
      const d = await kg(
        'intelligent/execute-cypher',
        { cypher: 'MATCH (n) RETURN count(n) AS total', parameters: {}, limit: 1 },
        s.token,
      );
      const row = (Array.isArray(d.records) ? d.records[0] : undefined) ?? {};
      const total = Number(row.total ?? row.count ?? row['count(n)']);
      if (Number.isFinite(total) && total > 0) {
        nodeCount = Math.floor(total);
        nodeSource = 'live';
      }
    } catch {
      // 全库计数需要较高权限；不可用时按配置回落，不视为错误。
    }

    // 云端教案数：智课账号未登录时为 null（该接口需要登录态）。
    let cloudLessons: number | null = null;
    try {
      const sess = await auth().api.getSession({ headers: req.headers });
      if (sess?.user) {
        const row = await config().DB.prepare(
          'SELECT count(*) AS n FROM lesson_workspaces WHERE owner_id=?',
        )
          .bind(sess.user.id)
          .first<{ n: number }>();
        cloudLessons = Number(row?.n || 0);
      }
    } catch {
      // 数据库或会话不可用时保留 null。
    }

    return json({ nodeCount, nodeSource, connected: true, cloudLessons });
  } catch (e) {
    return failure(e);
  }
}
