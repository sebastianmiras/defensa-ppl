const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={blocks:[],presentation:null,bi:null,si:0};
let toastTimer;
let designTargets={};
let headingObserver;
function globalText(key){return state.presentation.sections[0][key]??''}
function textLines(s){return esc(s).replace(/\n/g,'<br>')}
const art=[
`<path d="M25 122h112M33 118V55l48-32 48 32v63M43 54h76M50 64v43m20-43v43m21-43v43m21-43v43M34 113h94"/><circle cx="81" cy="42" r="5"/><path d="M18 132h125"/>`,
`<circle cx="70" cy="74" r="43"/><circle cx="96" cy="74" r="43"/><path d="M83 36v77M36 74h94" opacity=".5"/><circle cx="83" cy="74" r="12" fill="currentColor" stroke="none"/><circle cx="36" cy="74" r="3" fill="currentColor"/><circle cx="130" cy="74" r="3" fill="currentColor"/>`,
`<path d="M28 120V40m0 80h110M40 103l24-30 25 13 35-48"/><circle cx="40" cy="103" r="5"/><circle cx="64" cy="73" r="5"/><circle cx="89" cy="86" r="5"/><circle cx="124" cy="38" r="5"/><path d="M43 120V98m21 22V76m25 44V88m35 32V41M28 60h105M28 90h105" opacity=".25"/>`,
`<path d="m23 63 58-32 58 32-58 32-58-32Zm0 20 58 32 58-32M23 103l58 32 58-32"/><path d="m52 47 58 32M81 95v40" opacity=".6"/>`,
`<path d="M26 37c24-11 40-5 55 6 15-11 31-17 55-6v82c-23-10-40-5-55 5-15-10-32-15-55-5V37Zm55 6v81"/><path d="M38 56c12-2 21 1 31 7m-31 8c12-2 21 1 31 7m-31 8c12-2 21 1 31 7m25-30c10-6 19-9 31-7m-31 22c10-6 19-9 31-7m-31 22c10-6 19-9 31-7" opacity=".7"/>`
];
function artwork(i){return `<svg viewBox="0 0 162 155" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${art[i%art.length]}</svg>`}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3400)}
function markdown(s){
 const inline=t=>esc(t).replace(/\[([^\]]+)\]\(media:([a-z0-9-]+)\)/gi,'<button type="button" class="media-link" data-media-id="$2">$1 <span aria-hidden="true">↗</span></button>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
 return String(s||'').split(/\n\s*\n/).map(block=>{
  const lines=block.split('\n');
  if(lines.every(l=>/^\s*\|/.test(l))){const rows=lines.filter(l=>!/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(l=>l.trim().replace(/^\||\|$/g,'').split('|'));return `<div style="overflow-x:auto"><table>${rows.map((r,i)=>`<${i?'tbody':'thead'}><tr>${r.map(c=>`<${i?'td':'th'}>${inline(c.trim())}</${i?'td':'th'}>`).join('')}</tr></${i?'tbody':'thead'}>`).join('')}</table></div>`}
  if(lines.every(l=>/^\s*-\s/.test(l)))return `<ul>${lines.map(l=>`<li>${inline(l.replace(/^\s*-\s/,''))}</li>`).join('')}</ul>`;
  return `<p>${lines.map(inline).join('<br>')}</p>`;
 }).join('');
}
async function api(path){const r=await fetch(path);let data;try{data=await r.json()}catch{throw Error('No se pudo leer el contenido de la presentación.')}if(!r.ok)throw Error(data.error||'No se pudo cargar la presentación');return data}
function current(){return state.bi===null?state.presentation?.sections[0]:state.blocks[state.bi]?.sections[state.si]}
function homeTitle(title){return String(title).split('\n').map((line,i)=>i?`<em>${esc(line)}</em>`:esc(line)).join('<br>')}
function atlas(){
 const s=current();document.documentElement.style.setProperty('--accent','#737d64');
 $('#trail').innerHTML=`${esc(s.footerTitle)}${s.footerTitle&&s.footerView?' <span class="foot-divider">/</span> ':''}${esc(s.footerView)}`;$('#footRight').textContent=s.footerHint;
 $('#app').innerHTML=`<section class="atlas"><div class="atlas-intro ${validImage(s.image)?'has-illustration':''}"><div class="intro-copy"><div><span class="eyebrow">${esc(s.eyebrow)}</span><h1 id="readTitle">${homeTitle(s.title)}</h1></div><div class="intro-right"><p id="readLead">${esc(s.lead)}</p>${s.badge?`<span class="demo-tag">${esc(s.badge)}</span>`:''}</div></div><div id="figureSlot" class="hero-illustration"></div></div><div class="stage" aria-label="Bloques del programa"><div class="stage-rule"></div>${state.blocks.map((b,i)=>`<button class="artifact" data-open="${i}" style="--i:${i};--offset:${[-8,-25,-2,23,6][i]}px;--cover:${esc(b.color)}" aria-label="Abrir bloque ${b.number}: ${esc(b.title)}"><div class="book"><div class="book-face"><div class="cover-top"><span>${esc(s.coverLabel)}</span><span class="cover-num">${b.number}</span></div><div class="cover-art">${artwork(i)}</div><div class="cover-title">${esc(b.title)}</div></div></div></button>`).join('')}</div><div class="presentation-content"><div class="body-copy" id="readBody">${markdown(s.body)}</div></div><div class="atlas-after" ${!s.bottomText&&!s.bottomRange?'hidden':''}>${s.bottomText?`<p>${textLines(s.bottomText)}</p>`:''}<span class="line"></span><span>${esc(s.bottomRange)}</span></div></section>`;
 renderFigure();
 document.querySelectorAll('[data-open]').forEach(e=>e.onclick=()=>openBlock(+e.dataset.open));
 const stage=$('.stage');stage.onpointermove=e=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches||e.pointerType==='touch')return;const r=stage.getBoundingClientRect();stage.style.perspectiveOrigin=`${48+(e.clientX-r.left)/r.width*4}% ${40+(e.clientY-r.top)/r.height*8}%`};
}
function diagram(){const s=current();return `<div class="diagram"><div class="diagram-grid">${[0,1,2].map(i=>`${i?'<span class="diagram-arrow">→</span>':''}<div class="diagram-node"><span>${esc(s['diagramLabel'+i])}</span>${textLines(s['diagramText'+i])}</div>`).join('')}</div></div>`}
function reader(){
 const b=state.blocks[state.bi],s=current();document.documentElement.style.setProperty('--accent',b.color);
 const sectionMeta=`${esc(globalText('blockLabel'))} ${b.number} <span style="margin:0 8px">/</span> ${esc(globalText('sectionLabel'))} ${String(state.si+1).padStart(2,'0')}`;
 $('#trail').innerHTML=`<span>${esc(b.number)} · ${esc(b.title.toUpperCase())}</span><span class="foot-divider">/</span>${esc(s.title.toUpperCase())}`;
 $('#footRight').textContent=globalText('readerHint');
 $('#app').innerHTML=`<section class="reader"><aside class="sidebar"><button class="back-map" id="back"><span>↖</span> ${esc(globalText('backLabel'))}</button><span class="block-count">${b.number}</span><h2>${esc(b.title)}</h2><p>${esc(b.subtitle)}</p><nav class="section-nav" aria-label="Apartados de ${esc(b.title)}">${b.sections.map((s,i)=>`<button class="section-link ${state.si===i?'active':''}" data-section="${i}" ${state.si===i?'aria-current="page"':''}><span>${String(i+1).padStart(2,'0')}</span>${esc(s.title)}<span>${state.si===i?'↗':''}</span></button>`).join('')}</nav><div class="sidebar-mini">${artwork(state.bi)}</div></aside><article class="reading"><div class="reading-sticky" id="readingSticky" aria-hidden="true"><div class="reading-sticky-inner"><span class="eyebrow">${sectionMeta}</span><strong>${esc(s.title)}</strong><small>${esc(s.lead)}</small></div></div><div class="reading-heading" id="readingHeading"><div class="reading-top"><span class="eyebrow">${sectionMeta}</span></div><h1 id="readTitle">${esc(s.title)}</h1><p class="lead" id="readLead">${esc(s.lead)}</p></div><div class="reading-content"><div class="reading-prose"><div class="body-copy" id="readBody">${markdown(s.body)}</div><div id="figureSlot"></div>${b.id==='fundamentacion'&&s.id==='visual'?diagram():''}</div>${blockIllustrations(b)}</div><div class="reading-bottom"><button id="prev">← ${esc(globalText('previousLabel'))}</button><small>${state.si+1} de ${b.sections.length} ${esc(globalText('sectionsLabel'))}</small><button id="next">${esc(globalText(state.si===b.sections.length-1?'nextBlockLabel':'nextSectionLabel'))} ↗</button></div></article></section>`;
 $('#back').onclick=goHome;document.querySelectorAll('[data-section]').forEach(e=>e.onclick=()=>navigate(state.bi,+e.dataset.section));$('#prev').onclick=()=>step(-1);$('#next').onclick=()=>step(1);renderFigure();bindBlockIllustrations(b);bindMediaLinks();bindStickyHeading();
 const nav=$('.section-nav'),active=$('.section-link.active');if(nav&&active)nav.scrollTop=Math.max(0,active.offsetTop-nav.offsetTop-nav.clientHeight/2+active.clientHeight/2);
}

function bindStickyHeading(){
 headingObserver?.disconnect();
 const heading=$('#readingHeading'),sticky=$('#readingSticky');
 if(!heading||!sticky)return;
 headingObserver=new IntersectionObserver(([entry])=>{
  const visible=!entry.isIntersecting&&entry.boundingClientRect.bottom<0;
  sticky.classList.toggle('visible',visible);
 },{threshold:0});
 headingObserver.observe(heading);
}

function blockIllustrations(block){
 const items=(block.illustrations||[]).filter(item=>validImage(item.image));if(!items.length)return '';
 const figure=(item,i,main=false)=>{const label=item.caption||`Ilustración ${i+1}`;return `<figure class="pedro-figure ${main?'pedro-primary':''}"><button class="pedro-image" data-pedro="${i}" aria-label="Ampliar ${esc(label)}"><img src="${esc(item.image)}" alt="${esc(label)}" ${main?'':'loading="lazy"'} decoding="async"><span aria-hidden="true">⤢</span></button>${item.caption?`<figcaption>${esc(item.caption)}</figcaption>`:''}</figure>`};
 return `<aside class="block-illustrations" aria-label="Ilustraciones">${figure(items[0],0,true)}${items.length>1?`<div class="pedro-gallery-items pedro-gallery-static">${items.slice(1).map((item,i)=>figure(item,i+1)).join('')}</div>`:''}</aside>`;
}
function bindBlockIllustrations(block){
 const items=(block.illustrations||[]).filter(item=>validImage(item.image));
 document.querySelectorAll('[data-pedro]').forEach(button=>button.onclick=()=>{const i=Number(button.dataset.pedro),item=items[i];$('#largeImage').src=item.image;$('#largeImage').alt=item.caption||`Ilustración ${i+1}`;$('#largeCaption').textContent=item.caption;$('#imageDialog').showModal()});
}
function mediaMarkup(item){
 if(item.type==='image'&&validImage(item.image))return `<img class="media-dialog-image" src="${esc(item.image)}" alt="${esc(item.alt||item.title)}">`;
 if(item.type==='gallery'){
  const images=(item.images||[]).filter(image=>validImage(image.src));
  if(!images.length)return '';
  const first=images[0];
  return `<div class="media-gallery ${item.presentation==='posters'?'media-gallery--posters':''}" data-media-gallery><div class="media-gallery-stage"><button type="button" class="media-gallery-arrow" data-gallery-prev aria-label="Imagen anterior">←</button><img id="mediaGalleryImage" src="${esc(first.src)}" alt="${esc(first.alt||'Imagen 1')}"><button type="button" class="media-gallery-arrow" data-gallery-next aria-label="Imagen siguiente">→</button></div><div class="media-gallery-meta"><span id="mediaGalleryCount">1 / ${images.length}</span><span>Selecciona una imagen para ampliarla</span></div><div class="media-gallery-thumbs">${images.map((image,index)=>`<button type="button" data-gallery-index="${index}" aria-label="Ver imagen ${index+1}" aria-pressed="${index===0?'true':'false'}"><img src="${esc(image.src)}" alt="" loading="lazy"></button>`).join('')}</div></div>`;
 }
 if(item.type==='table'&&Array.isArray(item.columns)&&Array.isArray(item.rows))return `<div class="media-table-wrap"><table><thead><tr>${item.columns.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${item.rows.map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 const stats=Array.isArray(item.stats)?item.stats:[];const bar=item.bar&&Number.isFinite(Number(item.bar.value))?`<div class="media-bar"><div style="width:${Math.max(0,Math.min(100,Number(item.bar.value)))}%"></div></div><p class="media-bar-label">${esc(item.bar.label)}</p>`:'';
 return `<div class="media-stats">${stats.map(stat=>`<div><strong>${esc(stat.value)}</strong><span>${esc(stat.label)}</span></div>`).join('')}</div>${bar}`;
}
function bindMediaGallery(item){
 const images=(item.images||[]).filter(image=>validImage(image.src));if(!images.length||!$('[data-media-gallery]'))return;let index=0;
 const show=next=>{index=(next+images.length)%images.length;const image=images[index];$('#mediaGalleryImage').src=image.src;$('#mediaGalleryImage').alt=image.alt||`Entrega ${index+1}`;$('#mediaGalleryCount').textContent=`${index+1} / ${images.length}`;document.querySelectorAll('[data-gallery-index]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)))};
 $('[data-gallery-prev]').onclick=()=>show(index-1);$('[data-gallery-next]').onclick=()=>show(index+1);document.querySelectorAll('[data-gallery-index]').forEach(button=>button.onclick=()=>show(Number(button.dataset.galleryIndex)));
}
function bindMediaLinks(){
 document.querySelectorAll('[data-media-id]').forEach(button=>button.onclick=()=>{const item=(current().media||[]).find(x=>x.id===button.dataset.mediaId);if(!item)return toast('Este material todavía no está disponible');$('#mediaDialog').classList.toggle('media-dialog--posters',item.presentation==='posters');$('#mediaKind').textContent=item.label||'MATERIAL';$('#mediaTitle').textContent=item.title||'';$('#mediaBody').innerHTML=mediaMarkup(item);bindMediaGallery(item);$('#mediaCaption').textContent=item.caption||'';$('#mediaSource').textContent=item.source||'';$('#mediaDialog').showModal()});
}
function animateIllustrations(selector){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 document.querySelectorAll(selector).forEach(async(img,i)=>{
  try{await img.decode()}catch{return}if(!img.isConnected)return;
  img.animate([{opacity:0,transform:'translate3d(0,12px,0) rotate(-1.2deg) scale(.985)'},{opacity:1,transform:'translate3d(0,-2px,0) rotate(.3deg) scale(1)',offset:.7},{opacity:1,transform:'translate3d(0,0,0) rotate(0deg) scale(1)'}],{duration:1350,delay:i*90,easing:'cubic-bezier(.22,.7,.3,1)',iterations:1});
 });
}

function validImage(path){return /^assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(png|jpe?g|webp|gif)$/i.test(path||'')}
function renderFigure(){const s=current();if(!$('#figureSlot'))return;if(state.bi===null)$('.atlas-intro')?.classList.toggle('has-illustration',validImage(s.image));$('#figureSlot').innerHTML=validImage(s.image)?`<figure class="image-figure"><button class="figure-btn" id="enlarge"><img src="${esc(s.image)}" alt="${esc(s.caption||s.title)}"><span>${esc(globalText('enlargeLabel'))} ⤢</span></button><figcaption>${esc(s.caption)}</figcaption></figure>`:'';if($('#enlarge'))$('#enlarge').onclick=()=>{$('#largeImage').src=s.image;$('#largeImage').alt=s.caption||s.title;$('#largeCaption').textContent=s.caption;$('#imageDialog').showModal()}}
function render(entering=false){
 if(state.bi===null)atlas();else reader();
 applyDesign();
 $('.bottom').hidden=!$('#trail').textContent.trim()&&!$('#footRight').textContent.trim();
 if(entering)animateIllustrations('.hero-illustration img, .pedro-primary img');
}
function navigate(bi,si){state.bi=bi;state.si=si;render(true);window.scrollTo({top:0,behavior:'instant'})}
function openBlock(i){navigate(i,0)}
function goHome(){navigate(null,0)}
function step(dir){let bi=state.bi,si=state.si+dir;if(si<0){if(bi===0){goHome();return}bi--;si=state.blocks[bi].sections.length-1}if(si>=state.blocks[bi].sections.length){if(bi>=state.blocks.length-1){goHome();return}bi++;si=0}navigate(bi,si)}
function applyDesign(){
 let sheet=$('#assistantDesign');if(!sheet){sheet=document.createElement('style');sheet.id='assistantDesign';document.head.append(sheet)}
 sheet.textContent=[state.presentation.styles||{},current().styles||{}].map(styles=>Object.entries(styles).map(([key,value])=>{const target=designTargets[key];if(!target||typeof value!=='string'||/[{}<>@\\]/.test(value))return '';const declarations=value.split(';').filter(x=>x.trim()).map(item=>{const split=item.indexOf(':');const property=item.slice(0,split).trim(),v=item.slice(split+1).trim();return target.properties.includes(property)&&!/(url\s*\(|!important)/i.test(v)?`${property}:${v} !important;`:''}).join('');return `${target.selector}{${declarations}}`}).join('\n')).join('\n');
}

$('#openQr').onclick=()=>{
 $('#mediaDialog').classList.remove('media-dialog--posters');
 $('#mediaKind').textContent='PROGRAMA DOCENTE · ACCESO DIGITAL';
 $('#mediaTitle').textContent='Programa docente completo';
 $('#mediaBody').innerHTML='<a class="qr-dialog-link" href="https://bit.ly/miras-programa-ppl" target="_blank" rel="noopener"><img src="assets/miras-programa-ppl.png" alt="Código QR para abrir el programa docente completo"><span>Abrir https://bit.ly/miras-programa-ppl ↗</span></a>';
 $('#mediaCaption').textContent='Escanea el código o pulsa sobre él para abrir el PDF completo del programa docente.';
 $('#mediaSource').textContent='Universidad de Alicante · Programa docente de Sebastián Miras Espantoso.';
 $('#mediaDialog').showModal();
};
$('#closeImage').onclick=()=>$('#imageDialog').close();$('#closeMedia').onclick=()=>$('#mediaDialog').close();
for(const dialog of document.querySelectorAll('dialog'))dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}};
window.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||document.querySelector('dialog[open]'))return;if(e.key==='Escape'&&state.bi!==null)goHome();if(e.key==='ArrowRight'&&state.bi!==null){e.preventDefault();step(1)}if(e.key==='ArrowLeft'&&state.bi!==null){e.preventDefault();step(-1)}if(e.key.toLowerCase()==='f'){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>toast('El navegador no permite pantalla completa aquí'))}});
async function init(){try{
 const files=['01-marco.json','02-fundamentacion.json','03-investigacion.json','04-programa.json','05-tema.json'];
 const [targets,presentation,...blocks]=await Promise.all([api('design-targets.json'),api('contenidos/presentacion.json'),...files.map(file=>api('contenidos/'+file))]);
 designTargets=targets;state.blocks=blocks;state.presentation=presentation;render(true);
}catch(e){$('#app').innerHTML='<div class="atlas"><h1>No se pudo abrir la presentación.</h1><p>Utiliza el lanzador incluido en el paquete offline o abre la versión publicada en GitHub Pages.</p></div>';toast(e.message)}}
await init();
