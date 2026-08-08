(function(){
"use strict";

const NUM_ANEXOS = 5;
const DEFAULT_DESCRIPTIONS = [
  `Controlé el acceso de los usuarios en los embarques del sistema de
transporte y optimicé la fluidez en las intersecciones de las vías cercanas por
donde transitan las unidades de los corredores complementarios, COSAC I y/o
AERODIRECTO.`,
  `Verifiqué y monitoreé
la operatividad en las instalaciones del COSAC I, Corredores Complementarios y/o
AERODIRECTO, tales como estaciones, patios, terminales y paraderos que forman
parte del sistema de transporte.`,
  `Organicé
los implementos viales en las instalaciones y/o vías del COSAC I, Corredores Complementarios
y/o AERODIRECTO durante la prestación del servicio del sistema de transporte.`,
  `Comuniqué sobre las
incidencias y/o eventos presentados durante la operación del sistema de
transporte.`,
  `Notifiqué
al centro de control las situaciones presentadas durante la operación de los
Corredores Complementarios, COSAC I y/o AERODIRECTO que ocasionen retrasos,
incumplimientos de programación, desvíos, buses averiados y otra información
relevante.`
];

const state = Array.from({length:NUM_ANEXOS}, (_,i) => ({ images:[null,null], description: DEFAULT_DESCRIPTIONS[i] || '' }));
let activeTarget = null; // {anexo, slot}

const container = document.getElementById('anexosContainer');
const statusText = document.getElementById('statusText');
const generateBtn = document.getElementById('generateBtn');
const generateLabel = document.getElementById('generateLabel');
const progressPill = document.getElementById('progressPill');

function slotPlaceholderHTML(){
  return `
      <div class="slot-placeholder">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <rect x="3" y="5" width="18" height="14" rx="2"/>
          <circle cx="8.5" cy="10.5" r="1.6"/>
          <path d="M21 16l-5.5-5.5a2 2 0 0 0-2.8 0L3 19"/>
        </svg>
        <span>Toca, arrastra o pega (Ctrl+V) una foto</span>
        <span class="hint">JPG o PNG</span>
      </div>`;
}

for(let i=0;i<NUM_ANEXOS;i++){
  const card = document.createElement('section');
  card.className = 'anexo-card';
  card.innerHTML = `
      <div class="anexo-head">
        <span class="anexo-num">ANEXO ${i+1}</span>
        <span class="anexo-title">Ficha ${i+1}</span>
        <span class="anexo-status" data-status="${i}">incompleto</span>
      </div>
      <div class="images-row">
        <div class="image-slot" data-anexo="${i}" data-slot="0">${slotPlaceholderHTML()}</div>
        <div class="image-slot" data-anexo="${i}" data-slot="1">${slotPlaceholderHTML()}</div>
      </div>
      <div class="desc-wrap">
        <label>Descripción</label>
        <textarea class="desc-input" data-anexo="${i}" placeholder="Describe la actividad realizada en este anexo..."></textarea>
      </div>
      <input type="file" accept="image/*" data-anexo="${i}" data-slot="0" class="file-input">
      <input type="file" accept="image/*" data-anexo="${i}" data-slot="1" class="file-input">
    `;
  container.appendChild(card);
  // populate textarea with default description (editable)
  const ta = card.querySelector('.desc-input');
  if(ta) ta.value = state[i].description;
}

container.querySelectorAll('.image-slot').forEach(slot => {
  const aIdx = +slot.dataset.anexo, sIdx = +slot.dataset.slot;
  const fileInput = container.querySelector(`.file-input[data-anexo="${aIdx}"][data-slot="${sIdx}"]`);

  slot.addEventListener('click', (e) => {
    if(e.target.closest('.slot-delete')) return;
    setActiveTarget(aIdx, sIdx);
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if(fileInput.files && fileInput.files[0]){
      handleFile(fileInput.files[0], aIdx, sIdx);
    }
    fileInput.value = '';
  });

  slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('dragover'); });
  slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));
  slot.addEventListener('drop', (e) => {
    e.preventDefault();
    slot.classList.remove('dragover');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if(file && file.type.startsWith('image/')){
      setActiveTarget(aIdx, sIdx);
      handleFile(file, aIdx, sIdx);
    }
  });
});

container.querySelectorAll('.desc-input').forEach(ta => {
  ta.addEventListener('input', () => {
    state[+ta.dataset.anexo].description = ta.value;
    updateProgress();
  });
  ta.addEventListener('focus', () => setActiveTarget(+ta.dataset.anexo, null));
});

function setActiveTarget(anexo, slot){
  activeTarget = { anexo, slot };
  document.querySelectorAll('.image-slot').forEach(s => s.classList.remove('active-target'));
  if(slot === 0 || slot === 1){
    const el = container.querySelector(`.image-slot[data-anexo="${anexo}"][data-slot="${slot}"]`);
    if(el) el.classList.add('active-target');
  }
}

function loadAndCompress(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        const maxDim = 1600;
        if(Math.max(w,h) > maxDim){
          const scale = maxDim / Math.max(w,h);
          w = Math.round(w*scale); h = Math.round(h*scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ dataUrl, width:w, height:h });
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

async function handleFile(file, anexoIdx, slotIdx){
  if(!file.type.startsWith('image/')){
    flashStatus('Ese archivo no es una imagen.', true);
    return;
  }
  try{
    const result = await loadAndCompress(file);
    state[anexoIdx].images[slotIdx] = result;
    renderSlot(anexoIdx, slotIdx);
    updateProgress();
  }catch(err){
    flashStatus('No se pudo cargar la imagen.', true);
  }
}

function renderSlot(anexoIdx, slotIdx){
  const slot = container.querySelector(`.image-slot[data-anexo="${anexoIdx}"][data-slot="${slotIdx}"]`);
  const data = state[anexoIdx].images[slotIdx];
  if(!data){
    slot.classList.remove('filled');
    slot.innerHTML = slotPlaceholderHTML();
    return;
  }
  slot.classList.add('filled');
  slot.innerHTML = `
      <img src="${data.dataUrl}" alt="Foto anexo ${anexoIdx+1}">
      <button type="button" class="slot-delete" title="Eliminar imagen">&times;</button>
      <div class="slot-replace-hint">Toca para reemplazar</div>
    `;
  slot.querySelector('.slot-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    state[anexoIdx].images[slotIdx] = null;
    renderSlot(anexoIdx, slotIdx);
    updateProgress();
  });
}

document.addEventListener('paste', (e) => {
  const items = (e.clipboardData && e.clipboardData.items) || [];
  let imageItem = null;
  for(const it of items){
    if(it.type && it.type.startsWith('image/')){ imageItem = it; break; }
  }
  if(!imageItem) return;
  e.preventDefault();
  const file = imageItem.getAsFile();
  if(!file) return;

  let target = activeTarget && (activeTarget.slot === 0 || activeTarget.slot === 1) ? activeTarget : null;
  if(!target){
    outer:
    for(let i=0;i<NUM_ANEXOS;i++){
      for(let s=0;s<2;s++){
        if(!state[i].images[s]){ target = { anexo:i, slot:s }; break outer; }
      }
    }
  }
  if(!target){
    flashStatus('Todos los espacios de imagen ya están llenos.', true);
    return;
  }
  setActiveTarget(target.anexo, target.slot);
  handleFile(file, target.anexo, target.slot);
});

function updateProgress(){
  let complete = 0;
  for(let i=0;i<NUM_ANEXOS;i++){
    const st = state[i];
    const done = st.images[0] && st.images[1] && st.description.trim().length > 0;
    const label = container.querySelector(`.anexo-status[data-status="${i}"]`);
    if(done){ complete++; label.textContent = 'completo'; label.classList.add('complete'); }
    else{ label.textContent = 'incompleto'; label.classList.remove('complete'); }
  }
  progressPill.textContent = `${complete}/${NUM_ANEXOS} completos`;
}

function flashStatus(msg, isError){
  statusText.textContent = msg;
  statusText.classList.toggle('error', !!isError);
}

function escXml(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function fitBox(w, h, maxW, maxH){
  const r = Math.min(maxW / w, maxH / h);
  return { w: Math.round(w * r), h: Math.round(h * r) };
}

async function buildDocxBlob(anexos){
  const EMU_PER_INCH = 914400;
  const pageW = 11906, pageH = 16838, margin = 720; // margen estrecho ~0.5 pulg
  const contentWidth = pageW - margin * 2;

  let relCounter = 1, picId = 1;
  const rels = [];
  const media = [];

  function addImageRel(base64Data){
    const id = 'rId' + (relCounter++);
    const name = `image${media.length + 1}.jpeg`;
    media.push({ name, base64: base64Data });
    rels.push({ id, target: `media/${name}` });
    return id;
  }

  function imageRunXML(rId, cx, cy){
    const id = picId++;
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="${cx}" cy="${cy}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="${id}" name="Picture ${id}"/>
        <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
        <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic>
            <pic:nvPicPr><pic:cNvPr id="${id}" name="Picture ${id}"/><pic:cNvPicPr/></pic:nvPicPr>
            <pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
            <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
          </pic:pic>
        </a:graphicData></a:graphic>
      </wp:inline></w:drawing></w:r>`;
  }

  function buildAnexoXML(n, images, description, isFirst){
    let xml = '';
    if(isFirst){
      xml += `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>ANEXOS</w:t></w:r></w:p><w:p/>`;
    }
    xml += `<w:p><w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>${escXml('ANEXO ' + n)}</w:t></w:r></w:p>`;

    const colW = contentWidth;
    const gutter = images.length === 2 ? 200 : 0;
    const imgColW = images.length === 2 ? Math.floor((contentWidth - gutter) / 2) : (contentWidth - 240);
    const maxImgWidthEMU = Math.floor(imgColW * 635 * 0.92);
    const maxImgHeightEMU = Math.round(3.0 * EMU_PER_INCH);

    let innerTableXML = '';
    if(images.length > 0){
      let cellsXML = '';
      images.forEach(img => {
        const fit = fitBox(img.width, img.height, maxImgWidthEMU, maxImgHeightEMU);
        cellsXML += `<w:tc><w:tcPr><w:tcW w:w="${imgColW}" w:type="dxa"/><w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${imageRunXML(img.rId, fit.w, fit.h)}</w:p></w:tc>`;
      });
      const gridCols = images.map(() => `<w:gridCol w:w="${imgColW}"/>`).join('');
      innerTableXML = `<w:tbl>
          <w:tblPr><w:tblW w:w="${contentWidth - gutter}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>
            <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          </w:tblBorders></w:tblPr>
          <w:tblGrid>${gridCols}</w:tblGrid>
          <w:tr>${cellsXML}</w:tr>
        </w:tbl><w:p/>`;
    }

    const descLines = String(description || '').split(/\r?\n/);
    let descParaRuns = `<w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>DESCRIPCIÓN:</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>`;
    descParaRuns += descLines.map((line, idx) => idx === 0
      ? `<w:r><w:t xml:space="preserve">${escXml(line)}</w:t></w:r>`
      : `<w:r><w:br/><w:t xml:space="preserve">${escXml(line)}</w:t></w:r>`
    ).join('');

    const descPara = `<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="000000"/></w:pBdr><w:jc w:val="both"/></w:pPr>${descParaRuns}</w:p>`;

    const outerTable = `<w:tbl>
        <w:tblPr><w:tblW w:w="${colW}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        </w:tblBorders></w:tblPr>
        <w:tblGrid><w:gridCol w:w="${colW}" w:type="dxa"/></w:tblGrid>
        <w:tr><w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr></w:p>
          ${innerTableXML}
          ${descPara}
        </w:tc></w:tr>
      </w:tbl>`;

    xml += outerTable;
    xml += `<w:p/>`;
    if(n < NUM_ANEXOS && n % 2 === 0) xml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    return xml;
  }

  let bodyXML = '';
  for(let i=0;i<anexos.length;i++){
    const a = anexos[i];
    const images = [];
    a.images.forEach(im => {
      if(!im) return;
      const base64 = im.dataUrl.split(',')[1];
      const rId = addImageRel(base64);
      images.push({ rId, width: im.width, height: im.height });
    });
    bodyXML += buildAnexoXML(i + 1, images, a.description, i === 0);
  }

  const sectPr = `<w:sectPr><w:pgSz w:w="${pageW}" w:h="${pageH}"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;

  const documentXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXML}
    ${sectPr}
  </w:body>
</w:document>`;

  const contentTypesXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rootRelsXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${rels.map(r => `<Relationship Id="${r.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${r.target}"/>`).join('\n  ')}
</Relationships>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXML);
  zip.folder('_rels').file('.rels', rootRelsXML);
  const wordFolder = zip.folder('word');
  wordFolder.file('document.xml', documentXML);
  wordFolder.folder('_rels').file('document.xml.rels', docRelsXML);
  const mediaFolder = wordFolder.folder('media');
  media.forEach(m => mediaFolder.file(m.name, m.base64, { base64: true }));

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

function buildPdfBlob(anexos){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210, pageH = 297, margin = 10; // margen estrecho
  const contentW = pageW - margin * 2;
  const blockGap = 10;
  const headerHeight = 15;
  const availableHeight = pageH - margin * 2 - headerHeight;
  const blockHeight = Math.round((availableHeight - blockGap) / 2);

  function drawAnexoBlock(a, number, x, y, width, height, includeHeader){
    const boxInnerX = x + 5;
    const boxInnerW = width - 10;
    let cursorY = y + 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`ANEXO ${number}`, boxInnerX, cursorY);
    const headingW = doc.getTextWidth(`ANEXO ${number}`);
    doc.setLineWidth(0.25);
    doc.line(boxInnerX, cursorY + 1, boxInnerX + headingW, cursorY + 1);
    cursorY += 7;

    const imgs = a.images.filter(Boolean);
    if(imgs.length){
      const gap = 6;
      const perW = imgs.length === 2 ? (boxInnerW - gap) / 2 : boxInnerW;
      const maxH = Math.min(70, height * 0.4);
      const placed = imgs.map(img => {
        const scale = Math.min(perW / img.width, maxH / img.height);
        return { img, w: img.width * scale, h: img.height * scale };
      });
      const rowH = Math.max(...placed.map(p => p.h));
      let xCursor = boxInnerX;
      placed.forEach(p => {
        const xOff = xCursor + (perW - p.w) / 2;
        const yOff = cursorY + (rowH - p.h) / 2;
        doc.addImage(p.img.dataUrl, 'JPEG', xOff, yOff, p.w, p.h);
        xCursor += perW + gap;
      });
      cursorY += rowH + 5;
      doc.setLineWidth(0.2);
      doc.line(boxInnerX, cursorY, boxInnerX + boxInnerW, cursorY);
      cursorY += 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const label = 'DESCRIPCIÓN:';
    doc.text(label, boxInnerX, cursorY);
    const lw = doc.getTextWidth(label);
    doc.setLineWidth(0.2);
    doc.line(boxInnerX, cursorY + 1, boxInnerX + lw, cursorY + 1);
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const descText = (a.description || '').trim() || '—';
    const lines = doc.splitTextToSize(descText, boxInnerW);
    lines.forEach(line => {
      doc.text(line, boxInnerX, cursorY);
      cursorY += 5;
    });

    cursorY += 8;
    const boxBottom = Math.min(y + height - 4, cursorY);
    doc.setLineWidth(0.3);
    doc.rect(x, y, width, boxBottom - y);
  }

  const pages = [];
  for(let i=0;i<anexos.length;i += 2){
    pages.push(anexos.slice(i, i + 2));
  }

  pages.forEach((pageAnexos, pageIndex) => {
    if(pageIndex > 0) doc.addPage();
    let y = margin;
    if(pageIndex === 0){
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
      doc.text('ANEXOS', pageW / 2, y, { align: 'center' });
      y += headerHeight;
    }
    const blockH = pageAnexos.length === 2 ? blockHeight : availableHeight;
    pageAnexos.forEach((a, idx) => {
      drawAnexoBlock(a, pageIndex * 2 + idx + 1, margin, y, contentW, blockH, pageIndex === 0 && idx === 0);
      if(idx === 0 && pageAnexos.length === 2) y += blockH + blockGap;
    });
  });

  return doc.output('blob');
}

function sanitizeFileName(value){
  return value.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function collectWarnings(){
  const missing = [];
  for(let i=0;i<NUM_ANEXOS;i++){
    const st = state[i];
    const missingImgs = st.images.filter(x => !x).length;
    const missingDesc = st.description.trim().length === 0;
    if(missingImgs > 0 || missingDesc){
      const parts = [];
      if(missingImgs > 0) parts.push(`${missingImgs} foto(s)`);
      if(missingDesc) parts.push('descripción');
      missing.push(`Anexo ${i+1}: falta ${parts.join(' y ')}`);
    }
  }
  return missing;
}

generateBtn.addEventListener('click', async () => {
  const warnings = collectWarnings();
  if(warnings.length){
    const proceed = confirm(
      'Algunos anexos están incompletos:\n\n' + warnings.join('\n') +
      '\n\n¿Deseas generar los documentos de todas formas?'
    );
    if(!proceed) return;
  }

  generateBtn.disabled = true;
  generateBtn.classList.add('loading');
  generateLabel.textContent = 'Generando...';
  flashStatus('Generando el Word y el PDF, esto puede tardar unos segundos...', false);

  try{
    const fileNamePrompt = prompt('Ingresa el nombre base para los archivos:', 'Anexos');
    if(fileNamePrompt === null) {
      generateBtn.disabled = false;
      generateBtn.classList.remove('loading');
      generateLabel.textContent = 'Generar documentos (.docx + .pdf)';
      flashStatus('Descarga cancelada.', false);
      return;
    }
    const baseName = sanitizeFileName(fileNamePrompt.trim() || 'Anexos');
    const [docxBlob, pdfBlob] = await Promise.all([
      buildDocxBlob(state),
      Promise.resolve().then(() => buildPdfBlob(state))
    ]);
    downloadBlob(docxBlob, `${baseName}.docx`);
    downloadBlob(pdfBlob, `${baseName}.pdf`);
    flashStatus(`Listo — se descargaron ${baseName}.docx y ${baseName}.pdf.`, false);
  }catch(err){
    console.error(err);
    flashStatus('Ocurrió un error al generar los documentos. Intenta de nuevo.', true);
  }finally{
    generateBtn.disabled = false;
    generateBtn.classList.remove('loading');
    generateLabel.textContent = 'Generar documentos (.docx + .pdf)';
  }
});

updateProgress();
})();
