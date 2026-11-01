/**
 * 轻量 .docx 生成器：直接写 OOXML 并用 store-only ZIP 打包。
 * 目的是零依赖地在本地生成可被 Word / WPS 打开的文档。
 */

// 正文档用宋体（思源宋体 / 系统衬线），标题同样衬线，与界面字体系统一致。
const FONT_BODY = '思源宋体';
const FONT_HEAD = '思源宋体';
const FONT_LATIN = 'Georgia';
// 文字与线条配色对齐界面：主文字 #1D1D1F、次级 #6E6E73、线条 #E8E8ED、强调蓝 #0071E3
const INK = '1D1D1F';
const MUTED = '6E6E73';
const LINE = 'E8E8ED';
const ACCENT = '0071E3';

export function esc(text) {
  return String(text ?? '')
    .replace(/「/g, '“')
    .replace(/」/g, '”')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // 去掉 XML 1.0 不允许的控制字符
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

const rFonts = (eastAsia = FONT_BODY, latin = FONT_LATIN) =>
  `<w:rFonts w:ascii="${latin}" w:hAnsi="${latin}" w:eastAsia="${eastAsia}" w:cs="${latin}"/>`;

function run(text, { bold = false, size = 28, color = INK, eastAsia = FONT_BODY, italic = false } = {}) {
  return (
    `<w:r><w:rPr>${rFonts(eastAsia)}${bold ? '<w:b/>' : ''}${italic ? '<w:i/>' : ''}` +
    `<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>` +
    `<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`
  );
}

function para(text, opts = {}) {
  const {
    bold = false,
    size = 28,
    color = INK,
    align = 'both',
    indent = true,
    before = 0,
    after = 90,
    line = 340,
    eastAsia = FONT_BODY,
  } = opts;
  const pPr =
    '<w:pPr>' +
    `<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>` +
    (indent ? '<w:ind w:firstLineChars="200" w:firstLine="420"/>' : '') +
    (align ? `<w:jc w:val="${align}"/>` : '') +
    '</w:pPr>';
  const lines = String(text ?? '').split('\n');
  return (
    `<w:p>${pPr}` +
    lines
      .map((line, i) => (i === 0 ? run(line, { bold, size, color, eastAsia }) : `<w:r><w:br/></w:r>${run(line, { bold, size, color, eastAsia })}`))
      .join('') +
    '</w:p>'
  );
}

function heading(text, level = 1) {
  const spec =
    level === 1
      ? { size: 28, before: 320, after: 160, color: INK, style: 'Heading1' }
      : level === 2
        ? { size: 24, before: 220, after: 120, color: INK, style: 'Heading2' }
        : { size: 22, before: 180, after: 100, color: INK, style: 'Heading3' };
  return (
    `<w:p><w:pPr><w:pStyle w:val="${spec.style}"/><w:keepNext/>` +
    `<w:spacing w:before="${spec.before}" w:after="${spec.after}" w:line="300" w:lineRule="auto"/></w:pPr>` +
    run(text, { bold: true, size: spec.size, color: spec.color, eastAsia: FONT_HEAD }) +
    '</w:p>'
  );
}

function title(text, subtitle) {
  const parts = [
    `<w:p><w:pPr><w:spacing w:before="240" w:after="80"/><w:jc w:val="center"/></w:pPr>` +
      run(text, { bold: true, size: 44, color: INK, eastAsia: FONT_HEAD }) +
      '</w:p>',
  ];
  if (subtitle) {
    parts.push(
      `<w:p><w:pPr><w:spacing w:after="200"/><w:jc w:val="center"/></w:pPr>` +
        run(subtitle, { size: 28, color: INK, eastAsia: FONT_HEAD }) +
        '</w:p>',
    );
  }
  parts.push(
    '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="6" w:color="E8E8ED"/></w:pBdr></w:pPr></w:p>',
  );
  return parts.join('');
}

function bullets(items, { indent = true } = {}) {
  return items
    .map(
      (item, i) =>
        `<w:p><w:pPr><w:spacing w:after="60" w:line="330" w:lineRule="auto"/>` +
        (indent ? '<w:ind w:leftChars="200" w:left="420" w:hangingChars="100" w:hanging="210"/>' : '') +
        `</w:pPr>${run(`${i + 1}. ${item}`)}</w:p>`,
    )
    .join('');
}

function cellParas(text, { bold = false, size = 28, color = INK, align = 'left' } = {}) {
  const lines = String(text ?? '').split('\n');
  return lines
    .map(
      (line) =>
        `<w:p><w:pPr><w:spacing w:before="20" w:after="20" w:line="280" w:lineRule="auto"/><w:jc w:val="${align}"/></w:pPr>` +
        run(line, { bold, size, color, eastAsia: FONT_HEAD }) +
        '</w:p>',
    )
    .join('');
}

/**
 * @param {string[]} headers
 * @param {string[][]} rows
 * @param {number[]} widths 单位 dxa（1/20 磅），总和约 9640
 */
function table(headers, rows, widths, opts = {}) {
  const { size = 28 } = opts;
  const border =
    '<w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
      .map((k) => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="${LINE}"/>`)
      .join('') +
    '</w:tblBorders>';
  const grid = widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('');
  const tr = (cells, { head = false, index = 0 } = {}) =>
    '<w:tr><w:trPr><w:cantSplit/>' +
    (head ? '<w:tblHeader/>' : '') +
    '</w:trPr>' +
    cells
      .map(
        (value, i) =>
          `<w:tc><w:tcPr><w:tcW w:w="${widths[i] || 1200}" w:type="dxa"/>` +
          '<w:vAlign w:val="center"/></w:tcPr>' +
          cellParas(value, { bold: head, size, align: head ? 'center' : 'left' }) +
          '</w:tc>',
      )
      .join('') +
    '</w:tr>';

  return (
    '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' +
    border +
    '<w:tblLayout w:type="fixed"/>' +
    '<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>' +
    '</w:tblPr><w:tblGrid>' +
    grid +
    '</w:tblGrid>' +
    tr(headers, { head: true }) +
    rows.map((row, i) => tr(row, { index: i })).join('') +
    '</w:tbl><w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>'
  );
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function spacer() {
  return '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>';
}

// ---------------- ZIP ----------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i += 1) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

/* UTF-8 编码：浏览器与 Node 通用，不依赖 Buffer */
function utf8(input) {
  const str = typeof input === 'string' ? input : new TextDecoder().decode(input);
  return new TextEncoder().encode(str);
}

/* 拼接字节块：浏览器与 Node 通用 */
function concat(chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

function zipStore(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const { time, date } = dosDateTime(new Date());

  for (const file of files) {
    const nameBuf = utf8(file.name);
    const data = utf8(file.data);
    const crc = crc32(data);

    const local = new Uint8Array(30);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBuf.length, true);
    lv.setUint16(28, 0, true);
    locals.push(local, nameBuf, data);

    const central = new Uint8Array(46);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBuf.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centrals.push(central, nameBuf);

    offset += 30 + nameBuf.length + data.length;
  }

  const centralBuf = concat(centrals);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralBuf.length, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return concat([...locals, centralBuf, eocd]);
}

function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

// ---------------- 组装 ----------------

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr>${rFonts()}<w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="90" w:line="340" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>
<w:pPr><w:spacing w:line="340" w:lineRule="auto"/></w:pPr><w:rPr>${rFonts()}<w:sz w:val="21"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/>
<w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr>${rFonts(FONT_HEAD)}<w:b/><w:sz w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/>
<w:pPr><w:keepNext/><w:outlineLvl w:val="1"/></w:pPr><w:rPr>${rFonts(FONT_HEAD)}<w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:qFormat/>
<w:pPr><w:keepNext/><w:outlineLvl w:val="2"/></w:pPr><w:rPr>${rFonts(FONT_HEAD)}<w:b/><w:sz w:val="22"/></w:rPr></w:style>
</w:styles>`;

/**
 * @param {{body:string, title:string, author?:string, subject?:string, keywords?:string}} options
 * @returns {Uint8Array}
 */
export function buildDocx({ body, title, author = '智课 Pro', subject = '', keywords = '' }) {
  const document =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>` +
    body +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1797" w:right="1797" w:bottom="1797" w:left="1797" w:header="851" w:footer="992" w:gutter="0"/>' +
    '<w:docGrid w:linePitch="312"/></w:sectPr></w:body></w:document>';

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(title)}</dc:title><dc:creator>${esc(author)}</dc:creator><cp:lastModifiedBy>${esc(author)}</cp:lastModifiedBy>
<dc:subject>${esc(subject)}</dc:subject><cp:keywords>${esc(keywords)}</cp:keywords>
<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified></cp:coreProperties>`;

  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Zhike Pro</Application><AppVersion>1.0</AppVersion></Properties>`;

  const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings ${NS}><w:zoom w:percent="100"/><w:defaultTabStop w:val="420"/><w:compat/></w:settings>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;

  return zipStore([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'docProps/core.xml', data: core },
    { name: 'docProps/app.xml', data: app },
    { name: 'word/document.xml', data: document },
    { name: 'word/styles.xml', data: STYLES },
    { name: 'word/settings.xml', data: settings },
    { name: 'word/_rels/document.xml.rels', data: docRels },
  ]);
}

export const D = { title, heading, para, bullets, table, pageBreak, spacer, run };
