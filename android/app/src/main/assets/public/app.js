const state={tools:[],activeTool:null,lastInput:null,lastResult:null,category:"همه"};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const tools=[
{id:"compress-image",name:"کاهش حجم عکس",cat:"تصویر",icon:"🗜️",desc:"کاهش حجم JPG/PNG/WebP با کیفیت قابل تنظیم."},
{id:"image-convert",name:"فشرده‌ساز و مبدل تصویر",cat:"تصویر",icon:"🔄",desc:"تبدیل JPG، PNG و WebP روی گوشی."},
{id:"crop-image",name:"برش عکس",cat:"تصویر",icon:"✂️",desc:"برش آزاد یا با نسبت ۱:۱، ۱۶:۹ و ۴:۳."},
{id:"edit-image",name:"ویرایش و برش تصویر",cat:"تصویر",icon:"🎨",desc:"چرخش، آینه و فیلتر ساده."},
{id:"image-text",name:"عکس‌نوشته ساز",cat:"تصویر",icon:"🖊️",desc:"قرار دادن متن فارسی روی عکس."},
{id:"qr-create",name:"ساخت QR کد",cat:"QR",icon:"▦",desc:"ساخت QR آفلاین؛ نسخه سبک داخلی."},
{id:"qr-scan",name:"اسکن QR کد",cat:"QR",icon:"⌗",desc:"خواندن QR با قابلیت BarcodeDetector دستگاه."},
{id:"image-pdf",name:"تبدیل عکس به PDF",cat:"PDF",icon:"📄",desc:"ساخت PDF از یک یا چند تصویر."},
{id:"pdf-merge",name:"ادغام PDF",cat:"PDF",icon:"🧩",desc:"ادغام PDFهای ساخته‌شده توسط این برنامه."},
{id:"text-pdf",name:"پی‌دی‌اف ساز",cat:"PDF",icon:"📝",desc:"ساخت PDF از متن فارسی."},
{id:"favicon",name:"ساخت فاوآیکون",cat:"فایل",icon:"🌐",desc:"ساخت اندازه‌های استاندارد فاوآیکون."},
{id:"svg-image",name:"تبدیل SVG به عکس",cat:"تصویر",icon:"🧬",desc:"تبدیل SVG محلی به PNG."},
{id:"password",name:"تولید رمز عبور قوی",cat:"ابزار",icon:"🔐",desc:"ساخت رمز تصادفی امن روی دستگاه."},
{id:"notes",name:"دفترچه یادداشت",cat:"متن",icon:"📒",desc:"یادداشت‌های محلی با IndexedDB."},
{id:"text-analyzer",name:"تحلیلگر متن",cat:"متن",icon:"📊",desc:"شمارش واژه، حروف، جمله و زمان مطالعه."},
{id:"code-format",name:"فرمت‌دهی و فشرده‌سازی کد",cat:"توسعه",icon:"{}" ,desc:"فرمت پایه JS/HTML/CSS/JSON بدون سرور."},
{id:"regex",name:"تست ریجکس",cat:"توسعه",icon:"🔎",desc:"آزمون الگوی Regex و نمایش گروه‌ها."},
{id:"text-compare",name:"مقایسه متن",cat:"متن",icon:"⇄",desc:"نمایش تفاوت‌های دو متن."},
{id:"meta-tags",name:"تولید تگ متا",cat:"توسعه",icon:"🏷️",desc:"تولید تگ‌های متادیتای HTML."},
{id:"calendar",name:"تقویم",cat:"تاریخ",icon:"📅",desc:"تقویم ماهانه شمسی و میلادی."},
{id:"date-convert",name:"تبدیل تاریخ",cat:"تاریخ",icon:"🔁",desc:"تبدیل شمسی، میلادی و قمری تقریبی."},
{id:"age",name:"محاسبه سن",cat:"تاریخ",icon:"🎂",desc:"محاسبه سن دقیق تا روز."},
{id:"distance",name:"فاصله‌یاب شهرها",cat:"ایران",icon:"📍",desc:"فاصله تقریبی بین شهرهای ایران."},
{id:"dictionary",name:"دیکشنری",cat:"ایران",icon:"📚",desc:"دیکشنری انگلیسی و فارسی آفلاین."},
{id:"hafez",name:"فال حافظ",cat:"ایران",icon:"📜",desc:"انتخاب غزل از مجموعه محلی."},
{id:"audio-cutter",name:"برش فایل صوتی",cat:"صوت",icon:"✂️",desc:"برش دقیق MP3/WAV و قالب‌های صوتی سازگار با Android."},
{id:"audio-compress",name:"فشرده‌سازی صدا",cat:"صوت",icon:"🎚️",desc:"تبدیل صوت به AAC/M4A با بیت‌ریت انتخابی و پردازش روی گوشی."},
{id:"audio-mp3",name:"تبدیل صدا به MP3",cat:"صوت",icon:"🎵",desc:"تبدیل محلی به MP3 در صورت وجود encoder سازگار؛ MP3 ورودی بدون افت کپی می‌شود."},
{id:"video-compress",name:"فشرده‌سازی ویدئو",cat:"ویدئو",icon:"🎬",desc:"کاهش حجم ویدئو با رمزگذاری H.264/AAC روی خود دستگاه."},
{id:"image-heic",name:"تبدیل عکس به HEIC",cat:"تصویر",icon:"🖼️",desc:"تبدیل تصویر به HEIC در دستگاه‌های Android سازگار."},
{id:"heic-jpg",name:"تبدیل HEIC به JPG",cat:"تصویر",icon:"🔃",desc:"تبدیل HEIC/HEIF به JPG با Android ImageDecoder."},
{id:"background-remove",name:"حذف پس‌زمینه",cat:"تصویر",icon:"✂️",desc:"حذف آفلاین پس‌زمینه‌های ساده با جداسازی رنگ از نواحی گوشه تصویر."},
{id:"pdf-images",name:"PDF به تصاویر",cat:"PDF",icon:"🖨️",desc:"تبدیل صفحات PDF به PNG/JPG با PdfRenderer اندروید."}
];
const categories=["همه","تصویر","QR","PDF","متن","توسعه","تاریخ","ایران","صوت","ویدئو","ابزار","فایل"];
document.addEventListener("DOMContentLoaded",async()=>{
  state.tools=tools; renderTools(); renderChips(); bindNav(); loadPrefs(); loadActivity();
  $("#intentBtn").onclick=runIntent; $("#intentInput").addEventListener("keydown",e=>{if(e.key==="Enter")runIntent()});
  $("#themeBtn").onclick=()=>toggleDark(); $("#darkToggle").onchange=e=>setDark(e.target.checked);
  $("#compactToggle").onchange=e=>document.body.classList.toggle("compact",e.target.checked);
  $("#clearHistory").onclick=()=>{localStorage.removeItem("ia-history");loadActivity()};
  $("#clearNotes").onclick=()=>{indexedDB.deleteDatabase("iran-aryaei-notes");toast("یادداشت‌های محلی حذف شد.")};
  $("#closeSheet").onclick=closeSheet; $("#sheetBackdrop").onclick=closeSheet;
});
function renderChips(){ $("#chips").innerHTML=categories.map(c=>`<button class="${c===state.category?"active":""}" data-cat="${c}">${c}</button>`).join(""); $$("#chips button").forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;renderChips();renderTools()})}
function renderTools(){let list=state.category==="همه"?tools:tools.filter(t=>t.cat===state.category);$("#toolsGrid").innerHTML=list.map(t=>`<button class="tool-card" data-tool="${t.id}"><div class="tool-icon">${t.icon}</div><h3>${t.name}</h3><p>${t.desc}</p><span class="ready">● آماده</span></button>`).join("");$$(".tool-card").forEach(b=>b.onclick=()=>openTool(b.dataset.tool))}
function bindNav(){$$(".nav-item").forEach(n=>n.onclick=()=>{$$(".nav-item").forEach(x=>x.classList.remove("active"));n.classList.add("active");$$(".page").forEach(p=>p.classList.remove("active"));$("#"+n.dataset.page).classList.add("active")})}
async function runIntent(){let q=$("#intentInput").value.trim().toLowerCase();if(!q)return;let data;try{data=await fetch("intents.json").then(r=>r.json())}catch(e){data={intents:tools.map(t=>({id:t.id,keywords:[t.name]}))}};let best=null,score=0;for(const i of data.intents){let s=i.keywords.reduce((n,k)=>n+(q.includes(k.toLowerCase())?k.length:0),0);if(s>score){score=s;best=i}}if(best)openTool(best.id);else toast("ابزار مناسب پیدا نشد؛ نام ابزار را دقیق‌تر بنویسید.")}
function openTool(id){state.activeTool=id;state.lastInput=null;state.lastResult=null;const t=tools.find(x=>x.id===id);$("#sheetTitle").textContent=t.name;$("#sheetDescription").textContent=t.desc+" این ابزار بدون اینترنت و بدون آپلود اجرا می‌شود.";$("#toolBody").innerHTML=toolForm(id);$("#resultBox").classList.add("hidden");$("#toolSheet").classList.add("open");$("#sheetBackdrop").classList.add("open");$("#toolSheet").setAttribute("aria-hidden","false");bindToolForm(id)}
function closeSheet(){$("#toolSheet").classList.remove("open");$("#sheetBackdrop").classList.remove("open");$("#toolSheet").setAttribute("aria-hidden","true")}
function fileField(accept,multiple=false,capture=""){return `<div class="form-group"><label>فایل ورودی</label><label class="file-btn">انتخاب فایل<input id="fileInput" type="file" accept="${accept}" ${multiple?"multiple":""} ${capture?`capture="${capture}"`:""}></label></div>`}
function toolForm(id){
 if(id==="compress-image")return fileField("image/*")+range("quality",10,100,80,"کیفیت");
 if(id==="image-convert")return fileField("image/*")+select("format","فرمت",["image/jpeg|JPG","image/png|PNG","image/webp|WebP"])+range("quality",10,100,85,"کیفیت");
 if(id==="crop-image")return fileField("image/*")+select("ratio","نسبت",["free|آزاد","1:1|۱:۱","16:9|۱۶:۹","4:3|۴:۳"]);
 if(id==="edit-image")return fileField("image/*")+select("edit","عملیات",["none|بدون فیلتر","rotate|چرخش ۹۰ درجه","mirror|آینه افقی","gray|سیاه و سفید","warm|گرم"]);
 if(id==="image-text")return fileField("image/*")+input("text","متن","ایران آریایی")+range("fontSize",18,96,42,"اندازه متن")+input("color","رنگ","#FFFFFF","color");
 if(id==="qr-create")return input("qrText","متن یا لینک","https://example.com")+select("qrEc","سطح تصحیح خطا",["L|کم","M|متوسط","Q|زیاد","H|خیلی زیاد"])+range("qrSize",256,1024,512,"اندازه");
 if(id==="qr-scan")return fileField("image/*",false,"environment")+`<div class="form-group"><small>در دستگاه‌هایی که BarcodeDetector دارند، تصویر QR خوانده می‌شود. برای دوربین، از انتخاب فایل با گزینه دوربین استفاده کنید.</small></div>`;
 if(id==="image-pdf")return fileField("image/*",true)+select("paper","اندازه صفحه",["A4|A4","Letter|Letter"])+range("margin",0,60,20,"حاشیه (pt)");
 if(id==="pdf-merge")return fileField("application/pdf",true)+`<div class="form-group"><small>نسخه مرحله اول PDFهایی را که با PDF ساز همین برنامه تولید شده‌اند با اطمینان ادغام می‌کند.</small></div>`;
 if(id==="text-pdf")return `<div class="form-group"><label>متن</label><textarea id="pdfText" placeholder="متن فارسی را اینجا وارد کنید..."></textarea></div>`+range("pdfFont",10,24,14,"اندازه متن");
 if(id==="favicon")return fileField("image/*")+select("favSizes","اندازه‌ها",["all|16,32,48,64,128,256","small|16,32,48","large|64,128,256"]);
 if(id==="svg-image")return fileField("image/svg+xml,.svg")+select("svgFormat","فرمت خروجی",["image/png|PNG","image/jpeg|JPG"])+range("svgSize",128,2048,1024,"اندازه");
 if(id==="password")return range("passLen",8,64,20,"طول")+`<div class="form-group"><label>اجزای رمز</label><div class="badges"><label><input id="pUpper" type="checkbox" checked> حروف بزرگ</label><label><input id="pNums" type="checkbox" checked> اعداد</label><label><input id="pSymbols" type="checkbox" checked> نمادها</label></div></div>`;
 if(id==="notes")return `<input id="noteId" type="hidden"><div class="form-group"><label>عنوان</label><input id="noteTitle" placeholder="عنوان یادداشت"></div><div class="form-group"><label>متن</label><textarea id="noteText" placeholder="یادداشت خود را بنویسید..."></textarea></div><div id="notesList"></div>`;
 if(id==="text-analyzer")return `<div class="form-group"><label>متن</label><textarea id="analysisText" placeholder="متن را وارد کنید..."></textarea></div>`;
 if(id==="code-format")return `<div class="form-group"><label>زبان</label>${select("codeLang","زبان",["json|JSON","js|JavaScript","html|HTML","css|CSS"])}</div><div class="form-group"><label>کد</label><textarea id="codeText" class="mono" placeholder="کد را وارد کنید..."></textarea></div><div class="form-group"><label>حالت</label>${select("codeMode","عملیات",["format|فرمت‌دهی","minify|فشرده‌سازی"])}</div>`;
 if(id==="regex")return input("regexPattern","الگو","^([A-Za-z]+)\\s+(\\d+)$")+input("regexFlags","پرچم‌ها","i")+`<div class="form-group"><label>متن تست</label><textarea id="regexText"></textarea></div>`;
 if(id==="text-compare")return `<div class="form-group"><label>متن اول</label><textarea id="textA"></textarea></div><div class="form-group"><label>متن دوم</label><textarea id="textB"></textarea></div>`;
 if(id==="meta-tags")return input("metaTitle","عنوان","ایران آریایی")+input("metaDesc","توضیحات","ابزارهای آفلاین فارسی")+input("metaImage","آدرس تصویر","")+input("metaUrl","آدرس صفحه","");
 if(id==="calendar")return select("calType","تقویم",["jalali|شمسی","gregorian|میلادی"])+input("calYear","سال",String(new Date().getFullYear()))+input("calMonth","ماه",String(new Date().getMonth()+1));
 if(id==="date-convert")return select("dateFrom","مبدأ",["jalali|شمسی","gregorian|میلادی","hijri|قمری"])+input("dateValue","تاریخ","1405/01/01")+select("dateTo","مقصد",["gregorian|میلادی","jalali|شمسی","hijri|قمری"]);
 if(id==="age")return select("birthCal","تقویم تاریخ تولد",["jalali|شمسی","gregorian|میلادی"])+input("birthDate","تاریخ تولد","1380/01/01");
 if(id==="distance")return `<div class="form-group"><label>شهر مبدأ</label><input id="cityA" list="citiesDatalist" placeholder="تهران"></div><div class="form-group"><label>شهر مقصد</label><input id="cityB" list="citiesDatalist" placeholder="شیراز"></div><datalist id="citiesDatalist"></datalist>`;
 if(id==="dictionary")return select("dictDir","جهت جستجو",["auto|تشخیص خودکار","en-fa|انگلیسی ← فارسی","fa-en|فارسی ← انگلیسی"])+input("dictWord","واژه یا عبارت","hello")+`<div id="dictSuggestions" class="result-box"></div>`;
 if(id==="hafez")return `<div class="form-group"><label>انتخاب غزل</label><select id="ghazalIndex"><option value="random">تصادفی</option></select></div>`;
 if(id==="audio-cutter")return fileField("audio/*")+input("audioStart","شروع (ثانیه)","0","number")+input("audioEnd","پایان (ثانیه)","60","number")+`<div id="audioInfo" class="form-group"><small>فایل صوتی را انتخاب کنید تا مدت آن بررسی شود.</small></div>`;
 if(id==="audio-compress")return fileField("audio/*")+select("audioBitrate","بیت‌ریت",["32000|32 kbps","48000|48 kbps","64000|64 kbps","96000|96 kbps","128000|128 kbps","192000|192 kbps"]);
 if(id==="video-compress")return fileField("video/*")+select("videoQuality","کیفیت خروجی",["1000000|اقتصادی","2000000|متوسط","4000000|کیفیت بالا","8000000|بسیار بالا"]);
 if(id==="image-heic")return fileField("image/*");
 if(id==="heic-jpg")return fileField("image/heic,image/heif,.heic,.heif");
 if(id==="background-remove")return fileField("image/*")+range("bgTolerance",10,120,45,"حساسیت حذف پس‌زمینه");
 if(id==="pdf-images")return fileField("application/pdf")+select("pdfImageFormat","فرمت",["png|PNG","jpg|JPG"])+range("pdfImageScale",50,200,100,"مقیاس درصد");
 if(id==="audio-mp3")return fileField("audio/*")+select("mp3Bitrate","بیت‌ریت هدف",["64000|64 kbps","96000|96 kbps","128000|128 kbps","192000|192 kbps"]);
}
function input(id,label,value,type="text"){return `<div class="form-group"><label>${label}</label><input id="${id}" type="${type}" value="${value}"></div>`}
function select(id,label,opts){return `<div class="form-group"><label>${label}</label><select id="${id}">${opts.map(x=>{let [v,l]=x.split("|");return `<option value="${v}">${l}</option>`}).join("")}</select></div>`}
function range(id,min,max,val,label){return `<div class="form-group"><label>${label}: <output id="${id}Out">${val}</output></label><input id="${id}" type="range" min="${min}" max="${max}" value="${val}"></div>`}
function bindToolForm(id){if(id==="distance")loadCityNames();if(id==="dictionary")bindDictionaryForm();if(id==="notes")loadNotesList();if(id==="hafez")loadGhazals();if(id.startsWith("audio-"))bindAudioForm(id);$$("input[type=range]").forEach(r=>r.oninput=()=>{let o=$("#"+r.id+"Out");if(o)o.value=r.value});const f=$("#fileInput");if(f)f.onchange=()=>previewFiles(f.files);$("#runTool").onclick=()=>executeTool(id)}
async function loadCityNames(){const d=await jsonLocal("cities.json");if(d)$("#citiesDatalist").innerHTML=d.cities.map(c=>`<option value="${esc(c.name)}">`).join("")}
async function loadGhazals(){const d=await jsonLocal("ghazal.json");if(d)$("#ghazalIndex").innerHTML=`<option value="random">تصادفی</option>`+d.ghazals.map((g,i)=>`<option value="${i}">غزل ${fa(i+1)} — ${esc(g.title||"")}</option>`).join("")}
function previewFiles(files){if(!files?.length)return;let f=files[0];if(f.type.startsWith("image/")){let img=document.createElement("img");img.className="preview";img.src=URL.createObjectURL(f);$("#toolBody").appendChild(img)}}
async function executeTool(id){
 try{
  let result;
  if(id==="compress-image")result=await processImage("image/jpeg",Number($("#quality").value),false);
  if(id==="image-convert")result=await processImage($("#format").value,Number($("#quality").value),false);
  if(id==="crop-image")result=await cropImage();
  if(id==="edit-image")result=await editImage();
  if(id==="image-text")result=await imageText();
  if(id==="qr-create")result=makeQR();
  if(id==="qr-scan")result=await scanQR();
  if(id==="image-pdf")result=await imagesToPdf();
  if(id==="pdf-merge")result=await mergePdfs();
  if(id==="text-pdf")result=textToPdf();
  if(id==="favicon")result=await makeFavicons();
  if(id==="svg-image")result=await svgToImage();
  if(id==="password")result=makePassword();
  if(id==="notes")result=await saveNote();
  if(id==="text-analyzer")result=analyzeText();
  if(id==="code-format")result=formatCode();
  if(id==="regex")result=testRegex();
  if(id==="text-compare")result=compareText();
  if(id==="meta-tags")result=makeMeta();
  if(id==="calendar")result=await makeCalendar();
  if(id==="date-convert")result=convertDateTool();
  if(id==="age")result=calcAge();
  if(id==="distance")result=await cityDistance();
  if(id==="dictionary")result=await dictionaryTool();
  if(id==="hafez")result=await hafezTool();
  if(id==="audio-cutter")result=await nativeAudioTool("trim");
  if(id==="audio-compress")result=await nativeAudioTool("compress");
  if(id==="audio-mp3")result=await nativeAudioTool("mp3");
  if(id==="video-compress")result=await nativeMediaTool("videoCompress");
  if(id==="image-heic")result=await nativeMediaTool("imageHeic");
  if(id==="heic-jpg")result=await nativeMediaTool("heicJpg");
  if(id==="background-remove")result=await nativeMediaTool("backgroundRemove");
  if(id==="pdf-images")result=await nativeMediaTool("pdfImages");
  state.lastResult=result; showResult(result); addActivity(tools.find(t=>t.id===id).name,result?.name||"خروجی"); 
 }catch(e){toast(e.message||"خطا در اجرای عملیات")}
}
function getFiles(){const f=$("#fileInput")?.files;if(!f?.length)throw Error("ابتدا فایل را انتخاب کنید.");return [...f]}
function loadImage(file){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(Error("تصویر خوانده نشد"));img.src=URL.createObjectURL(file)})}
async function canvasImage(file,mode="normal"){const img=await loadImage(file),c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext("2d");x.drawImage(img,0,0);return {c,x,img}}
function blobFromCanvas(c,type,q){return new Promise(r=>c.toBlob(r,type,q))}
async function processImage(type,q){const f=getFiles()[0],{c}=await canvasImage(f);const b=await blobFromCanvas(c,type,q/100);return {blob:b,name:"iran-aryaei."+ext(type),html:`<div class="before-after"><div><small>ورودی</small><img src="${URL.createObjectURL(f)}"></div><div><small>خروجی</small><img src="${URL.createObjectURL(b)}"></div></div><p>حجم: ${fmt(f.size)} ← ${fmt(b.size)} · کاهش ${Math.max(0,Math.round((1-b.size/f.size)*100))}%</p>`}}
function ext(type){return type.split("/")[1].replace("jpeg","jpg")}
async function cropImage(){const f=getFiles()[0],{img}=await canvasImage(f),ratio=$("#ratio").value;let sw=img.naturalWidth,sh=img.naturalHeight;let w=sw,h=sh;if(ratio!=="free"){const [rw,rh]=ratio.split(":").map(Number);if(sw/sh>rw/rh)w=Math.round(sh*rw/rh);else h=Math.round(sw*rh/rw)}const sx=Math.round((sw-w)/2),sy=Math.round((sh-h)/2),c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,sx,sy,w,h,0,0,w,h);const b=await blobFromCanvas(c,"image/png",1);return {blob:b,name:"cropped.png",html:`<img class="preview" src="${URL.createObjectURL(b)}"><p>${w}×${h}px</p>`}}
async function editImage(){const f=getFiles()[0],{img}=await canvasImage(f),op=$("#edit").value;let c=document.createElement("canvas"),x;if(op==="rotate"){c.width=img.naturalHeight;c.height=img.naturalWidth;x=c.getContext("2d");x.translate(c.width/2,c.height/2);x.rotate(Math.PI/2);x.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2)}else{c.width=img.naturalWidth;c.height=img.naturalHeight;x=c.getContext("2d");if(op==="mirror"){x.translate(c.width,0);x.scale(-1,1)}x.filter=op==="gray"?"grayscale(1)":op==="warm"?"sepia(.45) saturate(1.2)":"none";x.drawImage(img,0,0)}const b=await blobFromCanvas(c,"image/png",1);return {blob:b,name:"edited.png",html:`<img class="preview" src="${URL.createObjectURL(b)}">`}}
async function imageText(){const f=getFiles()[0],{c,x}=await canvasImage(f);x.font=`bold ${$("#fontSize").value}px Tahoma`;x.fillStyle=$("#color").value;x.textAlign="center";x.direction="rtl";x.shadowColor="rgba(0,0,0,.55)";x.shadowBlur=6;x.fillText($("#text").value,c.width/2,c.height-60);const b=await blobFromCanvas(c,"image/png",1);return {blob:b,name:"image-text.png",html:`<img class="preview" src="${URL.createObjectURL(b)}">`}}
function makeQR(){const text=$("#qrText").value.trim();if(!text)throw Error("متن QR را وارد کنید.");const c=document.createElement("canvas");QRLite.render(c,text,Number($("#qrSize").value));return {blobPromise:new Promise(r=>c.toBlob(r,"image/png",1)),name:"qr-code.png",html:`<img class="preview" src="${c.toDataURL("image/png")}"><p>QR آفلاین · سطح ${$("#qrEc").value}</p>`}}
async function scanQR(){const f=getFiles()[0];if(!("BarcodeDetector" in window))throw Error("BarcodeDetector در WebView این دستگاه در دسترس نیست. برای نسخه بعدی می‌توان decoder محلی اختصاصی اضافه کرد.");const det=new BarcodeDetector({formats:["qr_code"]});const img=await loadImage(f),codes=await det.detect(img);if(!codes.length)throw Error("QR پیدا نشد.");return {name:"qr-result.txt",text:codes[0].rawValue,html:`<div class="mono">${esc(codes[0].rawValue)}</div><div class="result-actions"><button onclick="navigator.clipboard?.writeText(${JSON.stringify(codes[0].rawValue)})">کپی</button></div>`}}
async function imagesToPdf(){const files=getFiles();const pages=[];for(const f of files){const {img}=await canvasImage(f);pages.push(await jpegBytes(img,0.9))}const blob=makeSimplePdf(pages,Number($("#margin").value));return {blob,name:"iran-aryaei-images.pdf",html:`<p>PDF ${files.length} صفحه‌ای ساخته شد.</p>`}}
async function jpegBytes(img,q){const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext("2d").drawImage(img,0,0);return new Uint8Array(await (await blobFromCanvas(c,"image/jpeg",q)).arrayBuffer())}
function makeSimplePdf(jpegs,margin){/* PDF generator: embeds JPEGs as pages, no external library. */
 let chunks=[],offsets=[],pos=0;const add=s=>{let b=new TextEncoder().encode(s);chunks.push(b);pos+=b.length};add("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
 let objs=[];let obj=1;const catalogId=obj++, pagesId=obj++, fontId=obj++;
 for(let i=0;i<jpegs.length;i++){let imgId=obj++, contId=obj++;objs.push({id:imgId,type:"img",data:jpegs[i]});objs.push({id:contId,type:"cont",img:imgId});}
 let pageIds=[];for(let i=0;i<jpegs.length;i++)pageIds.push(obj++);
 objs.push({id:pagesId,type:"pages",kids:pageIds});objs.push({id:fontId,type:"font"});
 const max=Math.max(...jpegs.map((b,i)=>{let wh=readJpegSize(b);return wh[0]/wh[1]}),1);
 for(const o of objs){offsets[o.id]=pos;if(o.type==="img"){let [w,h]=readJpegSize(o.data);add(`${o.id} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${o.data.length} >>\nstream\n`);chunks.push(o.data);pos+=o.data.length;add("\nendstream\nendobj\n")}
 else if(o.type==="cont"){let data=`q\n${500-margin} 0 0 ${350-margin} ${margin} ${margin} cm\n/Im${o.img} Do\nQ`;add(`${o.id} 0 obj\n<< /Length ${data.length} >>\nstream\n${data}\nendstream\nendobj\n`)}
 else if(o.type==="pages"){add(`${o.id} 0 obj\n<< /Type /Pages /Kids [${o.kids.map(k=>k+" 0 R").join(" ")}] /Count ${o.kids.length} >>\nendobj\n`)}
 else if(o.type==="font"){add(`${o.id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`)}}
 offsets[catalogId]=pos;add(`${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`);
 for(let i=0;i<pageIds.length;i++){let pid=pageIds[i],imgId=objs.find(o=>o.type==="img"&&o.id===objs.filter(x=>x.type==="img")[i].id).id,contId=objs.find(o=>o.type==="cont"&&o.img===imgId).id;let [w,h]=readJpegSize(jpegs[i]);offsets[pid]=pos;add(`${pid} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 500 350] /Resources << /XObject << /Im${imgId} ${imgId} 0 R >> >> /Contents ${contId} 0 R >>\nendobj\n`)}
 let xref=pos, count=Math.max(...Object.keys(offsets).map(Number))+1;add(`xref\n0 ${count}\n0000000000 65535 f \n`);for(let i=1;i<count;i++)add(String(offsets[i]||0).padStart(10,"0")+" 00000 n \n");add(`trailer\n<< /Size ${count} /Root 1 0 R /Pages ${pagesId} 0 R >>\nstartxref\n${xref}\n%%EOF`);return new Blob(chunks,{type:"application/pdf"})}
function readJpegSize(bytes){for(let i=0;i<bytes.length-9;i++){if(bytes[i]===0xff&&bytes[i+1]===0xc0){return [bytes[i+7]*256+bytes[i+8],bytes[i+5]*256+bytes[i+6]]}}return [100,100]}
async function mergePdfs(){
 const files=getFiles(); if(files.length<2)throw Error("حداقل دو PDF لازم است.");
 const p=nativePlugin(); if(!p)throw Error("ادغام PDF در نسخه اندروید در دسترس است.");
 const paths=[]; for(const f of files){const x=await p.writeTempFile({name:f.name,data:await blobToBase64(f)});paths.push(x.path)}
 const out=await p.mergePdfs({inputPaths:paths});
 return {nativePath:out.path,name:out.name,mime:out.mime,size:out.size,html:`<p>${fa(files.length)} فایل PDF با موفقیت ادغام شد.</p>`};
}

async function jsonLocal(file){try{return await fetch(file).then(r=>r.json())}catch(e){return null}}
async function makeFavicons(){const f=getFiles()[0],{img}=await canvasImage(f),sizes=$("#favSizes").value.split(",").map(Number),parts=[];for(const n of sizes){const c=document.createElement("canvas");c.width=c.height=n;c.getContext("2d").drawImage(img,0,0,n,n);parts.push({name:`favicon-${n}.png`,bytes:new Uint8Array(await (await blobFromCanvas(c,"image/png",1)).arrayBuffer()),preview:c.toDataURL("image/png")})}const zip=makeZipStore(parts);return {blob:zip,name:"favicons.zip",html:`<p>${fa(sizes.length)} اندازه ساخته شد و همه در یک ZIP قرار گرفت.</p><img class="preview" src="${parts[0].preview}">`}}
function crc32(bytes){let table=crc32.table;if(!table){table=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);table[n]=c>>>0;}crc32.table=table;}let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function u16(v){return new Uint8Array([v&255,(v>>>8)&255])}
function u32(v){return new Uint8Array([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255])}
function makeZipStore(files){const locals=[],central=[];let offset=0;const enc=new TextEncoder();for(const f of files){const name=enc.encode(f.name),crc=crc32(f.bytes),lh=new Uint8Array(30+name.length+f.bytes.length);let p=0;lh.set([80,75,3,4],p);p+=4;lh.set(u16(20),p);p+=2;lh.set(u16(0),p);p+=2;lh.set(u16(0),p);p+=2;lh.set(u16(0),p);p+=2;lh.set(u16(0),p);p+=2;lh.set(u32(crc),p);p+=4;lh.set(u32(f.bytes.length),p);p+=4;lh.set(u32(f.bytes.length),p);p+=4;lh.set(u16(name.length),p);p+=2;lh.set(u16(0),p);p+=2;lh.set(name,p);p+=name.length;lh.set(f.bytes,p);locals.push(lh);const ch=new Uint8Array(46+name.length);p=0;ch.set([80,75,1,2],p);p+=4;ch.set(u16(20),p);p+=2;ch.set(u16(20),p);p+=2;ch.set(u16(0),p);p+=2;ch.set(u16(0),p);p+=2;ch.set(u16(0),p);p+=2;ch.set(u16(0),p);p+=2;ch.set(u32(crc),p);p+=4;ch.set(u32(f.bytes.length),p);p+=4;ch.set(u32(f.bytes.length),p);p+=4;ch.set(u16(name.length),p);p+=2;ch.set(u16(0),p);p+=2;ch.set(u16(0),p);p+=2;ch.set(u16(0),p);p+=2;ch.set(u16(0),p);p+=2;ch.set(u32(0),p);p+=4;ch.set(u32(offset),p);p+=4;ch.set(name,p);central.push(ch);offset+=lh.length}const cdSize=central.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22);let p=0;end.set([80,75,5,6],p);p+=4;end.set(u16(0),p);p+=2;end.set(u16(0),p);p+=2;end.set(u16(files.length),p);p+=2;end.set(u16(files.length),p);p+=2;end.set(u32(cdSize),p);p+=4;end.set(u32(offset),p);p+=4;end.set(u16(0),p);const parts=[...locals,...central,end];return new Blob(parts,{type:"application/zip"})}
async function svgToImage(){const f=getFiles()[0],svg=await f.text();if(!svg.includes("<svg"))throw Error("SVG معتبر نیست.");const url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));const img=await new Promise((res,rej)=>{let i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error("SVG خوانده نشد"));i.src=url});const n=Number($("#svgSize").value),c=document.createElement("canvas");c.width=c.height=n;c.getContext("2d").drawImage(img,0,0,n,n);const b=await blobFromCanvas(c,$("#svgFormat").value,0.92);return {blob:b,name:"converted."+ext($("#svgFormat").value),html:`<img class="preview" src="${URL.createObjectURL(b)}">`}}
function makePassword(){let chars="abcdefghijklmnopqrstuvwxyz",extra="";if($("#pUpper").checked)extra+="ABCDEFGHIJKLMNOPQRSTUVWXYZ";if($("#pNums").checked)extra+="0123456789";if($("#pSymbols").checked)extra+="!@#$%^&*()-_=+[]{}";chars+=extra;if(!chars)throw Error("حداقل یک مجموعه کاراکتر را فعال کنید.");const a=new Uint32Array(Number($("#passLen").value));crypto.getRandomValues(a);let out=[...a].map(x=>chars[x%chars.length]).join("");return {name:"password.txt",text:out,html:`<div class="mono" style="font-size:20px">${esc(out)}</div><div class="result-actions"><button onclick="navigator.clipboard?.writeText(${JSON.stringify(out)})">کپی رمز</button></div>`}}
function openNotesDB(){return new Promise((res,rej)=>{const r=indexedDB.open("iran-aryaei-notes",1);r.onupgradeneeded=()=>r.result.createObjectStore("notes",{keyPath:"id",autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function saveNote(){const title=$("#noteTitle").value.trim(),text=$("#noteText").value.trim();if(!title&&!text)throw Error("عنوان یا متن یادداشت را وارد کنید.");const db=await openNotesDB(),id=$("#noteId")?.value;await new Promise((res,rej)=>{const st=db.transaction("notes","readwrite").objectStore("notes"),q=id?st.put({id:Number(id),title:title||"بدون عنوان",text,updated:Date.now()}):st.add({title:title||"بدون عنوان",text,created:Date.now()});q.onsuccess=res;q.onerror=()=>rej(q.error)});db.close();if($("#noteId"))$("#noteId").value="";await loadNotesList();return {name:"note.txt",text,html:`<p>یادداشت «${esc(title||"بدون عنوان")}» ذخیره شد.</p>`}}
async function loadNotesList(){const box=$("#notesList");if(!box)return;const db=await openNotesDB();const rows=await new Promise((res,rej)=>{const q=db.transaction("notes","readonly").objectStore("notes").getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error)});db.close();box.innerHTML=rows.length?`<div class="form-group"><input id="noteSearch" placeholder="جستجوی یادداشت..."></div>`+rows.sort((a,b)=>(b.updated||b.created)-(a.updated||a.created)).map(n=>`<div class="activity-row"><b>${esc(n.title)}</b><small>${esc((n.text||"").slice(0,90))}</small><div><button data-edit-note="${n.id}">ویرایش</button><button data-del-note="${n.id}">حذف</button></div></div>`).join(""):"<small>هنوز یادداشتی ثبت نشده است.</small>";$$('[data-edit-note]').forEach(b=>b.onclick=async()=>{const n=rows.find(x=>x.id===Number(b.dataset.editNote));if(n){$("#noteTitle").value=n.title;$("#noteText").value=n.text;$("#noteId").value=n.id;}});$$('[data-del-note]').forEach(b=>b.onclick=async()=>{const db2=await openNotesDB();db2.transaction("notes","readwrite").objectStore("notes").delete(Number(b.dataset.delNote));setTimeout(()=>{db2.close();loadNotesList()},50)});const search=$("#noteSearch");if(search)search.oninput=()=>{const q=search.value.trim().toLowerCase();$$('[data-edit-note]').forEach(b=>{const n=rows.find(x=>x.id===Number(b.dataset.editNote));b.closest('.activity-row').style.display=!q||`${n.title} ${n.text}`.toLowerCase().includes(q)?"":"none"})}}
function bindDictionaryForm(){const i=$("#dictWord");if(i)i.onkeydown=e=>{if(e.key==="Enter")executeTool("dictionary")}}
function analyzeText(){const t=$("#analysisText").value,words=t.trim()?t.trim().split(/\s+/).length:0,letters=(t.match(/[\p{L}\p{N}]/gu)||[]).length,sent=(t.match(/[.!?؟؛]+/g)||[]).length;return {name:"text-analysis.txt",text:`واژه: ${words}\nحروف و اعداد: ${letters}\nجمله: ${sent}\nزمان مطالعه تقریبی: ${Math.max(1,Math.ceil(words/200))} دقیقه`,html:`<p>واژه: <b>${fa(words)}</b> · حروف: <b>${fa(letters)}</b> · جمله: <b>${fa(sent)}</b> · مطالعه: <b>${fa(Math.max(1,Math.ceil(words/200)))} دقیقه</b></p>`}}
function formatCode(){const code=$("#codeText").value,lang=$("#codeLang").value,mode=$("#codeMode").value;let out=code;if(mode==="minify"){if(lang==="json"){try{out=JSON.stringify(JSON.parse(code))}catch{out=code.replace(/\s+/g," ").trim()}}else out=code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm,"").replace(/\s+/g," ").trim()}else{try{if(lang==="json")out=JSON.stringify(JSON.parse(code),null,2);else out=code.replace(/>\s*</g,"><").replace(/;\s*/g,";\\n").replace(/{\s*/g,"{\\n").replace(/}\s*/g,"\\n}\\n")}catch{out=code}}return {name:"formatted-code.txt",text:out,html:`<div class="mono">${esc(out)}</div>`}}
function testRegex(){let re;try{re=new RegExp($("#regexPattern").value,$("#regexFlags").value)}catch(e){throw Error("الگوی Regex نامعتبر است.");}const t=$("#regexText").value,m=re.exec(t);return {name:"regex-result.txt",text:m?`MATCH\n${m.slice(1).join("\n")}`:"NO MATCH",html:m?`<p>تطبیق موفق بود.</p><div class="mono">${esc(JSON.stringify(m.slice(1)))}</div>`:"<p>تطبیقی پیدا نشد.</p>"}}
function compareText(){const a=$("#textA").value,b=$("#textB").value,aa=a.split(/\s+/),bb=b.split(/\s+/),out=[];const n=Math.max(aa.length,bb.length);for(let i=0;i<n;i++){if(aa[i]===bb[i])out.push(esc(aa[i]||""));else{if(aa[i])out.push(`<del>${esc(aa[i])}</del>`);if(bb[i])out.push(`<ins>${esc(bb[i])}</ins>`)}}return {name:"text-diff.html",text:out.join(" "),html:`<div style="line-height:2">${out.join(" ")}</div>`}}
function makeMeta(){const e=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;");const title=e($("#metaTitle").value),desc=e($("#metaDesc").value),img=e($("#metaImage").value),url=e($("#metaUrl").value);const out=`<title>${title}</title>\n<meta name="description" content="${desc}">\n<meta property="og:title" content="${title}">\n<meta property="og:description" content="${desc}">\n${img?`<meta property="og:image" content="${img}">`:""}\n${url?`<meta property="og:url" content="${url}">`:""}`;return {name:"meta-tags.html",text:out,html:`<div class="mono">${esc(out)}</div>`}}

async function textToPdf(){
 const text=$("#pdfText").value.trim(); if(!text)throw Error("متن را وارد کنید.");
 const font=Number($("#pdfFont").value);
 const lines=[];
 for(const paragraph of text.split(/\r?\n/)){
   const words=paragraph.split(/\s+/); let line="";
   for(const w of words){const test=line?line+" "+w:w;if(measureText(test,font)>480){if(line)lines.push(line);line=w}else line=test}
   if(line)lines.push(line); if(!line)lines.push(" ");
 }
 const perPage=32,pages=[];
 for(let i=0;i<lines.length;i+=perPage){
   const page=lines.slice(i,i+perPage),c=document.createElement("canvas");c.width=595;c.height=842;
   const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);
   x.fillStyle="#111";x.font=`${font}px Tahoma, Arial, sans-serif`;x.textAlign="right";x.direction="rtl";
   page.forEach((line,j)=>x.fillText(line,545,55+j*24));
   pages.push(await jpegBytesCanvas(c,0.94));
 }
 const blob=makeSimplePdf(pages,20);
 return {blob,name:"iran-aryaei-text.pdf",html:`<p>PDF فارسی ${fa(pages.length)} صفحه‌ای ساخته شد.</p>`}
}
function measureText(t,font){const c=document.createElement("canvas"),x=c.getContext("2d");x.font=`${font}px Tahoma, Arial, sans-serif`;return x.measureText(t).width}
async function jpegBytesCanvas(c,q){const b=await blobFromCanvas(c,"image/jpeg",q);return new Uint8Array(await b.arrayBuffer())}

function div(a,b){return Math.floor(a/b)}
function jalaliToJdn(jy,jm,jd){const epbase=jy-(jy>=0?474:473),epyear=474+(epbase%2820);return jd+(jm<=7?(jm-1)*31:(jm-1)*30+6)+Math.floor((epyear*682-110)/2816)+(epyear-1)*365+Math.floor(epbase/2820)*1029983+(1948320-1)}
function jdnToJalali(jdn){let depoch=jdn-jalaliToJdn(475,1,1),cycle=Math.floor(depoch/1029983),cyear=depoch%1029983;let ycycle;if(cyear<366)ycycle=0;else{let aux1=Math.floor(cyear/366),aux2=cyear%366;ycycle=Math.floor((2134*aux1+2816*aux2+2816)/1028522)+aux1+1}let jy=ycycle+2820*cycle+474;if(jy<=0)jy--;let yday=jdn-jalaliToJdn(jy,1,1)+1;let jm=yday<=186?Math.ceil(yday/31):Math.ceil((yday-6)/30),jd=jdn-jalaliToJdn(jy,jm,1)+1;return [jy,jm,jd]}
function gregToJdn(y,m,d){let a=Math.floor((14-m)/12),y2=y+4800-a,m2=m+12*a-3;return d+Math.floor((153*m2+2)/5)+365*y2+Math.floor(y2/4)-Math.floor(y2/100)+Math.floor(y2/400)-32045}
function jdnToGreg(j){let a=j+32044,b=Math.floor((4*a+3)/146097),c=a-Math.floor(146097*b/4),d=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*d/4),m=Math.floor((5*e+2)/153),day=e-Math.floor((153*m+2)/5)+1,month=m+3-12*Math.floor(m/10),year=100*b+d-4800+Math.floor(m/10);return [year,month,day]}
function parseDate(v,cal){const a=v.split(/[\/-]/).map(Number);if(a.length!==3||a.some(Number.isNaN))throw Error("تاریخ نامعتبر است.");if(cal==="jalali")return jalaliToJdn(...a);if(cal==="gregorian")return gregToJdn(...a);if(cal==="hijri")return hijriToJdn(...a);throw Error("تقویم نامعتبر")}
function hijriToJdn(y,m,d){return d+Math.ceil(29.5*(m-1))+(y-1)*354+Math.floor((3+11*y)/30)+1948439}
function jdnToHijri(j){let y=Math.floor((30*(j-1948439)+10646)/10631),m=Math.min(12,Math.ceil((j-(29+approxHijriStart(y)))/29.5)+1);while(m>1&&hijriToJdn(y,m,1)>j)m--;return [y,m,j-hijriToJdn(y,m,1)+1]}
function approxHijriStart(y){return (y-1)*354+Math.floor((3+11*y)/30)}
function fmtDate(jdn,cal){let a=cal==="jalali"?jdnToJalali(jdn):cal==="gregorian"?jdnToGreg(jdn):jdnToHijri(jdn);return a.map(String).map(x=>x.padStart(2,"0")).join("/")}
async function convertDateTool(){const from=$("#dateFrom").value,to=$("#dateTo").value,j=parseDate($("#dateValue").value,from);return {name:"date-conversion.txt",text:`${$("#dateValue").value} (${from}) = ${fmtDate(j,to)} (${to})`,html:`<p><b>${esc(fmtDate(j,to))}</b></p>`}}
function calcAge(){const cal=$("#birthCal").value,j=parseDate($("#birthDate").value,cal),now=new Date(),today=gregToJdn(now.getFullYear(),now.getMonth()+1,now.getDate());if(j>today)throw Error("تاریخ تولد نمی‌تواند در آینده باشد.");let [by,bm,bd]=cal==="jalali"?jdnToJalali(j):jdnToGreg(j);let [cy,cm,cd]=cal==="jalali"?jdnToJalali(today):jdnToGreg(today);let y=cy-by,m=cm-bm,d=cd-bd;if(d<0){m--;const prevJ=cal==="jalali"?jalaliToJdn(cy,cm,1)-1:gregToJdn(cy,cm,1)-1;d+=1+(cal==="jalali"?jdnToJalali(prevJ)[2]-1:jdnToGreg(prevJ)[2])}if(m<0){y--;m+=12}return {name:"age.txt",text:`سن: ${y} سال، ${m} ماه، ${d} روز`,html:`<p>سن دقیق: <b>${fa(y)} سال، ${fa(m)} ماه، ${fa(d)} روز</b></p>`}}
async function makeCalendar(){let cal=$("#calType").value,y=Number($("#calYear").value),m=Number($("#calMonth").value);if(cal==="jalali"){let first=jalaliToJdn(y,m,1),days=m<=6?31:m<=11?30:(jalaliToJdn(y+1,1,1)-first);let g=jdnToGreg(first);return calendarHtml(y,m,days,(first+1)%7,"شمسی",g)}else{let first=gregToJdn(y,m,1),days=new Date(y,m,0).getDate();return calendarHtml(y,m,days,first%7,"میلادی",jdnToJalali(first))}}
function calendarHtml(y,m,days,start,label,other){let h=`<p><b>تقویم ${label} ${fa(y)}/${fa(m)}</b></p><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;text-align:center">`;for(let i=0;i<start;i++)h+="<span></span>";for(let d=1;d<=days;d++)h+=`<span style="padding:8px;background:var(--bg);border-radius:8px">${fa(d)}</span>`;return {name:"calendar.html",text:`تقویم ${label} ${y}/${m}`,html:h+"</div><small>معادل تقریبی/تبدیل مبنا: "+other.join("/")+"</small>"}}
async function cityDistance(){const data=await jsonLocal("cities.json");if(!data)throw Error("cities.json پیدا نشد.");const norm=s=>s.trim().toLowerCase();const a=data.cities.find(c=>norm(c.name)===norm($("#cityA").value)||c.aliases?.some(x=>norm(x)===norm($("#cityA").value)));const b=data.cities.find(c=>norm(c.name)===norm($("#cityB").value)||c.aliases?.some(x=>norm(x)===norm($("#cityB").value)));if(!a||!b)throw Error("نام شهر در داده محلی پیدا نشد.");const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLon=(b.lon-a.lon)*Math.PI/180,x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2,km=R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));return {name:"city-distance.txt",text:`${a.name} تا ${b.name}: ${Math.round(km)} km`,html:`<p>فاصله خط مستقیم: <b>${fa(Math.round(km))} کیلومتر</b></p><p>زمان تقریبی با خودرو: ${fa(Math.round(km/75))} ساعت</p>`}}
async function dictionaryTool(){const data=await jsonLocal("dictionary.json");if(!data)throw Error("dictionary.json پیدا نشد.");const raw=$("#dictWord").value.trim();if(!raw)throw Error("واژه را وارد کنید.");const q=normText(raw),dir=$("#dictDir")?.value||"auto";const persian=/[\u0600-\u06FF]/.test(raw);let arr=data.entries.filter(x=>{const en=normText(x.en),fa=normText(x.fa);if(dir==="en-fa"||(dir==="auto"&&!persian))return en===q||en.includes(q);if(dir==="fa-en"||(dir==="auto"&&persian))return fa===q||fa.includes(q);return en===q||fa===q||en.includes(q)||fa.includes(q)}).slice(0,20);if(!arr.length)return {name:"dictionary.txt",text:"پیدا نشد",html:"<p>واژه یا عبارت پیدا نشد.</p>"};return {name:"dictionary.txt",text:arr.map(x=>`${x.en} — ${x.fa}`).join("\n"),html:`<p><small>${fa(arr.length)} نتیجه از بانک آفلاین</small></p>`+arr.map(x=>`<div class="activity-row"><b>${esc(x.en)}</b><span>↔</span><span>${esc(x.fa.replaceAll("؛", "، "))}</span></div>`).join("")}}
function normText(s){return String(s).toLowerCase().replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[ۀة]/g,"ه").replace(/[\u200c\u200f\u200e]/g,"").trim()}
async function hafezTool(){const data=await jsonLocal("ghazal.json");if(!data?.ghazals?.length)throw Error("ghazal.json پیدا نشد.");let i=$("#ghazalIndex").value==="random"?Math.floor(Math.random()*data.ghazals.length):Number($("#ghazalIndex").value);const g=data.ghazals[i];return {name:"hafez.txt",text:`غزل ${i+1}\n${g.text}`,html:`<h3>${esc(g.title||"فال حافظ")}</h3><div style="line-height:2.2;white-space:pre-line">${esc(g.text)}</div>`}}

function bindAudioForm(id){const f=$("#fileInput");if(!f)return;f.onchange=async()=>{try{const file=f.files?.[0];if(!file)return;const u=URL.createObjectURL(file),a=new Audio(u);a.onloadedmetadata=()=>{const info=$("#audioInfo");if(info)info.innerHTML=`<small>مدت فایل: <b>${fa(Math.round(a.duration))}</b> ثانیه · حجم: ${fmt(file.size)}</small>`;if($("#audioEnd")&&Number($("#audioEnd").value)<=0)$("#audioEnd").value=Math.ceil(a.duration)};}catch(e){}}}
async function nativeAudioTool(mode){const p=nativePlugin();if(!p)throw Error("نسخه اندروید ابزار صوتی در دسترس نیست.");const file=getFiles()[0];const data=await blobToBase64(file);const temp=await p.writeTempFile({name:file.name,data});let out;if(mode==="trim"){const start=Number($("#audioStart").value||0),end=Number($("#audioEnd").value||0);if(!(end>start))throw Error("زمان پایان باید بیشتر از شروع باشد.");out=await p.trimAudio({inputPath:temp.path,startSec:start,endSec:end,outputName:file.name.replace(/\.[^.]+$/i,"")+"-cut."+(file.name.toLowerCase().endsWith(".mp3")?"mp3":file.name.toLowerCase().endsWith(".wav")?"wav":"m4a")});}else if(mode==="compress"){out=await p.compressAudio({inputPath:temp.path,bitrate:Number($("#audioBitrate").value)});}else{out=await p.audioToMp3({inputPath:temp.path,bitrate:Number($("#mp3Bitrate").value)});}return {nativePath:out.path,name:out.name,mime:out.mime,size:out.size,html:`<div class="result-card"><p>پردازش صوت با موفقیت انجام شد.</p><p>خروجی: <b>${esc(out.name)}</b></p><p>حجم: ${fmt(out.size)}</p></div>`}}

async function nativeMediaTool(mode){
 const p=nativePlugin(); if(!p)throw Error("نسخه اندروید ابزار در دسترس نیست.");
 const file=getFiles()[0]; const temp=await p.writeTempFile({name:file.name,data:await blobToBase64(file)}); let out;
 if(mode==="videoCompress") out=await p.compressVideo({inputPath:temp.path,bitrate:Number($("#videoQuality").value)});
 else if(mode==="imageHeic") out=await p.imageToHeic({inputPath:temp.path});
 else if(mode==="heicJpg") out=await p.heicToJpg({inputPath:temp.path});
 else if(mode==="backgroundRemove") out=await p.removeBackground({inputPath:temp.path,tolerance:Number($("#bgTolerance").value)});
 else if(mode==="pdfImages") out=await p.pdfToImages({inputPath:temp.path,format:$("#pdfImageFormat").value,scale:Number($("#pdfImageScale").value)});
 return {nativePath:out.path,name:out.name,mime:out.mime,size:out.size,html:`<div class="result-card"><p>پردازش با موفقیت انجام شد.</p><p>خروجی: <b>${esc(out.name)}</b></p><p>حجم: ${fmt(out.size)}</p>${out.pages?`<p>تعداد صفحات: ${fa(out.pages)}</p>`:""}</div>`};
}
function showResult(r){$("#resultBox").classList.remove("hidden");$("#resultBox").innerHTML=(r.html||"<p>عملیات انجام شد.</p>")+`<div class="result-actions"><button id="saveBtn">ذخیره</button><button id="shareBtn">اشتراک‌گذاری</button><button id="repeatBtn">اجرای مجدد</button></div>`;$("#saveBtn").onclick=()=>saveResult(r);$("#shareBtn").onclick=()=>shareResult(r);$("#repeatBtn").onclick=()=>executeTool(state.activeTool)}
async function materialize(r){if(r.blob)return r.blob;if(r.blobPromise)return await r.blobPromise;return new Blob([r.text||""],{type:r.mime||"text/plain;charset=utf-8"})}
function nativePlugin(){return window.Capacitor?.Plugins?.IranAryaei||null}
async function blobToBase64(blob){return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result).split(",")[1]||"");fr.onerror=reject;fr.readAsDataURL(blob)})}
async function saveResult(r){try{const p=nativePlugin();if(r.nativePath&&p){await p.saveTempFile({path:r.nativePath,name:r.name,mime:r.mime||"application/octet-stream"});toast("در پوشه دانلود/ایران آریایی ذخیره شد.");return}const b=await materialize(r);if(p&&b.size<50*1024*1024){await p.saveBase64({name:r.name||"iran-aryaei-output",mime:b.type||"application/octet-stream",data:await blobToBase64(b)});toast("در پوشه دانلود/ایران آریایی ذخیره شد.");return}const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=r.name||"iran-aryaei-output";a.click();toast("فایل آماده ذخیره شد.")}catch(e){toast(e.message||"ذخیره انجام نشد")}}
async function shareResult(r){try{const p=nativePlugin();if(r.nativePath&&p){await p.shareTempFile({path:r.nativePath,name:r.name,mime:r.mime||"application/octet-stream"});return}const b=await materialize(r);const file=new File([b],r.name||"output",{type:b.type||"application/octet-stream"});if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:"ایران آریایی"})}else if(p&&b.size<50*1024*1024){const x=await p.writeTempFile({name:r.name||"output",data:await blobToBase64(b)});await p.shareTempFile({path:x.path,name:r.name||"output",mime:b.type||"application/octet-stream"})}else toast("اشتراک‌گذاری در این دستگاه در دسترس نیست.")}catch(e){toast(e.message||"اشتراک‌گذاری انجام نشد")}}
function addActivity(tool,file){let a=JSON.parse(localStorage.getItem("ia-history")||"[]");a.unshift({tool,file,time:new Date().toLocaleString("fa-IR")});a=a.slice(0,100);localStorage.setItem("ia-history",JSON.stringify(a));loadActivity()}
function loadActivity(){let a=JSON.parse(localStorage.getItem("ia-history")||"[]");$("#totalActivity").textContent=fa(a.length);$("#activityList").innerHTML=a.length?a.map(x=>`<div class="activity-row"><b>${esc(x.file)}</b><small>${esc(x.tool)} · ${esc(x.time)}</small></div>`).join(""):`<div class="activity-row"><small>هنوز عملیاتی ثبت نشده است.</small></div>`}
function loadPrefs(){let dark=localStorage.getItem("ia-dark")==="1";setDark(dark);$("#darkToggle").checked=dark;let c=localStorage.getItem("ia-compact")==="1";$("#compactToggle").checked=c;document.body.classList.toggle("compact",c)}
function setDark(v){document.body.classList.toggle("dark",v);localStorage.setItem("ia-dark",v?"1":"0");$("#themeBtn").textContent=v?"☀":"☾"}
function toggleDark(){setDark(!document.body.classList.contains("dark"));$("#darkToggle").checked=document.body.classList.contains("dark")}
function toast(msg){let t=document.createElement("div");t.textContent=msg;t.style.cssText="position:fixed;z-index:100;bottom:92px;left:16px;right:16px;background:#151a22;color:#fff;padding:12px 14px;border-radius:13px;text-align:center;font-size:12px;box-shadow:0 10px 30px #0004";document.body.appendChild(t);setTimeout(()=>t.remove(),2600)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function fa(n){return String(n).replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d])}
