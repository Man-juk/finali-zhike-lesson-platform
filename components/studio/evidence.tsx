'use client';
import { Download,ShieldCheck,AlertCircle,Check } from 'lucide-react';
import { standardNames,type Knowledge } from '@/lib/lesson';
import {lexicalCategories,lexicalSourceLabel,lexicalDisplayGroups} from '@/lib/lexical';
import { exampleChoices,meaningChoices,groundedBlocks } from '@/lib/evidence';
import {GrammarQuestionPicker} from './grammar-questions';
import { download } from '@/lib/export';
/** 按图谱原始序号逐条选择释义，保留原文；未选择时由生成接口使用默认原文。 */
export function EvidencePicker({item,onChange,standard,searchHint}:{item:Knowledge;onChange:(k:Knowledge)=>void;standard?:string;searchHint?:string}){
 if(!item.verified)return <div className="source-warning"><AlertCircle size={15}/>{item.checkedAt?'本次未找到可用图谱条目。可更换名称；生成时将跳过此条。':searchHint||'尚未查询。请点击上方“搜索图谱”，连接账号后检索。'}</div>;
 const examples=exampleChoices(item.rawExample??item.example);
 const rawMeaning=item.rawDetail??item.detail;
 const syntax=item.kind==='Word'?[...new Set((item.lexicalFeatures||[]).filter(feature=>feature.category==='pos'&&feature.direction==='property').map(feature=>feature.value))]:[];
 const picked=item.selectedExamples?.length||0;
 const hasMeaning=!!(rawMeaning||'').trim();
 const hasExamples=examples.length>0;
 // 按原始编号拆分，兼容旧草稿中的整段释义选择。
 const meaningGroups=[{label:'',entries:meaningChoices(rawMeaning).map(value=>({text:value,value}))}];
 const meanings=meaningGroups.flatMap(group=>group.entries.map(entry=>entry.value));
 const chosen=item.selectedMeanings?.length?item.selectedMeanings:meanings.filter(meaning=>item.selectedMeaning===meaning||item.selectedMeaning?.trim()===rawMeaning.trim());
 // 按钮可点条件（放宽）：
 //   · 有例句时，至少勾选 1 条；图谱无释义也不卡住老师（底层校验本就放行空释义）。
 //   · 图谱无例句时，不再要求勾选，老师可直接确认。
 //   · 释义与例句都没有的节点，仍需老师显式勾选「已核对」才放行，避免误确认。
 const canConfirm=item.kind==='Grammar'||(hasExamples?picked>0:(!hasMeaning?!!item.scopeConfirmed:true));


 const stdName=standardNames[standard||item.evidence?.standard||'']||'';
 return (
 <div className="kb-card">
   {/* ---------- 区块 1：图谱原始释义 ---------- */}
   <section className="kb-block">
     <div className="kb-head">
       <h4 className="kb-title">{item.kind==='Grammar'?'图谱语法内容':'图谱原始释义'}</h4>
       {item.levels.length>0&&<div className="kb-tags">{item.levels.map(l=><span className="kb-tag" key={l}>{stdName?stdName+' '+l:l}</span>)}</div>}
     </div>
     {syntax.length>0&&<p className="kb-syntax"><span>句法属性</span>{syntax.map(value=><strong className="kb-tag" key={value}>{value}</strong>)}</p>}
     {item.kind==='Grammar'?<><div className="kb-meaning kb-character-original">{rawMeaning||'图谱未提供语法内容'}</div><p className="kb-note">语法内容自动作为教学参考，无需选择释义。</p></>:item.kind==='Character'?<>
      <div className="kb-meaning kb-character-original">{rawMeaning||'此节点暂无释义'}</div>
      <label className="field kb-character-input">本课讲解释义（选填）
       <textarea aria-label={item.name+'本课讲解释义'} rows={4} maxLength={2500} value={item.characterTeachingMeaning||''} onChange={event=>onChange({...item,characterTeachingMeaning:event.target.value,selectedMeanings:[],selectedMeaning:'',scopeConfirmed:false})} placeholder="请填写本课希望讲解的释义，可参考上方图谱原文。留空则自动使用图谱释义。"/>
      </label>
      <p className="kb-note">输入内容作为教师指定释义保存，与图谱原文分别保留。</p>
     </>:<><p className="kb-note">按图谱原有序号分条，可多选；不选时自动使用图谱释义。</p>
     {hasMeaning?<div className="kb-meaning-groups">{meaningGroups.map((group,groupIndex)=><section className="kb-meaning-group" key={groupIndex}>{group.label&&<h5>{group.label}</h5>}<ul className="kb-meaning-choices">{group.entries.map(({text,value:meaning},index)=>{
      const checked=chosen.includes(meaning);
      const next=meanings.filter(value=>value===meaning?!checked:chosen.includes(value));
      const tooLong=next.join('\n').length>2500||next.length>20;
      return <li key={index}><label className={'kb-example'+(checked?' is-on':'')}><input type="checkbox" checked={checked} disabled={!checked&&tooLong} onChange={()=>onChange({...item,selectedMeanings:next,selectedMeaning:next.join('\n'),scopeConfirmed:false})}/><span className="kb-check" aria-hidden="true">{checked&&<Check size={12}/>}</span><span className="kb-example-text">{text}</span></label></li>;
     })}</ul></section>)}</div>:<div className="kb-meaning is-empty">此节点暂无释义</div>}</>}
   </section>

   {item.kind==='Idiom'&&(item.idiomAllusion||item.idiomSource||item.idiomFeeling)&&<section className="kb-block"><h4 className="kb-title">图谱成语资料</h4>{item.idiomSource&&<p className="helper">出处：{item.idiomSource}</p>}{item.idiomFeeling&&<p className="helper">感情色彩：{item.idiomFeeling}</p>}{item.idiomAllusion&&<details><summary>查看图谱典故</summary><p className="kb-character-original">{item.idiomAllusion}</p></details>}</section>}
   {/* ---------- 区块 2：选择例句（唯一勾选处） ---------- */}
   <section className="kb-block">
     <div className="kb-head">
       <h4 className="kb-title">{item.kind==='Grammar'?'选择图谱补充例句（选填）':'选择本课使用的例句'}</h4>
       <span className="kb-note">最多 5 条，不改写原句</span>
     </div>
     {item.kind==='Grammar'&&<p className="kb-note">可不勾选；无论是否选择图谱例句，生成教案时都会结合课文原句分析本课语法。课文中没有相应用法时，不强行编造。</p>}
     {examples.length
       ?<ul className="kb-examples">{examples.map((sentence,i)=>{
          const on=item.selectedExamples?.includes(sentence)||false;
          const full=picked>=5&&!on;
          return (
           <li key={i}>
            <label className={'kb-example'+(on?' is-on':'')+(full?' is-off':'')}>
              <input
                type="checkbox"
                checked={on}
                disabled={full}
                onChange={e=>onChange({...item,selectedExamples:e.target.checked?[...(item.selectedExamples||[]),sentence]:(item.selectedExamples||[]).filter(x=>x!==sentence),scopeConfirmed:false})}
              />
              <span className="kb-check" aria-hidden="true">{on&&<Check size={12}/>}</span>
              <span className="kb-example-text">{sentence}</span>
            </label>
           </li>
          );
         })}</ul>
       :<p className="kb-empty-note">{item.kind==='Grammar'?'图谱未返回补充例句，生成时仍会参考用户提供的课文。':'该节点无关联例句，生成教案时将不包含此部分'}</p>}
   </section>

   {item.kind==='Word'&&<section className="kb-block lexical-block"><h4 className="kb-title">词汇扩展信息</h4><p className="kb-note">点开查看，勾选后加入教案（最多 40 项）。也可直接生成，系统会使用当前选择。</p>{item.lexicalStatus==='unavailable'&&<p role="status" className="helper">词汇关系暂时无法获取或无访问权限；已返回的词性仍可选择。可稍后重新搜索。</p>}{item.lexicalStatus==='truncated'&&<p className="helper">图谱返回已达上限，当前仅显示部分关系。</p>}{lexicalDisplayGroups(item.lexicalFeatures||[]).map(({category,label,features})=><details className="lexical-details" key={category}><summary>{label}<span>{features.length} 项 · 已选 {features.filter(f=>item.selectedFeatureIds?.includes(f.id)).length} 项</span></summary>{features.length?<div className="lexical-options">{features.map(f=>{const checked=item.selectedFeatureIds?.includes(f.id)||false;return <label className="lexical-option" key={f.id}><div className="lexical-option-row"><input type="checkbox" checked={checked} disabled={!checked&&(item.selectedFeatureIds?.length||0)>=40} onChange={e=>onChange({...item,selectedFeatureIds:e.target.checked?[...(item.selectedFeatureIds||[]),f.id]:(item.selectedFeatureIds||[]).filter(id=>id!==f.id),scopeConfirmed:false})}/><span className="lexical-option-body"><strong>{f.value}</strong>{lexicalSourceLabel(f)&&<small>查询来源：{lexicalSourceLabel(f)}</small>}{f.relationType&&<small>{f.direction==='incoming'?f.value+' → '+item.name:item.name+' → '+f.value} · 图谱关系：{f.relationType}</small>}{f.detail&&<small>{f.detail}</small>}</span></div></label>})}</div>:<p className="kb-empty-note">{item.lexicalStatus==='unavailable'&&category!=='pos'?'本次未能获取该类关系。':item.lexicalStatus?'图谱本次未返回此类信息。':'此草稿尚未查询扩展信息，请重新搜索图谱。'}</p>}</details>)}</section>}
   <GrammarQuestionPicker item={item} onChange={onChange}/>
   {/* ---------- 区块 3：确认 ---------- */}
   <section className="kb-block kb-actions">
     <button
       className="kb-confirm"
       type="button"
       disabled={!canConfirm}
       onClick={()=>onChange({...item,selectedMeaning:(item.selectedMeaning||rawMeaning||'').slice(0,2500),selectedExamples:(item.selectedExamples||[]).slice(0,5),scopeConfirmed:true})}
     >
       {item.scopeConfirmed?<><Check size={14}/>已确认本课选择</>:item.kind==='Grammar'?'确认本课选择':'确认此词义'}
     </button>
     <span className="kb-note" role="status">{item.scopeConfirmed?'已确认，可生成教案。':'可直接生成并自动匹配；确认后将按本课选择生成。'}</span>
   </section>
 </div>
 )}
export function EvidenceView({knowledge}:{knowledge:Knowledge[]}){const blocks=groundedBlocks(knowledge);return <section className="evidence-view"><div className="source-banner"><ShieldCheck size={18}/><div><strong>图谱原文区 · 与 AI 设计分开保存</strong><p>以下原文由系统从查询结果中取出，模型不能修改。教师选定片段不等于原数据库绝对无误。</p></div></div>{blocks.length===0?<p className="helper">暂无已确认的图谱原文。请返回知识确认，重新核验并选定义项后生成。</p>:blocks.map(k=><article className="material evidence-block" key={k.knowledgeId}><h3>{k.name} <span className="badge verified">{k.kind} · {k.role}</span></h3><p>{k.meaning||'图谱未提供释义'}</p>{k.teacherMeaning&&<div className="source-warning"><div><strong>教师指定讲解释义</strong><p>{k.teacherMeaning}</p></div></div>}{k.examples.map((s,i)=><div className="quoted-example" key={i}><blockquote>{s}</blockquote><button className="text-button" onClick={()=>sentenceCard(s,k.name,k.knowledgeId)}><Download size={14}/>例句图片</button></div>)}{k.lexicalFeatures.length>0&&<div className="lexical-selected"><strong>已选入教案的词汇扩展</strong>{k.lexicalFeatures.map(f=><p key={f.id}>{lexicalCategories[f.category]}：{f.value}{f.relationType&&'（'+(f.direction==='incoming'?f.value+' → '+k.name:k.name+' → '+f.value)+'；'+f.relationType+'）'}{f.detail&&'；'+f.detail}{lexicalSourceLabel(f)&&'；查询来源：'+lexicalSourceLabel(f)}</p>)}</div>}<small>来源：{k.source} · 节点：{k.knowledgeId}<br/>等级：{k.levels.join('、')||'当前体系未返回'} · 查询时间：{k.checkedAt}</small></article>)}</section>}
export async function sentenceCard(sentence:string,name:string,id:string){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)return;
 const fontFamily='"Noto Sans SC Variable","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
 // 等待自托管字体加载完成，避免 canvas 静默回落到系统字体
 try{if(document.fonts&&typeof document.fonts.load==='function')await Promise.all([document.fonts.load('42px "Noto Sans SC Variable"'),document.fonts.load('25px "Noto Sans SC Variable"')]);}catch{}
 canvas.width=1400;ctx.font='42px '+fontFamily;
 const lines:string[]=[];let line='';for(const char of Array.from(sentence)){if(char==='\n'||ctx.measureText(line+char).width>1180){lines.push(line);line=char==='\n'?'':char}else line+=char}if(line)lines.push(line);
 canvas.height=Math.max(480,250+lines.length*72);ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#3E6650';ctx.font='25px '+fontFamily;ctx.fillText('智课 · 图谱例句卡　'+name,110,85);ctx.fillStyle='#12211F';ctx.font='42px '+fontFamily;lines.forEach((s,i)=>ctx.fillText(s,110,180+i*72));ctx.font='19px '+fontFamily;ctx.fillStyle='#5A6B68';ctx.fillText('原句来源：国际中文教育知识图谱　'+id,110,canvas.height-55);canvas.toBlob(b=>{if(b)download(b,name+'-图谱例句.png')},'image/png');
}
