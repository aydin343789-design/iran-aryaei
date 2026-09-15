package com.offlinetoolbox.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.Result;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeWriter;

import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "NativeTools")
public class NativeToolsPlugin extends Plugin {

    private byte[] base64ToBytes(String dataUrl) {
        try {
            String pure = dataUrl.contains(",") ? dataUrl.substring(dataUrl.indexOf(",") + 1) : dataUrl;
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
    // generateQr - ساخت QR
    // ═══════════════════════════════════════
    @PluginMethod
    public void generateQr(PluginCall call) {
        try {
            String text = call.getString("text", "");
            Integer sizeObj = call.getInt("size", 512);
            int size = sizeObj != null ? sizeObj : 512;

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
    // scanQr - اسکن QR
    // ═══════════════════════════════════════
    @PluginMethod
    public void scanQr(PluginCall call) {
        try {
            String dataUrl = call.getString("data", "");
            if (dataUrl == null) { dataUrl = ""; }
            byte[] imgBytes = base64ToBytes(dataUrl);
            Bitmap bmp = BitmapFactory.decodeByteArray(imgBytes, 0, imgBytes.length);

            JSObject r = new JSObject();
            JSArray results = new JSArray();

            if (bmp != null) {
                int w = bmp.getWidth(), h = bmp.getHeight();
                int[] pixels = new int[w * h];
                bmp.getPixels(pixels, 0, w, 0, 0, w, h);
                bmp.recycle();

                RGBLuminanceSource source = new RGBLuminanceSource(w, h, pixels);
                BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(source));

                try {
                    Result result = new MultiFormatReader().decode(bitmap);
                    JSObject item = new JSObject();
                    item.put("value", result.getText());
                    results.put(item);
                } catch (Exception ignore) {}
            }

            r.put("results", results);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("scanQr: " + e.getMessage());
        }
    }

    // ═══════════════════════════════════════
    // بقیه متدها (به‌زودی)
    // ═══════════════════════════════════════
    @PluginMethod
    public void createImagePdf(PluginCall call) { call.reject("به‌زودی"); }

    @PluginMethod
    public void mergePdf(PluginCall call) { call.reject("به‌زودی"); }

    @PluginMethod
    public void createTextPdf(PluginCall call) { call.reject("به‌زودی"); }

    @PluginMethod
    public void trimAudio(PluginCall call) { call.reject("به‌زودی"); }

    @PluginMethod
    public void compressAudio(PluginCall call) { call.reject("به‌زودی"); }

    @PluginMethod
    public void convertToMp3(PluginCall call) { call.reject("به‌زودی"); }

    @PluginMethod
    public void compressVideo(PluginCall call) { call.reject("به‌زودی"); }

    @PluginMethod
    public void heicEncode(PluginCall call) { call.reject("به‌زودی"); }

    @PluginMethod
    public void heicDecode(PluginCall call) { call.reject("به‌زودی"); }

    @PluginMethod
    public void removeBackground(PluginCall call) { call.reject("به‌زودی"); }

    @PluginMethod
    public void pdfToImages(PluginCall call) { call.reject("به‌زودی"); }
}
