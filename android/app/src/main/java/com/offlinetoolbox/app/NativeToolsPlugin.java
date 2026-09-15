package com.offlinetoolbox.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.pdf.PdfDocument;
import android.os.Environment;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.Result;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.common.BitMatrix;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.pdmodel.PDPage;
import com.tom_roush.pdfbox.pdmodel.PDPageContentStream;
import com.tom_roush.pdfbox.pdmodel.font.PDType1Font;
import com.tom_roush.pdfbox.pdmodel.graphics.image.PDImageXObject;
import com.tom_roush.pdfbox.util.PDFBoxResourceLoader;

import androidx.annotation.Nullable;

@CapacitorPlugin(name = "NativeTools")
public class NativeToolsPlugin extends Plugin {

    private byte[] base64ToBytes(String dataUrl) {
        try {
            String pure = dataUrl.substring(dataUrl.indexOf(",") + 1);
            return Base64.decode(pure, Base64.DEFAULT);
        } catch (Exception e) {
            return new byte[0];
        }
    }

    private String bytesToBase64(byte[] bytes) {
        return Base64.encodeToString(bytes, Base64.NO_WRAP);
    }

    private JSObject makeResult(byte[] data, String mime, String name) {
        JSObject r = new JSObject();
        r.put("data", bytesToBase64(data));
        r.put("mime", mime);
        r.put("name", name);
        return r;
    }

    // ═══════════════════════════════════════
    // 1. ساخت PDF از تصاویر
    // ═══════════════════════════════════════
    @PluginMethod
    public void createImagePdf(PluginCall call) {
        try {
            JSArray files = call.getArray("files");
            if (files == null) { call.reject("files لازم است"); return; }
            PDFBoxResourceLoader.init(getContext());
            PDDocument doc = new PDDocument();

            for (int i = 0; i < files.length(); i++) {
                byte[] imgBytes = Base64.decode(files.getString(i), Base64.DEFAULT);
                Bitmap bmp = BitmapFactory.decodeByteArray(imgBytes, 0, imgBytes.length);
                if (bmp == null) continue;

                PDPage page = new PDPage(new com.tom_roush.pdfbox.pdmodel.common.PDRectangle(
                    bmp.getWidth(), bmp.getHeight()));
                doc.addPage(page);

                java.io.File tmp = File.createTempFile("img", ".png", getContext().getCacheDir());
                FileOutputStream fos = new FileOutputStream(tmp);
                bmp.compress(Bitmap.CompressFormat.PNG, 100, fos);
                fos.close();

                PDImageXObject pdImg = PDImageXObject.createFromFileByContent(tmp, doc);
                PDPageContentStream cs = new PDPageContentStream(doc, page);
                cs.drawImage(pdImg, 0, 0, bmp.getWidth(), bmp.getHeight());
                cs.close();
                tmp.delete();
                bmp.recycle();
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            doc.close();

            call.resolve(makeResult(out.toByteArray(), "application/pdf", "images.pdf"));
        } catch (Exception e) {
            call.reject("createImagePdf: " + e.getMessage());
        }
    }

    // ═══════════════════════════════════════
    // 2. ادغام PDF
    // ═══════════════════════════════════════
    @PluginMethod
    public void mergePdf(PluginCall call) {
        try {
            JSArray files = call.getArray("files");
            if (files == null) { call.reject("files لازم است"); return; }
            PDFBoxResourceLoader.init(getContext());
            PDDocument merged = new PDDocument();

            for (int i = 0; i < files.length(); i++) {
                byte[] pdfBytes = Base64.decode(files.getString(i), Base64.DEFAULT);
                PDDocument src = PDDocument.load(pdfBytes);
                for (PDPage page : src.getPages()) {
                    merged.importPage(page);
                }
                src.close();
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            merged.save(out);
            merged.close();

            call.resolve(makeResult(out.toByteArray(), "application/pdf", "merged.pdf"));
        } catch (Exception e) {
            call.reject("mergePdf: " + e.getMessage());
        }
    }

    // ═══════════════════════════════════════
    // 3. ساخت PDF از متن
    // ═══════════════════════════════════════
    @PluginMethod
    public void createTextPdf(PluginCall call) {
        try {
            String text = call.getString("text", "");
            PDFBoxResourceLoader.init(getContext());
            PDDocument doc = new PDDocument();
            PDPage page = new PDPage();
            doc.addPage(page);

            PDPageContentStream cs = new PDPageContentStream(doc, page);
            cs.beginText();
            cs.setFont(PDType1Font.HELVETICA, 12);
            cs.newLineAtOffset(50, 750);

            String[] lines = text.split("\n");
            for (String line : lines) {
                // فیلتر کاراکترهای غیر latin
                StringBuilder sb = new StringBuilder();
                for (char c : line.toCharArray()) {
                    sb.append(c < 128 ? c : '?');
                }
                cs.showText(sb.toString());
                cs.newLineAtOffset(0, -15);
            }
            cs.endText();
            cs.close();

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            doc.close();

            call.resolve(makeResult(out.toByteArray(), "application/pdf", "document.pdf"));
        } catch (Exception e) {
            call.reject("createTextPdf: " + e.getMessage());
        }
    }

    // ═══════════════════════════════════════
    // 4. ساخت QR
    // ═══════════════════════════════════════
    @PluginMethod
    public void generateQr(PluginCall call) {
        try {
            String text = call.getString("text", "");
            int size = call.getInt("size", 512);

            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 1);

            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(text, BarcodeFormat.QR_CODE, size, size, hints);

            Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            for (int x = 0; x < size; x++) {
                for (int y = 0; y < size; y++) {
                    bmp.setPixel(x, y, matrix.get(x, y) ? Color.BLACK : Color.WHITE);
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bmp.compress(Bitmap.CompressFormat.PNG, 100, out);
            bmp.recycle();

            call.resolve(makeResult(out.toByteArray(), "image/png", "qr.png"));
        } catch (Exception e) {
            call.reject("generateQr: " + e.getMessage());
        }
    }

    // ═══════════════════════════════════════
    // 5. اسکن QR
    // ═══════════════════════════════════════
    @PluginMethod
    public void scanQr(PluginCall call) {
        try {
            String dataUrl = call.getString("data", "");
            byte[] imgBytes = base64ToBytes(dataUrl);
            Bitmap bmp = BitmapFactory.decodeByteArray(imgBytes, 0, imgBytes.length);
            if (bmp == null) { call.reject("تصویر نامعتبر"); return; }

            int w = bmp.getWidth(), h = bmp.getHeight();
            int[] pixels = new int[w * h];
            bmp.getPixels(pixels, 0, w, 0, 0, w, h);

            RGBLuminanceSource source = new RGBLuminanceSource(w, h, pixels);
            BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(source));

            try {
                Result result = new MultiFormatReader().decode(bitmap);
                JSArray results = new JSArray();
                JSObject item = new JSObject();
                item.put("value", result.getText());
                results.put(item);

                JSObject r = new JSObject();
                r.put("results", results);
                call.resolve(r);
            } catch (Exception e) {
                JSObject r = new JSObject();
                r.put("results", new JSArray());
                call.resolve(r);
            }
        } catch (Exception e) {
            call.reject("scanQr: " + e.getMessage());
        }
    }

    // ═══════════════════════════════════════
    // 6-12. بقیه ابزارها (placeholder برای الان)
    // ═══════════════════════════════════════
    @PluginMethod
    public void trimAudio(PluginCall call) { call.reject("trimAudio: به‌زودی"); }

    @PluginMethod
    public void compressAudio(PluginCall call) { call.reject("compressAudio: به‌زودی"); }

    @PluginMethod
    public void convertToMp3(PluginCall call) { call.reject("convertToMp3: به‌زودی"); }

    @PluginMethod
    public void compressVideo(PluginCall call) { call.reject("compressVideo: به‌زودی"); }

    @PluginMethod
    public void heicEncode(PluginCall call) { call.reject("heicEncode: به‌زودی"); }

    @PluginMethod
    public void heicDecode(PluginCall call) { call.reject("heicDecode: به‌زودی"); }

    @PluginMethod
    public void removeBackground(PluginCall call) { call.reject("removeBackground: به‌زودی"); }

    @PluginMethod
    public void pdfToImages(PluginCall call) { call.reject("pdfToImages: به‌زودی"); }
}
