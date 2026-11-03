import type {Knowledge} from './lesson';
import {grammarQuestion} from './grammar-data';
import {kg,AppError} from './server';
// LIMIT is inside the subquery: three per grammar node, not three across the whole result.
export const grammarQuestionQuery='MATCH (n:Grammar) WHERE n.name IN $terms CALL { WITH n MATCH (n)<-[:QUESTION_GRAMMAR]-(q:Question) RETURN q ORDER BY q.id, q.name LIMIT 3 } RETURN n, q LIMIT $limit';
export async function enrichGrammarQuestions(token:string,knowledge:Knowledge[]){
 const grammars=knowledge.filter(item=>item.kind==='Grammar');if(!grammars.length)return;
 const terms=[...new Set(grammars.map(item=>item.name))],limit=grammars.length*3;
 try{
  const data=await kg('intelligent/execute-cypher',{cypher:grammarQuestionQuery,parameters:{terms,limit},limit},token);
  if(!Array.isArray(data.records))throw new Error('Invalid grammar question records');
  for(const item of grammars){item.grammarQuestions=[];item.grammarQuestionStatus='available';item.evidence?.queries.push(grammarQuestionQuery)}
  for(const row of data.records){
   const n=row.n?.properties||row.n?.data||row.n||{},question=row.q&&grammarQuestion(row.q);
   if(!question)continue;
   for(const item of grammars.filter(item=>item.name===n.name&&(n.id===undefined||item.id==='Grammar:'+n.id))){
    if(item.grammarQuestions!.length<3&&!item.grammarQuestions!.some(existing=>existing.id===question.id))item.grammarQuestions!.push(question);
   }
  }
 }catch(error){if(error instanceof AppError&&error.status===401)throw error;for(const item of grammars){item.grammarQuestions=[];item.grammarQuestionStatus='unavailable'}}
}
