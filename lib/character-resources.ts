import type {Knowledge} from './lesson';

export function graphResourceUrl(value:unknown):string|undefined{
 if(typeof value!=='string'||!value.trim())return undefined;
 try{const url=new URL(value.trim(),'https://kg.chineseplus.net');return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:undefined}catch{return undefined}
}
export function characterResources(knowledge:Knowledge[]){
 return knowledge.filter(item=>item.kind==='Character'&&item.verified&&item.role!=='排除').map(item=>({id:item.id,name:item.name,animationUrl:graphResourceUrl(item.animationUrl),strokeUrl:graphResourceUrl(item.strokeUrl)}));
}
export function characterResourceMaterials(knowledge:Knowledge[]){
 return characterResources(knowledge).filter(item=>item.animationUrl||item.strokeUrl).map(item=>({title:`汉字「${item.name}」笔顺材料`,content:[item.animationUrl&&`笔顺动画：${item.animationUrl}`,item.strokeUrl&&`笔顺图：${item.strokeUrl}`,'来源：国际中文教育知识图谱；节点：'+item.id].filter(Boolean).join('\n')}));
}
