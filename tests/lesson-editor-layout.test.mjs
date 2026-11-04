import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 defaultEditorLayout,
 normalizeEditorLayout,
 reorderModules,
 lessonEditorModuleIds,
} from '../lib/lesson-editor-layout.ts';

test('default layout includes intro visible and full order', () => {
 const d = defaultEditorLayout();
 assert.equal(d.visible.intro, true);
 assert.deepEqual(d.order, [...lessonEditorModuleIds]);
});

test('normalize merges legacy visible-only payload and prepends missing intro', () => {
 const legacy = {
  visible: {
   goals: false,
   vocabulary: true,
   grammar: true,
   steps: true,
   exercises: true,
   appendix: true,
  },
 };
 const n = normalizeEditorLayout(legacy);
 assert.equal(n.visible.intro, true);
 assert.equal(n.visible.goals, false);
 assert.ok(n.order.includes('intro'));
 assert.equal(n.order[0], 'intro');
 assert.equal(n.order.length, lessonEditorModuleIds.length);
});

test('normalize preserves custom order and appends unknown gaps', () => {
 const custom = {
  visible: defaultEditorLayout().visible,
  order: ['appendix', 'steps', 'intro', 'goals'],
 };
 const n = normalizeEditorLayout(custom);
 assert.deepEqual(n.order.slice(0, 4), ['appendix', 'steps', 'intro', 'goals']);
 assert.equal(n.order.length, lessonEditorModuleIds.length);
});

test('reorderModules moves panel without dropping ids', () => {
 const order = [...lessonEditorModuleIds];
 const next = reorderModules(order, 'grammar', 'intro');
 assert.equal(next[0], 'grammar');
 assert.equal(next.indexOf('intro'), 1);
 assert.equal(next.length, order.length);
});
