import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lexicalFeature,lexicalRelationCategory,wordPropertyFeatures,lexicalDisplayGroups,lexicalSourceLabel} from '../lib/lexical.ts';
import {selectionSchema,validateSelections,groundedBlocks,knowledgeSelection} from '../lib/evidence.ts';
import {initialBrief} from '../lib/lesson.ts';
const pos=lexicalFeature('pos','形容词'),syn=lexicalFeature('synonym','便利','','SYNONYM','outgoing');
const node={id:'Word:1',name:'方便',kind:'Word',role:'核心',verified:true,detail:'便利。',rawDetail:'便利。',example:'',levels:[],relations:[],lexicalFeatures:[pos,syn],evidence:{standard:initialBrief.standard,parameters:{terms:['方便']},queries:[]}};
const selection={id:node.id,name:node.name,kind:node.kind,role:'核心',selectedMeaning:'便利。',selectedExamples:[],scopeConfirmed:true};
test('generation submits selections without oversized graph payloads and retains backend verification',()=>{
 const expanded={...node,...selection,rawDetail:'原文'.repeat(40000),lexicalFeatures:Array(400).fill(syn),selectedFeatureIds:[syn.id]};
 assert.ok(JSON.stringify(expanded).length>60000);
 const payload=knowledgeSelection(expanded);
 assert.ok(JSON.stringify(payload).length<1000);
 assert.deepEqual(selectionSchema.parse(payload),payload);
 assert.deepEqual(validateSelections([payload],[node],initialBrief).problems,[]);
 assert.ok(validateSelections([{...payload,selectedFeatureIds:['forged']}],[node],initialBrief).problems.length);
});
test('synonym display merges both sources without losing independently selectable identities',()=>{
 const cilin=lexicalFeature('cilin','便利','','CILIN','outgoing');
 const group=lexicalDisplayGroups([pos,syn,cilin]).find(group=>group.category==='synonym');
 assert.equal(group.label,'同义关系');
 assert.deepEqual(group.features,[syn,cilin]);
 assert.deepEqual(group.features.map(lexicalSourceLabel),['同近义关系','词林关系']);
 assert.notEqual(syn.id,cilin.id);
 assert.ok(!lexicalDisplayGroups([cilin]).some(group=>group.category==='cilin'));
 const result=validateSelections([{...selection,selectedFeatureIds:[cilin.id]}],[{...node,lexicalFeatures:[syn,cilin]}],initialBrief);
 assert.deepEqual(groundedBlocks(result.knowledge)[0].lexicalFeatures,[cilin]);
});
test('legacy selections default to no lexical additions',()=>{const selected=selectionSchema.parse(selection);assert.deepEqual(selected.selectedFeatureIds,[]);assert.equal(validateSelections([selection],[node],initialBrief).problems.length,0)});
test('only checked and freshly verified features enter model evidence',()=>{const checked=validateSelections([{...selection,selectedFeatureIds:[syn.id]}],[node],initialBrief);assert.deepEqual(checked.problems,[]);assert.deepEqual(groundedBlocks(checked.knowledge)[0].lexicalFeatures,[syn]);assert.deepEqual(groundedBlocks([{...node,scopeConfirmed:true}])[0].lexicalFeatures,[])});
test('forged and stale lexical selections are rejected',()=>{for(const id of ['forged',lexicalFeature('synonym','随意捏造').id])assert.ok(validateSelections([{...selection,selectedFeatureIds:[id]}],[node],initialBrief).problems.some(x=>x.includes('扩展信息')))});
test('source-only POS normalization preserves text and does not infer missing data',()=>{assert.deepEqual(wordPropertyFeatures({}),[]);assert.deepEqual(wordPropertyFeatures({pos:['名词','动词','名词']}).map(x=>x.value),['名词','动词']);assert.equal(wordPropertyFeatures({'词性':'形容词'})[0].value,'形容词')});
test('unknown relationship types stay unclassified and direction changes feature identity',()=>{assert.equal(lexicalRelationCategory('SYNONYM'),'synonym');assert.equal(lexicalRelationCategory('反义'),'antonym');assert.equal(lexicalRelationCategory('COMPOSED_OF'),'wordFormation');assert.equal(lexicalRelationCategory('UNRECOGNIZED'),null);assert.notEqual(lexicalFeature('wordFormation','方便','','COMPOSED_OF','incoming').id,lexicalFeature('wordFormation','方便','','COMPOSED_OF','outgoing').id)});
test('selection limits are enforced on the server',()=>assert.equal(selectionSchema.safeParse({...selection,selectedFeatureIds:Array(41).fill(syn.id)}).success,false));

test('graph syntax property takes priority and Chinese relationship names remain distinct',()=>{
 assert.deepEqual(wordPropertyFeatures({'句法属性':['形容词','动词'],pos:'旧字段'}).map(f=>f.value),['形容词','动词']);
 assert.equal(lexicalRelationCategory('同近义'),'synonym');
 assert.equal(lexicalRelationCategory('同近义关系'),'synonym');
 assert.equal(lexicalRelationCategory('反义关系'),'antonym');
 assert.equal(lexicalRelationCategory('词林关系'),'cilin');
 const feature=lexicalFeature('cilin','便利','','词林关系','incoming');
 const fresh={...node,lexicalFeatures:[feature]};
 const result=validateSelections([{...selection,selectedFeatureIds:[feature.id]}],[fresh],initialBrief);
 assert.deepEqual(result.problems,[]);
 assert.deepEqual(groundedBlocks(result.knowledge)[0].lexicalFeatures,[feature]);
});

test('official Word.syntactic takes priority over display labels and legacy fields',()=>{
 assert.equal(wordPropertyFeatures({syntactic:'动词'})[0].value,'动词');
 assert.equal(wordPropertyFeatures({syntactic:['名词','动词']}).length,2);
 assert.equal(wordPropertyFeatures({syntactic:'名词','句法属性':'旧值',pos:'旧值'})[0].value,'名词');
 assert.deepEqual(wordPropertyFeatures({unrelated:'名词'}),[]);
 for(const [type,category] of [['NEAR_SYNONYMOUS_WITH','synonym'],['ANTITHESIS_WITH','antonym'],['COMPOSITION_COMPONENT','wordFormation'],['CILIN','cilin']])assert.equal(lexicalRelationCategory(type),category);
});
