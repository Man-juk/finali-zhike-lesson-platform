const NAMED_ENTITIES:Record<string,string>={
 amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',
 agrave:'à',aacute:'á',acirc:'â',atilde:'ã',auml:'ä',
 Agrave:'À',Aacute:'Á',Acirc:'Â',Atilde:'Ã',Auml:'Ä',
 egrave:'è',eacute:'é',ecirc:'ê',euml:'ë',
 Egrave:'È',Eacute:'É',Ecirc:'Ê',Euml:'Ë',
 igrave:'ì',iacute:'í',icirc:'î',iuml:'ï',
 Igrave:'Ì',Iacute:'Í',Icirc:'Î',Iuml:'Ï',
 ograve:'ò',oacute:'ó',ocirc:'ô',otilde:'õ',ouml:'ö',
 Ograve:'Ò',Oacute:'Ó',Ocirc:'Ô',Otilde:'Õ',Ouml:'Ö',
 ugrave:'ù',uacute:'ú',ucirc:'û',uuml:'ü',
 Ugrave:'Ù',Uacute:'Ú',Ucirc:'Û',Uuml:'Ü',
};

/** 解码图谱题目里常见的 HTML 实体（如 &agrave;），避免页面上出现乱码。 */
export function decodeHtmlEntities(raw:string):string{
 if(!raw)return '';
 let text=raw;
 text=text.replace(/&#x([0-9a-f]+);/gi,(_,hex)=>{const cp=parseInt(hex,16);return Number.isFinite(cp)?String.fromCodePoint(cp):_});
 text=text.replace(/&#(\d+);/g,(_,dec)=>{const cp=parseInt(dec,10);return Number.isFinite(cp)?String.fromCodePoint(cp):_});
 text=text.replace(/&([a-zA-Z]+);/g,(entity,name)=>NAMED_ENTITIES[name]??entity);
 if(typeof document!=='undefined'){
  const ta=document.createElement('textarea');
  ta.innerHTML=text;
  text=ta.value;
 }
 return text.replace(/\uFFFD+/g,'').trim();
}
