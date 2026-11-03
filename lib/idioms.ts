import type {Brief,Knowledge} from './lesson';
export const idiomSearchQuery="MATCH (n:Idiom) WHERE n.name IS NOT NULL AND n.name <> '' AND $text CONTAINS n.name RETURN n LIMIT 1000";
export function idiomContext(brief:Brief):string{
 return [brief.topic,brief.passage,brief.outcome,brief.terms,...Object.values(brief.knowledgeGroups||{})].filter(Boolean).join('\n');
}
export function idiomOrigins(name:string,brief:Brief){
 const teacher=[brief.topic,brief.outcome,brief.terms,...Object.values(brief.knowledgeGroups||{})].join('\n');
 return [teacher.includes(name)?'教师输入':'',brief.passage.includes(name)?'课文':''].filter(Boolean);
}
export function chooseIdiom(existing:Knowledge[],item:Knowledge,checked:boolean):Knowledge[]{
 return existing.some(node=>node.id===item.id)?existing.map(node=>node.id===item.id?{...node,role:checked?'核心':'排除'}:node):checked?[...existing,{...item,role:'核心'}]:existing;
}
