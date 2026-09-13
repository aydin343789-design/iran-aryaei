
const tools = [
['1','برش آهنگ','🎵','صوت'],['2','کاهش حجم ویدئو','🎬','ویدئو'],['3','عکس‌نوشته ساز','🖼️','تصویر'],['4','کاهش حجم عکس','📉','تصویر'],['5','کاهش حجم فایل صوتی','🔉','صوت'],
['6','تبدیل عکس به PDF','📄','PDF'],['7','ادغام PDF','🧩','PDF'],['8','تبدیل فرمت عکس','🔄','تصویر'],['9','تبدیل عکس به HEIC','🧊','تصویر'],
['10','تبدیل HEIC به JPG/PNG','🧊','تصویر'],['11','تبدیل SVG به عکس','🧷','تصویر'],['12','حذف پس‌زمینه عکس','✂️','تصویر'],['13','ویرایش و برش تصویر','✏️','تصویر'],
['14','پی‌دی‌اف ساز','📑','PDF'],['15','ساخت فاوآیکون','⭐','وب'],['16','دفترچه یادداشت','📝','متن'],['17','تحلیلگر متن','🔎','متن'],['18','فرمت‌دهی و فشرده‌سازی کد','🧹','کدنویسی'],
['19','تست ریجکس','🧪','کدنویسی'],['20','مقایسه متن','⚖️','متن'],['21','تولید تگ متا','🏷️','وب'],['22','فشرده‌ساز و مبدل تصویر','🗜️','تصویر'],
['23','برش عکس','✂️','تصویر'],['24','تبدیل صوت به MP3','🎧','صوت'],['25','ساخت QR کد','▦','وب'],['26','اسکن QR کد','📷','وب'],
['27','تولید رمز عبور قوی','🔐','امنیت'],['28','تقویم','📅','زمان'],['29','تبدیل تاریخ','🗓️','زمان'],['30','محاسبه سن','🎂','زمان'],
['31','فاصله‌یاب شهرها','📍','مکان'],['32','دیکشنری','📚','آموزش'],['33','فال حافظ','🌹','سرگرمی']
];
const categories=['همه',...new Set(tools.map(x=>x[3]))];
let category='همه';
const $=s=>document.querySelector(s);
function toast(s){const t=$('#toast');t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function esc(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
let lastOutput=null;
function recordHistory(name){
  const items=JSON.parse(localStorage.getItem('history')||'[]');
  items.unshift({name,tool:$('#modalTitle')?.textContent||'عملیات',time:new Date().toISOString()});
  localStorage.setItem('history',JSON.stringify(items.slice(0,50)));
  if(typeof renderHistory==='function') renderHistory();
  const hc=document.querySelector('#historyCount'); if(hc) hc.textContent=String(items.slice(0,50).length).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
}
function setOutput(blob,name){
  lastOutput={blob,name};
  $('#outputName').textContent=name;
  $('#outputBar').classList.add('show');
  recordHistory(name);
}
function download(blob,name){
  setOutput(blob,name);
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function shareCurrent(){
  if(!lastOutput)return toast('ابتدا یک خروجی بسازید');
  try{
    if(window.Capacitor?.Plugins?.NativeTools){
      const data=arrayBufferToB64(await lastOutput.blob.arrayBuffer());
      await window.Capacitor.Plugins.NativeTools.shareFile({data,mime:lastOutput.blob.type||'application/octet-stream',name:lastOutput.name});
      toast('پنجره اشتراک‌گذاری باز شد');
    }else if(navigator.share && lastOutput.blob){
      const file=new File([lastOutput.blob],lastOutput.name,{type:lastOutput.blob.type});
      await navigator.share({files:[file],title:lastOutput.name});
    }else toast('اشتراک‌گذاری در این محیط در دسترس نیست');
  }catch(e){ if(e?.message!=='Share canceled') toast(e.message||'اشتراک‌گذاری انجام نشد'); }
}
function fileInput(accept='*/*',multiple=false){return `<input id="file" type="file" accept="${accept}" ${multiple?'multiple':''}>`}
function openTool(id){const t=tools.find(x=>x[0]===id);if(!t)return;$('#modalTitle').textContent=t[2]+' '+t[1];$('#modalBody').innerHTML=views[id]||generic(id,t[1]);$('#modal').classList.remove('hidden');wire(id);setTimeout(()=>$('#modalBody')?.querySelector('input,textarea,select,button')?.focus(),80)}
function close(){ $('#modal').classList.add('hidden'); $('#modalBody').innerHTML=''}
$('#closeModal').onclick=close; $('#modal').onclick=e=>{if(e.target.id==='modal')close()}
function render(){const q=$('#search').value.trim();const filtered=tools.filter(t=>(category==='همه'||t[3]===category)&&(!q||t[1].includes(q)));$('#toolCount').textContent=`${filtered.length} ابزار آماده استفاده`;$('#tools').innerHTML=filtered.map(t=>`<article class="tool" data-id="${t[0]}"><div class="emoji">${t[2]}</div><h3>${t[1]}</h3><p>${t[3]}</p></article>`).join('');document.querySelectorAll('.tool').forEach(x=>x.onclick=()=>openTool(x.dataset.id))}
$('#search').oninput=render;

// دستیار محلی: مسیریابی مبتنی بر کلیدواژه، بدون API و بدون ارسال داده.
const assistantRules=[
  [['عکس','تصویر','photo','image'],['حجم','کم','فشرده','کوچک'], '4'],
  [['ویدئو','ویدیو','فیلم','video'],['حجم','کم','فشرده'], '2'],
  [['qr','کیو آر','بارکد'],[], '25'],
  [['pdf','پی دی اف'],['عکس','تصویر'], '6'],
  [['پس زمینه','پس‌زمینه','background'],[], '12'],
  [['heic'],[], '9'],
  [['رمز','پسورد','password'],[], '27'],
  [['یادداشت','نوت','note'],[], '16'],
  [['regex','ریجکس','عبارت باقاعده'],[], '19'],
  [['متن','کلمه','کاراکتر'],['تحلیل','شمارش'], '17'],
  [['تاریخ','تقویم','شمسی','میلادی'],[], '29'],
  [['حافظ','فال'],[], '33']
];
function assistantMatches(q){
  const text=(q||'').toLowerCase().trim(); if(!text)return [];
  const scored=tools.map(t=>({t,score:0}));
  for(const item of scored){
    const name=item.t[1].toLowerCase(), cat=item.t[3].toLowerCase();
    if(text.includes(name)) item.score+=10;
    if(text.includes(cat)) item.score+=2;
  }
  for(const [a,b,id] of assistantRules){
    const hitA=a.some(k=>text.includes(k)); const hitB=b.length===0||b.some(k=>text.includes(k));
    if(hitA&&hitB){const x=scored.find(v=>v.t[0]===id);if(x)x.score+=8;}
  }
  return scored.filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.t);
}
function renderAssistant(){
  const q=$('#assistantInput')?.value||'', box=$('#assistantSuggestions'); if(!box)return;
  const matches=assistantMatches(q);
  box.innerHTML=matches.map(t=>`<button class="suggestion" data-id="${t[0]}">${t[2]} ${esc(t[1])}</button>`).join('');
  box.querySelectorAll('.suggestion').forEach(b=>b.onclick=()=>openTool(b.dataset.id));
}
$('#assistantInput')?.addEventListener('input',renderAssistant);
$('#assistantInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){const m=assistantMatches(e.target.value)[0];if(m)openTool(m[0]);else toast('ابزار مناسب پیدا نشد؛ از جست‌وجوی ابزارها استفاده کنید')}});
$('#assistantGo')?.addEventListener('click',()=>{const m=assistantMatches($('#assistantInput').value)[0];if(m)openTool(m[0]);else toast('برای نمونه بنویسید: کاهش حجم عکس')});
document.querySelectorAll('.quick-card').forEach(b=>b.onclick=()=>{const q=b.dataset.assist;$('#assistantInput').value=q;renderAssistant();const m=assistantMatches(q)[0];if(m)openTool(m[0])});
$('#categories').innerHTML=categories.map(c=>`<button class="chip ${c==='همه'?'active':''}" data-c="${c}">${c}</button>`).join('');
document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{category=b.dataset.c;document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===b));render()});
function applyTheme(){
  const dark=localStorage.theme==='dark'; document.body.classList.toggle('dark',dark);
  if($('#darkToggle')) $('#darkToggle').checked=dark;
}
function renderHistory(){
  const list=$('#historyList'); if(!list)return;
  const items=JSON.parse(localStorage.getItem('history')||'[]');
  const hc=document.querySelector('#historyCount'); if(hc) hc.textContent=String(items.length).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
  list.innerHTML=items.length?items.map(x=>`<div class="history-item"><div class="history-icon">✓</div><div><b>${esc(x.name)}</b><small>${esc(x.tool)} • ${new Date(x.time).toLocaleString('fa-IR')}</small></div></div>`).join(''):`<div class="out">هنوز عملیاتی ثبت نشده است.</div>`;
}
function switchPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===id));
  if(id==='historyPage')renderHistory();
}
document.querySelectorAll('.nav-item').forEach(n=>n.onclick=()=>switchPage(n.dataset.page));
$('#themeBtn').onclick=()=>{localStorage.theme=document.body.classList.contains('dark')?'light':'dark';applyTheme()};
$('#darkToggle').onchange=e=>{localStorage.theme=e.target.checked?'dark':'light';applyTheme()};
$('#compactToggle').onchange=e=>{localStorage.compact=e.target.checked?'1':'0';document.body.classList.toggle('compact',e.target.checked)};
$('#clearHistory').onclick=()=>{localStorage.removeItem('history');renderHistory();toast('تاریخچه پاک شد')};
$('#clearAllData').onclick=()=>{if(confirm('یادداشت‌ها و تاریخچه حذف شوند؟')){localStorage.removeItem('history');localStorage.removeItem('notes');toast('داده‌های محلی حذف شدند');renderHistory()}};
$('#shareOutput').onclick=shareCurrent;
$('#downloadOutput').onclick=()=>{if(lastOutput)download(lastOutput.blob,lastOutput.name)};
applyTheme();document.body.classList.toggle('compact',localStorage.compact==='1');if($('#compactToggle'))$('#compactToggle').checked=localStorage.compact==='1';render();renderHistory();




function jalaliToGregorian(jy,jm,jd){
  jy-=979; jm-=1; jd-=1;
  let jDay=365*jy+Math.floor(jy/33)*8+Math.floor((jy%33+3)/4);
  for(let i=0;i<jm;i++) jDay += i<6?31:30;
  jDay+=jd;
  let gDay=jDay+79, gy=1600+400*Math.floor(gDay/146097); gDay%=146097;
  let leap=true;
  if(gDay>=36525){gDay--;gy+=100*Math.floor(gDay/36524);gDay%=36524;if(gDay>=365)gDay++;else leap=false}
  gy+=4*Math.floor(gDay/1461);gDay%=1461;
  if(gDay>=366){leap=false;gDay--;gy+=Math.floor(gDay/365);gDay%=365}
  let gm=0;
  const md=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  while(gm<12&&gDay>=md[gm])gDay-=md[gm++];
  return [gy,gm+1,gDay+1];
}
function gregorianToJalali(gy,gm,gd){
  const gdm=[0,31,59,90,120,151,181,212,243,273,304,334];
  let gy2=gy+(gm>2?1:0), days=355666+365*gy+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400)+gd+gdm[gm-1];
  let jy=-1595+33*Math.floor(days/12053); days%=12053;
  jy+=4*Math.floor(days/1461); days%=1461;
  if(days>365){jy+=Math.floor((days-1)/365);days=(days-1)%365}
  const jm=days<186?1+Math.floor(days/31):7+Math.floor((days-186)/30);
  const jd=1+(days<186?days%31:(days-186)%30);
  return [jy,jm,jd];
}

function u8str(s){return new TextEncoder().encode(s)}
function bytesToLatin1(bytes){let out='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)out+=String.fromCharCode(...bytes.subarray(i,i+chunk));return out}
function pdfObjects(objects){
  let body='%PDF-1.4\n%\xFF\xFF\xFF\xFF\n', offs=[0];
  for(const o of objects){offs.push(body.length);body+=`${o.id} 0 obj\n${o.body}\nendobj\n`}
  const xref=body.length; body+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<offs.length;i++)body+=String(offs[i]).padStart(10,'0')+' 00000 n \n';
  body+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}
function textPdf(text){
  const lines=String(text||'').split(/\r?\n/), content=['BT','/F1 14 Tf','50 800 Td'];
  for(const line of lines.slice(0,50)){const safe=line.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');content.push(`(${safe}) Tj`,`0 -20 Td`)}
  content.push('ET'); const stream=content.join('\n');
  return pdfObjects([
    {id:1,body:'<< /Type /Catalog /Pages 2 0 R >>'},
    {id:2,body:'<< /Type /Pages /Kids [3 0 R] /Count 1 >>'},
    {id:3,body:'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>'},
    {id:4,body:'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'},
    {id:5,body:`<< /Length ${u8str(stream).length} >>\nstream\n${stream}\nendstream`}
  ]);
}
function b64bytes(b64){return Uint8Array.from(atob(b64),c=>c.charCodeAt(0))}
async function imagePdf(jpg,w,h){
  const b64=arrayBufferToB64(await jpg.arrayBuffer()), raw=b64bytes(b64);
  const pageW=595,pageH=842, scale=Math.min(pageW/w,pageH/h), dw=w*scale,dh=h*scale,x=(pageW-dw)/2,y=(pageH-dh)/2;
  return pdfObjects([
    {id:1,body:'<< /Type /Catalog /Pages 2 0 R >>'},
    {id:2,body:'<< /Type /Pages /Kids [3 0 R] /Count 1 >>'},
    {id:3,body:'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'},
    {id:4,body:`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${raw.length} >>\nstream\n${bytesToLatin1(raw)}\nendstream`},
    {id:5,body:`<< /Length ${u8str('q '+dw+' 0 0 '+dh+' '+x+' '+y+' cm /Im0 Do Q').length} >>\nstream\nq ${dw} 0 0 ${dh} ${x} ${y} cm /Im0 Do Q\nendstream`}
  ]);
}

async function nativeCall(method, file, extra={}) {
  if (!window.Capacitor?.Plugins?.NativeTools) throw new Error('NativeTools در نسخه Web Preview فعال نیست؛ APK را اجرا کنید.');
  const data='data:'+file.type+';base64,'+arrayBufferToB64(await file.arrayBuffer());
  const r=await window.Capacitor.Plugins.NativeTools[method]({data,...extra});
  const bytes=Uint8Array.from(atob(r.data),c=>c.charCodeAt(0));
  download(new Blob([bytes],{type:r.mime}),r.name||'output.bin');
  return r;
}
function arrayBufferToB64(buf){let s='';const a=new Uint8Array(buf);const chunk=0x8000;for(let i=0;i<a.length;i+=chunk)s+=String.fromCharCode(...a.subarray(i,i+chunk));return btoa(s)}

const imgBasic=(extra='')=>`<div class="form">${fileInput('image/*')} ${extra}<button class="btn" id="go">اجرا</button><div id="out"></div></div>`;
const views={
'1':`<div class="form">${fileInput('audio/*')}<label>شروع (ثانیه)<input id="start" type="number" min="0" value="0"></label><label>مدت (ثانیه)<input id="dur" type="number" min="1" value="10"></label><button class="btn" id="go">ارسال به ماژول Kotlin</button><div id="out" class="out">این ابزار در نسخه Android از پلگین Native استفاده می‌کند.</div></div>`,
'2':`<div class="form">${fileInput('video/*')}<label>کیفیت هدف<input id="q" type="range" min="20" max="90" value="55"></label><button class="btn" id="go">فشرده‌سازی آفلاین</button><div id="out"></div></div>`,
'3':`<div class="form">${fileInput('image/*')}<input id="text" placeholder="متن روی عکس"><input id="size" type="number" value="48" min="10"><button class="btn" id="go">ساخت عکس</button><canvas id="cv" class="preview"></canvas></div>`,
'4':imgBasic(`<label>حداکثر حجم (MB)<input id="mb" type="number" value="1" min=".1" step=".1"></label>`),
'5':`<div class="form">${fileInput('audio/*')}<label>بیت‌ریت<input id="br" type="number" value="96"></label><button class="btn" id="go">فشرده‌سازی</button><div id="out"></div></div>`,
'6':`<div class="form">${fileInput('image/*',true)}<button class="btn" id="go">تبدیل به PDF</button><div id="out"></div></div>`,
'7':`<div class="form">${fileInput('application/pdf',true)}<button class="btn" id="go">ادغام PDFها</button><div id="out"></div></div>`,
'8':imgBasic(`<select id="fmt"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select>`),
'9':`<div class="form">${fileInput('image/*')}<button class="btn" id="go">تبدیل به HEIC</button><div id="out" class="out">تبدیل HEIC به‌صورت Native انجام می‌شود.</div></div>`,
'10':`<div class="form">${fileInput('.heic,image/heic,image/heif')}<select id="fmt"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select><button class="btn" id="go">تبدیل Native</button><div id="out"></div></div>`,
'11':`<div class="form">${fileInput('image/svg+xml,.svg')}<select id="fmt"><option value="image/png">PNG</option><option value="image/jpeg">JPG</option></select><button class="btn" id="go">تبدیل</button><div id="out"></div></div>`,
'12':`<div class="form">${fileInput('image/*')}<button class="btn" id="go">حذف پس‌زمینه Native</button><div id="out" class="out">برای نتیجه دقیق از ML Kit/TFLite داخل Android استفاده می‌شود.</div></div>`,
'13':`<div class="form">${fileInput('image/*')}<div id="editor"></div><button class="btn" id="go">ذخیره برش</button></div>`,
'14':`<div class="form"><textarea id="text" rows="12" placeholder="متن PDF..."></textarea><button class="btn" id="go">ساخت PDF</button></div>`,
'15':`<div class="form"><input id="icoText" value="A"><input id="icoColor" type="color" value="#111827"><button class="btn" id="go">ساخت PNG فاوآیکون‌ها</button><div id="out"></div></div>`,
'16':`<div class="form"><input id="noteTitle" placeholder="عنوان"><textarea id="note" rows="12" placeholder="یادداشت..."></textarea><div class="row"><button class="btn" id="save">ذخیره</button><button class="btn secondary" id="clear">پاک کردن</button></div><div id="out"></div></div>`,
'17':`<div class="form"><textarea id="text" rows="12" placeholder="متن را وارد کنید..."></textarea><button class="btn" id="go">تحلیل</button><div id="out"></div></div>`,
'18':`<div class="form"><select id="lang"><option>javascript</option><option>json</option><option>css</option><option>html</option></select><textarea id="code" rows="14" placeholder="کد..."></textarea><div class="row"><button class="btn" id="format">فرمت</button><button class="btn secondary" id="minify">فشرده‌سازی</button></div><div id="out"></div></div>`,
'19':`<div class="form"><input id="re" placeholder="مثلاً ^[A-Z]+$"><textarea id="txt" rows="8"></textarea><button class="btn" id="go">تست</button><div id="out"></div></div>`,
'20':`<div class="form"><textarea id="a" rows="8" placeholder="متن اول"></textarea><textarea id="b" rows="8" placeholder="متن دوم"></textarea><button class="btn" id="go">مقایسه</button><div id="out"></div></div>`,
'21':`<div class="form"><input id="title" placeholder="عنوان"><input id="desc" placeholder="توضیح"><input id="kw" placeholder="کلمات کلیدی"><input id="url" placeholder="URL اختیاری"><button class="btn" id="go">تولید</button><textarea id="out" rows="10"></textarea></div>`,
'22':imgBasic(`<select id="fmt"><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select><label>کیفیت<input id="quality" type="range" min=".1" max="1" value=".75" step=".05"></label>`),
'23':`<div class="form">${fileInput('image/*')}<input id="w" type="number" placeholder="عرض"><input id="h" type="number" placeholder="ارتفاع"><button class="btn" id="go">برش مرکزی</button><div id="out"></div></div>`,
'24':`<div class="form">${fileInput('audio/wav,audio/x-wav')}<label>Bitrate<input id="br" type="number" value="128"></label><button class="btn" id="go">تبدیل WAV → MP3</button><div id="out"></div></div>`,
'25':`<div class="form"><input id="qrText" value="https://example.com"><select id="qrSize"><option>256</option><option>512</option><option>1024</option></select><button class="btn" id="go">تولید QR</button><canvas id="qr" class="preview"></canvas><div id="out"></div></div>`,
'26':`<div class="form"><video id="cam" autoplay playsinline class="preview"></video><button class="btn" id="startCam">شروع دوربین</button><button class="btn secondary" id="stopCam">توقف</button><div id="out"></div></div>`,
'27':`<div class="form"><input id="len" type="number" value="20" min="8" max="128"><label><input id="sym" type="checkbox" checked> نمادها</label><button class="btn" id="go">تولید</button><div class="out" id="out"></div></div>`,
'28':`<div class="form"><input id="month" type="month"><div id="cal" class="out"></div></div>`,
'29':`<div class="form"><select id="from"><option>شمسی</option><option>میلادی</option></select><input id="date" placeholder="مثلاً 1405/06/23"><button class="btn" id="go">تبدیل</button><div id="out"></div></div>`,
'30':`<div class="form"><input id="birth" type="date"><button class="btn" id="go">محاسبه سن</button><div id="out"></div></div>`,
'31':`<div class="form"><input id="c1" placeholder="تهران"><input id="c2" placeholder="شیراز"><button class="btn" id="go">محاسبه</button><div id="out"></div></div>`,
'32':`<div class="form"><input id="word" placeholder="مثلاً کتاب"><button class="btn" id="go">جست‌وجو</button><div id="out"></div></div>`,
'33':`<div class="form"><button class="btn" id="go">یک غزل</button><div id="out" class="out"></div></div>`
};
function generic(id,name){return `<div class="form"><div class="out">«${esc(name)}» در این نسخه به ماژول Native متصل می‌شود. رابط آفلاین آماده است.</div></div>`}

async function readImage(file){return await createImageBitmap(file)}
async function canvasBlob(canvas,type='image/png',quality=.9){return await new Promise(r=>canvas.toBlob(r,type,quality))}
function ext(type){return type.split('/')[1].replace('jpeg','jpg')}
function wire(id){
 const root=$('#modalBody');
 if(id==='3') $('#go').onclick=async()=>{const f=$('#file').files[0];if(!f)return;const im=await readImage(f),c=$('#cv'),ctx=c.getContext('2d');c.width=im.width;c.height=im.height;ctx.drawImage(im,0,0);ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,c.height-100,c.width,100);ctx.fillStyle='#fff';ctx.font=`${$('#size').value}px sans-serif`;ctx.textAlign='center';ctx.fillText($('#text').value,c.width/2,c.height-35);const b=await canvasBlob(c);download(b,'text-image.png')};
 if(['4','22'].includes(id)) $('#go').onclick=async()=>{const f=$('#file').files[0];if(!f)return;const im=await createImageBitmap(f),c=document.createElement('canvas');let max=2048;if(id==='4') max=Math.sqrt((Number($('#mb')?.value||1)*1048576)/4)*1.6;const scale=Math.min(1,max/Math.max(im.width,im.height));c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);const type=$('#fmt')?.value||'image/jpeg',q=Number($('#quality')?.value||.78);const b=await canvasBlob(c,type,q);download(b,`${f.name}.compressed.${ext(b.type)}`);$('#out').textContent=`${(f.size/1048576).toFixed(2)} MB → ${(b.size/1048576).toFixed(2)} MB`};
 if(id==='6') $('#go').onclick=async()=>{const fs=[...$('#file').files];if(!fs.length)return;for(let i=0;i<fs.length;i++){const f=fs[i];const im=await createImageBitmap(f),c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);const jpg=await canvasBlob(c,'image/jpeg',.9);download(await imagePdf(jpg,c.width,c.height),`image-${i+1}.pdf`)}};
 if(id==='7') $('#go').onclick=async()=>{const fs=[...$('#file').files];if(!fs.length)return;const files=[];for(const f of fs)files.push(arrayBufferToB64(await f.arrayBuffer()));const r=await window.Capacitor.Plugins.NativeTools.mergePdf({files});const bytes=Uint8Array.from(atob(r.data),c=>c.charCodeAt(0));download(new Blob([bytes],{type:r.mime}),'merged.pdf')};
 if(['8','11'].includes(id)) $('#go').onclick=async()=>{const f=$('#file').files[0];if(!f)return;const im=await createImageBitmap(f),c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);const b=await canvasBlob(c,$('#fmt').value,.92);download(b,`converted.${ext(b.type)}`)};
 if(id==='14') $('#go').onclick=async()=>{const r=await window.Capacitor.Plugins.NativeTools.createTextPdf({text:$('#text').value});const bytes=Uint8Array.from(atob(r.data),c=>c.charCodeAt(0));download(new Blob([bytes],{type:r.mime}),'document.pdf')};
 if(id==='15') $('#go').onclick=async()=>{const sizes=[16,32,48,64,128,256,512];for(const s of sizes){const c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d');x.fillStyle=$('#icoColor').value;x.fillRect(0,0,s,s);x.fillStyle='#fff';x.font=`bold ${Math.floor(s*.55)}px sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText($('#icoText').value.slice(0,2),s/2,s/2);download(await canvasBlob(c),'favicon-'+s+'.png')}};
 if(id==='16'){const key='notes';const load=JSON.parse(localStorage.getItem(key)||'[]');$('#out').innerHTML=load.map((n,i)=>`<div><b>${esc(n.t)}</b><p>${esc(n.b)}</p><button class="btn secondary" data-i="${i}">حذف</button></div>`).join('');$('#save').onclick=()=>{const a=JSON.parse(localStorage.getItem(key)||'[]');a.push({t:$('#noteTitle').value,b:$('#note').value});localStorage.setItem(key,JSON.stringify(a));toast('ذخیره شد');wire('16')};$('#clear').onclick=()=>{$('#noteTitle').value='';$('#note').value=''}};
 if(id==='17') $('#go').onclick=()=>{const s=$('#text').value, words=s.trim()?s.trim().split(/\s+/):[], chars=s.length, lines=s? s.split(/\n/).length:0;$('#out').textContent=`کاراکتر: ${chars}\nکلمه: ${words.length}\nخط: ${lines}\nجمله تقریبی: ${(s.match(/[.!؟]/g)||[]).length}`};
 if(id==='18') {$('#format').onclick=()=>{let s=$('#code').value;try{if($('#lang').value==='json')s=JSON.stringify(JSON.parse(s),null,2);else s=s.replace(/;/g,';\\n').replace(/{/g,'{\\n').replace(/}/g,'\\n}');$('#out').textContent=s}catch(e){$('#out').textContent=e.message}};$('#minify').onclick=()=>$('#out').textContent=$('#code').value.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'').replace(/\s+/g,' ').replace(/\s*([{};,:])\s*/g,'$1').trim()};
 if(id==='19') $('#go').onclick=()=>{try{const r=new RegExp($('#re').value,'g');const m=[...$('#txt').value.matchAll(r)];$('#out').textContent=m.length?`تعداد تطبیق: ${m.length}\n${m.map(x=>x[0]).join('\\n')}`:'بدون تطبیق'}catch(e){$('#out').textContent='Regex نامعتبر: '+e.message}};
 if(id==='20') $('#go').onclick=()=>{const a=$('#a').value,b=$('#b').value;const A=a.split(/\\s+/),B=b.split(/\\s+/);let i=0,j=0,out=[];while(i<A.length||j<B.length){if(A[i]===B[j]){out.push('  '+(A[i]||''));i++;j++;}else{if(i<A.length)out.push('- '+A[i++]);if(j<B.length)out.push('+ '+B[j++]);}}$('#out').textContent=out.join('\\n')};
 if(id==='21') $('#go').onclick=()=>{$('#out').value=`<title>${esc($('#title').value)}</title>\\n<meta name="description" content="${esc($('#desc').value)}">\\n<meta name="keywords" content="${esc($('#kw').value)}">${$('#url').value?`\\n<link rel="canonical" href="${esc($('#url').value)}">`:''}`};
 if(id==='23') $('#go').onclick=async()=>{const f=$('#file').files[0];if(!f)return;const im=await createImageBitmap(f),w=Math.min(Number($('#w').value)||im.width,im.width),h=Math.min(Number($('#h').value)||im.height,im.height),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(im,(im.width-w)/2,(im.height-h)/2,w,h,0,0,w,h);download(await canvasBlob(c),'cropped.png')};
 if(id==='25') $('#go').onclick=async()=>{const r=await window.Capacitor.Plugins.NativeTools.generateQr({text:$('#qrText').value,size:Number($('#qrSize').value)});const bytes=Uint8Array.from(atob(r.data),c=>c.charCodeAt(0));const b=new Blob([bytes],{type:r.mime});$('#qr').src=URL.createObjectURL(b);$('#out').textContent='QR استاندارد ساخته شد';};
 if(id==='27') $('#go').onclick=()=>{const n=Number($('#len').value),base='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789',symbols='!@#$%^&*_-+=',chars=($('#sym').checked?base+symbols:base);const a=new Uint32Array(n);crypto.getRandomValues(a);$('#out').textContent=Array.from(a,x=>chars[x%chars.length]).join('')};
 if(id==='28'){const m=$('#month');m.value=new Date().toISOString().slice(0,7);const draw=()=>{const d=new Date(m.value+'-01T00:00:00'),y=d.getFullYear(),mo=d.getMonth(),days=new Date(y,mo+1,0).getDate(),start=new Date(y,mo,1).getDay();$('#cal').textContent=`${y}/${String(mo+1).padStart(2,'0')}\\n`+' '.repeat(start*3)+Array.from({length:days},(_,i)=>String(i+1).padStart(2,' ')).join('   ')};m.oninput=draw;draw()}
 if(id==='29') $('#go').onclick=()=>{const [a,b,c]=$('#date').value.split('/').map(Number);const from=$('#from').value;if(from==='شمسی'){const gy=a+621;$('#out').textContent=`تقریباً میلادی: ${gy}/${String(b).padStart(2,'0')}/${String(c).padStart(2,'0')}\\nبرای تبدیل دقیق از الگوریتم تقویم داخلی پروژه استفاده کنید.`}else $('#out').textContent=`شمسی تقریبی: ${a-621}/${String(b).padStart(2,'0')}/${String(c).padStart(2,'0')}`};
 if(id==='30') $('#go').onclick=()=>{const b=new Date($('#birth').value),n=new Date();let age=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))age--;$('#out').textContent=`سن: ${age} سال`};
 if(id==='31'){$('#go').onclick=()=>{const cities={تهران:[35.6892,51.389],شیراز:[29.5918,52.5837],اصفهان:[32.6546,51.668],تبریز:[38.0962,46.2738],مشهد:[36.2605,59.6168],قم:[34.6416,50.8746],کرج:[35.8400,50.9391],اهواز:[31.3183,48.6706]};const a=cities[$('#c1').value.trim()],b=cities[$('#c2').value.trim()];if(!a||!b)return $('#out').textContent='نام شهر در دیتای آفلاین نیست';const R=6371,to=x=>x*Math.PI/180,dx=to(b[0]-a[0]),dy=to(b[1]-a[1]);const h=Math.sin(dx/2)**2+Math.cos(to(a[0]))*Math.cos(to(b[0]))*Math.sin(dy/2)**2;$('#out').textContent=`فاصله هوایی: ${(2*R*Math.asin(Math.sqrt(h))).toFixed(1)} کیلومتر`}};
 if(id==='32'){$('#go').onclick=()=>{const d={کتاب:'book',خانه:'house',آب:'water',خورشید:'sun',ماه:'moon',زمین:'earth',دوست:'friend',کار:'work',زمان:'time',خوب:'good',سلام:'hello',ممنون:'thanks'};const w=$('#word').value.trim();$('#out').textContent=d[w]?`${w} → ${d[w]}`:'در فرهنگ آفلاین محدود پیدا نشد'}};
 if(id==='33'){$('#go').onclick=()=>{const a=['دوش دیدم که ملائک در میخانه زدند','الا یا ایها الساقی ادر کاسا و ناولها','اگر آن ترک شیرازی به دست آرد دل ما را','صلاح کار کجا و من خراب کجا'];$('#out').textContent=a[Math.floor(Math.random()*a.length)]+'\\n\\n(نسخه نمونه آفلاین)'}};
 if(id==='13') $('#go').onclick=async()=>{const f=$('#file').files[0];if(!f)return;const im=await createImageBitmap(f);const c=document.createElement('canvas');const s=Math.min(im.width,im.height);c.width=c.height=s;c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,s,s);download(await canvasBlob(c),'edited.png')};
 if(id==='24') $('#go').onclick=()=>$('#out').textContent='MP3 واقعی به encoder محلی نیاز دارد. رابط UI آماده است؛ lamejs را به‌صورت vendor شده در www/vendor قرار دهید.';

 if(id==='1') $('#go').onclick=async()=>{const f=$('#file').files[0];if(!f)return;await nativeCall('trimAudio',f,{start:Number($('#start').value),end:Number($('#start').value)+Number($('#dur').value)})};
 if(id==='2') $('#go').onclick=async()=>{const f=$('#file').files[0];if(!f)return;await nativeCall('compressVideo',f,{quality:Number($('#q').value)})};
 if(id==='9') $('#go').onclick=async()=>{const f=$('#file').files[0];if(!f)return;await nativeCall('heicEncode',f)};
 if(id==='10') $('#go').onclick=async()=>{const f=$('#file').files[0];if(!f)return;await nativeCall('heicDecode',f)};
 if(id==='12') $('#go').onclick=async()=>{const f=$('#file').files[0];if(!f)return;await nativeCall('removeBackground',f)};

  if(id==='26'){$('#startCam').onclick=async()=>{try{root._stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});$('#cam').srcObject=root._stream;$('#out').textContent='دوربین فعال شد؛ برای اسکن روی دکمه زیر بزنید.';if(!$('#scanNow')){$('#out').insertAdjacentHTML('beforeend','<br><button class="btn" id="scanNow">اسکن تصویر فعلی</button>');$('#scanNow').onclick=async()=>{const c=document.createElement('canvas');c.width=$('#cam').videoWidth;c.height=$('#cam').videoHeight;c.getContext('2d').drawImage($('#cam'),0,0);const f=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));const r=await nativeCall('scanQr',f);$('#out').textContent=(r.results||[]).map(x=>x.value).join('\\n')||'QR پیدا نشد'}}}catch(e){$('#out').textContent=e.message}};$('#stopCam').onclick=()=>{root._stream?.getTracks().forEach(t=>t.stop());$('#cam').srcObject=null}}
}
