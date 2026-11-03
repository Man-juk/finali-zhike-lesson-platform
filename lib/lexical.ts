import {z} from 'zod';
export const lexicalCategories={pos:'词性',synonym:'同义关系',antonym:'反义词',wordFormation:'构词关系',cilin:'同义关系'} as const;
export const lexicalFeatureSchema=z.object({id:z.string().max(3000),category:z.enum(['pos','synonym','antonym','wordFormation','cilin']),value:z.string().max(300),detail:z.string().max(1000),relationType:z.string().max(100).optional(),direction:z.enum(['outgoing','incoming','property']).optional()});
export type LexicalFeature=z.infer<typeof lexicalFeatureSchema>;
export function lexicalSourceLabel(feature:LexicalFeature):string{
 return feature.category==='synonym'?'同近义关系':feature.category==='cilin'?'词林关系':'';
}
export function lexicalDisplayGroups(features:LexicalFeature[]){
 return Object.entries(lexicalCategories).filter(([category])=>category!=='cilin').map(([category,label])=>({category,label,features:features.filter(feature=>feature.category===category||(category==='synonym'&&feature.category==='cilin'))}));
}
export function lexicalFeature(category:LexicalFeature['category'],value:string,detail='',relationType='',direction:LexicalFeature['direction']='property'):LexicalFeature{
 const item={category,value:value.slice(0,300),detail:detail.slice(0,1000),relationType:relationType.slice(0,100),direction};
 return {...item,id:JSON.stringify([item.category,item.value,item.detail,item.relationType,item.direction])};
}
export function wordPropertyFeatures(properties:Record<string,unknown>):LexicalFeature[]{
 // Official schema (2026-10-25): Word.syntactic is displayed as “句法属性”.
 const keys=['syntactic','句法属性','pos','partOfSpeech','part_of_speech','词性'];
 const raw=keys.map(key=>properties[key]).find(value=>value!==undefined&&value!==null&&value!=='');
 const values=Array.isArray(raw)?raw:typeof raw==='string'?raw.split(/[、,，;；|]+/):[];
 return [...new Set(values.filter((v):v is string=>typeof v==='string').map(v=>v.trim()).filter(Boolean))].map(v=>lexicalFeature('pos',v));
}
// Only explicitly recognized relationship names are classified; unknown graph edges are not inferred.
export function lexicalRelationCategory(type:string):LexicalFeature['category']|null{
 const key=type.toUpperCase().replace(/[ -]/g,'_');
 if(['NEAR_SYNONYMOUS_WITH','SYNONYM','SYNONYMS','HAS_SYNONYM','IS_SYNONYM_OF','同近义','同近义关系','近义词','近义关系','近义','同义词','同义'].includes(key))return 'synonym';
 if(['ANTITHESIS_WITH','ANTONYM','ANTONYMS','HAS_ANTONYM','IS_ANTONYM_OF','反义词','反义关系','反义'].includes(key))return 'antonym';
 if(['COMPOSITION_COMPONENT','COMPOSED_OF','COMPRISES','HAS_COMPONENT','COMPONENT_OF','WORD_FORMATION','构词','构词关系','组成','构成'].includes(key))return 'wordFormation';
 if(['CILIN','词林','词林关系'].includes(key))return 'cilin';
 if(['HAS_POS','PART_OF_SPEECH','HAS_PART_OF_SPEECH','词性','属于词性'].includes(key))return 'pos';
 return null;
}
