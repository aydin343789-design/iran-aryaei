
const tools = [
['1','برش آهنگ','🎵','صوت'],['2','کاهش حجم ویدئو','🎬','ویدئو'],['3','عکس‌نوشته ساز','🖼️','تصویر'],['4','کاهش حجم عکس','📉','تصویر'],['5','کاهش حجم فایل صوتی','🔉','صوت'],
['6','تبدیل عکس به PDF','📄','PDF'],['7','ادغام PDF','🧩','PDF'],['8','تبدیل فرمت عکس','🔄','تصویر'],['9','تبدیل عکس به HEIC','🧊','تصویر'],
['10','تبدیل HEIC به JPG/PNG','🧊','تصویر'],['11','تبدیل SVG به عکس','🧷','تصویر'],['12','حذف پس‌زمینه عکس','✂️','تصویر'],['13','ویرایش و برش تصویر','✏️','تصویر'],
['14','پی‌دی‌اف ساز','📑','PDF'],['15','ساخت فاوآیکون','⭐','وب'],['16','دفترچه یادداشت','📝','متن'],['17','تحلیلگر متن','🔎','متن'],['18','فرمت‌دهی و فشرده‌سازی کد','🧹','کدنویسی'],
['19','تست ریجکس','🧪','کدنویسی'],['20','مقایسه متن','⚖️','متن'],['21','تولید تگ متا','🏷️','وب'],['22','فشرده‌ساز و مبدل تصویر','🗜️','تصویر'],
['23','برش عکس','✂️','تصویر'],['24','تبدیل صوت به MP3','🎧','صوت'],['25','ساخت QR کد','▦','وب'],['26','اسکن QR کد','📷','وب'],
['27','تولید رمز عبور قوی','🔐','امنیت'],['28','تقویم','📅','زمان'],['29','تبدیل تاریخ','🗓️','زمان'],['30','محاسبه سن','🎂','زمان'],
['31','فاصله‌یاب شهرها','📍','مکان'],['32','دیکشنری','📚','آموزش'],['33','فال حافظ','🌹','سرگرمی'],['34','تبدیل PDF به عکس','🖼️','PDF']
];
const categories=['همه',...new Set(tools.map(x=>x[3]))];
let category='همه';
const $=s=>document.querySelector(s);
function toast(s){const t=$('#toast');if(!t)return;t.textContent=s;t.classList.add('show');clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>t.classList.remove('show'),2600)}
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\\':'&#92;'}[m]))}
let lastOutput=null;
let outputTimer=null;
function recordHistory(name){
  const items=JSON.parse(localStorage.getItem('history')||'[]');
  items.unshift({name,tool:$('#modalTitle')?.textContent||'عملیات',time:new Date().toISOString()});
  localStorage.setItem('history',JSON.stringify(items.slice(0,50)));
  if(typeof renderHistory==='function')renderHistory();
  const hc=$('#historyCount');
  if(hc)hc.textContent=String(Math.min(items.length,50)).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
}
function setOutput(blob,name){
  lastOutput={blob,name};
  const bar=$('#outputBar');
  if(!bar)return;
  $('#outputName').textContent=name;
  bar.classList.add('show');
  clearTimeout(outputTimer);
  outputTimer=setTimeout(hideOutput,9000);
  recordHistory(name);
}
function hideOutput(){
  const bar=$('#outputBar');
  if(bar)bar.classList.remove('show');
}
async function saveCurrent(){
  if(!lastOutput)return toast('ابتدا یک خروجی بسازید');
  try{
    const plugin=window.Capacitor?.Plugins?.NativeTools;
    if(plugin?.saveFile){
      const data=arrayBufferToB64(await lastOutput.blob.arrayBuffer());
      const r=await plugin.saveFile({data,mime:lastOutput.blob.type||'application/octet-stream',name:lastOutput.name});
      toast(`فایل ذخیره شد: ${r.path||lastOutput.name}`);
      hideOutput();
      return r;
    }
    const a=document.createElement('a');
    a.href=URL.createObjectURL(lastOutput.blob);
    a.download=lastOutput.name;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1200);
    toast('فایل برای ذخیره آماده شد');
    hideOutput();
  }catch(e){toast(e?.message||'ذخیره فایل ناموفق بود')}
}
async function download(blob,name){
  setOutput(blob,name);
  try{
    const plugin=window.Capacitor?.Plugins?.NativeTools;
    if(plugin?.saveFile){
      const data=arrayBufferToB64(await blob.arrayBuffer());
      const r=await plugin.saveFile({data,mime:blob.type||'application/octet-stream',name});
      toast(`فایل ذخیره شد: ${r.path||name}`);
      return r;
    }
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1200);
    return {name};
  }catch(e){toast(e?.message||'ذخیره خودکار انجام نشد؛ دکمه ذخیره را بزنید');return {name,error:e}}
}
async function shareCurrent(){
  if(!lastOutput)return toast('ابتدا یک خروجی بسازید');
  try{
    const plugin=window.Capacitor?.Plugins?.NativeTools;
    if(plugin?.shareFile){
      const data=arrayBufferToB64(await lastOutput.blob.arrayBuffer());
      await plugin.shareFile({data,mime:lastOutput.blob.type||'application/octet-stream',name:lastOutput.name});
    }else if(navigator.share){
      const file=new File([lastOutput.blob],lastOutput.name,{type:lastOutput.blob.type||'application/octet-stream'});
      await navigator.share({files:[file],title:lastOutput.name});
    }else throw new Error('اشتراک‌گذاری در این دستگاه در دسترس نیست');
    toast('اشتراک‌گذاری انجام شد');
    hideOutput();
  }catch(e){
    if(!/cancel|لغو|canceled|cancelled/i.test(e?.message||''))toast(e?.message||'اشتراک‌گذاری انجام نشد');
  }
}
function fileInput(accept='*/*',multiple=false){return `<input id="file" type="file" accept="${accept}" ${multiple?'multiple':''}>`}
function openTool(id){const t=tools.find(x=>x[0]===id);if(!t)return;$('#modalTitle').textContent=t[2]+' '+t[1];$('#modalBody').innerHTML=views[id]||generic(id,t[1]);$('#modal').classList.remove('hidden');wire(id);setTimeout(()=>$('#modalBody')?.querySelector('input,textarea,select,button')?.focus(),80)}
function close(){ $('#modal').classList.add('hidden'); $('#modalBody').innerHTML=''}
$('#closeModal').onclick=close; $('#modal').onclick=e=>{if(e.target.id==='modal')close()}
function render(){const q=normalizeFa($('#search').value||'');const filtered=tools.filter(t=>{if(category!=='همه'&&t[3]!==category)return false;if(!q)return true;const direct=normalizeFa(`${t[1]} ${t[3]}`).includes(q);if(direct)return true;return Object.entries(intentData).some(([intent,phrases])=>intent===t[1]&&[intent,...(phrases||[])].some(p=>normalizeFa(p).includes(q)||q.includes(normalizeFa(p))));});$('#toolCount').textContent=`${filtered.length} ابزار آماده استفاده`;$('#tools').innerHTML=filtered.map(t=>`<article class="tool" data-id="${t[0]}"><div class="emoji">${t[2]}</div><h3>${t[1]}</h3><p>${t[3]}</p></article>`).join('');document.querySelectorAll('.tool').forEach(x=>x.onclick=()=>openTool(x.dataset.id))}
$('#search').oninput=render;

const fallbackIntents={
  'برش آهنگ':['برش آهنگ','بریدن آهنگ','آهنگ را ببر','قسمتی از آهنگ','تریم آهنگ','trim audio','audio trim'],
  'کاهش حجم ویدئو':['کم کردن حجم ویدئو','کم کردن حجم ویدیو','فشرده کردن ویدئو','فشرده کردن ویدیو','حجم ویدئو','حجم ویدیو','فیلم را کم کن','فیلم کم حجم','ویدئو کم حجم','compress video','video compressor'],
  'عکس‌نوشته ساز':['عکس نوشته','عکس‌نوشته','متن روی عکس','روی عکس متن بنویس','عکس با نوشته','نوشته روی تصویر','image text','text on image'],
  'کاهش حجم عکس':['کم کن','فشرده','فشرده سازی','فشرده‌سازی','حجم عکس','حجم تصویر','کوچیک کن','کوچک کن','کم کردن حجم عکس','کم کردن حجم تصویر','عکس کم حجم','تصویر کم حجم','compress image','resize image'],
  'کاهش حجم فایل صوتی':['کم کردن حجم صدا','فشرده کردن صدا','حجم فایل صوتی','کم حجم کردن صوت','فشرده سازی صوت','audio compressor','compress audio'],
  'تبدیل عکس به PDF':['pdf کن','پی دی اف','پی‌دی‌اف','عکس به pdf','تصویر به pdf','عکس را pdf کن','تبدیل عکس به pdf','چند عکس pdf','image to pdf','jpg to pdf'],
  'ادغام PDF':['ادغام pdf','ترکیب pdf','چند pdf','وصل کردن pdf','یکی کردن pdf','pdf ها را یکی کن','merge pdf','combine pdf'],
  'تبدیل فرمت عکس':['فرمت عکس را عوض کن','تغییر فرمت عکس','تبدیل فرمت تصویر','jpg به png','png به jpg','webp','convert image','image format'],
  'تبدیل عکس به HEIC':['heic','تبدیل به heic','عکس heic','تصویر heic','jpg به heic','png به heic','image to heic'],
  'تبدیل HEIC به JPG/PNG':['heic به jpg','heic به png','تبدیل heic','باز کردن heic','heic را تبدیل کن','heic to jpg','heic to png'],
  'تبدیل SVG به عکس':['svg به png','svg به jpg','تبدیل svg','svg را به عکس تبدیل کن','تبدیل برداری به عکس','svg converter','svg to image'],
  'حذف پس‌زمینه عکس':['حذف پس زمینه','حذف پس‌زمینه','پس زمینه عکس','پس‌زمینه عکس','زمینه عکس را حذف کن','بک گراند عکس را حذف کن','background remover','remove background'],
  'ویرایش و برش تصویر':['ویرایش تصویر','ویرایش عکس','برش تصویر','کراپ تصویر','کراپ و ویرایش','crop image','edit image'],
  'پی‌دی‌اف ساز':['پی دی اف ساز','پی‌دی‌اف ساز','pdf ساز','ساخت pdf از متن','متن را pdf کن','pdf متنی','text to pdf','create pdf'],
  'ساخت فاوآیکون':['فاوآیکون','favicon','آیکون سایت','آیکون وب','ساخت favicon','favicon بساز','web icon'],
  'دفترچه یادداشت':['یادداشت','نوت','یادداشت جدید','دفترچه یادداشت','یادداشت بنویس','note','notebook'],
  'تحلیلگر متن':['تحلیل متن','شمارش کلمات','تعداد کلمات','تعداد حروف','تعداد جمله','تحلیل نوشته','text analyzer','analyze text'],
  'فرمت‌دهی و فشرده‌سازی کد':['فرمت کد','مرتب کردن کد','زیبا کردن کد','فشرده سازی کد','کد را مرتب کن','minify code','format code','code formatter'],
  'تست ریجکس':['ریجکس','regex','عبارت باقاعده','تست الگو','تست regex','عبارت منظم','regex tester','regular expression'],
  'مقایسه متن':['مقایسه متن','متن را مقایسه کن','تفاوت دو متن','تفاوت متن ها','دو متن چه فرقی دارند','diff text','compare text'],
  'تولید تگ متا':['تگ متا','متا تگ','meta tag','متا برای سایت','سئو متا','تولید meta','generate meta tags'],
  'فشرده‌ساز و مبدل تصویر':['فشرده ساز تصویر','فشرده‌ساز تصویر','تبدیل و فشرده سازی عکس','عکس را تبدیل و کم حجم کن','image converter compressor','compress and convert image'],
  'برش عکس':['برش عکس','کراپ عکس','عکس را برش بده','برش مرکزی عکس','crop photo','crop image'],
  'تبدیل صوت به MP3':['تبدیل صوت به mp3','wav به mp3','صدا را mp3 کن','تبدیل فایل صوتی به mp3','تبدیل آهنگ به mp3','audio to mp3','wav to mp3'],
  'ساخت QR کد':['qr','کیوآر','کیو آر','بارکد','کد مربعی','ساخت qr','تولید qr','لینک را qr کن','qr code','generate qr'],
  'اسکن QR کد':['اسکن qr','خواندن qr','qr را بخوان','کیوآر را اسکن کن','خواندن بارکد','دوربین qr','qr scanner','scan qr'],
  'تولید رمز عبور قوی':['رمز قوی','پسورد قوی','رمز عبور','پسورد بساز','رمز تصادفی','رمز امن','password','strong password','generate password'],
  'تقویم':['تقویم','تقویم ماه','تقویم این ماه','calendar','calendar month'],
  'تبدیل تاریخ':['تبدیل تاریخ','شمسی به میلادی','میلادی به شمسی','تاریخ شمسی','تاریخ میلادی','تبدیل شمسی','تبدیل میلادی','date converter','jalali gregorian'],
  'محاسبه سن':['سنم','محاسبه سن','چند سالمه','سن من','سن را حساب کن','تاریخ تولد و سن','age calculator','calculate age'],
  'فاصله‌یاب شهرها':['فاصله شهر','فاصله بین شهرها','مسافت بین شهر','فاصله تهران','دو شهر','فاصله شیراز تهران','مسافت دو شهر','distance city','city distance'],
  'دیکشنری':['دیکشنری','ترجمه کلمه','معنی کلمه','ترجمه','معنی این کلمه','این کلمه یعنی چه','لغت','dictionary','translate word','word meaning'],
  'فال حافظ':['فال حافظ','حافظ','غزل حافظ','یک غزل','فال بگیر','فال شعر','hafez','hafez fortune']
};
let intentData=fallbackIntents;
async function loadIntents(){
  try{
    const r=await fetch('./intents.json',{cache:'no-store'});
    if(r.ok){const data=await r.json();if(data&&typeof data==='object')intentData={...fallbackIntents,...data};}
  }catch(_e){}
}
function normalizeFa(value){
  return String(value||'').toLowerCase()
    .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/ۀ/g,'ه').replace(/ة/g,'ه')
    .replace(/[\u200c\u200d]/g,' ')
    .replace(/[ًٌٍَُِّْـ]/g,'')
    .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\u0660-\u0669]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\p{L}\p{N}\s]+/gu,' ')
    .replace(/\s+/g,' ').trim();
}
function levenshtein(a,b){
  if(a===b)return 0;
  if(!a)return b.length;
  if(!b)return a.length;
  if(a.length>b.length)[a,b]=[b,a];
  let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const cur=[i];
    for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
    prev=cur;
  }
  return prev[b.length];
}
function tokenScore(text,phrase){
  const p=normalizeFa(phrase);if(!p)return 0;
  if(text===p)return 1;
  if(text.includes(p))return p.includes(' ')?0.9:0.74;
  const tw=text.split(' ').filter(Boolean),pw=p.split(' ').filter(Boolean);
  let exact=0,fuzzy=0;
  for(const w of pw){
    if(w.length<2)continue;
    if(tw.includes(w)){exact++;continue;}
    if(w.length>=4){
      const best=Math.min(...tw.filter(x=>x.length>=3).map(x=>levenshtein(w,x)).concat([99]));
      if(best<=Math.max(1,Math.floor(w.length/4)))fuzzy++;
    }
  }
  if(!pw.length)return 0;
  return Math.min(.72,(exact+.55*fuzzy)/pw.length*.72);
}
function assistantMatches(q){
  const text=normalizeFa(q);if(!text)return [];
  const queryWords=new Set(text.split(' ').filter(w=>w.length>1));
  const scored=tools.map(t=>({t,score:0,why:[]}));
  for(const item of scored){
    const nameScore=tokenScore(text,item.t[1]);
    if(nameScore){item.score+=nameScore*7;item.why.push('نام ابزار');}
    const cat=normalizeFa(item.t[3]);
    if(cat&&text.includes(cat))item.score+=1.1;
  }
  for(const [intent,phrases] of Object.entries(intentData)){
    const item=scored.find(x=>x.t[1]===intent);if(!item)continue;
    let best=0;
    for(const phrase of Array.isArray(phrases)?phrases:[])best=Math.max(best,tokenScore(text,phrase));
    if(best){item.score+=best*9;item.why.push('هدف');}
  }
  for(const item of scored){
    const words=normalizeFa(item.t[1]).split(' ').filter(w=>w.length>1);
    const overlap=words.filter(w=>queryWords.has(w)).length;
    item.score+=overlap*1.25;
  }
  const boost=(name,value)=>{const x=scored.find(v=>v.t[1]===name);if(x)x.score+=value};
  const penalize=(name,value)=>{const x=scored.find(v=>v.t[1]===name);if(x)x.score-=value};
  if(/\b(pdf|پی دی اف|پی‌دی‌اف)\b/.test(text)||text.includes('پی دی اف')||text.includes('پی‌دی‌اف')){
    if(/یکی کن|ادغام|ترکیب|وصل|یکجا/.test(text)){boost('ادغام PDF',8);penalize('تبدیل عکس به PDF',5);}
    if(/به عکس|به تصویر|صفحه.*عکس|png|jpg/.test(text)){boost('تبدیل PDF به عکس',8);}
    if(/عکس.*(به|کن).*pdf|تصویر.*(به|کن).*pdf/.test(text)){boost('تبدیل عکس به PDF',8);}
  }
  if(/qr|کیوآر|بارکد/.test(text)){
    if(/بخوان|بخون|خواندن|اسکن|اسکن کن|دوربین/.test(text)){boost('اسکن QR کد',10);penalize('ساخت QR کد',6);}
    if(/بساز|ساخت|تولید|ایجاد/.test(text)){boost('ساخت QR کد',10);penalize('اسکن QR کد',6);}
  }
  if(/ترجمه|معنی|واژه|کلمه/.test(text))boost('دیکشنری',7);
  return scored.filter(x=>x.score>=2.35).sort((a,b)=>b.score-a.score).slice(0,4).map(x=>x.t);
}
function renderAssistant(matches=assistantMatches($('#assistantInput')?.value||'')){
  const box=$('#assistantSuggestions');if(!box)return;
  box.innerHTML=matches.map(t=>`<button class="suggestion" data-id="${t[0]}">${t[2]} ${esc(t[1])}</button>`).join('');
  box.querySelectorAll('.suggestion').forEach(b=>b.onclick=()=>openTool(b.dataset.id));
}
async function runAssistant(){
  const input=$('#assistantInput'),box=$('#assistantSuggestions');
  const q=input?.value||'';if(!q.trim())return toast('درخواستتان را بنویسید');
  if(box)box.innerHTML='<div class="assistant-thinking"><span class="thinking-dots"><i></i><i></i><i></i></span><span>در حال بررسی درخواست...</span></div>';
  const started=performance.now();
  const matches=assistantMatches(q);
  const wait=Math.max(200,Math.min(600,360-(performance.now()-started)));
  await new Promise(resolve=>setTimeout(resolve,wait));
  if(!matches.length){
    if(box)box.innerHTML='<div class="assistant-empty">ابزار مناسبی پیدا نشد. نام کار یا نوع فایل را واضح‌تر بنویسید.</div>';
    return toast('ابزار مناسب پیدا نشد');
  }
  renderAssistant(matches);
  openTool(matches[0][0]);
}
$('#assistantInput')?.addEventListener('input',()=>renderAssistant());
$('#assistantInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runAssistant()}});
$('#assistantGo')?.addEventListener('click',runAssistant);
document.querySelectorAll('.quick-card').forEach(b=>b.onclick=()=>{const q=b.dataset.assist;$('#assistantInput').value=q;runAssistant()});
loadIntents();
loadOfflineData();
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
$('#downloadOutput').onclick=saveCurrent;
$('#closeOutput').onclick=hideOutput;
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

const imgBasic=(extra='')=>`<div class="form">${fileInput('image/*')}<div id="inputPreview"></div>${extra}<button class="btn" id="go">اجرا</button><div id="out"></div></div>`;
const views={
'1':`<div class="form">${fileInput('audio/*')}<label>شروع (ثانیه)<input id="start" type="number" min="0" value="0"></label><label>مدت (ثانیه)<input id="dur" type="number" min="1" value="10"></label><button class="btn" id="go">ارسال به ماژول Kotlin</button><div id="out" class="out">این ابزار در نسخه Android از پلگین Native استفاده می‌کند.</div></div>`,
'2':`<div class="form">${fileInput('video/*')}<label>کیفیت هدف<input id="q" type="range" min="20" max="90" value="55"></label><button class="btn" id="go">فشرده‌سازی آفلاین</button><div id="out"></div></div>`,
'3':`<div class="form">${fileInput('image/*')}<input id="text" placeholder="متن روی عکس"><input id="size" type="number" value="48" min="10"><button class="btn" id="go">ساخت عکس</button><canvas id="cv" class="preview"></canvas></div>`,
'4':imgBasic(`<label>حداکثر حجم (MB)<input id="mb" type="number" value="1" min=".1" step=".1"></label>`),
'5':`<div class="form">${fileInput('audio/*')}<label>بیت‌ریت<input id="br" type="number" value="96"></label><button class="btn" id="go">فشرده‌سازی</button><div id="out"></div></div>`,
'6':`<div class="form">${fileInput('image/*',true)}<div id="inputPreview"></div><button class="btn" id="go">تبدیل به PDF</button><div id="out"></div></div>`,
'7':`<div class="form">${fileInput('application/pdf',true)}<button class="btn" id="go">ادغام PDFها</button><div id="out"></div></div>`,
'8':imgBasic(`<select id="fmt"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select>`),
'9':`<div class="form">${fileInput('image/*')}<button class="btn" id="go">تبدیل به HEIC</button><div id="out" class="out">تبدیل HEIC به‌صورت Native انجام می‌شود.</div></div>`,
'10':`<div class="form">${fileInput('.heic,image/heic,image/heif')}<select id="fmt"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select><button class="btn" id="go">تبدیل Native</button><div id="out"></div></div>`,
'11':`<div class="form">${fileInput('image/svg+xml,.svg')}<select id="fmt"><option value="image/png">PNG</option><option value="image/jpeg">JPG</option></select><button class="btn" id="go">تبدیل</button><div id="out"></div></div>`,
'12':`<div class="form">${fileInput('image/*')}<button class="btn" id="go">حذف پس‌زمینه Native</button><div id="out" class="out">برای نتیجه دقیق از ML Kit/TFLite داخل Android استفاده می‌شود.</div></div>`,
'13':`<div class="form">${fileInput('image/*')}<div id="inputPreview"></div><div id="editor"></div><button class="btn" id="go">ذخیره تصویر</button><div id="out"></div></div>`,
'14':`<div class="form"><textarea id="text" rows="12" placeholder="متن PDF..."></textarea><button class="btn" id="go">ساخت PDF</button></div>`,
'15':`<div class="form"><input id="icoText" value="A"><input id="icoColor" type="color" value="#111827"><button class="btn" id="go">ساخت PNG فاوآیکون‌ها</button><div id="out"></div></div>`,
'16':`<div class="form"><input id="noteTitle" placeholder="عنوان"><textarea id="note" rows="12" placeholder="یادداشت..."></textarea><div class="row"><button class="btn" id="save">ذخیره</button><button class="btn secondary" id="clear">پاک کردن</button></div><div id="out"></div></div>`,
'17':`<div class="form"><textarea id="text" rows="12" placeholder="متن را وارد کنید..."></textarea><button class="btn" id="go">تحلیل</button><div id="out"></div></div>`,
'18':`<div class="form">${fileInput('text/*,.js,.ts,.json,.css,.html,.htm,.xml,.kt,.java,.py,.php,.c,.cpp,.h')}<textarea id="code" rows="14" placeholder="کد را وارد کنید یا فایل را از حافظه انتخاب کنید..."></textarea><div class="row"><button class="btn" id="format">فرمت</button><button class="btn secondary" id="minify">فشرده‌سازی</button></div><div id="out"></div></div>`,
'19':`<div class="form"><input id="re" placeholder="مثلاً ^[A-Z]+$"><textarea id="txt" rows="8"></textarea><button class="btn" id="go">تست</button><div id="out"></div></div>`,
'20':`<div class="form"><textarea id="a" rows="8" placeholder="متن اول"></textarea><textarea id="b" rows="8" placeholder="متن دوم"></textarea><button class="btn" id="go">مقایسه</button><div id="out"></div></div>`,
'21':`<div class="form"><input id="title" placeholder="عنوان"><input id="desc" placeholder="توضیح"><input id="kw" placeholder="کلمات کلیدی"><input id="url" placeholder="URL اختیاری"><button class="btn" id="go">تولید</button><textarea id="out" rows="10"></textarea></div>`,
'22':imgBasic(`<input id="w" type="number" min="16" placeholder="عرض جدید"><input id="h" type="number" min="16" placeholder="ارتفاع جدید (اختیاری)"><select id="fmt"><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select><label>کیفیت<input id="quality" type="range" min=".1" max="1" value=".82" step=".05"></label>`),
'23':`<div class="form">${fileInput('image/*')}<div id="inputPreview"></div><input id="w" type="number" placeholder="عرض"><input id="h" type="number" placeholder="ارتفاع"><button class="btn" id="go">برش مرکزی</button><div id="out"></div></div>`,
'24':`<div class="form">${fileInput('audio/*')}<label>Bitrate<input id="br" type="number" value="128"></label><button class="btn" id="go">تبدیل به MP3</button><div id="out"></div></div>`,
'25':`<div class="form"><input id="qrText" value="https://example.com"><select id="qrSize"><option>256</option><option>512</option><option>1024</option></select><button class="btn" id="go">تولید QR</button><img id="qr" class="preview" alt="QR"><div id="out"></div></div>`,
'26':`<div class="form"><input id="qrCamera" type="file" accept="image/*" capture="environment" hidden><label class="drop" for="qrCamera">📷 عکس QR را از گالری انتخاب کنید یا با دوربین بگیرید</label><div id="inputPreview"></div><button class="btn" id="go">خواندن QR</button><div id="out"></div></div>`,
'27':`<div class="form"><input id="len" type="number" value="20" min="8" max="128"><label><input id="sym" type="checkbox" checked> نمادها</label><button class="btn" id="go">تولید</button><div class="out" id="out"></div></div>`,
'28':`<div class="form"><input id="month" type="month"><div id="cal" class="out"></div></div>`,
'29':`<div class="form"><select id="from"><option>شمسی</option><option>میلادی</option></select><input id="date" placeholder="مثلاً 1405/06/23"><button class="btn" id="go">تبدیل</button><div id="out"></div></div>`,
'30':`<div class="form"><input id="birth" type="date"><button class="btn" id="go">محاسبه سن</button><div id="out"></div></div>`,
'31':`<div class="form"><input id="c1" placeholder="تهران"><input id="c2" placeholder="شیراز"><button class="btn" id="go">محاسبه</button><div id="out"></div></div>`,
'32':`<div class="form"><input id="word" placeholder="مثلاً کتاب"><button class="btn" id="go">جست‌وجو</button><div id="out"></div></div>`,
'33':`<div class="form"><button class="btn" id="go">یک غزل</button><div id="out" class="out"></div></div>`,
'34':`<div class="form">${fileInput('application/pdf')}<button class="btn" id="go">تبدیل صفحات به عکس</button><div id="out"></div></div>`
};
function generic(id,name){return `<div class="form"><div class="out">«${esc(name)}» در این نسخه به ماژول Native متصل می‌شود. رابط آفلاین آماده است.</div></div>`}

async function readImage(file){return await createImageBitmap(file)}
async function canvasBlob(canvas,type='image/png',quality=.9){return await new Promise(r=>canvas.toBlob(r,type,quality))}
function ext(type){return type.split('/')[1].replace('jpeg','jpg')}
function showInputPreview(){
  const box=$('#inputPreview'),input=$('#file');
  if(!box||!input)return;
  box.innerHTML='';
  const files=[...input.files];
  if(!files.length)return;
  files.filter(f=>f.type.startsWith('image/')).slice(0,6).forEach(f=>{
    const img=document.createElement('img');img.className='preview input-preview';img.alt=f.name;img.src=URL.createObjectURL(f);img.onload=()=>URL.revokeObjectURL(img.src);box.appendChild(img);
  });
}
async function toBlobFromFile(file,type='image/png',quality=.9){
  const im=await createImageBitmap(file),c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);im.close?.();return canvasBlob(c,type,quality)
}
function showBusy(message='در حال پردازش...'){$('#out').textContent=message}
async function wire(id){
 const root=$('#modalBody');
 const input=$('#file');
 input?.addEventListener('change',async()=>{
   showInputPreview();
   if(id==='13' || id==='23'){
     const f=input.files[0]; if(f){
       const im=await readImage(f); const box=$('#editor');
       if(box){box.innerHTML=''; const c=document.createElement('canvas');c.className='preview';c.width=im.width;c.height=im.height;c.style.maxHeight='360px';c.getContext('2d').drawImage(im,0,0);box.appendChild(c);im.close?.();}
     }
   }
 });
 if(id==='4') $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('یک تصویر انتخاب کنید');showBusy('در حال کاهش حجم تصویر...');const im=await readImage(f),c=document.createElement('canvas');const target=Math.max(.1,Number($('#mb')?.value||1));const max=2048;const scale=Math.min(1,max/Math.max(im.width,im.height));c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);im.close?.();const b=await canvasBlob(c,'image/jpeg',.76);$('#out').innerHTML=`<img class="preview" src="${URL.createObjectURL(b)}" alt="تصویر کم‌حجم شده"><div class="out">${(f.size/1048576).toFixed(2)} MB ← ${ (b.size/1048576).toFixed(2)} MB</div>`;await download(b,`${f.name.replace(/\.[^.]+$/,'')}-compressed.jpg`);}catch(e){toast(e.message||'کاهش حجم تصویر ناموفق بود')}};
 if(id==='22') $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('یک تصویر انتخاب کنید');const w=Math.max(16,Number($('#w')?.value||0)),h=Math.max(16,Number($('#h')?.value||0));if(!w&&!h)return toast('عرض یا ارتفاع را وارد کنید');const im=await readImage(f);const ratio=im.width/im.height;const nw=w||Math.round(h*ratio),nh=h||Math.round(w/ratio);const c=document.createElement('canvas');c.width=nw;c.height=nh;c.getContext('2d').drawImage(im,0,0,nw,nh);im.close?.();const type=$('#fmt')?.value||'image/jpeg',q=Number($('#quality')?.value||.8),b=await canvasBlob(c,type,q);$('#out').innerHTML=`<img class="preview" src="${URL.createObjectURL(b)}" alt="تصویر تغییر اندازه یافته"><div class="out">${nw} × ${nh}</div>`;await download(b,`${f.name.replace(/\.[^.]+$/,'')}-${nw}x${nh}.${ext(b.type)}`);}catch(e){toast(e.message||'تغییر اندازه ناموفق بود')}};
 if(id==='6') $('#go').onclick=async()=>{try{const fs=[...input.files];if(!fs.length)return toast('یک یا چند تصویر انتخاب کنید');showBusy('در حال ساخت PDF...');const files=[];for(const f of fs)files.push(arrayBufferToB64(await f.arrayBuffer()));const r=await window.Capacitor.Plugins.NativeTools.createImagePdf({files});const b=new Blob([b64bytes(r.data)],{type:r.mime});await download(b,r.name||'images.pdf');$('#out').textContent=`${fs.length} تصویر در یک PDF ذخیره شد`;}catch(e){toast(e.message||'ساخت PDF ناموفق بود')}};
 if(id==='7') $('#go').onclick=async()=>{try{const fs=[...input.files];if(!fs.length)return toast('PDF انتخاب کنید');showBusy('در حال ادغام PDFها...');const files=[];for(const f of fs)files.push(arrayBufferToB64(await f.arrayBuffer()));const r=await window.Capacitor.Plugins.NativeTools.mergePdf({files});await download(new Blob([b64bytes(r.data)],{type:r.mime}),'merged.pdf');$('#out').textContent='PDFها با موفقیت ادغام شدند';}catch(e){toast(e.message||'ادغام PDF ناموفق بود')}};
 if(['8','11'].includes(id)) $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('یک تصویر انتخاب کنید');showBusy('در حال تبدیل...');const b=await toBlobFromFile(f,$('#fmt').value,.92);await download(b,`converted.${ext(b.type)}`);$('#out').textContent='تبدیل با موفقیت انجام شد';}catch(e){toast(e.message||'تبدیل ناموفق بود')}};
 if(id==='14') $('#go').onclick=async()=>{try{const text=$('#text').value.trim();if(!text)return toast('متن PDF را وارد کنید');showBusy('در حال ساخت PDF...');const r=await window.Capacitor.Plugins.NativeTools.createTextPdf({text});await download(new Blob([b64bytes(r.data)],{type:r.mime}),'document.pdf');$('#out').textContent='PDF ساخته و ذخیره شد';}catch(e){toast(e.message||'ساخت PDF ناموفق بود')}};
 if(id==='15') $('#go').onclick=async()=>{for(const s of [16,32,48,64,128,256,512]){const c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d');x.fillStyle=$('#icoColor').value;x.fillRect(0,0,s,s);x.fillStyle='#fff';x.font=`bold ${Math.max(8,Math.floor(s*.55))}px sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText($('#icoText').value.slice(0,2),s/2,s/2);await download(await canvasBlob(c,'image/png',1),`favicon-${s}.png`)}$('#out').textContent='فاوآیکون‌ها ذخیره شدند'};
 if(id==='16'){const key='notes';const load=JSON.parse(localStorage.getItem(key)||'[]');$('#out').innerHTML=load.map((n,i)=>`<div class="out"><b>${esc(n.t)}</b><p>${esc(n.b)}</p><button class="btn secondary" data-i="${i}">حذف</button></div>`).join('');$('#save').onclick=()=>{const a=JSON.parse(localStorage.getItem(key)||'[]');a.push({t:$('#noteTitle').value,b:$('#note').value});localStorage.setItem(key,JSON.stringify(a));toast('ذخیره شد');wire('16')};$('#clear').onclick=()=>{$('#noteTitle').value='';$('#note').value=''};}
 if(id==='17') $('#go').onclick=()=>{const s=$('#text').value,words=s.trim()?s.trim().split(/\s+/):[],chars=s.length,lines=s?s.split(/\n/).length:0;$('#out').textContent=`کاراکتر: ${chars}\nکلمه: ${words.length}\nخط: ${lines}\nجمله: ${(s.match(/[.!؟]/g)||[]).length}`};
 if(id==='18'){const codeFile=input;codeFile?.addEventListener('change',async()=>{const f=codeFile.files[0];if(!f)return;$('#code').value=await f.text();$('#out').textContent=`فایل ${f.name} آماده است`});$('#format').onclick=()=>{const code=$('#code').value;if(!code.trim())return toast('کد یا فایل را وارد کنید');try{const lang=(f=>f?.name?.split('.').pop().toLowerCase())(codeFile?.files?.[0]);const v=lang==='json'?JSON.stringify(JSON.parse(code),null,2):code.replace(/;\s*/g,';\n').replace(/\{\s*/g,'{\n').replace(/\}\s*/g,'\n}').replace(/,(?=[^\n])/g,',\n');$('#out').textContent=v}catch(e){toast('کد قابل قالب‌بندی نیست')}};$('#minify').onclick=async()=>{const code=$('#code').value;if(!code.trim())return toast('کد یا فایل را وارد کنید');const min=code.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1').replace(/\s+/g,' ').replace(/\s*([{};,:])\s*/g,'$1').trim();$('#out').textContent=min;const f=codeFile?.files?.[0];const name=f?.name?`${f.name.replace(/\.[^.]+$/,'')}-min${f.name.includes('.')?f.name.slice(f.name.lastIndexOf('.')):'.txt'}`:'compressed-code.txt';await download(new Blob([min],{type:'text/plain;charset=utf-8'}),name)}}
 if(id==='19') $('#go').onclick=()=>{try{const r=new RegExp($('#re').value,'g'),m=[...$('#txt').value.matchAll(r)];$('#out').textContent=m.length?`تعداد تطبیق: ${m.length}\n${m.map(x=>x[0]).join('\n')}`:'بدون تطبیق'}catch(e){$('#out').textContent='Regex نامعتبر: '+e.message}};
 if(id==='20') $('#go').onclick=()=>{
  const A=$('#a').value.replace(/\r\n/g,'\n').split('\n');
  const B=$('#b').value.replace(/\r\n/g,'\n').split('\n');
  const n=A.length,m=B.length;
  if(n*m>180000)return toast('دو متن برای مقایسه بیش از حد بزرگ هستند');
  const dp=Array.from({length:n+1},()=>new Uint32Array(m+1));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=A[i]===B[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  let i=0,j=0,rows=[];
  while(i<n&&j<m){
    if(A[i]===B[j]){rows.push(['same',A[i]]);i++;j++;}
    else if(dp[i+1][j]>=dp[i][j+1]){rows.push(['del',A[i]]);i++;}
    else{rows.push(['add',B[j]]);j++;}
  }
  while(i<n){rows.push(['del',A[i]]);i++;}
  while(j<m){rows.push(['add',B[j]]);j++;}
  $('#out').innerHTML=rows.map(([type,line])=>{const prefix=type==='same'?'  ':type==='del'?'- ':'+ ';return `<div class=\"diff-line ${type}\">${prefix}${esc(line)}</div>`}).join('')||'دو متن خالی هستند';
 };
 if(id==='21') $('#go').onclick=()=>{$('#out').value=`<title>${esc($('#title').value)}</title>\n<meta name="description" content="${esc($('#desc').value)}">\n<meta name="keywords" content="${esc($('#kw').value)}">${$('#url').value?`\n<link rel="canonical" href="${esc($('#url').value)}">`:''}`};
 if(id==='23') $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('یک تصویر انتخاب کنید');const im=await readImage(f),w=Math.min(Number($('#w').value)||im.width,im.width),h=Math.min(Number($('#h').value)||im.height,im.height),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(im,(im.width-w)/2,(im.height-h)/2,w,h,0,0,w,h);im.close?.();const b=await canvasBlob(c,'image/png',1);await download(b,'cropped.png');$('#out').innerHTML=`<img class="preview" src="${URL.createObjectURL(b)}" alt="برش">`; }catch(e){toast(e.message||'برش ناموفق بود')}};
 if(id==='25') $('#go').onclick=async()=>{try{const text=$('#qrText').value.trim();if(!text)return toast('متن یا لینک را وارد کنید');const r=await window.Capacitor.Plugins.NativeTools.generateQr({text,size:Number($('#qrSize').value)});const b=new Blob([b64bytes(r.data)],{type:r.mime});const img=$('#qr');img.src=URL.createObjectURL(b);await download(b,'qr.png');$('#out').textContent='QR ساخته و ذخیره شد';}catch(e){toast(e.message||'ساخت QR ناموفق بود')}};
 if(id==='27') $('#go').onclick=()=>{const n=Number($('#len').value),base='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789',symbols='!@#$%^&*_-+=',chars=$('#sym').checked?base+symbols:base,a=new Uint32Array(n);crypto.getRandomValues(a);$('#out').textContent=Array.from(a,x=>chars[x%chars.length]).join('')};
 if(id==='28'){const m=$('#month');m.value=new Date().toISOString().slice(0,7);const draw=()=>{const d=new Date(m.value+'-01T00:00:00'),y=d.getFullYear(),mo=d.getMonth(),days=new Date(y,mo+1,0).getDate(),start=new Date(y,mo,1).getDay();$('#cal').textContent=`${y}/${String(mo+1).padStart(2,'0')}\n`+' '.repeat(start*3)+Array.from({length:days},(_,i)=>String(i+1).padStart(2,' ')).join('   ')};m.oninput=draw;draw()}
 if(id==='29') $('#go').onclick=()=>{const p=$('#date').value.trim().split(/[\/-]/).map(Number);if(p.length!==3||p.some(Number.isNaN))return toast('تاریخ را مثل 1405/06/23 وارد کنید');const r=$('#from').value==='شمسی'?jalaliToGregorian(...p):gregorianToJalali(...p);$('#out').textContent=$('#from').value==='شمسی'?`میلادی: ${r.join('/')}`:`شمسی: ${r.join('/')}`};
 if(id==='30') $('#go').onclick=()=>{const b=new Date($('#birth').value),n=new Date();if(Number.isNaN(b.getTime()))return toast('تاریخ تولد را انتخاب کنید');let age=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))age--;$('#out').textContent=`سن: ${age} سال`};
 if(id==='31') $('#go').onclick=()=>{const a=findCity($('#c1').value),b=findCity($('#c2').value);if(!a||!b)return $('#out').textContent='شهر پیدا نشد. نام شهر را فارسی یا انگلیسی وارد کنید.';const R=6371,to=x=>x*Math.PI/180,dx=to(b.lat-a.lat),dy=to(b.lon-a.lon),h=Math.sin(dx/2)**2+Math.cos(to(a.lat))*Math.cos(to(b.lat))*Math.sin(dy/2)**2;$('#out').textContent=`${a.name} تا ${b.name}: ${(2*R*Math.asin(Math.sqrt(h))).toFixed(1)} کیلومتر هوایی`};
 if(id==='32') $('#go').onclick=()=>{const raw=normalizeWord($('#word').value);if(!raw)return toast('واژه یا عبارت را وارد کنید');const direct=DICTIONARY[raw];if(direct)return $('#out').textContent=`${direct.fa} → ${direct.en}`;const parts=raw.split(' ').filter(Boolean),translated=parts.map(w=>DICTIONARY[w]?.en||DICTIONARY[w]?.fa?DICTIONARY[w].en:w),known=parts.filter(w=>DICTIONARY[w]);if(known.length)return $('#out').textContent=`${raw} → ${translated.join(' ')}`;const fuzzy=Object.keys(DICTIONARY).find(k=>k.includes(raw)||raw.includes(k));if(fuzzy)return $('#out').textContent=`${DICTIONARY[fuzzy].fa} → ${DICTIONARY[fuzzy].en}`;$('#out').textContent='این واژه در فرهنگ آفلاین پیدا نشد. می‌توانید عبارت را کوتاه‌تر یا به فارسی/انگلیسی وارد کنید.'};
 if(id==='33') $('#go').onclick=()=>{const a=['دوش دیدم که ملائک در میخانه زدند','الا یا ایها الساقی ادر کاسا و ناولها','اگر آن ترک شیرازی به دست آرد دل ما را','صلاح کار کجا و من خراب کجا'];$('#out').textContent=a[Math.floor(Math.random()*a.length)]+'\n\n(نسخه آفلاین)'};
 if(id==='34') $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('یک PDF انتخاب کنید');showBusy('در حال تبدیل صفحات PDF به تصویر...');const r=await nativeCallNoSave('pdfToImages',f);const files=r.files||[];if(!files.length)return toast('صفحه‌ای پیدا نشد');for(const item of files){const blob=new Blob([b64bytes(item.data)],{type:item.mime});await download(blob,item.name)}$('#out').innerHTML=`${files.length} تصویر ساخته و ذخیره شد`; }catch(e){toast(e.message||'تبدیل PDF به عکس ناموفق بود')}};
 if(id==='13') $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('یک تصویر انتخاب کنید');const im=await readImage(f),s=Math.min(im.width,im.height),c=document.createElement('canvas');c.width=c.height=s;c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,s,s);im.close?.();const b=await canvasBlob(c,'image/png',1);await download(b,'edited.png');$('#out').innerHTML=`<img class="preview" src="${URL.createObjectURL(b)}" alt="ویرایش">`;}catch(e){toast(e.message||'ویرایش ناموفق بود')}};
 if(id==='1') $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('فایل صوتی انتخاب کنید');showBusy('در حال برش صوت...');await nativeCall('trimAudio',f,{start:Number($('#start').value)||0,end:(Number($('#start').value)||0)+(Number($('#dur').value)||10)});}catch(e){toast(e.message)}};
 if(id==='2') $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('ویدئو انتخاب کنید');showBusy('در حال کاهش حجم ویدئو...');await nativeCall('compressVideo',f,{quality:Number($('#q').value)||55});}catch(e){toast(e.message)}};
 if(id==='5') $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('فایل صوتی انتخاب کنید');showBusy('در حال کاهش حجم صوت...');await nativeCall('compressAudio',f,{bitrate:Number($('#br').value)||96});}catch(e){toast(e.message)}};
 if(id==='9') $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('تصویر انتخاب کنید');await nativeCall('heicEncode',f);}catch(e){toast(e.message)}};
 if(id==='10') $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('فایل HEIC انتخاب کنید');await nativeCall('heicDecode',f);}catch(e){toast(e.message)}};
 if(id==='12') $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('تصویر انتخاب کنید');await nativeCall('removeBackground',f);}catch(e){toast(e.message)}};
 if(id==='24') $('#go').onclick=async()=>{try{const f=input.files[0];if(!f)return toast('فایل صوتی انتخاب کنید');showBusy('در حال تبدیل به MP3...');await nativeCall('convertToMp3',f,{bitrate:Number($('#br').value)||128});}catch(e){toast(e.message)}};
 if(id==='26') {
   const qrInput=document.querySelector('#qrCamera');
   const mainInput=input;
   qrInput?.addEventListener('change',()=>{ if(qrInput.files?.[0] && mainInput) { const dt=new DataTransfer(); dt.items.add(qrInput.files[0]); mainInput.files=dt.files; showInputPreview(); } });
   $('#go').onclick=async()=>{try{const f=qrInput?.files?.[0]||mainInput?.files?.[0];if(!f)return toast('یک عکس QR انتخاب کنید یا با دوربین بگیرید');showBusy('در حال خواندن QR...');const r=await nativeCallNoSave('scanQr',f);const values=(r.results||[]).map(x=>x.value).filter(Boolean);$('#out').textContent=values.length?values.join('\n'):'QR پیدا نشد';if(values.length)toast('QR با موفقیت خوانده شد');}catch(e){toast(e.message||'خواندن QR ناموفق بود')}};
 }
}
async function nativeCallNoSave(method,file,extra={}){const data='data:'+file.type+';base64,'+arrayBufferToB64(await file.arrayBuffer());return await window.Capacitor.Plugins.NativeTools[method]({data,...extra})}

const normalizeWord=s=>String(s||'').trim().toLowerCase().replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/ۀ/g,'ه').replace(/ة/g,'ه').replace(/\u200c/g,' ').replace(/[ًٌٍَُِّْـ]/g,'').replace(/[^\p{L}\p{N}\s]+/gu,' ').replace(/\s+/g,' ').trim();
let DICTIONARY={};
let CITIES=[];
async function loadOfflineData(){
  try{const [d,c]=await Promise.all([fetch('dictionary.json').then(r=>r.json()),fetch('cities.json').then(r=>r.json())]);DICTIONARY=d;CITIES=c.map(x=>({name:x.fa,en:x.en,lat:Number(x.lat),lon:Number(x.lon),key:normalizeWord(x.fa)}));}catch(e){DICTIONARY={'کتاب':{fa:'کتاب',en:'book'},'book':{fa:'کتاب',en:'book'},'آب':{fa:'آب',en:'water'},'water':{fa:'آب',en:'water'},'خانه':{fa:'خانه',en:'house'},'house':{fa:'خانه',en:'house'}};CITIES=[];}}
function findCity(q){const n=normalizeWord(q);if(!n)return null;const exact=CITIES.find(c=>c.key===n||normalizeWord(c.en)===n);if(exact)return exact;const clean=CITIES.filter(c=>c.key.includes(n)||normalizeWord(c.en).includes(n));if(clean.length)return clean.sort((a,b)=>a.key.length-b.key.length)[0];return null}

