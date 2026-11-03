import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialBrief,briefSchema,getKnowledgeGroups,graphTermsFromGroups,manualKnowledge} from '../lib/lesson.ts';
import {lessonPrompt} from '../lib/evidence.ts';
const groups={characters:'比',vocabulary:'方便、比',grammar:'比字句',culture:'春节习俗',other:'小组合作'};
test('legacy terms remain editable without inventing categories',()=>{assert.equal(getKnowledgeGroups(initialBrief).vocabulary,initialBrief.terms);assert.equal(briefSchema.parse(initialBrief).terms,initialBrief.terms)});
test('five columns survive draft JSON and only language knowledge enters graph search',()=>{const brief=briefSchema.parse({...initialBrief,knowledgeGroups:groups});assert.equal(brief.terms,'比、方便、比字句');assert.deepEqual(briefSchema.parse(JSON.parse(JSON.stringify(brief))).knowledgeGroups,groups);assert.equal(graphTermsFromGroups({...groups,characters:'',vocabulary:'',grammar:''}),'')});
test('same-name character and vocabulary retain separate candidate kinds',()=>{const entries=manualKnowledge({...initialBrief,knowledgeGroups:groups});assert.ok(entries.some(k=>k.name==='比'&&k.kind==='Character'));assert.ok(entries.some(k=>k.name==='比'&&k.kind==='Word'));assert.ok(entries.some(k=>k.name==='比字句'&&k.kind==='Grammar'));assert.ok(entries.every(k=>!['春节习俗','小组合作'].includes(k.name)))});
test('culture and other requirements reach prompt without becoming graph evidence',()=>{const prompt=lessonPrompt({...initialBrief,knowledgeGroups:groups},[],{});assert.ok(prompt.includes('春节习俗'));assert.ok(prompt.includes('小组合作'));assert.ok(prompt.includes('不构成图谱证据'))});
