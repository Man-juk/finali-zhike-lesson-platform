'use client';
import {knowledgeColumns,getKnowledgeGroups,type Brief,type KnowledgeGroups} from '@/lib/lesson';
export default function KnowledgeFields({brief,onChange}:{brief:Brief;onChange:(groups:KnowledgeGroups)=>void}){
 const groups=getKnowledgeGroups(brief);
 return <fieldset className="knowledge-fields"><legend>指定知识点（选填）</legend><p className="helper">留空时，系统根据主题、课文和预期成果自动提取知识点。每栏可用顿号、逗号或换行分隔多个内容。汉字、词汇、语法用于图谱检索；文化和其他作为教师指定的教学需求，相关事实需教师核验。</p><div className="knowledge-fields-grid">{knowledgeColumns.map(({key,label,example})=><label className="field" key={key}>{label}<textarea rows={3} maxLength={1200} value={groups[key]} onChange={e=>onChange({...groups,[key]:e.target.value})} placeholder={'例如：'+example}/></label>)}</div></fieldset>;
}
