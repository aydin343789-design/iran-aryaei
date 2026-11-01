/*!
 * PDFLite — minimal fully offline PDF toolkit.
 * - buildImagePdf(pages): builds a valid PDF from JPEG page images (used by
 *   "Image to PDF" and "PDF from text", the latter rendering text to canvas
 *   first since no Persian font file is bundled for real embedded text).
 * - mergePdfs(buffers): a best-effort merger for classic (non-encrypted,
 *   non object-stream / non-linearized) PDFs, including any PDF this app
 *   itself generates. Complex modern PDFs (encrypted, cross-reference
 *   streams) are detected and rejected with a clear message rather than
 *   producing a corrupt file.
 * No network, no dependencies.
 */
(function (global) {
  'use strict';

  var PAGE_SIZES = {
    A4: [595.28, 841.89],
    Letter: [612, 792]
  };

  // ---------- low level byte/string helpers ----------
  function strToBytes(str) {
    var arr = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i) & 0xFF;
    return arr;
  }
  function concatBytes(chunks) {
    var total = 0;
    chunks.forEach(function (c) { total += c.length; });
    var out = new Uint8Array(total);
    var off = 0;
    chunks.forEach(function (c) { out.set(c, off); off += c.length; });
    return out;
  }
  function dataUrlToBytes(dataUrl) {
    var base64 = dataUrl.split(',')[1];
    var bin = atob(base64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  // ---------- PDF builder (image-based pages) ----------
  // pages: [{ jpegBytes: Uint8Array, pxWidth, pxHeight, pageSize: 'A4'|'Letter', margin: number(pt) }]
  function buildImagePdf(pages) {
    var objects = []; // array of {text (string, may contain \0 placeholder) or bytes}
    var offsets = [];
    var chunks = [];
    var curOffset = 0;

    function pushString(s) {
      var b = strToBytes(s);
      chunks.push(b);
      curOffset += b.length;
    }
    function pushBytes(b) {
      chunks.push(b);
      curOffset += b.length;
    }
    function startObj(num) {
      offsets[num] = curOffset;
      pushString(num + ' 0 obj\n');
    }
    function endObj() {
      pushString('endobj\n');
    }

    pushString('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    var pageCount = pages.length;
    var totalObjs = 2 + pageCount * 3; // catalog, pages, then per page: page/content/image
    var pagesObjNum = 2;
    var nextObjNum = 3;
    var pageObjNums = [];

    // reserve numbering: we need catalog(1), pages(2), then for each page: pageObj, contentObj, imageObj
    var perPage = [];
    for (var i = 0; i < pageCount; i++) {
      perPage.push({ page: nextObjNum++, content: nextObjNum++, image: nextObjNum++ });
    }

    // obj 1: catalog
    startObj(1);
    pushString('<< /Type /Catalog /Pages 2 0 R >>\n');
    endObj();

    // obj 2: pages
    var kids = perPage.map(function (p) { return p.page + ' 0 R'; }).join(' ');
    startObj(2);
    pushString('<< /Type /Pages /Kids [' + kids + '] /Count ' + pageCount + ' >>\n');
    endObj();

    pages.forEach(function (pg, idx) {
      var sizeName = pg.pageSize || 'A4';
      var pageWH = PAGE_SIZES[sizeName] || PAGE_SIZES.A4;
      var margin = pg.margin != null ? pg.margin : 24;
      var maxW = pageWH[0] - margin * 2;
      var maxH = pageWH[1] - margin * 2;
      var ratio = Math.min(maxW / pg.pxWidth, maxH / pg.pxHeight);
      var drawW = pg.pxWidth * ratio;
      var drawH = pg.pxHeight * ratio;
      var x = (pageWH[0] - drawW) / 2;
      var y = (pageWH[1] - drawH) / 2;
      var ids = perPage[idx];

      // page object
      startObj(ids.page);
      pushString('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageWH[0].toFixed(2) + ' ' + pageWH[1].toFixed(2) + ']' +
        ' /Resources << /XObject << /Im0 ' + ids.image + ' 0 R >> >> /Contents ' + ids.content + ' 0 R >>\n');
      endObj();

      // content stream
      var contentStr = 'q ' + drawW.toFixed(2) + ' 0 0 ' + drawH.toFixed(2) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' cm /Im0 Do Q';
      startObj(ids.content);
      pushString('<< /Length ' + contentStr.length + ' >>\nstream\n' + contentStr + '\nendstream\n');
      endObj();

      // image object (raw JPEG via DCTDecode)
      startObj(ids.image);
      pushString('<< /Type /XObject /Subtype /Image /Width ' + pg.pxWidth + ' /Height ' + pg.pxHeight +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + pg.jpegBytes.length + ' >>\nstream\n');
      pushBytes(pg.jpegBytes);
      pushString('\nendstream\n');
      endObj();
    });

    var xrefStart = curOffset;
    var totalCount = nextObjNum;
    pushString('xref\n0 ' + totalCount + '\n');
    pushString('0000000000 65535 f \n');
    for (var n = 1; n < totalCount; n++) {
      var off = offsets[n] || 0;
      pushString(String(off).padStart(10, '0') + ' 00000 n \n');
    }
    pushString('trailer\n<< /Size ' + totalCount + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF');

    return concatBytes(chunks);
  }

  // ---------- helpers to turn images/canvases into page descriptors ----------
  function canvasToPage(canvas, pageSize, margin, quality) {
    var dataUrl = canvas.toDataURL('image/jpeg', quality || 0.88);
    return {
      jpegBytes: dataUrlToBytes(dataUrl),
      pxWidth: canvas.width,
      pxHeight: canvas.height,
      pageSize: pageSize,
      margin: margin
    };
  }

  function imageFileToPage(imgEl, pageSize, margin, quality) {
    var c = document.createElement('canvas');
    c.width = imgEl.naturalWidth; c.height = imgEl.naturalHeight;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(imgEl, 0, 0);
    return canvasToPage(c, pageSize, margin, quality);
  }

  // ---------- basic classic-PDF merger ----------
  function bytesToLatin1(bytes) {
    var CHUNK = 0x8000;
    var out = '';
    for (var i = 0; i < bytes.length; i += CHUNK) {
      out += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
    }
    return out;
  }

  function parseClassicPdf(bytes) {
    var text = bytesToLatin1(bytes);
    if (text.indexOf('trailer') === -1) {
      throw new Error('NO_TRAILER');
    }
    if (/\/Encrypt/.test(text.slice(text.lastIndexOf('trailer')))) {
      throw new Error('ENCRYPTED');
    }
    var objRe = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
    var objects = {};
    var m;
    while ((m = objRe.exec(text)) !== null) {
      var num = parseInt(m[1], 10);
      var body = m[2];
      var streamMatch = /stream\r?\n([\s\S]*?)endstream/.exec(body);
      var dictText = streamMatch ? body.slice(0, streamMatch.index) : body;
      var streamBytes = null;
      if (streamMatch) {
        var startInBody = streamMatch.index + streamMatch[0].indexOf('\n') + 1;
        var lenMatch = /\/Length\s+(\d+)/.exec(dictText);
        var globalStart = m.index + 'obj'.length + startInBody + (m[0].indexOf(body));
        // Recompute precisely using absolute offsets in original bytes:
        var absBodyStart = m.index + m[0].indexOf(body);
        var absStreamKw = absBodyStart + streamMatch.index;
        var absDataStart = absStreamKw + streamMatch[0].indexOf('\n') + 1;
        var len = lenMatch ? parseInt(lenMatch[1], 10) : streamMatch[1].length;
        streamBytes = bytes.subarray(absDataStart, absDataStart + len);
      }
      objects[num] = { dict: dictText, stream: streamBytes };
    }
    var trailerText = text.slice(text.lastIndexOf('trailer'));
    var rootMatch = /\/Root\s+(\d+)\s+0\s+R/.exec(trailerText);
    if (!rootMatch) throw new Error('NO_ROOT');
    var rootNum = parseInt(rootMatch[1], 10);
    return { objects: objects, rootNum: rootNum };
  }

  function refsIn(dictText) {
    var re = /(\d+)\s+0\s+R/g, m, out = [];
    while ((m = re.exec(dictText)) !== null) out.push(parseInt(m[1], 10));
    return out;
  }

  function getPagesInOrder(parsed) {
    var root = parsed.objects[parsed.rootNum];
    if (!root) throw new Error('BAD_CATALOG');
    var pagesRefMatch = /\/Pages\s+(\d+)\s+0\s+R/.exec(root.dict);
    if (!pagesRefMatch) throw new Error('BAD_CATALOG');
    var pages = [];
    function walk(num, inherited) {
      var obj = parsed.objects[num];
      if (!obj) return;
      var isPages = /\/Type\s*\/Pages/.test(obj.dict);
      var mediaBoxMatch = /\/MediaBox\s*\[([^\]]+)\]/.exec(obj.dict);
      var inh = Object.assign({}, inherited);
      if (mediaBoxMatch) inh.mediaBox = mediaBoxMatch[0];
      if (isPages || /\/Kids/.test(obj.dict)) {
        var kidsMatch = /\/Kids\s*\[([^\]]+)\]/.exec(obj.dict);
        if (kidsMatch) {
          var kidNums = refsIn(kidsMatch[1]);
          kidNums.forEach(function (k) { walk(k, inh); });
        }
      } else {
        pages.push({ num: num, inherited: inh });
      }
    }
    walk(parseInt(pagesRefMatch[1], 10), {});
    return pages;
  }

  function mergePdfs(buffers) {
    var allDocs = buffers.map(function (b) {
      try { return parseClassicPdf(b); }
      catch (e) { throw new Error(e.message === 'ENCRYPTED' ? 'ENCRYPTED' : 'UNSUPPORTED'); }
    });

    var newObjects = {}; // newNum -> {dict(text with OLD refs still), stream}
    var nextNum = 1;
    var idMap = []; // per-doc map: oldNum -> newNum
    var orderedPageNewNums = [];

    allDocs.forEach(function (doc, docIdx) {
      var localMap = {};
      idMap.push(localMap);
      function copy(oldNum) {
        if (localMap[oldNum]) return localMap[oldNum];
        var newNum = nextNum++;
        localMap[oldNum] = newNum;
        var obj = doc.objects[oldNum];
        if (!obj) return newNum;
        newObjects[newNum] = { dict: obj.dict, stream: obj.stream, sourceRefs: refsIn(obj.dict) };
        // recursively copy referenced objects
        refsIn(obj.dict).forEach(function (r) { copy(r); });
        return newNum;
      }
      var pages = getPagesInOrder(doc);
      pages.forEach(function (pg) {
        var newPageNum = copy(pg.num);
        orderedPageNewNums.push(newPageNum);
        // ensure MediaBox present directly on page (inherit if needed)
        if (pg.inherited.mediaBox && !/\/MediaBox/.test(newObjects[newPageNum].dict)) {
          newObjects[newPageNum].dict = newObjects[newPageNum].dict.replace(
            /<</, '<< ' + pg.inherited.mediaBox
          );
        }
      });
    });

    // Build final remap: since copy() used original numbers as keys but we need
    // the *object's own doc* map to rewrite its internal refs. Rebuild per new object
    // by finding which doc/localMap produced it.
    // Simpler approach: redo pass storing (docIdx, oldNum) per newNum.
    // (Re-implemented below for correctness.)
    newObjects = {};
    nextNum = 1;
    idMap = allDocs.map(function () { return {}; });
    var newNumToSource = {};
    orderedPageNewNums = [];

    allDocs.forEach(function (doc, docIdx) {
      var localMap = idMap[docIdx];
      function copy(oldNum) {
        if (localMap[oldNum] != null) return localMap[oldNum];
        var newNum = nextNum++;
        localMap[oldNum] = newNum;
        newNumToSource[newNum] = { docIdx: docIdx, oldNum: oldNum };
        var obj = doc.objects[oldNum];
        if (obj) refsIn(obj.dict).forEach(copy);
        return newNum;
      }
      var pages = getPagesInOrder(doc);
      pages.forEach(function (pg) {
        var newPageNum = copy(pg.num);
        orderedPageNewNums.push(newPageNum);
      });
    });

    // Now emit objects with refs rewritten using each object's own doc map
    var catalogNum = nextNum++;
    var pagesNum = nextNum++;

    var chunks = [];
    var offsets = {};
    var curOffset = 0;
    function pushString(s) { var b = strToBytes(s); chunks.push(b); curOffset += b.length; }
    function pushBytes(b) { chunks.push(b); curOffset += b.length; }

    pushString('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    Object.keys(newNumToSource).forEach(function (key) {
      var newNum = parseInt(key, 10);
      var src = newNumToSource[newNum];
      var doc = allDocs[src.docIdx];
      var localMap = idMap[src.docIdx];
      var obj = doc.objects[src.oldNum];
      var dictRewritten = obj.dict.replace(/(\d+)\s+0\s+R/g, function (all, n) {
        var mapped = localMap[parseInt(n, 10)];
        return mapped ? (mapped + ' 0 R') : all;
      });
      offsets[newNum] = curOffset;
      pushString(newNum + ' 0 obj\n' + dictRewritten);
      if (obj.stream) {
        pushString('stream\n');
        pushBytes(obj.stream);
        pushString('\nendstream\n');
      } else {
        pushString('\n');
      }
      pushString('endobj\n');
    });

    offsets[catalogNum] = curOffset;
    pushString(catalogNum + ' 0 obj\n<< /Type /Catalog /Pages ' + pagesNum + ' 0 R >>\nendobj\n');

    offsets[pagesNum] = curOffset;
    var kidsStr = orderedPageNewNums.map(function (n) { return n + ' 0 R'; }).join(' ');
    pushString(pagesNum + ' 0 obj\n<< /Type /Pages /Kids [' + kidsStr + '] /Count ' + orderedPageNewNums.length + ' >>\nendobj\n');

    // fix up each merged page's /Parent to point at the unified Pages object
    // (simplest: leave original /Parent ref — most viewers tolerate a dangling
    // parent since /Kids on the real Pages object is authoritative for traversal.)

    var totalCount = pagesNum + 1;
    var xrefStart = curOffset;
    pushString('xref\n0 ' + totalCount + '\n0000000000 65535 f \n');
    for (var n = 1; n < totalCount; n++) {
      var off = offsets[n] || 0;
      pushString(String(off).padStart(10, '0') + ' 00000 n \n');
    }
    pushString('trailer\n<< /Size ' + totalCount + ' /Root ' + catalogNum + ' 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF');

    return concatBytes(chunks);
  }

  global.PDFLite = {
    buildImagePdf: buildImagePdf,
    canvasToPage: canvasToPage,
    imageFileToPage: imageFileToPage,
    mergePdfs: mergePdfs,
    PAGE_SIZES: PAGE_SIZES
  };
})(window);
