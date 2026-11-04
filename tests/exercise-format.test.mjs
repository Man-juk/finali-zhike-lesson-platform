import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseChoiceItems,segmentExerciseContent,cleanExerciseText,stripDuplicateFieldLabel} from '../lib/exercise-format.ts';
import {decodeHtmlEntities} from '../lib/html-entities.ts';

test('choices parse into lettered options',()=>{
 assert.deepEqual(parseChoiceItems('A甲 B乙'),[{letter:'A',text:'甲'},{letter:'B',text:'乙'}]);
 assert.equal(parseChoiceItems('A. 去公园 B. 在家').length,2);
});
test('image urls become image segments',()=>{
 const segments=segmentExerciseContent('https://kg.example.com/a.jpg');
 assert.equal(segments.length,1);
 assert.equal(segments[0].type,'image');
});
test('html entities decode and duplicate labels strip',()=>{
 assert.equal(decodeHtmlEntities('Z&agrave;'),'Zà');
 assert.equal(stripDuplicateFieldLabel('说明：这是提示','说明'),'这是提示');
});
