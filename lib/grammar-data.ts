import {z} from 'zod';
import type {Knowledge} from './lesson';
export const grammarQuestionSchema=z.object({id:z.string().min(1).max(200),name:z.string().max(300),description:z.string().max(10000),stem:z.string().max(10000),corpus:z.string().max(10000),choices:z.string().max(10000),answer:z.string().max(3000),listenStem:z.string().max(10000),listenCorpus:z.string().max(10000),links:z.array(z.object({label:z.string().max(30),url:z.string().max(3000)})).max(20)});
export type GrammarQuestion=z.infer<typeof grammarQuestionSchema>;
export function grammarQuestion(raw:Record<string,any>):GrammarQuestion|null{
 const p=raw.properties||raw.data||raw;
 const text=(key:string,max=10000)=>typeof p[key]==='string'?p[key].slice(0,max):'';
 const id=p.id??raw.id??p.name;if(id===undefined)return null;
 const links:GrammarQuestion['links']=[];
 for(const [key,label] of [['stem','题干链接'],['listen_stem','听力题干链接'],['corpus','语料链接'],['listen_corpus','听力语料链接']] as const){
  const value=text(key).trim(),urls=value.match(/https?:\/\/[^\s<>"']+/g)||(/^\/(?!\/)/.test(value)?[value]:[]);
  for(const source of urls){try{const url=new URL(source,'https://kg.chineseplus.net');if(url.href.length<=3000&&!url.username&&!url.password&&!links.some(link=>link.url===url.href))links.push({label,url:url.href})}catch{}}
 }
 const question={id:'Question:'+String(id),name:text('name',300),description:text('desc'),stem:text('stem'),corpus:text('corpus'),choices:text('chooses'),answer:text('answer',3000),listenStem:text('listen_stem'),listenCorpus:text('listen_corpus'),links:links.slice(0,20)};
 return grammarQuestionSchema.safeParse(question).success?question:null;
}
export function selectedGrammarQuestions(knowledge:Knowledge[]){
 return knowledge.filter(item=>item.kind==='Grammar'&&item.verified&&item.role!=='排除').map(item=>({item,questions:(item.grammarQuestions||[]).filter(question=>item.selectedQuestionIds?.includes(question.id)).slice(0,3)}));
}
export function grammarQuestionMaterials(knowledge:Knowledge[],includeAnswers=true){
 return selectedGrammarQuestions(knowledge).flatMap(({item,questions})=>questions.map((question,index)=>({title:`${item.name} · 图谱例题 ${index+1}`,content:[question.name,question.description,question.corpus,question.stem,question.listenCorpus,question.listenStem,question.choices,includeAnswers&&question.answer&&'图谱答案：'+question.answer,...question.links.map(link=>link.label+'：'+link.url),'来源：国际中文教育知识图谱；语法节点：'+item.id+'；题目节点：'+question.id].filter(Boolean).join('\n')})));
}
