/*!
 * QRLite — minimal, fully offline QR Code encoder.
 * Implements ISO/IEC 18004 byte-mode encoding, error-correction level M,
 * versions 1-10 (data capacity up to 216 bytes — enough for links, short
 * text, vCard-lite, wifi strings, etc). No network, no dependencies.
 *
 * Public API:
 *   QRLite.generate(text)            -> { size, version, modules: Uint8Array[size*size] }
 *   QRLite.drawToCanvas(canvas, text, {scale, margin, dark, light})
 *   QRLite.maxLength(text)           -> boolean, whether text fits in v1-10 byte mode
 */
(function (global) {
  'use strict';

  // ---------- GF(256) tables (primitive poly 0x11D) ----------
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (function initGF() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  // Build Reed-Solomon generator polynomial of given degree (ecc codeword count)
  function rsGeneratorPoly(degree) {
    var poly = [1];
    for (var i = 0; i < degree; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= gfMul(poly[j], 1);
        next[j + 1] ^= gfMul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly; // highest degree first
  }
  function rsEncode(dataCodewords, eccCount) {
    var gen = rsGeneratorPoly(eccCount);
    var res = new Uint8Array(dataCodewords.length + eccCount);
    res.set(dataCodewords);
    for (var i = 0; i < dataCodewords.length; i++) {
      var coef = res[i];
      if (coef === 0) continue;
      for (var j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
    return Array.from(res.slice(dataCodewords.length));
  }

  // ---------- Version tables (EC level M only), versions 1-10 ----------
  // [totalDataCodewords, eccPerBlock, [ [blockCount, dataWordsPerBlock], ... ] ]
  var VERSION_TABLE = {
    1:  { data: 16,  ecc: 10, groups: [[1, 16]] },
    2:  { data: 28,  ecc: 16, groups: [[1, 28]] },
    3:  { data: 44,  ecc: 26, groups: [[1, 44]] },
    4:  { data: 64,  ecc: 18, groups: [[2, 32]] },
    5:  { data: 86,  ecc: 24, groups: [[2, 43]] },
    6:  { data: 108, ecc: 16, groups: [[4, 27]] },
    7:  { data: 124, ecc: 18, groups: [[4, 31]] },
    8:  { data: 154, ecc: 22, groups: [[2, 38], [2, 39]] },
    9:  { data: 182, ecc: 22, groups: [[3, 36], [2, 37]] },
    10: { data: 216, ecc: 26, groups: [[2, 68 /*unused*/]] } // placeholder overwritten below
  };
  // Correct version 10 group split (4 blocks x43 + 1 block x44 = 216)
  VERSION_TABLE[10] = { data: 216, ecc: 26, groups: [[4, 43], [1, 44]] };

  var REMAINDER_BITS = { 1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 0, 8: 0, 9: 0, 10: 0 };
  var ALIGNMENT_POS = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };

  function charCountBits(version) { return version <= 9 ? 8 : 16; }

  function utf8Bytes(str) {
    return Array.from(new TextEncoder().encode(str));
  }

  function pickVersion(byteLen) {
    for (var v = 1; v <= 10; v++) {
      var capBits = VERSION_TABLE[v].data * 8;
      var used = 4 + charCountBits(v) + byteLen * 8;
      if (used <= capBits) return v;
    }
    return null; // too long
  }

  function maxLength(text) {
    return pickVersion(utf8Bytes(text).length) !== null;
  }

  // ---------- Bitstream builder ----------
  function BitBuffer() { this.bits = []; }
  BitBuffer.prototype.put = function (val, len) {
    for (var i = len - 1; i >= 0; i--) this.bits.push((val >>> i) & 1);
  };
  BitBuffer.prototype.toBytes = function () {
    var bytes = [];
    for (var i = 0; i < this.bits.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | (this.bits[i + j] || 0);
      bytes.push(b);
    }
    return bytes;
  };

  function buildCodewords(bytes, version) {
    var vt = VERSION_TABLE[version];
    var bb = new BitBuffer();
    bb.put(0b0100, 4); // byte mode indicator
    bb.put(bytes.length, charCountBits(version));
    for (var i = 0; i < bytes.length; i++) bb.put(bytes[i], 8);
    var capBits = vt.data * 8;
    var termLen = Math.min(4, capBits - bb.bits.length);
    if (termLen > 0) bb.put(0, termLen);
    while (bb.bits.length % 8 !== 0) bb.bits.push(0);
    var dataBytes = bb.toBytes();
    var padBytes = [0xEC, 0x11];
    var pi = 0;
    while (dataBytes.length < vt.data) { dataBytes.push(padBytes[pi % 2]); pi++; }

    // split into blocks
    var blocks = [];
    var offset = 0;
    vt.groups.forEach(function (g) {
      var count = g[0], size = g[1];
      for (var b = 0; b < count; b++) {
        blocks.push(dataBytes.slice(offset, offset + size));
        offset += size;
      }
    });
    var eccBlocks = blocks.map(function (blk) { return rsEncode(blk, vt.ecc); });

    // interleave
    var maxData = Math.max.apply(null, blocks.map(function (b) { return b.length; }));
    var out = [];
    for (var i2 = 0; i2 < maxData; i2++) {
      blocks.forEach(function (blk) { if (i2 < blk.length) out.push(blk[i2]); });
    }
    for (var i3 = 0; i3 < vt.ecc; i3++) {
      eccBlocks.forEach(function (blk) { out.push(blk[i3]); });
    }
    var bitOut = new BitBuffer();
    out.forEach(function (byte) { bitOut.put(byte, 8); });
    var rem = REMAINDER_BITS[version];
    for (var r = 0; r < rem; r++) bitOut.bits.push(0);
    return bitOut.bits;
  }

  // ---------- Matrix construction ----------
  function makeMatrix(version) {
    var size = version * 4 + 17;
    var m = [];
    var reserved = [];
    for (var i = 0; i < size; i++) { m.push(new Int8Array(size).fill(-1)); reserved.push(new Uint8Array(size)); }

    function setFinder(r, c) {
      for (var i2 = -1; i2 <= 7; i2++) {
        for (var j2 = -1; j2 <= 7; j2++) {
          var rr = r + i2, cc = c + j2;
          if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
          reserved[rr][cc] = 1;
          var isBorder = (i2 === 0 || i2 === 6 || j2 === 0 || j2 === 6) && i2 >= 0 && i2 <= 6 && j2 >= 0 && j2 <= 6;
          var isCore = i2 >= 2 && i2 <= 4 && j2 >= 2 && j2 <= 4;
          if (i2 >= 0 && i2 <= 6 && j2 >= 0 && j2 <= 6) {
            m[rr][cc] = (isBorder || isCore) ? 1 : 0;
          } else {
            m[rr][cc] = 0; // separator
          }
        }
      }
    }
    setFinder(0, 0);
    setFinder(0, size - 7);
    setFinder(size - 7, 0);

    // timing patterns
    for (var t = 8; t < size - 8; t++) {
      if (!reserved[6][t]) { m[6][t] = t % 2 === 0 ? 1 : 0; reserved[6][t] = 1; }
      if (!reserved[t][6]) { m[t][6] = t % 2 === 0 ? 1 : 0; reserved[t][6] = 1; }
    }

    // alignment patterns
    var pos = ALIGNMENT_POS[version] || [];
    pos.forEach(function (r) {
      pos.forEach(function (c) {
        // skip if overlapping finder corners
        if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) return;
        for (var i2 = -2; i2 <= 2; i2++) {
          for (var j2 = -2; j2 <= 2; j2++) {
            var rr = r + i2, cc = c + j2;
            var isBorder = Math.max(Math.abs(i2), Math.abs(j2)) === 2;
            var isCenter = i2 === 0 && j2 === 0;
            m[rr][cc] = (isBorder || isCenter) ? 1 : 0;
            reserved[rr][cc] = 1;
          }
        }
      });
    });

    // dark module
    m[size - 8][8] = 1; reserved[size - 8][8] = 1;

    // reserve format info areas
    for (var f = 0; f < 9; f++) {
      if (!reserved[8][f]) reserved[8][f] = 1;
      if (!reserved[f][8]) reserved[f][8] = 1;
    }
    for (var f2 = 0; f2 < 8; f2++) {
      reserved[8][size - 1 - f2] = 1;
      reserved[size - 1 - f2][8] = 1;
    }

    // reserve version info areas (v7+)
    if (version >= 7) {
      for (var a = 0; a < 6; a++) {
        for (var b2 = 0; b2 < 3; b2++) {
          reserved[a][size - 11 + b2] = 1;
          reserved[size - 11 + b2][a] = 1;
        }
      }
    }

    return { size: size, m: m, reserved: reserved };
  }

  function placeData(mat, bits) {
    var size = mat.size, m = mat.m, reserved = mat.reserved;
    var bitIdx = 0;
    var dir = -1; // upward
    var col = size - 1;
    while (col > 0) {
      if (col === 6) col--; // skip timing column
      for (var i = 0; i < size; i++) {
        var row = dir === -1 ? size - 1 - i : i;
        for (var k = 0; k < 2; k++) {
          var c = col - k;
          if (!reserved[row][c]) {
            var bit = bitIdx < bits.length ? bits[bitIdx] : 0;
            m[row][c] = bit;
            bitIdx++;
          }
        }
      }
      dir = -dir;
      col -= 2;
    }
  }

  function applyMask(mat, maskId, dataMaskFn) {
    var size = mat.size, m = mat.m, reserved = mat.reserved;
    var out = [];
    for (var r = 0; r < size; r++) {
      out.push(Int8Array.from(m[r]));
    }
    for (var r2 = 0; r2 < size; r2++) {
      for (var c2 = 0; c2 < size; c2++) {
        if (reserved[r2][c2]) continue;
        if (dataMaskFn(r2, c2)) out[r2][c2] ^= 1;
      }
    }
    return out;
  }

  var MASK_FNS = [
    function (r, c) { return (r + c) % 2 === 0; },
    function (r, c) { return r % 2 === 0; },
    function (r, c) { return c % 3 === 0; },
    function (r, c) { return (r + c) % 3 === 0; },
    function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
    function (r, c) { return ((r * c) % 2) + ((r * c) % 3) === 0; },
    function (r, c) { return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0; },
    function (r, c) { return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0; }
  ];

  function penalty(grid) {
    var size = grid.length, total = 0;
    // rule 1: runs
    function runPenalty(getVal) {
      var p = 0;
      for (var i = 0; i < size; i++) {
        var run = 1;
        for (var j = 1; j < size; j++) {
          if (getVal(i, j) === getVal(i, j - 1)) { run++; }
          else { if (run >= 5) p += run - 2; run = 1; }
        }
        if (run >= 5) p += run - 2;
      }
      return p;
    }
    total += runPenalty(function (i, j) { return grid[i][j]; });
    total += runPenalty(function (i, j) { return grid[j][i]; });
    // rule 2: 2x2 blocks
    for (var r = 0; r < size - 1; r++) {
      for (var c = 0; c < size - 1; c++) {
        var v = grid[r][c];
        if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) total += 3;
      }
    }
    // rule 3: finder-like patterns 1:1:3:1:1 with 4 light either side
    var patternA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var patternB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function matchAt(arr, start, pat) {
      for (var k = 0; k < pat.length; k++) { if (arr[start + k] !== pat[k]) return false; }
      return true;
    }
    for (var r2 = 0; r2 < size; r2++) {
      var rowArr = grid[r2];
      for (var c2 = 0; c2 <= size - 11; c2++) {
        if (matchAt(rowArr, c2, patternA) || matchAt(rowArr, c2, patternB)) total += 40;
      }
    }
    for (var c3 = 0; c3 < size; c3++) {
      var colArr = [];
      for (var r3 = 0; r3 < size; r3++) colArr.push(grid[r3][c3]);
      for (var r4 = 0; r4 <= size - 11; r4++) {
        if (matchAt(colArr, r4, patternA) || matchAt(colArr, r4, patternB)) total += 40;
      }
    }
    // rule 4: dark ratio
    var dark = 0;
    for (var i2 = 0; i2 < size; i2++) for (var j2 = 0; j2 < size; j2++) if (grid[i2][j2]) dark++;
    var pct = (dark * 100) / (size * size);
    var prev = Math.floor(Math.abs(pct - 50) / 5) * 5;
    total += (prev / 5) * 10;
    return total;
  }

  // BCH encoding for format info (15,5) and version info (18,6)
  function bchFormat(data5) {
    var g = 0x537, val = data5 << 10;
    var msb = function (x) { var m = 0; while (x >>> m) m++; return m - 1; };
    while (msb(val) >= 10) val ^= g << (msb(val) - 10);
    return ((data5 << 10) | val) ^ 0x5412;
  }
  function bchVersion(data6) {
    var g = 0x1F25, val = data6 << 12;
    var msb = function (x) { var m = 0; while (x >>> m) m++; return m - 1; };
    while (msb(val) >= 12) val ^= g << (msb(val) - 12);
    return (data6 << 12) | val;
  }

  function writeFormatInfo(grid, size, maskId) {
    var ecBits = 0b00; // M = 00 per spec (L=01,M=00,Q=11,H=10)
    var data5 = (ecBits << 3) | maskId;
    var bits15 = bchFormat(data5);
    // bitArr[k] = bit (14-k) of the 15-bit string, i.e. MSB first
    var bitArr = [];
    for (var i = 14; i >= 0; i--) bitArr.push((bits15 >>> i) & 1);

    // Copy 1 (around top-left finder): row8 cols[0,1,2,3,4,5,7,8] = bits f14..f7,
    // then col8 rows[7,5,4,3,2,1,0] = bits f6..f0
    var c1cols = [0, 1, 2, 3, 4, 5, 7, 8];
    for (var k = 0; k < 8; k++) grid[8][c1cols[k]] = bitArr[k];
    var c1rows = [7, 5, 4, 3, 2, 1, 0];
    for (var k2 = 0; k2 < 7; k2++) grid[c1rows[k2]][8] = bitArr[8 + k2];

    // Copy 2 (split top-right + bottom-left): col8 rows[size-1..size-7] = bits f14..f8,
    // then row8 cols[size-8..size-1] = bits f7..f0
    for (var k3 = 0; k3 < 7; k3++) grid[size - 1 - k3][8] = bitArr[k3];
    for (var k4 = 0; k4 < 8; k4++) grid[8][size - 8 + k4] = bitArr[7 + k4];
  }

  function writeVersionInfo(grid, size, version) {
    if (version < 7) return;
    var bits18 = bchVersion(version);
    var bitArr = [];
    for (var i = 0; i < 18; i++) bitArr.push((bits18 >>> i) & 1);
    var idx = 0;
    for (var c = 0; c < 6; c++) {
      for (var r = 0; r < 3; r++) {
        grid[r][size - 11 + c] = bitArr[idx];
        grid[size - 11 + c][r] = bitArr[idx];
        idx++;
      }
    }
  }

  function generate(text) {
    var bytes = utf8Bytes(text);
    var version = pickVersion(bytes.length);
    if (!version) throw new Error('متن برای QR Code خیلی طولانی است (حداکثر حدود ۲۰۰ کاراکتر).');
    var bits = buildCodewords(bytes, version);
    var mat = makeMatrix(version);
    placeData(mat, bits);

    var best = null, bestPenalty = Infinity, bestMaskId = 0;
    for (var mId = 0; mId < 8; mId++) {
      var candidate = applyMask(mat, mId, MASK_FNS[mId]);
      var p = penalty(candidate);
      if (p < bestPenalty) { bestPenalty = p; best = candidate; bestMaskId = mId; }
    }
    writeFormatInfo(best, mat.size, bestMaskId);
    writeVersionInfo(best, mat.size, version);

    var flat = new Uint8Array(mat.size * mat.size);
    for (var r = 0; r < mat.size; r++) {
      for (var c = 0; c < mat.size; c++) flat[r * mat.size + c] = best[r][c] ? 1 : 0;
    }
    return { size: mat.size, version: version, modules: flat };
  }

  function drawToCanvas(canvas, text, opts) {
    opts = opts || {};
    var result = generate(text);
    var margin = opts.margin != null ? opts.margin : 4;
    var targetPx = opts.targetSize || 512;
    var scale = Math.max(1, Math.floor(targetPx / (result.size + margin * 2)));
    var px = (result.size + margin * 2) * scale;
    canvas.width = px; canvas.height = px;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = opts.light || '#FFFFFF';
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = opts.dark || '#000000';
    for (var r = 0; r < result.size; r++) {
      for (var c = 0; c < result.size; c++) {
        if (result.modules[r * result.size + c]) {
          ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
        }
      }
    }
    return result;
  }

  global.QRLite = { generate: generate, drawToCanvas: drawToCanvas, maxLength: maxLength };
})(window);
