import {test} from 'node:test';
import assert from 'node:assert/strict';
import {characterResources,characterResourceMaterials} from '../lib/character-resources.ts';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['lib/workspace.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {knowledgeSchema}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const character={id:'Character:旅',name:'旅',kind:'Character',role:'核心',verified:true,detail:'',example:'',levels:[],relations:[],animationUrl:'https://kg.chineseplus.net/旅.gif',strokeUrl:'https://kg.chineseplus.net/旅.png'};
test('character resources survive draft validation and supply export materials with provenance',()=>{
 const restored=knowledgeSchema.parse(character);
 assert.equal(restored.animationUrl,character.animationUrl);
 const materials=characterResourceMaterials([restored]);
 assert.equal(materials.length,1);
 assert.ok(materials[0].content.includes('笔顺动画：'));
 assert.ok(materials[0].content.includes('笔顺图：'));
 assert.ok(materials[0].content.includes(character.id));
});
test('missing resources stay absent, and excluded or unverified characters supply no materials',()=>{
 assert.deepEqual(characterResources([{...character,verified:false},{...character,role:'排除'},{...character,kind:'Word'}]),[]);
 assert.deepEqual(characterResourceMaterials([{...character,animationUrl:undefined,strokeUrl:undefined}]),[]);
});
