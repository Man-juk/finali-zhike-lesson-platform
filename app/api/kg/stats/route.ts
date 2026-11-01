import { json, session, config, failure } from '@/lib/server';
import { kg } from '@/lib/server';

/**
 * 图谱规模统计。
 * 优先用真实 Cypher 计数；平台未授权全库统计时回落到环境变量配置的规模常量。
 * 回落时 source='configured'，前端据此标注数据来源，不冒充实时查询结果。
 */
export async function GET() {
  try {
    const s = await session(false);
    const raw = config().GRAPH_NODE_COUNT;
    const configured = Number(raw);
    const fallback = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : null;

    if (!s) {
      return json({
        nodeCount: fallback,
        source: fallback ? 'configured' : 'unavailable',
        connected: false,
      });
    }

    try {
      const d = await kg(
        'intelligent/execute-cypher',
        { cypher: 'MATCH (n) RETURN count(n) AS total', parameters: {}, limit: 1 },
        s.token,
      );
      const row = (Array.isArray(d.records) ? d.records[0] : undefined) ?? {};
      const total = Number(row.total ?? row.count ?? row['count(n)']);
      if (Number.isFinite(total) && total > 0) {
        return json({ nodeCount: Math.floor(total), source: 'live', connected: true });
      }
    } catch {
      // 全库计数需要较高权限；不可用时按配置回落，不视为错误。
    }

    return json({
      nodeCount: fallback,
      source: fallback ? 'configured' : 'unavailable',
      connected: true,
    });
  } catch (e) {
    return failure(e);
  }
}
