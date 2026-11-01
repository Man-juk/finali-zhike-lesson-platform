'use client';
import { Download,ShieldCheck,AlertCircle,Check } from 'lucide-react';
import { standardNames,type Knowledge } from '@/lib/lesson';
import { exampleChoices,groundedBlocks } from '@/lib/evidence';
import { download } from '@/lib/export';
/**
 * 单个知识节点的三区块证据卡。
 *
 * 结构（自上而下，层级单一，不重复）：
 *   ① 图谱原始释义  —— 默认展开；多义项按「1. 2.」自动拆成有序列表
 *   ② 选择例句      —— 唯一勾选处，一行一条胶囊
 *   ③ 确认此词义    —— 莫兰迪绿主按钮，兼作「我已核对」的确认动作
 *
 * 底层逻辑（selectedMeaning / selectedExamples / scopeConfirmed 三个字段、
 * exampleChoices 解析、validateSelections 校验）完全沿用，未作改动。
 */

/** 列表渲染时剥掉文本自带的「1. 」序号，避免与 <ol> 的序号标记重复。 */
function stripSeq(s: string): string {
  return s.replace(/^\d{1,2}[.．]\s*/, '');
}

/** 把「1. … 2. …」这类多义项原文拆成独立条目；单条则原样返回。 */
function splitMeanings(raw: string): string[] {
  const text = (raw || '').trim();
  if (!text) return [];
  // 序号行：半角「1. 」必须跟空白（避免误切「1.5 公斤」）；
  // 全角「1．」不存在小数歧义，后面可跟空白或直接接中文。
  const SEQ = /^(\d{1,2})(?:[.]\s+|[.．]\s*(?=[\u4e00-\u9fff]))/;
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = '';
  let seq = 0;
  for (const line of lines) {
    const m = SEQ.exec(line);
    const num = m ? Number(m[1]) : NaN;
    // 序号必须从 1 开始并依次递增
    const isSeq = m != null && num === seq + 1;
    if (isSeq) {
      if (buf) out.push(buf);
      buf = line;
      seq = num;
    } else {
      buf += (buf ? '\n' : '') + line;
    }
  }
  if (buf) out.push(buf);
  // 拆出来的每一条都必须自带序号，否则整体视为一条释义
  const valid = out.every(s => SEQ.test(s));
  if (out.length <= 1 || !valid) return [text];
  return out;
}

export function EvidencePicker({item,onChange,standard}:{item:Knowledge;onChange:(k:Knowledge)=>void;standard?:string}){
 if(!item.verified)return <div className="source-warning"><AlertCircle size={15}/>{item.checkedAt?'本次未找到可用图谱条目。可更换名称；生成时将跳过此条。':'尚未查询。请点击上方“搜索图谱知识”，连接账号后检索。'}</div>;
 const examples=exampleChoices(item.rawExample??item.example);
 const rawMeaning=item.rawDetail??item.detail;
 const picked=item.selectedExamples?.length||0;
 const hasMeaning=!!(rawMeaning||'').trim();
 const hasExamples=examples.length>0;
 // 多义项拆分：>1 条渲染有序列表，单条走纯文本分支
 const meanings=splitMeanings(rawMeaning);
 const isList=meanings.length>1;
 // 按钮可点条件（放宽）：
 //   · 有例句时，至少勾选 1 条；图谱无释义也不卡住老师（底层校验本就放行空释义）。
 //   · 图谱无例句时，不再要求勾选，老师可直接确认。
 //   · 释义与例句都没有的节点，仍需老师显式勾选「已核对」才放行，避免误确认。
 const canConfirm=hasExamples?picked>0:(!hasMeaning?!!item.scopeConfirmed:true);
 // 「填入释义」按钮：仅在有原文可填时出现
 const canFill=hasMeaning;
 const stdName=standardNames[standard||item.evidence?.standard||'']||'';
 return (
 <div className="kb-card">
   {/* ---------- 区块 1：图谱原始释义 ---------- */}
   <section className="kb-block">
     <div className="kb-head">
       <h4 className="kb-title">图谱原始释义</h4>
       {item.levels.length>0&&<div className="kb-tags">{item.levels.map(l=><span className="kb-tag" key={l}>{stdName?stdName+' '+l:l}</span>)}</div>}
     </div>
     {hasMeaning
       ?(isList
         ?<ol className="kb-meaning-list">{meanings.map((m,i)=><li key={i}>{stripSeq(m)}</li>)}</ol>
         :<div className="kb-meaning" tabIndex={0}>{meanings[0]}</div>)
       :<div className="kb-meaning is-empty">此节点暂无释义</div>}
     {/* 弱化的义项编辑行：老师可裁剪为适合本课的原文片段 */}
     <label className="kb-edit">
       <span className="kb-edit-label">选定义项</span>
       <span className="kb-edit-field">
         <textarea
           aria-label={item.name+'选定义项'}
           rows={2}
           maxLength={2500}
           disabled={!canFill}
           value={item.selectedMeaning||''}
           placeholder={canFill?'可裁剪为适合本课的原文片段（须为原文连续片段）':'该节点无详细释义，可忽略此项'}
           onChange={e=>onChange({...item,selectedMeaning:e.target.value,scopeConfirmed:false})}
         />
         {canFill&&<button type="button" className="kb-fill" onClick={()=>onChange({...item,selectedMeaning:(item.selectedMeaning||rawMeaning).slice(0,2500),scopeConfirmed:false})} title="把上方释义填入下方">填入释义</button>}
       </span>
     </label>
   </section>

   {/* ---------- 区块 2：选择例句（唯一勾选处） ---------- */}
   <section className="kb-block">
     <div className="kb-head">
       <h4 className="kb-title">选择本课使用的例句</h4>
       <span className="kb-note">最多 5 条，不改写原句</span>
     </div>
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
       :<p className="kb-empty-note">该节点无关联例句，生成教案时将不包含此部分</p>}
   </section>

   {/* ---------- 区块 3：确认 ---------- */}
   <section className="kb-block kb-actions">
     <button
       className="kb-confirm"
       type="button"
       disabled={!canConfirm}
       onClick={()=>onChange({...item,selectedMeaning:(item.selectedMeaning||rawMeaning||'').slice(0,2500),selectedExamples:(item.selectedExamples||[]).slice(0,5),scopeConfirmed:true})}
     >
       确认此词义
     </button>
   </section>
 </div>
 )}
export function EvidenceView({knowledge}:{knowledge:Knowledge[]}){const blocks=groundedBlocks(knowledge);return <section className="evidence-view"><div className="source-banner"><ShieldCheck size={18}/><div><strong>图谱原文区 · 与 AI 设计分开保存</strong><p>以下原文由系统从查询结果中取出，模型不能修改。教师选定片段不等于原数据库绝对无误。</p></div></div>{blocks.length===0?<p className="helper">暂无已确认的图谱原文。请返回知识确认，重新核验并选定义项后生成。</p>:blocks.map(k=><article className="material evidence-block" key={k.knowledgeId}><h3>{k.name} <span className="badge verified">{k.kind} · {k.role}</span></h3><p>{k.meaning||'图谱未提供释义'}</p>{k.examples.map((s,i)=><div className="quoted-example" key={i}><blockquote>{s}</blockquote><button className="text-button" onClick={()=>sentenceCard(s,k.name,k.knowledgeId)}><Download size={14}/>例句图片</button></div>)}<small>来源：{k.source} · 节点：{k.knowledgeId}<br/>等级：{k.levels.join('、')||'当前体系未返回'} · 查询时间：{k.checkedAt}</small></article>)}</section>}
export async function sentenceCard(sentence:string,name:string,id:string){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)return;
 const fontFamily='"Noto Sans SC Variable","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
 // 等待自托管字体加载完成，避免 canvas 静默回落到系统字体
 try{if(document.fonts&&typeof document.fonts.load==='function')await Promise.all([document.fonts.load('42px "Noto Sans SC Variable"'),document.fonts.load('25px "Noto Sans SC Variable"')]);}catch{}
 canvas.width=1400;ctx.font='42px '+fontFamily;
 const lines:string[]=[];let line='';for(const char of Array.from(sentence)){if(char==='\n'||ctx.measureText(line+char).width>1180){lines.push(line);line=char==='\n'?'':char}else line+=char}if(line)lines.push(line);
 canvas.height=Math.max(480,250+lines.length*72);ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#3E6650';ctx.font='25px '+fontFamily;ctx.fillText('智课 · 图谱例句卡　'+name,110,85);ctx.fillStyle='#12211F';ctx.font='42px '+fontFamily;lines.forEach((s,i)=>ctx.fillText(s,110,180+i*72));ctx.font='19px '+fontFamily;ctx.fillStyle='#5A6B68';ctx.fillText('原句来源：国际中文教育知识图谱　'+id,110,canvas.height-55);canvas.toBlob(b=>{if(b)download(b,name+'-图谱例句.png')},'image/png');
}
