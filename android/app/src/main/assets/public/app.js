/* ==========================================================================
   ایران آریایی — app.js
   Intent engine + navigation + bottom sheet + first 10 offline tools
   ========================================================================== */
(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Tool registry (all 33 tools; only the first 10 are wired to real logic
  // for this build step — see PRIORITY in the original spec)
  // ---------------------------------------------------------------------
  var CATEGORIES = {
    image: 'تصویر', pdf: 'PDF', qr: 'QR', text: 'متن',
    date: 'تاریخ', audio: 'صدا', video: 'ویدیو', util: 'ابزار'
  };

  var TOOLS = [
    { id: 'img-resize', name: 'کاهش حجم تصویر', cat: 'image', icon: '🗜️', active: true },
    { id: 'img-convert', name: 'فشرده‌سازی و تبدیل تصویر', cat: 'image', icon: '🔄', active: true },
    { id: 'img-crop', name: 'برش تصویر', cat: 'image', icon: '✂️', active: true },
    { id: 'img-edit', name: 'ویرایش و برش تصویر', cat: 'image', icon: '🎨', active: true },
    { id: 'img-text', name: 'افزودن متن به عکس', cat: 'image', icon: '🔤', active: true },
    { id: 'qr-gen', name: 'ساخت QR Code', cat: 'qr', icon: '⬛', active: true },
    { id: 'qr-scan', name: 'اسکن QR Code', cat: 'qr', icon: '📷', active: true },
    { id: 'img-to-pdf', name: 'تبدیل عکس به PDF', cat: 'pdf', icon: '📄', active: true },
    { id: 'pdf-merge', name: 'ادغام PDF', cat: 'pdf', icon: '📎', active: true },
    { id: 'pdf-text', name: 'ساخت PDF از متن', cat: 'pdf', icon: '📝', active: true },

    { id: 'favicon-gen', name: 'ساخت فاوآیکون', cat: 'image', icon: '🌐', active: true },
    { id: 'svg-to-img', name: 'تبدیل SVG به تصویر', cat: 'image', icon: '🖼️', active: true },
    { id: 'password-gen', name: 'تولید رمز عبور قوی', cat: 'util', icon: '🔐', active: true },
    { id: 'notepad', name: 'یادداشت', cat: 'text', icon: '🗒️', active: true },
    { id: 'text-analyzer', name: 'تحلیلگر متن', cat: 'text', icon: '📊', active: true },
    { id: 'code-format', name: 'فرمت‌بندی و کوچک‌سازی کد', cat: 'util', icon: '💻', active: true },
    { id: 'regex-test', name: 'تست Regex', cat: 'util', icon: '🧩', active: true },
    { id: 'text-diff', name: 'مقایسه متن', cat: 'text', icon: '📑', active: true },
    { id: 'meta-gen', name: 'تولید متا تگ', cat: 'util', icon: '🏷️', active: true },
    { id: 'calendar', name: 'تقویم', cat: 'date', icon: '📅', active: true },
    { id: 'date-convert', name: 'تبدیل تاریخ', cat: 'date', icon: '🔁', active: true },
    { id: 'age-calc', name: 'محاسبه سن', cat: 'date', icon: '🎂', active: true },
    { id: 'city-distance', name: 'فاصله بین شهرها', cat: 'util', icon: '🗺️', active: true },
    { id: 'dictionary', name: 'دیکشنری', cat: 'text', icon: '📖', active: true },
    { id: 'hafez', name: 'فال حافظ', cat: 'text', icon: '🌹', active: true },
    { id: 'audio-trim', name: 'برش صدا', cat: 'audio', icon: '✂️', active: true },
    { id: 'audio-reduce', name: 'کاهش حجم صدا', cat: 'audio', icon: '🗜️', active: true },
    { id: 'audio-to-mp3', name: 'تبدیل صدا به MP3', cat: 'audio', icon: '🎵', active: true },
    { id: 'video-reduce', name: 'کاهش حجم ویدیو', cat: 'video', icon: '🎬', active: true },
    { id: 'img-to-heic', name: 'تبدیل عکس به HEIC', cat: 'image', icon: '📱', active: true },
    { id: 'heic-to-jpg', name: 'تبدیل HEIC به JPG', cat: 'image', icon: '🖼️', active: true },
    { id: 'bg-remove', name: 'حذف پس‌زمینه عکس', cat: 'image', icon: '✨', active: true },
    { id: 'pdf-to-img', name: 'تبدیل PDF به تصویر', cat: 'pdf', icon: '🖨️', active: true }
  ];

  var QUICK_ACTIONS = ['img-resize', 'qr-gen', 'img-to-pdf'];

  // ---------------------------------------------------------------------
  // Storage helpers
  // ---------------------------------------------------------------------
  var LS = {
    get: function (k, def) { try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------------------------------------------------------------------
  // Theme
  // ---------------------------------------------------------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
    var nightSwitch = document.getElementById('nightSwitch');
    if (nightSwitch) nightSwitch.checked = theme === 'dark';
  }
  function initTheme() {
    var saved = LS.get('ia_theme', null);
    if (!saved) {
      saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    applyTheme(saved);
  }
  document.getElementById('themeToggle').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(cur); LS.set('ia_theme', cur);
  });

  // ---------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  // ---------------------------------------------------------------------
  // Navigation between the 3 main screens
  // ---------------------------------------------------------------------
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById('screen-' + name).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.classList.toggle('active', n.dataset.screen === name);
    });
    if (name === 'activity') renderActivity();
  }
  document.querySelectorAll('.nav-item').forEach(function (n) {
    n.addEventListener('click', function () { showScreen(n.dataset.screen); });
  });

  // ---------------------------------------------------------------------
  // Home screen render: quick actions, chips, tool grid
  // ---------------------------------------------------------------------
  function toolById(id) { return TOOLS.find(function (t) { return t.id === id; }); }

  function renderQuickGrid() {
    var grid = document.getElementById('quickGrid');
    grid.innerHTML = '';
    QUICK_ACTIONS.forEach(function (id) {
      var t = toolById(id);
      var el = document.createElement('div');
      el.className = 'quick-card';
      el.innerHTML = '<div class="quick-icon">' + t.icon + '</div><span>' + t.name + '</span>';
      el.addEventListener('click', function () { openTool(t.id); });
      grid.appendChild(el);
    });
  }

  var activeCategory = 'all';
  function renderChips() {
    var row = document.getElementById('chipRow');
    row.innerHTML = '';
    var cats = ['all'].concat(Object.keys(CATEGORIES));
    cats.forEach(function (c) {
      var chip = document.createElement('div');
      chip.className = 'chip' + (c === activeCategory ? ' active' : '');
      chip.textContent = c === 'all' ? 'همه' : CATEGORIES[c];
      chip.addEventListener('click', function () { activeCategory = c; renderChips(); renderToolGrid(); });
      row.appendChild(chip);
    });
  }

  function renderToolGrid() {
    var grid = document.getElementById('toolGrid');
    grid.innerHTML = '';
    var list = activeCategory === 'all' ? TOOLS : TOOLS.filter(function (t) { return t.cat === activeCategory; });
    document.getElementById('toolCountHint').textContent = '· ' + TOOLS.length + ' ابزار';
    list.forEach(function (t) {
      var card = document.createElement('div');
      card.className = 'tool-card';
      card.innerHTML =
        '<div class="tool-status' + (t.active ? '' : ' soon') + '">' + (t.active ? 'آماده' : 'به‌زودی') + '</div>' +
        '<div class="tool-icon">' + t.icon + '</div>' +
        '<div class="tool-name">' + t.name + '</div>' +
        '<div class="tool-cat">' + CATEGORIES[t.cat] + '</div>';
      card.addEventListener('click', function () { openTool(t.id); });
      grid.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------
  // Intent engine
  // ---------------------------------------------------------------------
  var intentData = null;
  fetch('./intents.json').then(function (r) { return r.json(); }).then(function (d) { intentData = d; }).catch(function () {});

  var citiesData = null;
  fetch('./cities.json').then(function (r) { return r.json(); }).then(function (d) { citiesData = d.cities; }).catch(function () {});

  var dictData = null;
  fetch('./dictionary.json').then(function (r) { return r.json(); }).then(function (d) { dictData = d.words; }).catch(function () {});

  var ghazalData = null;
  fetch('./ghazal.json').then(function (r) { return r.json(); }).then(function (d) { ghazalData = d.verses; }).catch(function () {});

  function matchIntent(query) {
    if (!intentData) return null;
    var q = query.trim().toLowerCase();
    if (!q) return null;
    var best = null, bestScore = 0;
    intentData.intents.forEach(function (intent) {
      intent.keywords.forEach(function (kw) {
        var kwLower = kw.toLowerCase();
        if (q.indexOf(kwLower) !== -1 || kwLower.indexOf(q) !== -1) {
          var score = kwLower.length;
          if (score > bestScore) { bestScore = score; best = intent.toolId; }
        }
      });
    });
    return best;
  }

  var heroInput = document.getElementById('heroInput');
  var heroSuggest = document.getElementById('heroSuggest');
  heroInput.addEventListener('input', function () {
    var match = matchIntent(heroInput.value);
    if (match) {
      var t = toolById(match);
      heroSuggest.textContent = t ? ('پیشنهاد: ' + t.icon + ' ' + t.name + (t.active ? '' : ' (به‌زودی)')) : '';
    } else {
      heroSuggest.textContent = heroInput.value.trim() ? 'ابزار مرتبطی پیدا نشد — از فهرست پایین انتخاب کنید' : '';
    }
  });
  function runHeroSearch() {
    var match = matchIntent(heroInput.value);
    if (match) {
      openTool(match);
      heroInput.value = ''; heroSuggest.textContent = '';
    } else if (heroInput.value.trim()) {
      toast('ابزار مرتبطی پیدا نشد');
    }
  }
  document.getElementById('heroSend').addEventListener('click', runHeroSearch);
  heroInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') runHeroSearch(); });

  // ---------------------------------------------------------------------
  // History / Activity
  // ---------------------------------------------------------------------
  function addHistory(toolId, fileName) {
    var t = toolById(toolId);
    var list = LS.get('ia_history', []);
    list.unshift({ toolId: toolId, name: fileName || '—', time: Date.now() });
    if (list.length > 200) list = list.slice(0, 200);
    LS.set('ia_history', list);
  }
  function timeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'همین الان';
    if (diff < 3600) return Math.floor(diff / 60) + ' دقیقه پیش';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ساعت پیش';
    return Math.floor(diff / 86400) + ' روز پیش';
  }
  function renderActivity() {
    var list = LS.get('ia_history', []);
    document.getElementById('statTotal').textContent = list.length;
    var wrap = document.getElementById('historyList');
    if (!list.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="emoji">🗂️</div>تا الان عملیاتی ثبت نشده است</div>';
      return;
    }
    wrap.innerHTML = list.map(function (h) {
      var t = toolById(h.toolId) || { icon: '🛠️', name: h.toolId };
      return '<div class="history-row"><div class="history-icon">' + t.icon + '</div>' +
        '<div><div class="history-name">' + h.name + '</div>' +
        '<div class="history-meta">' + t.name + ' · ' + timeAgo(h.time) + '</div></div></div>';
    }).join('');
  }
  document.getElementById('clearHistoryBtn').addEventListener('click', function () {
    LS.set('ia_history', []); renderActivity(); toast('تاریخچه پاک شد');
  });
  document.getElementById('clearNotesBtn').addEventListener('click', function () {
    LS.set('ia_notes', []); toast('یادداشت‌ها پاک شدند');
  });

  // ---------------------------------------------------------------------
  // Settings switches
  // ---------------------------------------------------------------------
  document.getElementById('nightSwitch').addEventListener('change', function (e) {
    var theme = e.target.checked ? 'dark' : 'light';
    applyTheme(theme); LS.set('ia_theme', theme);
  });
  var compactSwitch = document.getElementById('compactSwitch');
  compactSwitch.checked = LS.get('ia_compact', false);
  document.getElementById('app').classList.toggle('compact', compactSwitch.checked);
  compactSwitch.addEventListener('change', function (e) {
    LS.set('ia_compact', e.target.checked);
    document.getElementById('app').classList.toggle('compact', e.target.checked);
  });

  // ---------------------------------------------------------------------
  // Bottom sheet (generic tool window)
  // ---------------------------------------------------------------------
  var sheetOverlay = document.getElementById('sheetOverlay');
  var sheet = document.getElementById('sheet');
  var sheetBody = document.getElementById('sheetBody');

  function openTool(id) {
    var t = toolById(id);
    if (!t) return;
    document.getElementById('sheetIcon').textContent = t.icon;
    document.getElementById('sheetTitle').textContent = t.name;
    document.getElementById('sheetStatus').textContent = t.active ? 'آماده پردازش روی دستگاه' : 'به‌زودی در دسترس است';
    sheetBody.innerHTML = '';
    if (!t.active) {
      document.getElementById('sheetDesc').textContent = 'این ابزار در مراحل بعدی توسعه اضافه می‌شود (طبق اولویت‌بندی پروژه).';
      sheetBody.innerHTML = '<div class="empty-state"><div class="emoji">🚧</div>این ابزار هنوز فعال نشده است</div>';
    } else {
      document.getElementById('sheetDesc').textContent = 'این ابزار کاملاً آفلاین و روی همین دستگاه اجرا می‌شود — هیچ فایلی جایی آپلود نمی‌شود.';
      var renderer = TOOL_RENDERERS[id];
      if (renderer) renderer(sheetBody, t);
    }
    sheetOverlay.classList.add('open');
    sheet.classList.add('open');
  }
  function closeSheet() {
    sheetOverlay.classList.remove('open');
    sheet.classList.remove('open');
  }
  document.getElementById('sheetClose').addEventListener('click', closeSheet);
  sheetOverlay.addEventListener('click', closeSheet);

  // ---------------------------------------------------------------------
  // Shared tool-building helpers
  // ---------------------------------------------------------------------
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function fileDrop(label, sub, accept, multiple) {
    var wrap = el('div', 'file-drop');
    wrap.innerHTML = '<div class="emoji">📁</div><div class="main">' + label + '</div><div class="sub">' + sub + '</div>';
    var input = document.createElement('input');
    input.type = 'file'; input.accept = accept || '*'; input.multiple = !!multiple;
    input.style.display = 'none';
    wrap.appendChild(input);
    wrap.addEventListener('click', function () { input.click(); });
    return { wrap: wrap, input: input };
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = reader.result;
        var comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = function () { reject(reader.error || new Error('خواندن فایل ناموفق بود')); };
      reader.readAsDataURL(blob);
    });
  }
  function nativePlugin() {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.IranAryaei) || null;
  }
  // Inside the Capacitor/Android app, saving means calling the native
  // IranAryaei.saveBase64 plugin method, which writes into MediaStore
  // Downloads — a plain <a download> click (the browser-only fallback
  // below) does NOT persist anything inside a WebView, so the two paths
  // are not interchangeable and the toast only fires after a REAL result.
  async function saveBlob(blob, filename) {
    var plugin = nativePlugin();
    if (plugin) {
      try {
        var base64 = await blobToBase64(blob);
        await plugin.saveBase64({ name: filename, mime: blob.type || 'application/octet-stream', data: base64 });
        toast('در پوشه دانلودها ذخیره شد: ' + filename);
      } catch (err) {
        toast('ذخیره فایل ناموفق بود: ' + (err && err.message ? err.message : 'خطای ناشناخته'));
      }
      return;
    }
    // Browser fallback — only meaningful when this page is opened in a
    // normal desktop/mobile browser (e.g. during development), not inside
    // the packaged Android app.
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    toast('فایل دانلود شد: ' + filename);
  }
  async function shareBlob(blob, filename, mime) {
    var plugin = nativePlugin();
    if (plugin) {
      try {
        var base64 = await blobToBase64(blob);
        var written = await plugin.writeTempFile({ name: filename, data: base64 });
        await plugin.shareTempFile({ path: written.path, name: filename, mime: mime });
      } catch (err) {
        toast('اشتراک‌گذاری ناموفق بود: ' + (err && err.message ? err.message : 'خطای ناشناخته'));
      }
      return;
    }
    try {
      var file = new File([blob], filename, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch (e) { /* fall through to download */ }
    saveBlob(blob, filename);
    toast('اشتراک‌گذاری مستقیم پشتیبانی نشد — فایل دانلود شد');
  }
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }
  function loadImageFile(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () { resolve({ img: img, url: url }); };
      img.onerror = reject;
      img.src = url;
    });
  }
  function resultActions(container, onSave, onShare, onRerun) {
    var wrap = el('div', 'result-actions');
    var b1 = el('button', '', '<span class="em">💾</span>ذخیره');
    var b2 = el('button', '', '<span class="em">📤</span>اشتراک‌گذاری');
    var b3 = el('button', '', '<span class="em">🔁</span>تکرار');
    b1.addEventListener('click', onSave);
    b2.addEventListener('click', onShare);
    b3.addEventListener('click', onRerun);
    wrap.appendChild(b1); wrap.appendChild(b2); wrap.appendChild(b3);
    container.appendChild(wrap);
  }

  // ---------------------------------------------------------------------
  // TOOL RENDERERS — the first 10 working tools
  // ---------------------------------------------------------------------
  var TOOL_RENDERERS = {};

  // 1. Image Size Reducer -------------------------------------------------
  TOOL_RENDERERS['img-resize'] = function (body) {
    var fd = fileDrop('انتخاب عکس (JPG / PNG / WebP)', 'برای انتخاب فایل ضربه بزنید', 'image/*');
    body.appendChild(fd.wrap);

    var qualityField = el('div', 'field',
      '<label>کیفیت خروجی: <b id="qVal">70</b>٪</label>' +
      '<input type="range" id="qSlider" min="10" max="100" value="70">');
    body.appendChild(qualityField);
    var qSlider = qualityField.querySelector('#qSlider');
    var qVal = qualityField.querySelector('#qVal');
    qSlider.addEventListener('input', function () { qVal.textContent = qSlider.value; });

    var runBtn = el('button', 'run-btn', '▶ اجرای عملیات');
    runBtn.disabled = true;
    body.appendChild(runBtn);

    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) {
        runBtn.disabled = false;
        fd.wrap.querySelector('.main').textContent = currentFile.name;
        fd.wrap.querySelector('.sub').textContent = fmtBytes(currentFile.size);
      }
    });

    runBtn.addEventListener('click', function () {
      if (!currentFile) return;
      runBtn.disabled = true; runBtn.textContent = '⏳ در حال پردازش...';
      loadImageFile(currentFile).then(function (loaded) {
        var canvas = document.createElement('canvas');
        canvas.width = loaded.img.naturalWidth; canvas.height = loaded.img.naturalHeight;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(loaded.img, 0, 0);
        var quality = parseInt(qSlider.value, 10) / 100;
        canvas.toBlob(function (blob) {
          runBtn.disabled = false; runBtn.textContent = '▶ اجرای عملیات';
          var pct = Math.max(0, Math.round((1 - blob.size / currentFile.size) * 100));
          resultWrap.innerHTML = '';
          var preview = el('div', 'preview-box');
          var img2 = document.createElement('img'); img2.src = URL.createObjectURL(blob);
          preview.appendChild(img2);
          resultWrap.appendChild(preview);
          resultWrap.appendChild(el('div', 'stat-line',
            '<span>حجم اصلی</span><b>' + fmtBytes(currentFile.size) + '</b>'));
          resultWrap.appendChild(el('div', 'stat-line',
            '<span>حجم جدید</span><b>' + fmtBytes(blob.size) + '</b>'));
          resultWrap.appendChild(el('div', 'stat-line',
            '<span>میزان کاهش</span><b>' + pct + '٪</b>'));
          var outName = currentFile.name.replace(/\.\w+$/, '') + '-reduced.jpg';
          resultActions(resultWrap,
            function () { saveBlob(blob, outName); addHistory('img-resize', outName); },
            function () { shareBlob(blob, outName, 'image/jpeg'); addHistory('img-resize', outName); },
            function () { runBtn.click(); });
        }, 'image/jpeg', quality);
      });
    });
  };

  // 2. Image Compressor & Converter ---------------------------------------
  TOOL_RENDERERS['img-convert'] = function (body) {
    var fd = fileDrop('انتخاب عکس', 'برای انتخاب فایل ضربه بزنید', 'image/*');
    body.appendChild(fd.wrap);

    var fmtField = el('div', 'field', '<label>فرمت خروجی</label><div class="seg" id="fmtSeg">' +
      '<button data-f="image/jpeg" class="active">JPG</button>' +
      '<button data-f="image/png">PNG</button>' +
      '<button data-f="image/webp">WebP</button></div>');
    body.appendChild(fmtField);
    var curFormat = 'image/jpeg';
    fmtField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        fmtField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); curFormat = b.dataset.f;
      });
    });

    var qualityField = el('div', 'field',
      '<label>کیفیت: <b id="qVal2">80</b>٪</label><input type="range" id="qSlider2" min="10" max="100" value="80">');
    body.appendChild(qualityField);
    var qSlider = qualityField.querySelector('#qSlider2');
    var qVal = qualityField.querySelector('#qVal2');
    qSlider.addEventListener('input', function () { qVal.textContent = qSlider.value; });

    var runBtn = el('button', 'run-btn', '▶ اجرای عملیات');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) { runBtn.disabled = false; fd.wrap.querySelector('.main').textContent = currentFile.name; }
    });

    runBtn.addEventListener('click', function () {
      if (!currentFile) return;
      loadImageFile(currentFile).then(function (loaded) {
        var canvas = document.createElement('canvas');
        canvas.width = loaded.img.naturalWidth; canvas.height = loaded.img.naturalHeight;
        var ctx = canvas.getContext('2d');
        if (curFormat === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(loaded.img, 0, 0);
        canvas.toBlob(function (blob) {
          var ext = curFormat === 'image/jpeg' ? 'jpg' : (curFormat === 'image/png' ? 'png' : 'webp');
          var outName = currentFile.name.replace(/\.\w+$/, '') + '.' + ext;
          resultWrap.innerHTML = '';
          var preview = el('div', 'preview-box');
          var img2 = document.createElement('img'); img2.src = URL.createObjectURL(blob);
          preview.appendChild(img2);
          resultWrap.appendChild(preview);
          resultWrap.appendChild(el('div', 'stat-line', '<span>حجم خروجی</span><b>' + fmtBytes(blob.size) + '</b>'));
          resultActions(resultWrap,
            function () { saveBlob(blob, outName); addHistory('img-convert', outName); },
            function () { shareBlob(blob, outName, curFormat); addHistory('img-convert', outName); },
            function () { runBtn.click(); });
        }, curFormat, parseInt(qSlider.value, 10) / 100);
      });
    });
  };

  // 3. Image Cropping -------------------------------------------------------
  TOOL_RENDERERS['img-crop'] = function (body) {
    var fd = fileDrop('انتخاب عکس', 'برای انتخاب فایل ضربه بزنید', 'image/*');
    body.appendChild(fd.wrap);

    var ratioField = el('div', 'field', '<label>نسبت برش</label><div class="seg" id="ratioSeg">' +
      '<button data-r="1" class="active">۱:۱</button>' +
      '<button data-r="1.777">۱۶:۹</button>' +
      '<button data-r="1.333">۴:۳</button></div>');
    body.appendChild(ratioField);
    var curRatio = 1;
    ratioField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        ratioField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); curRatio = parseFloat(b.dataset.r);
      });
    });

    var runBtn = el('button', 'run-btn', '▶ برش از مرکز تصویر');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    body.appendChild(el('div', '', '<div class="sheet-desc" style="margin:0">برش از مرکز تصویر انجام می‌شود؛ نسخهٔ بعدی امکان جابه‌جایی دستی کادر برش را اضافه می‌کند.</div>'));
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) { runBtn.disabled = false; fd.wrap.querySelector('.main').textContent = currentFile.name; }
    });

    runBtn.addEventListener('click', function () {
      if (!currentFile) return;
      loadImageFile(currentFile).then(function (loaded) {
        var iw = loaded.img.naturalWidth, ih = loaded.img.naturalHeight;
        var targetRatio = curRatio;
        var cw, ch;
        if (iw / ih > targetRatio) { ch = ih; cw = ch * targetRatio; } else { cw = iw; ch = cw / targetRatio; }
        var sx = (iw - cw) / 2, sy = (ih - ch) / 2;
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(loaded.img, sx, sy, cw, ch, 0, 0, cw, ch);
        canvas.toBlob(function (blob) {
          var outName = currentFile.name.replace(/\.\w+$/, '') + '-cropped.jpg';
          resultWrap.innerHTML = '';
          var preview = el('div', 'preview-box');
          var img2 = document.createElement('img'); img2.src = URL.createObjectURL(blob);
          preview.appendChild(img2);
          resultWrap.appendChild(preview);
          resultActions(resultWrap,
            function () { saveBlob(blob, outName); addHistory('img-crop', outName); },
            function () { shareBlob(blob, outName, 'image/jpeg'); addHistory('img-crop', outName); },
            function () { runBtn.click(); });
        }, 'image/jpeg', 0.92);
      });
    });
  };

  // 4. Image Editing & Cropping (rotate / mirror / filters) ----------------
  TOOL_RENDERERS['img-edit'] = function (body) {
    var fd = fileDrop('انتخاب عکس', 'برای انتخاب فایل ضربه بزنید', 'image/*');
    body.appendChild(fd.wrap);

    var state = { rotate: 0, flip: false, filter: 'none' };
    var toolsRow = el('div', 'field', '<label>عملیات</label><div class="seg" id="editSeg">' +
      '<button data-a="rotate">↻ چرخش ۹۰°</button>' +
      '<button data-a="flip">⇋ آینه</button></div>');
    body.appendChild(toolsRow);

    var filterField = el('div', 'field', '<label>فیلتر</label><div class="seg" id="filterSeg">' +
      '<button data-f="none" class="active">هیچ</button>' +
      '<button data-f="grayscale">سیاه‌وسفید</button>' +
      '<button data-f="sepia">سپیا</button></div>');
    body.appendChild(filterField);
    filterField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        filterField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); state.filter = b.dataset.f; redraw();
      });
    });

    var preview = el('div', 'preview-box', '<span style="font-size:12px;color:var(--text-dim)">عکسی انتخاب نشده</span>');
    body.appendChild(preview);

    var runBtn = el('button', 'run-btn', '✔ اعمال و ذخیره');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var loadedImg = null, currentFile = null;
    function redraw() {
      if (!loadedImg) return;
      var iw = loadedImg.naturalWidth, ih = loadedImg.naturalHeight;
      var swapped = state.rotate % 180 !== 0;
      var canvas = document.createElement('canvas');
      canvas.width = swapped ? ih : iw; canvas.height = swapped ? iw : ih;
      var ctx = canvas.getContext('2d');
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(state.rotate * Math.PI / 180);
      if (state.flip) ctx.scale(-1, 1);
      if (state.filter === 'grayscale') ctx.filter = 'grayscale(1)';
      if (state.filter === 'sepia') ctx.filter = 'sepia(1)';
      ctx.drawImage(loadedImg, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
      preview.innerHTML = '';
      preview.appendChild(canvas);
      preview.dataset.ready = '1';
    }

    toolsRow.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.a === 'rotate') state.rotate = (state.rotate + 90) % 360;
        if (b.dataset.a === 'flip') state.flip = !state.flip;
        redraw();
      });
    });

    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (!currentFile) return;
      fd.wrap.querySelector('.main').textContent = currentFile.name;
      loadImageFile(currentFile).then(function (loaded) {
        loadedImg = loaded.img; runBtn.disabled = false; redraw();
      });
    });

    runBtn.addEventListener('click', function () {
      var canvas = preview.querySelector('canvas');
      if (!canvas) return;
      canvas.toBlob(function (blob) {
        var outName = currentFile.name.replace(/\.\w+$/, '') + '-edited.jpg';
        resultWrap.innerHTML = '';
        resultActions(resultWrap,
          function () { saveBlob(blob, outName); addHistory('img-edit', outName); },
          function () { shareBlob(blob, outName, 'image/jpeg'); addHistory('img-edit', outName); },
          function () { runBtn.click(); });
      }, 'image/jpeg', 0.92);
    });
  };

  // 5. Photo Text Adder ------------------------------------------------------
  TOOL_RENDERERS['img-text'] = function (body) {
    var fd = fileDrop('انتخاب عکس', 'برای انتخاب فایل ضربه بزنید', 'image/*');
    body.appendChild(fd.wrap);

    var textField = el('div', 'field', '<label>متن</label><input type="text" id="txtInput" placeholder="متن دلخواه...">');
    body.appendChild(textField);
    var textInput = textField.querySelector('#txtInput');

    var sizeField = el('div', 'field', '<label>اندازه فونت: <b id="sizeVal">48</b>px</label><input type="range" id="sizeSlider" min="16" max="120" value="48">');
    body.appendChild(sizeField);
    var sizeSlider = sizeField.querySelector('#sizeSlider');
    var sizeVal = sizeField.querySelector('#sizeVal');
    sizeSlider.addEventListener('input', function () { sizeVal.textContent = sizeSlider.value; redraw(); });

    var colorField = el('div', 'field', '<label>رنگ متن</label><div class="color-row"><input type="color" id="colorPick" value="#ffffff"></div>');
    body.appendChild(colorField);
    var colorPick = colorField.querySelector('#colorPick');
    colorPick.addEventListener('input', redraw);

    var posField = el('div', 'field', '<label>موقعیت</label><div class="seg" id="posSeg">' +
      '<button data-p="top" >بالا</button><button data-p="center">وسط</button><button data-p="bottom" class="active">پایین</button></div>');
    body.appendChild(posField);
    var curPos = 'bottom';
    posField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        posField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); curPos = b.dataset.p; redraw();
      });
    });
    textInput.addEventListener('input', redraw);

    var preview = el('div', 'preview-box', '<span style="font-size:12px;color:var(--text-dim)">عکسی انتخاب نشده</span>');
    body.appendChild(preview);
    var runBtn = el('button', 'run-btn', '✔ اعمال و ذخیره');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var loadedImg = null, currentFile = null;
    function redraw() {
      if (!loadedImg) return;
      var iw = loadedImg.naturalWidth, ih = loadedImg.naturalHeight;
      var canvas = document.createElement('canvas');
      canvas.width = iw; canvas.height = ih;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(loadedImg, 0, 0);
      var fontSize = parseInt(sizeSlider.value, 10) * (iw / 600);
      ctx.font = fontSize + 'px Vazirmatn, Tahoma, sans-serif';
      ctx.fillStyle = colorPick.value;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 6;
      var y = curPos === 'top' ? fontSize + 20 : (curPos === 'center' ? ih / 2 : ih - 30);
      ctx.fillText(textInput.value || '', iw / 2, y);
      preview.innerHTML = '';
      preview.appendChild(canvas);
    }

    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (!currentFile) return;
      fd.wrap.querySelector('.main').textContent = currentFile.name;
      loadImageFile(currentFile).then(function (loaded) { loadedImg = loaded.img; runBtn.disabled = false; redraw(); });
    });

    runBtn.addEventListener('click', function () {
      var canvas = preview.querySelector('canvas');
      if (!canvas) return;
      canvas.toBlob(function (blob) {
        var outName = currentFile.name.replace(/\.\w+$/, '') + '-text.jpg';
        resultWrap.innerHTML = '';
        resultActions(resultWrap,
          function () { saveBlob(blob, outName); addHistory('img-text', outName); },
          function () { shareBlob(blob, outName, 'image/jpeg'); addHistory('img-text', outName); },
          function () { runBtn.click(); });
      }, 'image/jpeg', 0.92);
    });
  };

  // 6. QR Code Generator -----------------------------------------------------
  TOOL_RENDERERS['qr-gen'] = function (body) {
    var textField = el('div', 'field', '<label>متن یا لینک</label><textarea id="qrText" placeholder="https://... یا هر متنی"></textarea>');
    body.appendChild(textField);
    var qrText = textField.querySelector('#qrText');

    var sizeField = el('div', 'field', '<label>اندازه خروجی: <b id="qrSizeVal">512</b>px</label><input type="range" id="qrSize" min="256" max="1024" step="64" value="512">');
    body.appendChild(sizeField);
    var qrSize = sizeField.querySelector('#qrSize');
    var qrSizeVal = sizeField.querySelector('#qrSizeVal');
    qrSize.addEventListener('input', function () { qrSizeVal.textContent = qrSize.value; });

    body.appendChild(el('div', 'sheet-desc', 'سطح تصحیح خطا: M (استاندارد) — ظرفیت تا حدود ۲۰۰ کاراکتر.'));

    var runBtn = el('button', 'run-btn', '▶ ساخت QR Code');
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    runBtn.addEventListener('click', function () {
      var text = qrText.value.trim();
      if (!text) { toast('ابتدا متن یا لینک را وارد کنید'); return; }
      if (!window.QRLite.maxLength(text)) { toast('متن خیلی طولانی است (حداکثر ~۲۰۰ کاراکتر)'); return; }
      try {
        var canvas = document.createElement('canvas');
        window.QRLite.drawToCanvas(canvas, text, { targetSize: parseInt(qrSize.value, 10) });
        resultWrap.innerHTML = '';
        var preview = el('div', 'preview-box');
        preview.appendChild(canvas);
        resultWrap.appendChild(preview);
        canvas.toBlob(function (blob) {
          var outName = 'qrcode-' + Date.now() + '.png';
          resultActions(resultWrap,
            function () { saveBlob(blob, outName); addHistory('qr-gen', outName); },
            function () { shareBlob(blob, outName, 'image/png'); addHistory('qr-gen', outName); },
            function () { runBtn.click(); });
        }, 'image/png');
      } catch (err) {
        toast(err.message || 'خطا در ساخت QR');
      }
    });
  };

  // 7. QR Code Scanner ---------------------------------------------------------
  TOOL_RENDERERS['qr-scan'] = function (body) {
    if (!('BarcodeDetector' in window)) {
      body.appendChild(el('div', 'empty-state',
        '<div class="emoji">⚠️</div>مرورگر/وب‌ویو این دستگاه از رمزگشایی QR داخلی پشتیبانی نمی‌کند.<br><br>' +
        'می‌توانید به‌جای دوربین، یک عکس حاوی QR را انتخاب کنید و منتظر بمانید — در برخی دستگاه‌ها همچنان قابل شناسایی است.'));
    }
    var fd = fileDrop('انتخاب عکس حاوی QR', 'یا اگر دوربین در دسترس است، بعداً به آن وصل می‌شود', 'image/*');
    body.appendChild(fd.wrap);
    var runBtn = el('button', 'run-btn', '▶ خواندن QR از عکس');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) { runBtn.disabled = false; fd.wrap.querySelector('.main').textContent = currentFile.name; }
    });

    runBtn.addEventListener('click', function () {
      if (!currentFile) return;
      if (!('BarcodeDetector' in window)) { toast('این قابلیت روی این دستگاه در دسترس نیست'); return; }
      loadImageFile(currentFile).then(function (loaded) {
        var canvas = document.createElement('canvas');
        canvas.width = loaded.img.naturalWidth; canvas.height = loaded.img.naturalHeight;
        canvas.getContext('2d').drawImage(loaded.img, 0, 0);
        var detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        detector.detect(canvas).then(function (codes) {
          resultWrap.innerHTML = '';
          if (!codes.length) { resultWrap.appendChild(el('div', 'empty-state', '<div class="emoji">🔍</div>کد QR شناسایی نشد')); return; }
          var value = codes[0].rawValue;
          var box = el('div', 'field', '<label>متن شناسایی‌شده</label><textarea readonly>' + value.replace(/</g, '&lt;') + '</textarea>');
          resultWrap.appendChild(box);
          var copyBtn = el('button', 'run-btn secondary', '📋 کپی متن');
          copyBtn.addEventListener('click', function () {
            navigator.clipboard.writeText(value).then(function () { toast('متن کپی شد'); });
          });
          resultWrap.appendChild(copyBtn);
          addHistory('qr-scan', currentFile.name);
        }).catch(function () { toast('خطا در خواندن QR'); });
      });
    });
  };

  // 8. Image to PDF Converter ---------------------------------------------------
  TOOL_RENDERERS['img-to-pdf'] = function (body) {
    var fd = fileDrop('انتخاب یک یا چند عکس', 'ترتیب انتخاب = ترتیب صفحات', 'image/*', true);
    body.appendChild(fd.wrap);
    var listWrap = el('div', 'field');
    body.appendChild(listWrap);

    var sizeField = el('div', 'field', '<label>اندازه صفحه</label><div class="seg" id="pageSizeSeg">' +
      '<button data-s="A4" class="active">A4</button><button data-s="Letter">Letter</button></div>');
    body.appendChild(sizeField);
    var curSize = 'A4';
    sizeField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        sizeField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); curSize = b.dataset.s;
      });
    });

    var runBtn = el('button', 'run-btn', '▶ ساخت PDF');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var files = [];
    fd.input.addEventListener('change', function () {
      files = Array.from(fd.input.files);
      listWrap.innerHTML = '';
      files.forEach(function (f) {
        listWrap.appendChild(el('div', 'file-list-item', '<span class="name">' + f.name + '</span>'));
      });
      runBtn.disabled = files.length === 0;
    });

    runBtn.addEventListener('click', function () {
      if (!files.length) return;
      runBtn.disabled = true; runBtn.textContent = '⏳ در حال ساخت PDF...';
      Promise.all(files.map(function (f) { return loadImageFile(f); }))
        .then(function (loadedArr) {
          var pages = loadedArr.map(function (loaded) {
            return window.PDFLite.imageFileToPage(loaded.img, curSize, 24, 0.85);
          });
          var pdfBytes = window.PDFLite.buildImagePdf(pages);
          var blob = new Blob([pdfBytes], { type: 'application/pdf' });
          runBtn.disabled = false; runBtn.textContent = '▶ ساخت PDF';
          var outName = 'converted-' + Date.now() + '.pdf';
          resultWrap.innerHTML = '';
          resultWrap.appendChild(el('div', 'stat-line', '<span>تعداد صفحات</span><b>' + pages.length + '</b>'));
          resultWrap.appendChild(el('div', 'stat-line', '<span>حجم فایل</span><b>' + fmtBytes(blob.size) + '</b>'));
          resultActions(resultWrap,
            function () { saveBlob(blob, outName); addHistory('img-to-pdf', outName); },
            function () { shareBlob(blob, outName, 'application/pdf'); addHistory('img-to-pdf', outName); },
            function () { runBtn.click(); });
        });
    });
  };

  // 9. PDF Merger -----------------------------------------------------------
  TOOL_RENDERERS['pdf-merge'] = function (body) {
    body.appendChild(el('div', 'sheet-desc',
      'این ابزار PDFهای ساده (بدون رمزگذاری، ساختار کلاسیک) از جمله فایل‌های ساخته‌شده در همین برنامه را ادغام می‌کند. برخی PDFهای پیچیده یا رمزگذاری‌شده ممکن است پشتیبانی نشوند.'));
    var fd = fileDrop('انتخاب دو یا چند فایل PDF', 'ترتیب انتخاب = ترتیب صفحات', 'application/pdf', true);
    body.appendChild(fd.wrap);
    var listWrap = el('div', 'field');
    body.appendChild(listWrap);
    var runBtn = el('button', 'run-btn', '▶ ادغام فایل‌ها');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var files = [];
    fd.input.addEventListener('change', function () {
      files = Array.from(fd.input.files);
      listWrap.innerHTML = '';
      files.forEach(function (f) { listWrap.appendChild(el('div', 'file-list-item', '<span class="name">' + f.name + '</span>')); });
      runBtn.disabled = files.length < 2;
    });

    runBtn.addEventListener('click', function () {
      if (files.length < 2) return;
      runBtn.disabled = true; runBtn.textContent = '⏳ در حال ادغام...';
      Promise.all(files.map(function (f) { return f.arrayBuffer(); }))
        .then(function (buffers) {
          var byteArrays = buffers.map(function (b) { return new Uint8Array(b); });
          var merged;
          try {
            merged = window.PDFLite.mergePdfs(byteArrays);
          } catch (err) {
            runBtn.disabled = false; runBtn.textContent = '▶ ادغام فایل‌ها';
            var msg = err.message === 'ENCRYPTED' ? 'یکی از فایل‌ها رمزگذاری‌شده است.' :
              'ساختار یکی از فایل‌ها پشتیبانی نمی‌شود (PDF پیچیده یا فشرده).';
            toast(msg);
            return;
          }
          var blob = new Blob([merged], { type: 'application/pdf' });
          runBtn.disabled = false; runBtn.textContent = '▶ ادغام فایل‌ها';
          var outName = 'merged-' + Date.now() + '.pdf';
          resultWrap.innerHTML = '';
          resultWrap.appendChild(el('div', 'stat-line', '<span>تعداد فایل ادغام‌شده</span><b>' + files.length + '</b>'));
          resultWrap.appendChild(el('div', 'stat-line', '<span>حجم نهایی</span><b>' + fmtBytes(blob.size) + '</b>'));
          resultActions(resultWrap,
            function () { saveBlob(blob, outName); addHistory('pdf-merge', outName); },
            function () { shareBlob(blob, outName, 'application/pdf'); addHistory('pdf-merge', outName); },
            function () { runBtn.click(); });
        });
    });
  };

  // 10. PDF Creator (Text to PDF) ---------------------------------------------
  TOOL_RENDERERS['pdf-text'] = function (body) {
    body.appendChild(el('div', 'sheet-desc',
      'چون فونت فارسی به‌صورت آفلاین در دسترس نبود، متن به‌صورت تصویر با کیفیت بالا در PDF قرار می‌گیرد (قابل چاپ و مشاهده، اما غیرقابل جستجو).'));
    var textField = el('div', 'field', '<label>متن</label><textarea id="pdfTextInput" placeholder="متن فارسی یا انگلیسی خود را اینجا بنویسید..." style="min-height:160px"></textarea>');
    body.appendChild(textField);
    var pdfTextInput = textField.querySelector('#pdfTextInput');

    var sizeField = el('div', 'field', '<label>اندازه فونت: <b id="pdfFontVal">22</b>pt</label><input type="range" id="pdfFontSize" min="12" max="40" value="22">');
    body.appendChild(sizeField);
    var pdfFontSize = sizeField.querySelector('#pdfFontSize');
    var pdfFontVal = sizeField.querySelector('#pdfFontVal');
    pdfFontSize.addEventListener('input', function () { pdfFontVal.textContent = pdfFontSize.value; });

    var orientField = el('div', 'field', '<label>جهت صفحه</label><div class="seg" id="orientSeg">' +
      '<button data-o="portrait" class="active">عمودی</button><button data-o="landscape">افقی</button></div>');
    body.appendChild(orientField);
    var curOrient = 'portrait';
    orientField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        orientField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); curOrient = b.dataset.o;
      });
    });

    var runBtn = el('button', 'run-btn', '▶ ساخت PDF');
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    runBtn.addEventListener('click', function () {
      var text = pdfTextInput.value;
      if (!text.trim()) { toast('ابتدا متنی وارد کنید'); return; }
      var pageWH = curOrient === 'landscape' ? [842, 595] : [595, 842];
      var scale = 2; // render at 2x for crisp text
      var pxW = pageWH[0] * scale, pxH = pageWH[1] * scale;
      var margin = 48 * scale;
      var fontPx = parseInt(pdfFontSize.value, 10) * scale;
      var lineHeight = fontPx * 1.7;

      // measure + wrap text into lines (RTL-aware via canvas direction)
      var measureCanvas = document.createElement('canvas');
      var mctx = measureCanvas.getContext('2d');
      mctx.font = fontPx + 'px Vazirmatn, Tahoma, sans-serif';
      var maxLineWidth = pxW - margin * 2;
      var paragraphs = text.split('\n');
      var lines = [];
      paragraphs.forEach(function (para) {
        var words = para.split(' ');
        var cur = '';
        words.forEach(function (w) {
          var test = cur ? cur + ' ' + w : w;
          if (mctx.measureText(test).width > maxLineWidth && cur) { lines.push(cur); cur = w; }
          else cur = test;
        });
        lines.push(cur);
      });

      var linesPerPage = Math.floor((pxH - margin * 2) / lineHeight);
      var pageChunks = [];
      for (var i = 0; i < lines.length; i += linesPerPage) pageChunks.push(lines.slice(i, i + linesPerPage));
      if (!pageChunks.length) pageChunks = [[]];

      var pages = pageChunks.map(function (chunk) {
        var canvas = document.createElement('canvas');
        canvas.width = pxW; canvas.height = pxH;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, pxW, pxH);
        ctx.fillStyle = '#1A1A1A';
        ctx.font = fontPx + 'px Vazirmatn, Tahoma, sans-serif';
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        chunk.forEach(function (line, idx) {
          ctx.fillText(line, pxW - margin, margin + fontPx + idx * lineHeight);
        });
        return window.PDFLite.canvasToPage(canvas, curOrient === 'landscape' ? 'Letter' : 'A4', 0, 0.9);
      });
      // Force exact custom page size by overriding pageSize lookup isn't simple; use A4/Letter closest match already set.
      var pdfBytes = window.PDFLite.buildImagePdf(pages);
      var blob = new Blob([pdfBytes], { type: 'application/pdf' });
      var outName = 'document-' + Date.now() + '.pdf';
      resultWrap.innerHTML = '';
      resultWrap.appendChild(el('div', 'stat-line', '<span>تعداد صفحات</span><b>' + pages.length + '</b>'));
      resultWrap.appendChild(el('div', 'stat-line', '<span>حجم فایل</span><b>' + fmtBytes(blob.size) + '</b>'));
      resultActions(resultWrap,
        function () { saveBlob(blob, outName); addHistory('pdf-text', outName); },
        function () { shareBlob(blob, outName, 'application/pdf'); addHistory('pdf-text', outName); },
        function () { runBtn.click(); });
    });
  };

  // ---------------------------------------------------------------------
  // Calendar math — Jalali (Shamsi) <-> Gregorian <-> Hijri
  // (verified via round-trip testing over 2010-2035 / Hijri 1400-1450,
  // 0 failures; algorithms are the standard, widely-used ones — see README)
  // ---------------------------------------------------------------------
  var CAL = (function () {
    function div(a, b) { var q = a / b; return q >= 0 ? Math.trunc(q) : -Math.trunc(-q); }
    function mod(a, b) { return a - b * div(a, b); }

    function g2d(gy, gm, gd) {
      var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
        + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
      d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
      return d;
    }
    function d2g(jdn) {
      var j = 4 * jdn + 139361631;
      j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
      var i = div(mod(j, 1461), 4) * 5 + 308;
      var gd = div(mod(i, 153), 5) + 1;
      var gm = mod(div(i, 153), 12) + 1;
      var gy = div(j, 1461) - 100100 + div(8 - gm, 6);
      return [gy, gm, gd];
    }

    var BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
      1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
    function jalCal(jy) {
      var bl = BREAKS.length, gy = jy + 621, leapJ = -14, jp = BREAKS[0], jump = 0, i, jm, n;
      for (i = 1; i < bl; i++) {
        jm = BREAKS[i]; jump = jm - jp;
        if (jy < jm) break;
        leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
        jp = jm;
      }
      n = jy - jp;
      leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
      if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
      var leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
      var march = 20 + leapJ - leapG;
      if (jump - n < 6) n = n - jump + div(jump, 33) * 33;
      var leap = mod(mod(n + 1, 33) - 1, 4);
      if (leap === -1) leap = 4;
      return { leap: leap, gy: gy, march: march };
    }
    function j2d(jy, jm, jd) {
      var r = jalCal(jy);
      return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
    }
    function d2j(jdn) {
      var gy = d2g(jdn)[0], jy = gy - 621, r = jalCal(jy);
      var jdn1f = g2d(r.gy, 3, r.march), k = jdn - jdn1f, jm, jd;
      if (k >= 0) {
        if (k <= 185) { jm = 1 + div(k, 31); jd = mod(k, 31) + 1; return [jy, jm, jd]; }
        else k -= 186;
      } else { jy -= 1; k += 179; if (r.leap === 1) k += 1; }
      jm = 7 + div(k, 30); jd = mod(k, 30) + 1;
      return [jy, jm, jd];
    }
    function g2j(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
    function j2g(jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }
    function jalaliMonthLength(jy, jm) {
      if (jm <= 6) return 31;
      if (jm <= 11) return 30;
      return jalCal(jy + 1).leap === 1 ? 30 : 29; // Esfand
    }

    // Hijri (tabular civil calendar — see README for the ~1-2 day caveat vs moon-sighting)
    function h2d(y, m, d) {
      return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948440 - 1;
    }
    function d2h(jdn) {
      jdn = jdn - 1948440 + 10632;
      var n = Math.floor((jdn - 1) / 10631);
      jdn = jdn - 10631 * n + 354;
      var j = Math.floor((10985 - jdn) / 5316) * Math.floor(50 * jdn / 17719) + Math.floor(jdn / 5670) * Math.floor(43 * jdn / 15238);
      jdn = jdn - Math.floor((30 - j) / 15) * Math.floor(17719 * j / 50) - Math.floor(j / 16) * Math.floor(15238 * j / 43) + 29;
      var m = Math.floor(24 * jdn / 709);
      var d = jdn - Math.floor(709 * m / 24);
      var y = 30 * n + j - 30;
      return [Math.trunc(y), Math.trunc(m), Math.trunc(d)];
    }
    function g2h(gy, gm, gd) { return d2h(g2d(gy, gm, gd)); }
    function h2g(hy, hm, hd) { return d2g(h2d(hy, hm, hd)); }

    var JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    var GREGORIAN_MONTHS = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
    var HIJRI_MONTHS = ['محرم', 'صفر', 'ربیع‌الاول', 'ربیع‌الثانی', 'جمادی‌الاول', 'جمادی‌الثانی', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذیقعده', 'ذیحجه'];
    var WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

    return {
      g2j: g2j, j2g: j2g, g2h: g2h, h2g: h2g, g2d: g2d, d2g: d2g,
      jalaliMonthLength: jalaliMonthLength,
      JALALI_MONTHS: JALALI_MONTHS, GREGORIAN_MONTHS: GREGORIAN_MONTHS, HIJRI_MONTHS: HIJRI_MONTHS, WEEKDAYS: WEEKDAYS
    };
  })();

  // ---------------------------------------------------------------------
  // 11. Favicon Generator (also: a tiny from-scratch ZIP writer, store-only)
  // ---------------------------------------------------------------------
  var ZIP = (function () {
    var CRC_TABLE = (function () {
      var t = [];
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
      }
      return t;
    })();
    function crc32(bytes) {
      var crc = 0xFFFFFFFF;
      for (var i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
      return (crc ^ 0xFFFFFFFF) >>> 0;
    }
    function dosDateTime() {
      var d = new Date();
      var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
      var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      return { time: time, date: date };
    }
    function u16(n) { return [n & 0xFF, (n >> 8) & 0xFF]; }
    function u32(n) { return [n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF]; }
    function build(files) { // files: [{name, bytes(Uint8Array)}]
      var localParts = [], centralParts = [], offset = 0;
      var dt = dosDateTime();
      files.forEach(function (f) {
        var nameBytes = new TextEncoder().encode(f.name);
        var crc = crc32(f.bytes);
        var size = f.bytes.length;
        var localHeader = [].concat(
          u32(0x04034b50), u16(20), u16(0), u16(0), u16(dt.time), u16(dt.date),
          u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0)
        );
        var local = new Uint8Array(localHeader.length + nameBytes.length + size);
        local.set(localHeader, 0);
        local.set(nameBytes, localHeader.length);
        local.set(f.bytes, localHeader.length + nameBytes.length);
        localParts.push(local);

        var centralHeader = [].concat(
          u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(dt.time), u16(dt.date),
          u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset)
        );
        var central = new Uint8Array(centralHeader.length + nameBytes.length);
        central.set(centralHeader, 0);
        central.set(nameBytes, centralHeader.length);
        centralParts.push(central);

        offset += local.length;
      });
      var centralStart = offset;
      var centralSize = centralParts.reduce(function (s, p) { return s + p.length; }, 0);
      var eocd = new Uint8Array([].concat(
        u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
        u32(centralSize), u32(centralStart), u16(0)
      ));
      var all = localParts.concat(centralParts, [eocd]);
      var total = all.reduce(function (s, p) { return s + p.length; }, 0);
      var out = new Uint8Array(total);
      var pos = 0;
      all.forEach(function (p) { out.set(p, pos); pos += p.length; });
      return out;
    }
    return { build: build };
  })();

  TOOL_RENDERERS['favicon-gen'] = function (body) {
    var fd = fileDrop('انتخاب یک عکس', 'ترجیحاً مربعی برای بهترین نتیجه', 'image/*');
    body.appendChild(fd.wrap);
    var runBtn = el('button', 'run-btn', '▶ ساخت بستهٔ فاوآیکون (ZIP)');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) { runBtn.disabled = false; fd.wrap.querySelector('.main').textContent = currentFile.name; }
    });

    runBtn.addEventListener('click', function () {
      if (!currentFile) return;
      loadImageFile(currentFile).then(function (loaded) {
        var sizes = [16, 32, 48, 64, 128, 256];
        var promises = sizes.map(function (sz) {
          return new Promise(function (resolve) {
            var canvas = document.createElement('canvas');
            canvas.width = sz; canvas.height = sz;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(loaded.img, 0, 0, sz, sz);
            canvas.toBlob(function (blob) {
              blob.arrayBuffer().then(function (buf) { resolve({ name: 'favicon-' + sz + 'x' + sz + '.png', bytes: new Uint8Array(buf) }); });
            }, 'image/png');
          });
        });
        Promise.all(promises).then(function (files) {
          var zipBytes = ZIP.build(files);
          var blob = new Blob([zipBytes], { type: 'application/zip' });
          var outName = 'favicons-' + Date.now() + '.zip';
          resultWrap.innerHTML = '';
          resultWrap.appendChild(el('div', 'stat-line', '<span>تعداد فایل</span><b>' + files.length + '</b>'));
          resultActions(resultWrap,
            function () { saveBlob(blob, outName); addHistory('favicon-gen', outName); },
            function () { shareBlob(blob, outName, 'application/zip'); addHistory('favicon-gen', outName); },
            function () { runBtn.click(); });
        });
      });
    });
  };

  // ---------------------------------------------------------------------
  // 12. SVG to Image Converter
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['svg-to-img'] = function (body) {
    var fd = fileDrop('انتخاب فایل SVG', 'برای انتخاب فایل ضربه بزنید', 'image/svg+xml');
    body.appendChild(fd.wrap);
    var sizeField = el('div', 'field', '<label>اندازه خروجی: <b id="svgSizeVal">512</b>px</label><input type="range" id="svgSize" min="128" max="2048" step="64" value="512">');
    body.appendChild(sizeField);
    var svgSize = sizeField.querySelector('#svgSize'), svgSizeVal = sizeField.querySelector('#svgSizeVal');
    svgSize.addEventListener('input', function () { svgSizeVal.textContent = svgSize.value; });
    var fmtField = el('div', 'field', '<label>فرمت</label><div class="seg" id="svgFmt"><button data-f="image/png" class="active">PNG</button><button data-f="image/jpeg">JPG</button></div>');
    body.appendChild(fmtField);
    var curFmt = 'image/png';
    fmtField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { fmtField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); curFmt = b.dataset.f; });
    });
    var runBtn = el('button', 'run-btn', '▶ تبدیل');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) { runBtn.disabled = false; fd.wrap.querySelector('.main').textContent = currentFile.name; }
    });

    runBtn.addEventListener('click', function () {
      if (!currentFile) return;
      var reader = new FileReader();
      reader.onload = function () {
        var svgText = reader.result;
        var svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
        var url = URL.createObjectURL(svgBlob);
        var img = new Image();
        img.onload = function () {
          var sz = parseInt(svgSize.value, 10);
          var canvas = document.createElement('canvas');
          canvas.width = sz; canvas.height = sz;
          var ctx = canvas.getContext('2d');
          if (curFmt === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sz, sz); }
          ctx.drawImage(img, 0, 0, sz, sz);
          URL.revokeObjectURL(url);
          canvas.toBlob(function (blob) {
            var ext = curFmt === 'image/png' ? 'png' : 'jpg';
            var outName = currentFile.name.replace(/\.\w+$/, '') + '.' + ext;
            resultWrap.innerHTML = '';
            var preview = el('div', 'preview-box');
            var img2 = document.createElement('img'); img2.src = URL.createObjectURL(blob);
            preview.appendChild(img2); resultWrap.appendChild(preview);
            resultActions(resultWrap,
              function () { saveBlob(blob, outName); addHistory('svg-to-img', outName); },
              function () { shareBlob(blob, outName, curFmt); addHistory('svg-to-img', outName); },
              function () { runBtn.click(); });
          }, curFmt, 0.92);
        };
        img.onerror = function () { toast('فایل SVG قابل خواندن نبود'); };
        img.src = url;
      };
      reader.readAsText(currentFile);
    });
  };

  // ---------------------------------------------------------------------
  // 13. Strong Password Generator
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['password-gen'] = function (body) {
    var lenField = el('div', 'field', '<label>طول رمز: <b id="pwLenVal">16</b></label><input type="range" id="pwLen" min="6" max="64" value="16">');
    body.appendChild(lenField);
    var pwLen = lenField.querySelector('#pwLen'), pwLenVal = lenField.querySelector('#pwLenVal');
    pwLen.addEventListener('input', function () { pwLenVal.textContent = pwLen.value; });

    var opts = { upper: true, numbers: true, symbols: true };
    var optsField = el('div', 'field', '<label>شامل شود</label><div class="seg" id="pwOpts" style="flex-wrap:wrap">' +
      '<button data-o="upper" class="active">حروف بزرگ</button>' +
      '<button data-o="numbers" class="active">اعداد</button>' +
      '<button data-o="symbols" class="active">نمادها</button></div>');
    body.appendChild(optsField);
    optsField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { b.classList.toggle('active'); opts[b.dataset.o] = b.classList.contains('active'); });
    });

    var runBtn = el('button', 'run-btn', '🔐 تولید رمز');
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    function generate() {
      var lower = 'abcdefghijklmnopqrstuvwxyz';
      var chars = lower;
      if (opts.upper) chars += lower.toUpperCase();
      if (opts.numbers) chars += '0123456789';
      if (opts.symbols) chars += '!@#$%^&*()_-+=[]{}';
      var len = parseInt(pwLen.value, 10);
      var arr = new Uint32Array(len);
      crypto.getRandomValues(arr);
      var pw = '';
      for (var i = 0; i < len; i++) pw += chars[arr[i] % chars.length];
      return pw;
    }

    runBtn.addEventListener('click', function () {
      var pw = generate();
      resultWrap.innerHTML = '';
      var box = el('div', 'field', '<label>رمز تولید‌شده</label><input type="text" id="pwOut" readonly style="font-family:monospace;font-size:15px;letter-spacing:1px">');
      box.querySelector('#pwOut').value = pw;
      resultWrap.appendChild(box);
      var copyBtn = el('button', 'run-btn secondary', '📋 کپی رمز');
      copyBtn.addEventListener('click', function () { navigator.clipboard.writeText(pw).then(function () { toast('رمز کپی شد'); }); });
      resultWrap.appendChild(copyBtn);
      addHistory('password-gen', 'رمز ' + pw.length + ' کاراکتری');
    });
  };

  // ---------------------------------------------------------------------
  // 14. Notepad (IndexedDB)
  // ---------------------------------------------------------------------
  var notesDB = null;
  function openNotesDB() {
    return new Promise(function (resolve, reject) {
      if (notesDB) return resolve(notesDB);
      var req = indexedDB.open('ia_notes_db', 1);
      req.onupgradeneeded = function () {
        req.result.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = function () { notesDB = req.result; resolve(notesDB); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function notesGetAll() {
    return openNotesDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction('notes', 'readonly');
        var req = tx.objectStore('notes').getAll();
        req.onsuccess = function () { resolve(req.result.sort(function (a, b) { return b.updated - a.updated; })); };
      });
    });
  }
  function notesPut(note) {
    return openNotesDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction('notes', 'readwrite');
        var req = tx.objectStore('notes').put(note);
        req.onsuccess = function () { resolve(req.result); };
      });
    });
  }
  function notesDelete(id) {
    return openNotesDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction('notes', 'readwrite');
        tx.objectStore('notes').delete(id);
        tx.oncomplete = function () { resolve(); };
      });
    });
  }

  TOOL_RENDERERS['notepad'] = function (body) {
    var searchField = el('div', 'field', '<input type="text" id="noteSearch" placeholder="جست‌وجو در یادداشت‌ها...">');
    body.appendChild(searchField);
    var newBtn = el('button', 'run-btn', '+ یادداشت جدید');
    body.appendChild(newBtn);
    var listWrap = el('div');
    body.appendChild(listWrap);
    var editorWrap = el('div');
    body.appendChild(editorWrap);

    var allNotes = [];
    function refresh() {
      notesGetAll().then(function (notes) {
        allNotes = notes;
        renderList(searchField.querySelector('#noteSearch').value);
      });
    }
    function renderList(filter) {
      var q = (filter || '').trim().toLowerCase();
      var list = !q ? allNotes : allNotes.filter(function (n) {
        return (n.title || '').toLowerCase().indexOf(q) !== -1 || (n.text || '').toLowerCase().indexOf(q) !== -1;
      });
      listWrap.innerHTML = '';
      if (!list.length) { listWrap.appendChild(el('div', 'empty-state', '<div class="emoji">🗒️</div>یادداشتی موجود نیست')); return; }
      list.forEach(function (n) {
        var row = el('div', 'history-row', '');
        row.style.cursor = 'pointer';
        row.innerHTML = '<div class="history-icon">🗒️</div><div style="flex:1"><div class="history-name">' +
          (n.title || 'بدون عنوان') + '</div><div class="history-meta">' + (n.text || '').slice(0, 40) + '</div></div>';
        row.addEventListener('click', function () { openEditor(n); });
        listWrap.appendChild(row);
      });
    }
    function openEditor(note) {
      editorWrap.innerHTML = '';
      var titleField = el('div', 'field', '<input type="text" id="noteTitle" placeholder="عنوان">');
      titleField.querySelector('#noteTitle').value = note.title || '';
      var bodyField = el('div', 'field', '<textarea id="noteBody" style="min-height:140px" placeholder="متن یادداشت..."></textarea>');
      bodyField.querySelector('#noteBody').value = note.text || '';
      editorWrap.appendChild(titleField); editorWrap.appendChild(bodyField);
      var saveBtn = el('button', 'run-btn', '💾 ذخیره یادداشت');
      var delBtn = el('button', 'run-btn secondary', '🗑️ حذف');
      editorWrap.appendChild(saveBtn);
      if (note.id) editorWrap.appendChild(delBtn);
      saveBtn.addEventListener('click', function () {
        var toSave = { title: titleField.querySelector('#noteTitle').value, text: bodyField.querySelector('#noteBody').value, updated: Date.now() };
        if (note.id) toSave.id = note.id;
        notesPut(toSave).then(function () { toast('یادداشت ذخیره شد'); editorWrap.innerHTML = ''; refresh(); });
      });
      delBtn.addEventListener('click', function () {
        notesDelete(note.id).then(function () { toast('یادداشت حذف شد'); editorWrap.innerHTML = ''; refresh(); });
      });
    }
    newBtn.addEventListener('click', function () { openEditor({}); });
    searchField.querySelector('#noteSearch').addEventListener('input', function (e) { renderList(e.target.value); });
    refresh();
  };

  // ---------------------------------------------------------------------
  // 15. Text Analyzer
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['text-analyzer'] = function (body) {
    var field = el('div', 'field', '<textarea id="anText" style="min-height:160px" placeholder="متن خود را اینجا وارد یا جای‌گذاری کنید..."></textarea>');
    body.appendChild(field);
    var statsWrap = el('div');
    body.appendChild(statsWrap);
    var textarea = field.querySelector('#anText');
    function analyze() {
      var text = textarea.value;
      var chars = text.length;
      var charsNoSpace = text.replace(/\s/g, '').length;
      var words = text.trim() ? text.trim().split(/\s+/).length : 0;
      var sentences = text.trim() ? (text.match(/[.!?؟。]+/g) || []).length || (text.trim() ? 1 : 0) : 0;
      var paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length : 0;
      var readingMin = Math.max(1, Math.ceil(words / 200));
      statsWrap.innerHTML = '';
      [['تعداد کاراکتر', chars], ['کاراکتر بدون فاصله', charsNoSpace], ['تعداد کلمات', words],
        ['تعداد جملات', sentences], ['تعداد پاراگراف‌ها', paragraphs], ['زمان مطالعه تقریبی', readingMin + ' دقیقه']
      ].forEach(function (row) { statsWrap.appendChild(el('div', 'stat-line', '<span>' + row[0] + '</span><b>' + row[1] + '</b>')); });
    }
    textarea.addEventListener('input', analyze);
    analyze();
  };

  // ---------------------------------------------------------------------
  // 16. Code Formatting & Minification
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['code-format'] = function (body) {
    var langField = el('div', 'field', '<label>زبان</label><div class="seg" id="langSeg">' +
      '<button data-l="json" class="active">JSON</button><button data-l="css">CSS</button><button data-l="html">HTML</button><button data-l="js">JS</button></div>');
    body.appendChild(langField);
    var curLang = 'json';
    langField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { langField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); curLang = b.dataset.l; });
    });
    var inField = el('div', 'field', '<label>کد ورودی</label><textarea id="codeIn" style="min-height:140px;font-family:monospace"></textarea>');
    body.appendChild(inField);
    var modeField = el('div', 'field', '<label>عملیات</label><div class="seg" id="modeSeg"><button data-m="format" class="active">فرمت‌بندی (زیبا)</button><button data-m="minify">کوچک‌سازی</button></div>');
    body.appendChild(modeField);
    var curMode = 'format';
    modeField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { modeField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); curMode = b.dataset.m; });
    });
    var runBtn = el('button', 'run-btn', '▶ اجرا');
    body.appendChild(runBtn);
    var outField = el('div', 'field', '<label>خروجی</label><textarea id="codeOut" readonly style="min-height:140px;font-family:monospace"></textarea>');
    body.appendChild(outField);
    var copyBtn = el('button', 'run-btn secondary', '📋 کپی خروجی');
    body.appendChild(copyBtn);

    function basicIndent(code) {
      var out = '', depth = 0, i = 0;
      code = code.replace(/>\s*</g, '>\n<'); // rough HTML tag split
      var lines = code.split(/\n|(?<=[{;}])/).map(function (l) { return l.trim(); }).filter(Boolean);
      lines.forEach(function (line) {
        if (/^[}\)\]]/.test(line) || /^<\//.test(line)) depth = Math.max(0, depth - 1);
        out += '  '.repeat(depth) + line + '\n';
        var opens = (line.match(/[{(\[]/g) || []).length;
        var closes = (line.match(/[})\]]/g) || []).length;
        if (/<[a-zA-Z]/.test(line) && !/\/>$/.test(line) && !/<\//.test(line) && curLang === 'html') depth++;
        else depth += Math.max(0, opens - closes);
      });
      return out.trim();
    }
    function minifyGeneric(code) {
      return code
        .replace(/\/\*[\s\S]*?\*\//g, '')     // block comments
        .replace(/(^|[^:])\/\/.*$/gm, '$1')   // line comments (best-effort)
        .replace(/>\s+</g, '><')
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    runBtn.addEventListener('click', function () {
      var input = inField.querySelector('#codeIn').value;
      var output = '';
      try {
        if (curLang === 'json') {
          var obj = JSON.parse(input);
          output = curMode === 'format' ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
        } else {
          output = curMode === 'format' ? basicIndent(input) : minifyGeneric(input);
        }
        outField.querySelector('#codeOut').value = output;
        addHistory('code-format', curLang.toUpperCase() + ' · ' + (curMode === 'format' ? 'فرمت' : 'کوچک‌سازی'));
      } catch (err) {
        toast('خطا: ' + (err.message || 'کد نامعتبر است'));
      }
    });
    copyBtn.addEventListener('click', function () {
      var v = outField.querySelector('#codeOut').value;
      if (!v) { toast('ابتدا کد را پردازش کنید'); return; }
      navigator.clipboard.writeText(v).then(function () { toast('کپی شد'); });
    });
    body.appendChild(el('div', 'sheet-desc',
      'فرمت‌بندی HTML/CSS/JS در این نسخه بر پایه قواعد ساده تورفتگی است (نه یک پارسر کامل)؛ برای JSON دقیق و کامل است.'));
  };

  // ---------------------------------------------------------------------
  // 17. Regex Tester
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['regex-test'] = function (body) {
    var patField = el('div', 'field', '<label>الگو (Pattern)</label><input type="text" id="reInput" placeholder="مثلاً: \\d+">');
    body.appendChild(patField);
    var flagsField = el('div', 'field', '<label>پرچم‌ها (Flags)</label><input type="text" id="reFlags" value="g" placeholder="g, i, m...">');
    body.appendChild(flagsField);
    var testField = el('div', 'field', '<label>متن تست</label><textarea id="reText" style="min-height:120px"></textarea>');
    body.appendChild(testField);
    var runBtn = el('button', 'run-btn', '▶ تست');
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    runBtn.addEventListener('click', function () {
      var pattern = patField.querySelector('#reInput').value;
      var flags = flagsField.querySelector('#reFlags').value;
      var text = testField.querySelector('#reText').value;
      resultWrap.innerHTML = '';
      try {
        var re = new RegExp(pattern, flags);
        var matches = flags.indexOf('g') !== -1 ? Array.from(text.matchAll(re)) : (re.exec(text) ? [re.exec(text)] : []);
        resultWrap.appendChild(el('div', 'stat-line', '<span>تعداد تطابق‌ها</span><b>' + matches.length + '</b>'));
        matches.slice(0, 50).forEach(function (m, idx) {
          var groups = m.slice(1).filter(function (g) { return g !== undefined; });
          resultWrap.appendChild(el('div', 'file-list-item', '<span class="name">#' + (idx + 1) + ': "' + m[0] + '"' +
            (groups.length ? ' — گروه‌ها: ' + groups.join(', ') : '') + '</span>'));
        });
        addHistory('regex-test', pattern);
      } catch (err) {
        toast('الگوی نامعتبر: ' + err.message);
      }
    });
  };

  // ---------------------------------------------------------------------
  // 18. Text Comparison (word-level LCS diff)
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['text-diff'] = function (body) {
    var f1 = el('div', 'field', '<label>متن اول</label><textarea id="diffA" style="min-height:100px"></textarea>');
    var f2 = el('div', 'field', '<label>متن دوم</label><textarea id="diffB" style="min-height:100px"></textarea>');
    body.appendChild(f1); body.appendChild(f2);
    var runBtn = el('button', 'run-btn', '▶ مقایسه');
    body.appendChild(runBtn);
    var resultWrap = el('div', 'preview-box', '');
    resultWrap.style.display = 'block'; resultWrap.style.textAlign = 'right'; resultWrap.style.lineHeight = '2';
    body.appendChild(resultWrap);

    function lcsDiff(a, b) {
      var n = a.length, m = b.length;
      var dp = Array.from({ length: n + 1 }, function () { return new Int32Array(m + 1); });
      for (var i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
      var out = [], i2 = 0, j2 = 0;
      while (i2 < n && j2 < m) {
        if (a[i2] === b[j2]) { out.push({ t: 'same', w: a[i2] }); i2++; j2++; }
        else if (dp[i2 + 1][j2] >= dp[i2][j2 + 1]) { out.push({ t: 'del', w: a[i2] }); i2++; }
        else { out.push({ t: 'add', w: b[j2] }); j2++; }
      }
      while (i2 < n) { out.push({ t: 'del', w: a[i2] }); i2++; }
      while (j2 < m) { out.push({ t: 'add', w: b[j2] }); j2++; }
      return out;
    }

    runBtn.addEventListener('click', function () {
      var a = f1.querySelector('#diffA').value.split(/\s+/).filter(Boolean);
      var b = f2.querySelector('#diffB').value.split(/\s+/).filter(Boolean);
      var diff = lcsDiff(a, b);
      resultWrap.innerHTML = diff.map(function (d) {
        if (d.t === 'same') return '<span>' + d.w + '</span>';
        if (d.t === 'del') return '<span style="background:rgba(192,57,43,.18);text-decoration:line-through;color:var(--danger)">' + d.w + '</span>';
        return '<span style="background:rgba(46,139,87,.18);color:var(--success)">' + d.w + '</span>';
      }).join(' ');
      addHistory('text-diff', 'مقایسه دو متن');
    });
  };

  // ---------------------------------------------------------------------
  // 19. Meta Tag Generator
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['meta-gen'] = function (body) {
    var titleField = el('div', 'field', '<label>عنوان صفحه</label><input type="text" id="metaTitle">');
    var descField = el('div', 'field', '<label>توضیحات</label><textarea id="metaDesc" style="min-height:70px"></textarea>');
    var imgField = el('div', 'field', '<label>آدرس تصویر (اختیاری)</label><input type="text" id="metaImg" placeholder="https://...">');
    body.appendChild(titleField); body.appendChild(descField); body.appendChild(imgField);
    var runBtn = el('button', 'run-btn', '▶ ساخت تگ‌ها');
    body.appendChild(runBtn);
    var outField = el('div', 'field', '<label>خروجی HTML</label><textarea id="metaOut" readonly style="min-height:180px;font-family:monospace"></textarea>');
    body.appendChild(outField);
    var copyBtn = el('button', 'run-btn secondary', '📋 کپی');
    body.appendChild(copyBtn);

    function esc(s) { return (s || '').replace(/"/g, '&quot;'); }
    runBtn.addEventListener('click', function () {
      var title = titleField.querySelector('#metaTitle').value;
      var desc = descField.querySelector('#metaDesc').value;
      var img = imgField.querySelector('#metaImg').value;
      var lines = [
        '<title>' + esc(title) + '</title>',
        '<meta name="description" content="' + esc(desc) + '">',
        '<meta property="og:title" content="' + esc(title) + '">',
        '<meta property="og:description" content="' + esc(desc) + '">'
      ];
      if (img) lines.push('<meta property="og:image" content="' + esc(img) + '">');
      lines.push('<meta name="twitter:card" content="summary_large_image">');
      lines.push('<meta name="twitter:title" content="' + esc(title) + '">');
      lines.push('<meta name="twitter:description" content="' + esc(desc) + '">');
      if (img) lines.push('<meta name="twitter:image" content="' + esc(img) + '">');
      outField.querySelector('#metaOut').value = lines.join('\n');
      addHistory('meta-gen', title || 'متا تگ');
    });
    copyBtn.addEventListener('click', function () {
      var v = outField.querySelector('#metaOut').value;
      if (!v) { toast('ابتدا تگ‌ها را بسازید'); return; }
      navigator.clipboard.writeText(v).then(function () { toast('کپی شد'); });
    });
  };

  // ---------------------------------------------------------------------
  // 20. Calendar (monthly view: Shamsi + Gregorian)
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['calendar'] = function (body) {
    var today = new Date();
    var todayJ = CAL.g2j(today.getFullYear(), today.getMonth() + 1, today.getDate());
    var state = { jy: todayJ[0], jm: todayJ[1] };

    var nav = el('div', 'field', '<div class="seg"><button id="calPrev">‹ ماه قبل</button><span id="calLabel" style="flex:2;text-align:center;padding:9px;font-weight:700"></span><button id="calNext">ماه بعد ›</button></div>');
    body.appendChild(nav);
    var grid = el('div');
    grid.style.display = 'grid'; grid.style.gridTemplateColumns = 'repeat(7,1fr)'; grid.style.gap = '4px';
    body.appendChild(grid);
    body.appendChild(el('div', 'sheet-desc', 'عدد بزرگ = روز شمسی، عدد کوچک زیر آن = روز میلادی معادل.'));

    function render() {
      nav.querySelector('#calLabel').textContent = CAL.JALALI_MONTHS[state.jm - 1] + ' ' + state.jy;
      grid.innerHTML = '';
      CAL.WEEKDAYS.forEach(function (w) {
        var h = el('div', '', w[0]);
        h.style.cssText = 'text-align:center;font-size:10px;color:var(--text-dim);padding:4px 0';
        grid.appendChild(h);
      });
      var firstGregorian = CAL.j2g(state.jy, state.jm, 1);
      var firstDate = new Date(firstGregorian[0], firstGregorian[1] - 1, firstGregorian[2]);
      var startWeekday = firstDate.getDay(); // 0=Sunday
      for (var i = 0; i < startWeekday; i++) grid.appendChild(el('div', ''));
      var len = CAL.jalaliMonthLength(state.jy, state.jm);
      for (var d = 1; d <= len; d++) {
        var greg = CAL.j2g(state.jy, state.jm, d);
        var isToday = state.jy === todayJ[0] && state.jm === todayJ[1] && d === todayJ[2];
        var cell = el('div', '', '<div style="font-weight:700;font-size:13px">' + d + '</div><div style="font-size:9px;color:var(--text-dim)">' + greg[2] + '</div>');
        cell.style.cssText = 'text-align:center;padding:6px 2px;border-radius:10px;background:' + (isToday ? 'var(--primary)' : 'var(--card)') + ';color:' + (isToday ? 'var(--primary-ink)' : 'var(--text)') + ';border:1px solid var(--border)';
        grid.appendChild(cell);
      }
    }
    nav.querySelector('#calPrev').addEventListener('click', function () {
      state.jm--; if (state.jm < 1) { state.jm = 12; state.jy--; } render();
    });
    nav.querySelector('#calNext').addEventListener('click', function () {
      state.jm++; if (state.jm > 12) { state.jm = 1; state.jy++; } render();
    });
    render();
  };

  // ---------------------------------------------------------------------
  // 21. Date Converter (Shamsi <-> Gregorian <-> Hijri)
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['date-convert'] = function (body) {
    var srcField = el('div', 'field', '<label>تقویم مبدأ</label><div class="seg" id="dcSrc">' +
      '<button data-s="j" class="active">شمسی</button><button data-s="g">میلادی</button><button data-s="h">قمری</button></div>');
    body.appendChild(srcField);
    var curSrc = 'j';
    srcField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { srcField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); curSrc = b.dataset.s; });
    });
    var ymdField = el('div', 'field', '<label>سال / ماه / روز</label><div style="display:flex;gap:8px">' +
      '<input type="number" id="dcY" placeholder="سال" style="flex:1.3">' +
      '<input type="number" id="dcM" placeholder="ماه" min="1" max="12" style="flex:1">' +
      '<input type="number" id="dcD" placeholder="روز" min="1" max="31" style="flex:1"></div>');
    body.appendChild(ymdField);
    var runBtn = el('button', 'run-btn', '▶ تبدیل');
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);
    body.appendChild(el('div', 'sheet-desc', 'تبدیل قمری بر پایه تقویم محاسباتی (جدولی) است و ممکن است ۱ تا ۲ روز با رؤیت هلال واقعی تفاوت داشته باشد.'));

    runBtn.addEventListener('click', function () {
      var y = parseInt(ymdField.querySelector('#dcY').value, 10);
      var m = parseInt(ymdField.querySelector('#dcM').value, 10);
      var d = parseInt(ymdField.querySelector('#dcD').value, 10);
      if (!y || !m || !d) { toast('سال، ماه و روز را کامل وارد کنید'); return; }
      try {
        var gy, gm, gd, jy, jm, jd, hy, hm, hd;
        if (curSrc === 'j') { var gArr = CAL.j2g(y, m, d); gy = gArr[0]; gm = gArr[1]; gd = gArr[2]; jy = y; jm = m; jd = d; var hArr = CAL.g2h(gy, gm, gd); hy = hArr[0]; hm = hArr[1]; hd = hArr[2]; }
        else if (curSrc === 'g') { gy = y; gm = m; gd = d; var jArr = CAL.g2j(y, m, d); jy = jArr[0]; jm = jArr[1]; jd = jArr[2]; var hArr2 = CAL.g2h(y, m, d); hy = hArr2[0]; hm = hArr2[1]; hd = hArr2[2]; }
        else { var gArr2 = CAL.h2g(y, m, d); gy = gArr2[0]; gm = gArr2[1]; gd = gArr2[2]; hy = y; hm = m; hd = d; var jArr2 = CAL.g2j(gy, gm, gd); jy = jArr2[0]; jm = jArr2[1]; jd = jArr2[2]; }
        resultWrap.innerHTML = '';
        resultWrap.appendChild(el('div', 'stat-line', '<span>شمسی</span><b>' + jy + ' ' + CAL.JALALI_MONTHS[jm - 1] + ' ' + jd + '</b>'));
        resultWrap.appendChild(el('div', 'stat-line', '<span>میلادی</span><b>' + gy + '-' + String(gm).padStart(2, '0') + '-' + String(gd).padStart(2, '0') + '</b>'));
        resultWrap.appendChild(el('div', 'stat-line', '<span>قمری</span><b>' + hy + ' ' + CAL.HIJRI_MONTHS[hm - 1] + ' ' + hd + '</b>'));
        addHistory('date-convert', jy + '/' + jm + '/' + jd);
      } catch (err) { toast('تاریخ نامعتبر است'); }
    });
  };

  // ---------------------------------------------------------------------
  // 22. Age Calculator
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['age-calc'] = function (body) {
    var field = el('div', 'field', '<label>تاریخ تولد (میلادی)</label><input type="date" id="dobInput">');
    body.appendChild(field);
    var runBtn = el('button', 'run-btn', '▶ محاسبه سن');
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    runBtn.addEventListener('click', function () {
      var val = field.querySelector('#dobInput').value;
      if (!val) { toast('تاریخ تولد را انتخاب کنید'); return; }
      var dob = new Date(val + 'T00:00:00');
      var now = new Date();
      if (dob > now) { toast('تاریخ تولد نمی‌تواند در آینده باشد'); return; }
      var y = now.getFullYear() - dob.getFullYear();
      var m = now.getMonth() - dob.getMonth();
      var d = now.getDate() - dob.getDate();
      if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
      if (m < 0) { y--; m += 12; }
      var totalDays = Math.floor((now - dob) / 86400000);
      var jArr = CAL.g2j(dob.getFullYear(), dob.getMonth() + 1, dob.getDate());
      resultWrap.innerHTML = '';
      resultWrap.appendChild(el('div', 'stat-line', '<span>سن دقیق</span><b>' + y + ' سال، ' + m + ' ماه، ' + d + ' روز</b>'));
      resultWrap.appendChild(el('div', 'stat-line', '<span>مجموع روزها</span><b>' + totalDays.toLocaleString('fa-IR') + '</b>'));
      resultWrap.appendChild(el('div', 'stat-line', '<span>تاریخ تولد شمسی</span><b>' + jArr[0] + ' ' + CAL.JALALI_MONTHS[jArr[1] - 1] + ' ' + jArr[2] + '</b>'));
      addHistory('age-calc', y + ' سال');
    });
  };

  // ---------------------------------------------------------------------
  // 23. City Distance Finder
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['city-distance'] = function (body) {
    if (!citiesData) { body.appendChild(el('div', 'empty-state', 'در حال بارگذاری اطلاعات شهرها...')); setTimeout(function () { body.innerHTML = ''; TOOL_RENDERERS['city-distance'](body); }, 400); return; }
    var opts = citiesData.map(function (c) { return '<option>' + c.name + '</option>'; }).join('');
    var f1 = el('div', 'field', '<label>شهر مبدأ</label><select id="cityA">' + opts + '</select>');
    var f2 = el('div', 'field', '<label>شهر مقصد</label><select id="cityB">' + opts + '</select>');
    body.appendChild(f1); body.appendChild(f2);
    if (f2.querySelector('select').options.length > 1) f2.querySelector('select').selectedIndex = 1;
    var runBtn = el('button', 'run-btn', '▶ محاسبه فاصله');
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    function haversine(a, b) {
      var R = 6371, toRad = function (d) { return d * Math.PI / 180; };
      var dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
      var s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    }

    runBtn.addEventListener('click', function () {
      var nameA = f1.querySelector('#cityA').value, nameB = f2.querySelector('#cityB').value;
      var a = citiesData.find(function (c) { return c.name === nameA; });
      var b = citiesData.find(function (c) { return c.name === nameB; });
      if (!a || !b) return;
      var km = haversine(a, b);
      resultWrap.innerHTML = '';
      resultWrap.appendChild(el('div', 'stat-line', '<span>فاصله مستقیم (هوایی)</span><b>' + Math.round(km).toLocaleString('fa-IR') + ' کیلومتر</b>'));
      resultWrap.appendChild(el('div', 'stat-line', '<span>زمان تقریبی رانندگی</span><b>~' + (km / 80).toFixed(1) + ' ساعت</b>'));
      body.appendChild(el('div', 'sheet-desc', 'فاصله به‌صورت خط‌مستقیم (هوایی) محاسبه شده، نه مسیر واقعی جاده.'));
      addHistory('city-distance', nameA + ' ↔ ' + nameB);
    });
  };

  // ---------------------------------------------------------------------
  // 24. Dictionary (English <-> Persian, offline word list)
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['dictionary'] = function (body) {
    if (!dictData) { body.appendChild(el('div', 'empty-state', 'در حال بارگذاری واژه‌نامه...')); setTimeout(function () { body.innerHTML = ''; TOOL_RENDERERS['dictionary'](body); }, 400); return; }
    var field = el('div', 'field', '<input type="text" id="dictSearch" placeholder="کلمه انگلیسی یا فارسی را وارد کنید...">');
    body.appendChild(field);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    field.querySelector('#dictSearch').addEventListener('input', function (e) {
      var q = e.target.value.trim().toLowerCase();
      resultWrap.innerHTML = '';
      if (!q) return;
      var matches = dictData.filter(function (w) { return w.en.toLowerCase().indexOf(q) !== -1 || w.fa.indexOf(q) !== -1; }).slice(0, 30);
      if (!matches.length) { resultWrap.appendChild(el('div', 'empty-state', 'یافت نشد')); return; }
      matches.forEach(function (w) {
        resultWrap.appendChild(el('div', 'file-list-item', '<span class="name">' + w.en + ' ← → ' + w.fa + '</span>'));
      });
    });
  };

  // ---------------------------------------------------------------------
  // 25. Hafez Fortune Telling
  // ---------------------------------------------------------------------
  TOOL_RENDERERS['hafez'] = function (body) {
    var runBtn = el('button', 'run-btn', '🌹 نیت کن و فال بگیر');
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    runBtn.addEventListener('click', function () {
      if (!ghazalData || !ghazalData.length) { toast('در حال بارگذاری... دوباره تلاش کنید'); return; }
      var v = ghazalData[Math.floor(Math.random() * ghazalData.length)];
      resultWrap.innerHTML = '';
      var box = el('div', 'preview-box', '');
      box.style.cssText = 'display:block;text-align:center;padding:20px;line-height:2.1;font-size:14.5px';
      box.innerHTML = '<div style="font-size:11px;color:var(--text-dim);margin-bottom:10px">غزل ' + v.number + ' · ' + v.category + '</div>' +
        v.text.split('\n').map(function (l) { return '<div>' + l + '</div>'; }).join('') +
        '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);font-size:12.5px;color:var(--text-dim)">' + v.interpretation + '</div>';
      resultWrap.appendChild(box);
      addHistory('hafez', 'غزل شماره ' + v.number);
    });
  };

  // ---------------------------------------------------------------------
  // Native-only tools (26-33) — these call the real IranAryaei Capacitor
  // plugin (android/.../IranAryaeiPlugin.java) directly; there is no JS
  // fallback because the underlying work (audio/video transcoding, HEIC,
  // PDF rasterization) genuinely needs native Android APIs. Outside the
  // installed app (e.g. testing this page in a plain browser) they show
  // a clear message instead of silently failing.
  // ---------------------------------------------------------------------
  function nativeUnavailableNotice(body, toolLabel) {
    body.appendChild(el('div', 'empty-state',
      '<div class="emoji">📱</div>«' + toolLabel + '» فقط داخل برنامهٔ نصب‌شده روی اندروید کار می‌کند، چون به قابلیت‌های ' +
      'native دستگاه نیاز دارد. اینجا (در مرورگر) در دسترس نیست.'));
  }
  async function nativeUploadFile(plugin, file) {
    var base64 = await blobToBase64(file);
    return plugin.writeTempFile({ name: file.name, data: base64 });
  }
  function showNativeResult(resultWrap, toolId, plugin, result, extraStatsHtml, rerunFn) {
    resultWrap.innerHTML = '';
    resultWrap.dataset.toolId = toolId;
    if (extraStatsHtml) resultWrap.appendChild(el('div', '', extraStatsHtml));
    resultWrap.appendChild(el('div', 'stat-line', '<span>حجم خروجی</span><b>' + fmtBytes(result.size || 0) + '</b>'));
    resultActions(resultWrap,
      function () {
        plugin.saveTempFile({ path: result.path, name: result.name, mime: result.mime })
          .then(function () { toast('در پوشه دانلودها ذخیره شد: ' + result.name); addHistory(toolId, result.name); })
          .catch(function (err) { toast('ذخیره ناموفق بود: ' + (err && err.message ? err.message : 'خطای ناشناخته')); });
      },
      function () {
        plugin.shareTempFile({ path: result.path, name: result.name, mime: result.mime })
          .then(function () { addHistory(toolId, result.name); })
          .catch(function (err) { toast('اشتراک‌گذاری ناموفق بود: ' + (err && err.message ? err.message : 'خطای ناشناخته')); });
      },
      rerunFn || function () {});
  }

  // 26. Audio Trimmer
  TOOL_RENDERERS['audio-trim'] = function (body) {
    var plugin = nativePlugin();
    if (!plugin) return nativeUnavailableNotice(body, 'برش صدا');
    var fd = fileDrop('انتخاب فایل صوتی', 'MP3, WAV, M4A و مشابه', 'audio/*');
    body.appendChild(fd.wrap);
    var rangeField = el('div', 'field', '<label>بازه برش (ثانیه)</label><div style="display:flex;gap:8px">' +
      '<input type="number" id="trimStart" placeholder="شروع" min="0" value="0" style="flex:1">' +
      '<input type="number" id="trimEnd" placeholder="پایان" min="0" style="flex:1"></div>');
    body.appendChild(rangeField);
    var durHint = el('div', 'sheet-desc', 'ابتدا فایل را انتخاب کنید تا مدت‌زمان آن نمایش داده شود.');
    body.appendChild(durHint);
    var runBtn = el('button', 'run-btn', '▶ برش صدا');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (!currentFile) return;
      fd.wrap.querySelector('.main').textContent = currentFile.name;
      runBtn.disabled = false;
      var audio = new Audio(URL.createObjectURL(currentFile));
      audio.addEventListener('loadedmetadata', function () {
        durHint.textContent = 'مدت‌زمان فایل: حدود ' + Math.round(audio.duration) + ' ثانیه';
        rangeField.querySelector('#trimEnd').value = Math.round(audio.duration);
      });
    });

    function run() {
      var start = parseFloat(rangeField.querySelector('#trimStart').value) || 0;
      var end = parseFloat(rangeField.querySelector('#trimEnd').value) || 0;
      if (!currentFile || end <= start) { toast('بازه برش نامعتبر است'); return; }
      runBtn.disabled = true; runBtn.textContent = '⏳ در حال پردازش...';
      nativeUploadFile(plugin, currentFile)
        .then(function (uploaded) { return plugin.trimAudio({ inputPath: uploaded.path, startSec: start, endSec: end }); })
        .then(function (result) { runBtn.disabled = false; runBtn.textContent = '▶ برش صدا'; showNativeResult(resultWrap, 'audio-trim', plugin, result, null, run); })
        .catch(function (err) { runBtn.disabled = false; runBtn.textContent = '▶ برش صدا'; toast('برش ناموفق بود: ' + (err && err.message ? err.message : 'خطای ناشناخته')); });
    }
    runBtn.addEventListener('click', run);
  };

  // 27. Audio Size Reducer
  TOOL_RENDERERS['audio-reduce'] = function (body) {
    var plugin = nativePlugin();
    if (!plugin) return nativeUnavailableNotice(body, 'کاهش حجم صدا');
    var fd = fileDrop('انتخاب فایل صوتی', 'برای انتخاب فایل ضربه بزنید', 'audio/*');
    body.appendChild(fd.wrap);
    var brField = el('div', 'field', '<label>بیت‌ریت خروجی</label><div class="seg" id="brSeg">' +
      '<button data-b="64000">۶۴</button><button data-b="96000" class="active">۹۶</button>' +
      '<button data-b="128000">۱۲۸</button><button data-b="192000">۱۹۲</button></div>');
    body.appendChild(brField);
    var curBitrate = 96000;
    brField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { brField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); curBitrate = parseInt(b.dataset.b, 10); });
    });
    var runBtn = el('button', 'run-btn', '▶ کاهش حجم');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) { runBtn.disabled = false; fd.wrap.querySelector('.main').textContent = currentFile.name; }
    });

    function run() {
      if (!currentFile) return;
      runBtn.disabled = true; runBtn.textContent = '⏳ در حال پردازش...';
      nativeUploadFile(plugin, currentFile)
        .then(function (uploaded) { return plugin.compressAudio({ inputPath: uploaded.path, bitrate: curBitrate }); })
        .then(function (result) { runBtn.disabled = false; runBtn.textContent = '▶ کاهش حجم'; showNativeResult(resultWrap, 'audio-reduce', plugin, result, null, run); })
        .catch(function (err) { runBtn.disabled = false; runBtn.textContent = '▶ کاهش حجم'; toast('فشرده‌سازی ناموفق بود: ' + (err && err.message ? err.message : 'خطای ناشناخته')); });
    }
    runBtn.addEventListener('click', run);
  };

  // 28. Audio to MP3
  TOOL_RENDERERS['audio-to-mp3'] = function (body) {
    var plugin = nativePlugin();
    if (!plugin) return nativeUnavailableNotice(body, 'تبدیل صدا به MP3');
    body.appendChild(el('div', 'sheet-desc', 'اگر فایل ورودی از قبل MP3 باشد بدون تغییر کپی می‌شود. برای فرمت‌های دیگر، این کار فقط روی دستگاه‌هایی ممکن است که encoder داخلی MP3 دارند.'));
    var fd = fileDrop('انتخاب فایل صوتی', 'برای انتخاب فایل ضربه بزنید', 'audio/*');
    body.appendChild(fd.wrap);
    var runBtn = el('button', 'run-btn', '▶ تبدیل به MP3');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) { runBtn.disabled = false; fd.wrap.querySelector('.main').textContent = currentFile.name; }
    });

    function run() {
      if (!currentFile) return;
      runBtn.disabled = true; runBtn.textContent = '⏳ در حال پردازش...';
      nativeUploadFile(plugin, currentFile)
        .then(function (uploaded) { return plugin.audioToMp3({ inputPath: uploaded.path, bitrate: 128000 }); })
        .then(function (result) { runBtn.disabled = false; runBtn.textContent = '▶ تبدیل به MP3'; showNativeResult(resultWrap, 'audio-to-mp3', plugin, result, null, run); })
        .catch(function (err) { runBtn.disabled = false; runBtn.textContent = '▶ تبدیل به MP3'; toast('تبدیل ناموفق بود: ' + (err && err.message ? err.message : 'این دستگاه encoder داخلی MP3 ندارد')); });
    }
    runBtn.addEventListener('click', run);
  };

  // 29. Video Size Reducer
  TOOL_RENDERERS['video-reduce'] = function (body) {
    var plugin = nativePlugin();
    if (!plugin) return nativeUnavailableNotice(body, 'کاهش حجم ویدیو');
    body.appendChild(el('div', 'sheet-desc', 'فشرده‌سازی ویدیو ممکن است روی فایل‌های بزرگ چند دقیقه طول بکشد — صفحه را باز نگه دارید.'));
    var fd = fileDrop('انتخاب فایل ویدیویی', 'برای انتخاب فایل ضربه بزنید', 'video/*');
    body.appendChild(fd.wrap);
    var qField = el('div', 'field', '<label>کیفیت</label><div class="seg" id="vqSeg">' +
      '<button data-b="1000000">کم</button><button data-b="2000000" class="active">متوسط</button><button data-b="5000000">بالا</button></div>');
    body.appendChild(qField);
    var curBitrate = 2000000;
    qField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { qField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); curBitrate = parseInt(b.dataset.b, 10); });
    });
    var runBtn = el('button', 'run-btn', '▶ کاهش حجم ویدیو');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) { runBtn.disabled = false; fd.wrap.querySelector('.main').textContent = currentFile.name; }
    });

    function run() {
      if (!currentFile) return;
      runBtn.disabled = true; runBtn.textContent = '⏳ در حال پردازش... ممکن است طول بکشد';
      nativeUploadFile(plugin, currentFile)
        .then(function (uploaded) { return plugin.compressVideo({ inputPath: uploaded.path, bitrate: curBitrate }); })
        .then(function (result) { runBtn.disabled = false; runBtn.textContent = '▶ کاهش حجم ویدیو'; showNativeResult(resultWrap, 'video-reduce', plugin, result, null, run); })
        .catch(function (err) { runBtn.disabled = false; runBtn.textContent = '▶ کاهش حجم ویدیو'; toast('فشرده‌سازی ناموفق بود: ' + (err && err.message ? err.message : 'خطای ناشناخته')); });
    }
    runBtn.addEventListener('click', run);
  };

  // 30. Image to HEIC
  TOOL_RENDERERS['img-to-heic'] = function (body) {
    var plugin = nativePlugin();
    if (!plugin) return nativeUnavailableNotice(body, 'تبدیل عکس به HEIC');
    body.appendChild(el('div', 'sheet-desc', 'این قابلیت به Android 10 یا بالاتر و پشتیبانی دستگاه از HEIC نیاز دارد.'));
    var fd = fileDrop('انتخاب عکس (JPG/PNG)', 'برای انتخاب فایل ضربه بزنید', 'image/*');
    body.appendChild(fd.wrap);
    var runBtn = el('button', 'run-btn', '▶ تبدیل به HEIC');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) { runBtn.disabled = false; fd.wrap.querySelector('.main').textContent = currentFile.name; }
    });

    function run() {
      if (!currentFile) return;
      runBtn.disabled = true; runBtn.textContent = '⏳ در حال پردازش...';
      nativeUploadFile(plugin, currentFile)
        .then(function (uploaded) { return plugin.imageToHeic({ inputPath: uploaded.path }); })
        .then(function (result) { runBtn.disabled = false; runBtn.textContent = '▶ تبدیل به HEIC'; showNativeResult(resultWrap, 'img-to-heic', plugin, result, null, run); })
        .catch(function (err) { runBtn.disabled = false; runBtn.textContent = '▶ تبدیل به HEIC'; toast('تبدیل ناموفق بود: ' + (err && err.message ? err.message : 'این دستگاه از HEIC پشتیبانی نمی‌کند')); });
    }
    runBtn.addEventListener('click', run);
  };

  // 31. HEIC to JPG
  TOOL_RENDERERS['heic-to-jpg'] = function (body) {
    var plugin = nativePlugin();
    if (!plugin) return nativeUnavailableNotice(body, 'تبدیل HEIC به JPG');
    var fd = fileDrop('انتخاب فایل HEIC/HEIF', 'برای انتخاب فایل ضربه بزنید', '.heic,.heif,image/heic,image/heif');
    body.appendChild(fd.wrap);
    var runBtn = el('button', 'run-btn', '▶ تبدیل به JPG');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) { runBtn.disabled = false; fd.wrap.querySelector('.main').textContent = currentFile.name; }
    });

    function run() {
      if (!currentFile) return;
      runBtn.disabled = true; runBtn.textContent = '⏳ در حال پردازش...';
      nativeUploadFile(plugin, currentFile)
        .then(function (uploaded) { return plugin.heicToJpg({ inputPath: uploaded.path }); })
        .then(function (result) { runBtn.disabled = false; runBtn.textContent = '▶ تبدیل به JPG'; showNativeResult(resultWrap, 'heic-to-jpg', plugin, result, null, run); })
        .catch(function (err) { runBtn.disabled = false; runBtn.textContent = '▶ تبدیل به JPG'; toast('تبدیل ناموفق بود: ' + (err && err.message ? err.message : 'خطای ناشناخته')); });
    }
    runBtn.addEventListener('click', run);
  };

  // 32. Remove Photo Background
  TOOL_RENDERERS['bg-remove'] = function (body) {
    var plugin = nativePlugin();
    if (!plugin) return nativeUnavailableNotice(body, 'حذف پس‌زمینه عکس');
    body.appendChild(el('div', 'sheet-desc', 'این نسخه با نمونه‌برداری از رنگ گوشه‌های عکس، پس‌زمینه‌های ساده و یک‌دست را حذف می‌کند — جایگزین کامل مدل‌های هوش مصنوعی segmentation نیست.'));
    var fd = fileDrop('انتخاب عکس', 'ترجیحاً با پس‌زمینه ساده/یک‌رنگ', 'image/*');
    body.appendChild(fd.wrap);
    var tolField = el('div', 'field', '<label>حساسیت تشخیص پس‌زمینه: <b id="tolVal">45</b></label><input type="range" id="tolSlider" min="10" max="120" value="45">');
    body.appendChild(tolField);
    var tolSlider = tolField.querySelector('#tolSlider'), tolVal = tolField.querySelector('#tolVal');
    tolSlider.addEventListener('input', function () { tolVal.textContent = tolSlider.value; });
    var runBtn = el('button', 'run-btn', '▶ حذف پس‌زمینه');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) { runBtn.disabled = false; fd.wrap.querySelector('.main').textContent = currentFile.name; }
    });

    function run() {
      if (!currentFile) return;
      runBtn.disabled = true; runBtn.textContent = '⏳ در حال پردازش...';
      nativeUploadFile(plugin, currentFile)
        .then(function (uploaded) { return plugin.removeBackground({ inputPath: uploaded.path, tolerance: parseInt(tolSlider.value, 10) }); })
        .then(function (result) { runBtn.disabled = false; runBtn.textContent = '▶ حذف پس‌زمینه'; showNativeResult(resultWrap, 'bg-remove', plugin, result, null, run); })
        .catch(function (err) { runBtn.disabled = false; runBtn.textContent = '▶ حذف پس‌زمینه'; toast('حذف پس‌زمینه ناموفق بود: ' + (err && err.message ? err.message : 'خطای ناشناخته')); });
    }
    runBtn.addEventListener('click', run);
  };

  // 33. Convert PDF to Images
  TOOL_RENDERERS['pdf-to-img'] = function (body) {
    var plugin = nativePlugin();
    if (!plugin) return nativeUnavailableNotice(body, 'تبدیل PDF به تصویر');
    var fd = fileDrop('انتخاب فایل PDF', 'برای انتخاب فایل ضربه بزنید', 'application/pdf');
    body.appendChild(fd.wrap);
    var fmtField = el('div', 'field', '<label>فرمت خروجی</label><div class="seg" id="pdfImgFmt"><button data-f="png" class="active">PNG</button><button data-f="jpg">JPG</button></div>');
    body.appendChild(fmtField);
    var curFmt = 'png';
    fmtField.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { fmtField.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); curFmt = b.dataset.f; });
    });
    var scaleField = el('div', 'field', '<label>مقیاس: <b id="pdfScaleVal">100</b>٪</label><input type="range" id="pdfScale" min="50" max="200" step="10" value="100">');
    body.appendChild(scaleField);
    var scaleSlider = scaleField.querySelector('#pdfScale'), scaleVal = scaleField.querySelector('#pdfScaleVal');
    scaleSlider.addEventListener('input', function () { scaleVal.textContent = scaleSlider.value; });
    var runBtn = el('button', 'run-btn', '▶ تبدیل به تصویر (ZIP)');
    runBtn.disabled = true;
    body.appendChild(runBtn);
    var resultWrap = el('div');
    body.appendChild(resultWrap);

    var currentFile = null;
    fd.input.addEventListener('change', function () {
      currentFile = fd.input.files[0];
      if (currentFile) { runBtn.disabled = false; fd.wrap.querySelector('.main').textContent = currentFile.name; }
    });

    function run() {
      if (!currentFile) return;
      runBtn.disabled = true; runBtn.textContent = '⏳ در حال پردازش...';
      nativeUploadFile(plugin, currentFile)
        .then(function (uploaded) { return plugin.pdfToImages({ inputPath: uploaded.path, format: curFmt, scale: parseInt(scaleSlider.value, 10) }); })
        .then(function (result) {
          runBtn.disabled = false; runBtn.textContent = '▶ تبدیل به تصویر (ZIP)';
          showNativeResult(resultWrap, 'pdf-to-img', plugin, result,
            '<div class="stat-line"><span>تعداد صفحات</span><b>' + (result.pages || '؟') + '</b></div>', run);
        })
        .catch(function (err) { runBtn.disabled = false; runBtn.textContent = '▶ تبدیل به تصویر (ZIP)'; toast('تبدیل ناموفق بود: ' + (err && err.message ? err.message : 'خطای ناشناخته')); });
    }
    runBtn.addEventListener('click', run);
  };

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  initTheme();
  renderQuickGrid();
  renderChips();
  renderToolGrid();
})();
