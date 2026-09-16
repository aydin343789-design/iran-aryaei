package ir.aryaei.tools;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaCodecList;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.ImageDecoder;
import android.graphics.Rect;
import android.graphics.SurfaceTexture;
import android.graphics.YuvImage;
import android.graphics.ImageFormat;
import android.os.ParcelFileDescriptor;
import android.graphics.pdf.PdfRenderer;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.webkit.MimeTypeMap;

import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import java.nio.ByteBuffer;
import java.util.Locale;

@CapacitorPlugin(name = "IranAryaei")
public class IranAryaeiPlugin extends Plugin {
    private static final long NO_END = -1L;

    @PluginMethod
    public void writeTempFile(PluginCall call) {
        String name = safeName(call.getString("name", "input.bin"));
        String data = call.getString("data");
        if (data == null) { call.reject("data لازم است"); return; }
        try {
            if (data.startsWith("data:")) { int comma=data.indexOf(','); if (comma>=0) data=data.substring(comma+1); }
            byte[] bytes = android.util.Base64.decode(data, android.util.Base64.DEFAULT);
            File dir=new File(getContext().getCacheDir(), "ia-input"); if(!dir.exists())dir.mkdirs();
            File f=new File(dir,name); try(FileOutputStream out=new FileOutputStream(f)){out.write(bytes);}
            JSObject ret=new JSObject(); ret.put("path",f.getAbsolutePath()); ret.put("name",f.getName()); ret.put("size",f.length()); call.resolve(ret);
        } catch(Exception e){ call.reject("ذخیره موقت فایل انجام نشد: "+e.getMessage()); }
    }

    @PluginMethod
    public void prepareAudio(PluginCall call) {
        String input = call.getString("inputPath");
        if (input == null) { call.reject("inputPath لازم است"); return; }
        File f = new File(input);
        if (!f.exists()) { call.reject("فایل صوتی پیدا نشد"); return; }
        JSObject ret = new JSObject();
        ret.put("path", f.getAbsolutePath());
        ret.put("size", f.length());
        ret.put("name", f.getName());
        call.resolve(ret);
    }

    @PluginMethod
    public void trimAudio(PluginCall call) {
        String input = call.getString("inputPath");
        double start = call.getDouble("startSec", 0.0);
        double end = call.getDouble("endSec", 0.0);
        if (input == null || start < 0 || end <= start) { call.reject("بازه برش نامعتبر است"); return; }
        File src = new File(input);
        if (!src.exists()) { call.reject("فایل صوتی پیدا نشد"); return; }
        try {
            File out = newTemp(call.getString("outputName", "audio-cut.m4a"));
            String ext = extension(src.getName()).toLowerCase(Locale.US);
            if (ext.equals("mp3")) {
                trimMp3(src, out, start, end);
            } else if (ext.equals("wav")) {
                trimWav(src, out, start, end);
            } else {
                trimWithExtractor(src, out, start, end);
            }
            resolveFile(call, out, mimeForName(out.getName()));
        } catch (Exception e) { call.reject("برش صوت انجام نشد: " + e.getMessage()); }
    }

    @PluginMethod
    public void compressAudio(PluginCall call) {
        String input = call.getString("inputPath");
        int bitrate = call.getInt("bitrate", 96000);
        if (input == null) { call.reject("inputPath لازم است"); return; }
        File src = new File(input);
        if (!src.exists()) { call.reject("فایل صوتی پیدا نشد"); return; }
        try {
            File out = newTemp("audio-compressed.m4a");
            transcodeToAac(src, out, bitrate);
            resolveFile(call, out, "audio/mp4");
        } catch (Exception e) { call.reject("فشرده‌سازی صوت انجام نشد: " + e.getMessage()); }
    }

    @PluginMethod
    public void audioToMp3(PluginCall call) {
        String input = call.getString("inputPath");
        if (input == null) { call.reject("inputPath لازم است"); return; }
        File src = new File(input);
        if (!src.exists()) { call.reject("فایل صوتی پیدا نشد"); return; }
        try {
            File out = newTemp("audio.mp3");
            if (extension(src.getName()).equalsIgnoreCase("mp3")) {
                copy(src, out);
            } else if (hasMp3Encoder()) {
                transcodeToMp3(src, out, call.getInt("bitrate", 128000));
            } else {
                call.reject("این دستگاه encoder داخلی MP3 ندارد. برای تبدیل غیر-MP3 به MP3 باید encoder MP3 محلی داخل APK قرار گیرد.");
                return;
            }
            resolveFile(call, out, "audio/mpeg");
        } catch (Exception e) { call.reject("تبدیل به MP3 انجام نشد: " + e.getMessage()); }
    }

    @PluginMethod
    public void compressVideo(PluginCall call) {
        String input = call.getString("inputPath");
        int bitrate = call.getInt("bitrate", 2000000);
        if (input == null) { call.reject("inputPath لازم است"); return; }
        File src = new File(input);
        if (!src.exists()) { call.reject("فایل ویدئو پیدا نشد"); return; }
        if (Build.VERSION.SDK_INT < 21) { call.reject("فشرده‌سازی ویدئو به Android 5 یا بالاتر نیاز دارد."); return; }
        File out = newTemp("video-compressed.mp4");
        try {
            transcodeVideoH264(src, out, bitrate);
            resolveFile(call, out, "video/mp4");
        } catch (Exception e) { call.reject("فشرده‌سازی ویدئو انجام نشد: " + e.getMessage()); }
    }

    @PluginMethod
    public void imageToHeic(PluginCall call) {
        String input = call.getString("inputPath");
        if (input == null) { call.reject("inputPath لازم است"); return; }
        if (Build.VERSION.SDK_INT < 29) { call.reject("ساخت HEIC به Android 10 یا بالاتر نیاز دارد."); return; }
        File src = new File(input);
        if (!src.exists()) { call.reject("تصویر پیدا نشد"); return; }
        try {
            Bitmap bmp = decodeBitmap(src);
            File out = newTemp("image-heic.heic");
            try (FileOutputStream fos = new FileOutputStream(out)) {
                if (!bmp.compress(Bitmap.CompressFormat.HEIC, 90, fos)) throw new IOException("HEIC encoder در دستگاه در دسترس نیست");
            } finally { bmp.recycle(); }
            resolveFile(call, out, "image/heic");
        } catch (Exception e) { call.reject("تبدیل به HEIC انجام نشد: " + e.getMessage()); }
    }

    @PluginMethod
    public void heicToJpg(PluginCall call) {
        String input = call.getString("inputPath");
        if (input == null) { call.reject("inputPath لازم است"); return; }
        File src = new File(input);
        if (!src.exists()) { call.reject("فایل HEIC/HEIF پیدا نشد"); return; }
        try {
            Bitmap bmp = decodeBitmap(src);
            File out = newTemp("image-converted.jpg");
            try (FileOutputStream fos = new FileOutputStream(out)) {
                if (!bmp.compress(Bitmap.CompressFormat.JPEG, 94, fos)) throw new IOException("تبدیل JPG ناموفق بود");
            } finally { bmp.recycle(); }
            resolveFile(call, out, "image/jpeg");
        } catch (Exception e) { call.reject("تبدیل HEIC به JPG انجام نشد: " + e.getMessage()); }
    }

    @PluginMethod
    public void removeBackground(PluginCall call) {
        String input = call.getString("inputPath");
        int tolerance = Math.max(10, Math.min(120, call.getInt("tolerance", 45)));
        if (input == null) { call.reject("inputPath لازم است"); return; }
        File src = new File(input);
        if (!src.exists()) { call.reject("تصویر پیدا نشد"); return; }
        try {
            Bitmap srcBmp = decodeBitmap(src);
            Bitmap outBmp = removeSimpleBackground(srcBmp, tolerance);
            File out = newTemp("background-removed.png");
            try (FileOutputStream fos = new FileOutputStream(out)) {
                if (!outBmp.compress(Bitmap.CompressFormat.PNG, 100, fos)) throw new IOException("ساخت PNG ناموفق بود");
            } finally { srcBmp.recycle(); outBmp.recycle(); }
            resolveFile(call, out, "image/png");
        } catch (Exception e) { call.reject("حذف پس‌زمینه انجام نشد: " + e.getMessage()); }
    }

    @PluginMethod
    public void mergePdfs(PluginCall call) {
        com.getcapacitor.JSArray arr = call.getArray("inputPaths");
        String[] paths = new String[0];
        if (arr != null) {
            try {
                paths = new String[arr.length()];
                for (int i=0;i<arr.length();i++) paths[i] = arr.getString(i);
            } catch (Exception e) { call.reject("فهرست PDFها نامعتبر است"); return; }
        }
        if (paths.length < 2) { call.reject("حداقل دو PDF لازم است"); return; }
        try {
            File out = newTemp("iran-aryaei-merged.pdf");
            PdfDocument doc = new PdfDocument(); int pageNo = 1;
            try {
                for (String path : paths) {
                    File src = new File(path); if (!src.exists()) throw new IOException("PDF پیدا نشد: " + path);
                    ParcelFileDescriptor pfd = ParcelFileDescriptor.open(src, ParcelFileDescriptor.MODE_READ_ONLY);
                    PdfRenderer renderer = new PdfRenderer(pfd);
                    try {
                        for (int i=0;i<renderer.getPageCount();i++) {
                            PdfRenderer.Page page=renderer.openPage(i); int w=page.getWidth(),h=page.getHeight();
                            PdfDocument.PageInfo pi=new PdfDocument.PageInfo.Builder(w,h,pageNo++).create(); PdfDocument.Page op=doc.startPage(pi);
                            Bitmap bmp=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888); bmp.eraseColor(Color.WHITE); page.render(bmp,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                            op.getCanvas().drawBitmap(bmp,0,0,null); bmp.recycle(); page.close(); doc.finishPage(op);
                        }
                    } finally { renderer.close(); pfd.close(); }
                }
                try(FileOutputStream fos=new FileOutputStream(out)){doc.writeTo(fos);} finally {doc.close();}
            } catch(Exception e){try{doc.close();}catch(Exception ignored){}throw e;}
            resolveFile(call,out,"application/pdf");
        } catch(Exception e){call.reject("ادغام PDF انجام نشد: "+e.getMessage());}
    }

    @PluginMethod
    public void pdfToImages(PluginCall call) {
        String input = call.getString("inputPath");
        String format = call.getString("format", "png");
        int scale = Math.max(50, Math.min(200, call.getInt("scale", 100)));
        if (input == null) { call.reject("inputPath لازم است"); return; }
        File src = new File(input);
        if (!src.exists()) { call.reject("فایل PDF پیدا نشد"); return; }
        if (Build.VERSION.SDK_INT < 21) { call.reject("PDF به تصویر به Android 5 یا بالاتر نیاز دارد."); return; }
        try {
            File dir = new File(getContext().getCacheDir(), "ia-pdf-pages-" + System.currentTimeMillis());
            if (!dir.mkdirs()) throw new IOException("پوشه خروجی ساخته نشد");
            ParcelFileDescriptor pfd = ParcelFileDescriptor.open(src, ParcelFileDescriptor.MODE_READ_ONLY);
            PdfRenderer renderer = new PdfRenderer(pfd);
            int count = renderer.getPageCount();
            File zip = newTemp("pdf-pages.zip");
            try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zip))) {
                for (int i = 0; i < count; i++) {
                    PdfRenderer.Page page = renderer.openPage(i);
                    int w = Math.max(1, Math.round(page.getWidth() * scale / 100f));
                    int h = Math.max(1, Math.round(page.getHeight() * scale / 100f));
                    Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
                    bmp.eraseColor(Color.WHITE);
                    page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                    page.close();
                    String ext = "jpg".equalsIgnoreCase(format) ? "jpg" : "png";
                    ZipEntry entry = new ZipEntry(String.format(Locale.US, "page-%03d.%s", i + 1, ext));
                    zos.putNextEntry(entry);
                    bmp.compress("jpg".equals(ext) ? Bitmap.CompressFormat.JPEG : Bitmap.CompressFormat.PNG, 94, zos);
                    zos.closeEntry();
                    bmp.recycle();
                }
            } finally { renderer.close(); pfd.close(); deleteTree(dir); }
            JSObject ret = new JSObject(); ret.put("path", zip.getAbsolutePath()); ret.put("name", zip.getName()); ret.put("mime", "application/zip"); ret.put("size", zip.length()); ret.put("pages", count); call.resolve(ret);
        } catch (Exception e) { call.reject("تبدیل PDF به تصاویر انجام نشد: " + e.getMessage()); }
    }

    @PluginMethod
    public void saveBase64(PluginCall call) {
        String name=safeName(call.getString("name","iran-aryaei-output")); String mime=call.getString("mime",mimeForName(name)); String data=call.getString("data");
        if(data==null){call.reject("data لازم است");return;}
        try{if(data.startsWith("data:")){int c=data.indexOf(',');if(c>=0)data=data.substring(c+1);}byte[] bytes=android.util.Base64.decode(data,android.util.Base64.DEFAULT);File dir=new File(getContext().getCacheDir(),"ia-save");if(!dir.exists())dir.mkdirs();File f=new File(dir,name);try(FileOutputStream out=new FileOutputStream(f)){out.write(bytes);}Uri uri=saveToDownloads(f,name,mime);JSObject ret=new JSObject();ret.put("uri",uri.toString());ret.put("name",name);call.resolve(ret);}catch(Exception e){call.reject("ذخیره در گوشی انجام نشد: "+e.getMessage());}
    }

    @PluginMethod
    public void saveTempFile(PluginCall call) {
        String path = call.getString("path");
        String name = safeName(call.getString("name", "iran-aryaei-output"));
        String mime = call.getString("mime", mimeForName(name));
        if (path == null) { call.reject("path لازم است"); return; }
        File src = new File(path);
        if (!src.exists()) { call.reject("فایل موقت پیدا نشد"); return; }
        try {
            Uri uri = saveToDownloads(src, name, mime);
            JSObject ret = new JSObject(); ret.put("uri", uri.toString()); ret.put("name", name); call.resolve(ret);
        } catch (Exception e) { call.reject("ذخیره در گوشی انجام نشد: " + e.getMessage()); }
    }

    @PluginMethod
    public void shareTempFile(PluginCall call) {
        String path = call.getString("path");
        String name = safeName(call.getString("name", "iran-aryaei-output"));
        String mime = call.getString("mime", mimeForName(name));
        if (path == null) { call.reject("path لازم است"); return; }
        File src = new File(path);
        if (!src.exists()) { call.reject("فایل موقت پیدا نشد"); return; }
        try {
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", src);
            Intent send = new Intent(Intent.ACTION_SEND); send.setType(mime); send.putExtra(Intent.EXTRA_STREAM, uri); send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(send, "اشتراک‌گذاری " + name));
            call.resolve();
        } catch (Exception e) { call.reject("اشتراک‌گذاری انجام نشد: " + e.getMessage()); }
    }

    private void resolveFile(PluginCall call, File file, String mime) {
        JSObject ret = new JSObject(); ret.put("path", file.getAbsolutePath()); ret.put("name", file.getName()); ret.put("mime", mime); ret.put("size", file.length()); call.resolve(ret);
    }

    private File newTemp(String name) { File dir = new File(getContext().getCacheDir(), "ia-output"); if (!dir.exists()) dir.mkdirs(); return new File(dir, safeName(name)); }

    private Uri saveToDownloads(File src, String name, String mime) throws Exception {
        if (Build.VERSION.SDK_INT >= 29) {
            ContentResolver cr = getContext().getContentResolver(); ContentValues v = new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME, name); v.put(MediaStore.Downloads.MIME_TYPE, mime); v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Iran Aryaei"); v.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v); if (uri == null) throw new IOException("MediaStore URI ساخته نشد");
            try (FileInputStream in = new FileInputStream(src); java.io.OutputStream out = cr.openOutputStream(uri)) { byte[] buf = new byte[1024*64]; int n; while ((n=in.read(buf))>0) out.write(buf,0,n); }
            v.clear(); v.put(MediaStore.Downloads.IS_PENDING, 0); cr.update(uri, v, null, null); return uri;
        }
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) throw new IOException("مجوز ذخیره‌سازی لازم است");
        File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS + "/Iran Aryaei"); if (!dir.exists() && !dir.mkdirs()) throw new IOException("پوشه دانلود ساخته نشد");
        File dst = new File(dir, name); copy(src, dst); return Uri.fromFile(dst);
    }

    private Bitmap decodeBitmap(File src) throws Exception {
        if (Build.VERSION.SDK_INT >= 28) {
            ImageDecoder.Source source = ImageDecoder.createSource(getContext().getContentResolver(), Uri.fromFile(src));
            return ImageDecoder.decodeBitmap(source, (decoder, info, source1) -> decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE));
        }
        Bitmap b = BitmapFactory.decodeFile(src.getAbsolutePath());
        if (b == null) throw new IOException("تصویر قابل خواندن نیست");
        return b;
    }

    private Bitmap removeSimpleBackground(Bitmap src, int tolerance) {
        int w = src.getWidth(), h = src.getHeight();
        Bitmap out = src.copy(Bitmap.Config.ARGB_8888, true);
        int[] pix = new int[w * h]; out.getPixels(pix, 0, w, 0, 0, w, h);
        int[] samples = {pix[0], pix[w - 1], pix[(h - 1) * w], pix[h * w - 1]};
        int r=0,g=0,b=0; for(int c:samples){r+=Color.red(c);g+=Color.green(c);b+=Color.blue(c);} r/=4;g/=4;b/=4;
        boolean[] seen=new boolean[pix.length]; int[] q=new int[pix.length + Math.max(16, 2*(w+h)+8)]; int head=0,tail=0;
        for(int x=0;x<w;x++){q[tail++]=x;q[tail++]=(h-1)*w+x;} for(int y=1;y<h-1;y++){q[tail++]=y*w;q[tail++]=y*w+w-1;}
        while(head<tail){int idx=q[head++]; if(idx<0||idx>=pix.length||seen[idx])continue; seen[idx]=true; int c=pix[idx];
            int d=Math.abs(Color.red(c)-r)+Math.abs(Color.green(c)-g)+Math.abs(Color.blue(c)-b);
            if(d<=tolerance*3){pix[idx]=Color.TRANSPARENT; int x=idx%w,y=idx/w; if(x>0)q[tail++]=idx-1;if(x<w-1)q[tail++]=idx+1;if(y>0)q[tail++]=idx-w;if(y<h-1)q[tail++]=idx+w;}
        }
        out.setPixels(pix,0,w,0,0,w,h); return out;
    }

    private void transcodeVideoH264(File src, File out, int bitrate) throws Exception {
        MediaExtractor ex = new MediaExtractor(); ex.setDataSource(src.getAbsolutePath());
        int vt=-1,at=-1; MediaFormat vf=null,af=null;
        for(int i=0;i<ex.getTrackCount();i++){MediaFormat f=ex.getTrackFormat(i);String m=f.getString(MediaFormat.KEY_MIME);if(m==null)continue;if(m.startsWith("video/")&&vt<0){vt=i;vf=f;}else if(m.startsWith("audio/")&&at<0){at=i;af=f;}}
        if(vt<0)throw new IOException("ترک ویدئو پیدا نشد");
        String vm=vf.getString(MediaFormat.KEY_MIME); int w=vf.getInteger(MediaFormat.KEY_WIDTH),h=vf.getInteger(MediaFormat.KEY_HEIGHT);
        MediaCodec dec=MediaCodec.createDecoderByType(vm); MediaCodec enc=MediaCodec.createEncoderByType("video/avc");
        MediaFormat ef=MediaFormat.createVideoFormat("video/avc",w,h); ef.setInteger(MediaFormat.KEY_COLOR_FORMAT,MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible); ef.setInteger(MediaFormat.KEY_BIT_RATE,Math.max(250000,bitrate));ef.setInteger(MediaFormat.KEY_FRAME_RATE,vf.containsKey(MediaFormat.KEY_FRAME_RATE)?vf.getInteger(MediaFormat.KEY_FRAME_RATE):30);ef.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL,2);
        dec.configure(vf,null,null,0); enc.configure(ef,null,null,MediaCodec.CONFIGURE_FLAG_ENCODE); dec.start();enc.start(); ex.selectTrack(vt);
        MediaMuxer mux=new MediaMuxer(out.getAbsolutePath(),MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4); int outV=-1,outA=-1; boolean muxStarted=false,exDone=false,decDone=false,encInDone=false,encOutDone=false;
        MediaCodec.BufferInfo di=new MediaCodec.BufferInfo(),ei=new MediaCodec.BufferInfo();
        try{
            while(!encOutDone){
                if(!exDone){int ib=dec.dequeueInputBuffer(10000);if(ib>=0){ByteBuffer in=dec.getInputBuffer(ib);in.clear();int n=ex.readSampleData(in,0);long pts=ex.getSampleTime();if(n<0){dec.queueInputBuffer(ib,0,0,0,MediaCodec.BUFFER_FLAG_END_OF_STREAM);exDone=true;}else{dec.queueInputBuffer(ib,0,n,Math.max(0,pts),ex.getSampleFlags());ex.advance();}}}
                int od=dec.dequeueOutputBuffer(di,10000); if(od==MediaCodec.INFO_OUTPUT_FORMAT_CHANGED){} else if(od>=0){ByteBuffer raw=dec.getOutputBuffer(od);boolean eos=(di.flags&MediaCodec.BUFFER_FLAG_END_OF_STREAM)!=0;if(di.size>0){int eb=enc.dequeueInputBuffer(10000);if(eb>=0){ByteBuffer dst=enc.getInputBuffer(eb);int n=Math.min(di.size,dst.remaining());raw.position(di.offset);raw.limit(di.offset+n);dst.put(raw);enc.queueInputBuffer(eb,0,n,di.presentationTimeUs,eos?MediaCodec.BUFFER_FLAG_END_OF_STREAM:0);if(eos)encInDone=true;}}else if(eos&&!encInDone){int eb=enc.dequeueInputBuffer(10000);if(eb>=0){enc.queueInputBuffer(eb,0,0,di.presentationTimeUs,MediaCodec.BUFFER_FLAG_END_OF_STREAM);encInDone=true;}}dec.releaseOutputBuffer(od,false);if(eos)decDone=true;}
                while(true){int eo=enc.dequeueOutputBuffer(ei,0);if(eo==MediaCodec.INFO_TRY_AGAIN_LATER)break;if(eo==MediaCodec.INFO_OUTPUT_FORMAT_CHANGED){outV=mux.addTrack(enc.getOutputFormat());if(at>=0){ex.unselectTrack(vt);ex.selectTrack(at);outA=mux.addTrack(af);}mux.start();muxStarted=true;}else if(eo>=0){ByteBuffer b=enc.getOutputBuffer(eo);if((ei.flags&MediaCodec.BUFFER_FLAG_CODEC_CONFIG)==0&&ei.size>0&&muxStarted){b.position(ei.offset);b.limit(ei.offset+ei.size);mux.writeSampleData(outV,b,ei);}boolean eos=(ei.flags&MediaCodec.BUFFER_FLAG_END_OF_STREAM)!=0;enc.releaseOutputBuffer(eo,false);if(eos){encOutDone=true;break;}}}
                if(decDone&&!encInDone){int eb=enc.dequeueInputBuffer(0);if(eb>=0){enc.queueInputBuffer(eb,0,0,0,MediaCodec.BUFFER_FLAG_END_OF_STREAM);encInDone=true;}}
            }
            if(at>=0&&muxStarted){ex.unselectTrack(vt);ex.seekTo(0,MediaExtractor.SEEK_TO_CLOSEST_SYNC);ex.selectTrack(at);ByteBuffer b=ByteBuffer.allocate(1024*1024);MediaCodec.BufferInfo ai=new MediaCodec.BufferInfo();while(true){int n=ex.readSampleData(b,0);if(n<0)break;long pts=ex.getSampleTime();ai.offset=0;ai.size=n;ai.presentationTimeUs=Math.max(0,pts);ai.flags=ex.getSampleFlags();b.position(0);b.limit(n);mux.writeSampleData(outA,b,ai);ex.advance();}}
        }finally{try{dec.stop();}catch(Exception ignored){}try{dec.release();}catch(Exception ignored){}try{enc.stop();}catch(Exception ignored){}try{enc.release();}catch(Exception ignored){}ex.release();if(muxStarted)mux.stop();mux.release();}
        if(!muxStarted||out.length()==0)throw new IOException("ویدئوی خروجی ساخته نشد");
    }

    private static void deleteTree(File f){if(f==null||!f.exists())return;if(f.isDirectory()){File[] cs=f.listFiles();if(cs!=null)for(File c:cs)deleteTree(c);}f.delete();}

    private void trimWithExtractor(File src, File out, double start, double end) throws Exception {
        MediaExtractor ex = new MediaExtractor(); ex.setDataSource(src.getAbsolutePath()); int track=-1;
        for(int i=0;i<ex.getTrackCount();i++){MediaFormat f=ex.getTrackFormat(i); String m=f.getString(MediaFormat.KEY_MIME); if(m!=null&&m.startsWith("audio/")){track=i;break;}}
        if(track<0)throw new IOException("ترک صوتی پیدا نشد"); ex.selectTrack(track); MediaFormat fmt=ex.getTrackFormat(track);
        MediaMuxer mux=new MediaMuxer(out.getAbsolutePath(),MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4); int ot=mux.addTrack(fmt); mux.start();
        ex.seekTo((long)(start*1_000_000),MediaExtractor.SEEK_TO_CLOSEST_SYNC); ByteBuffer buf=ByteBuffer.allocate(1024*1024); MediaCodec.BufferInfo info=new MediaCodec.BufferInfo();
        while(true){int n=ex.readSampleData(buf,0); if(n<0)break;long t=ex.getSampleTime();if(t<0||t>(long)(end*1_000_000))break;info.offset=0;info.size=n;info.presentationTimeUs=Math.max(0,t-(long)(start*1_000_000));info.flags=ex.getSampleFlags();mux.writeSampleData(ot,buf,info);ex.advance();}
        mux.stop();mux.release();ex.release();
    }

    private void trimWav(File src, File out, double start, double end) throws Exception {
        byte[] all=readAll(src); if(all.length<44||all[0]!='R'||all[1]!='I'||all[2]!='F'||all[3]!='F')throw new IOException("WAV نامعتبر است");
        int channels=le16(all,22), sampleRate=le32(all,24), bits=le16(all,34); int dataPos=findChunk(all,"data"); if(dataPos<0)throw new IOException("بخش data پیدا نشد"); int dataLen=le32(all,dataPos+4); int audioStart=dataPos+8; int blockAlign=Math.max(1,channels*bits/8); int from=(int)Math.max(0,Math.min(dataLen,(long)(start*sampleRate)*blockAlign)); int to=(int)Math.max(from,Math.min(dataLen,(long)(end*sampleRate)*blockAlign)); from-=from%blockAlign;to-=to%blockAlign; byte[] outData=new byte[to-from];System.arraycopy(all,audioStart+from,outData,0,outData.length); byte[] header=new byte[44];System.arraycopy(all,0,header,0,44);putLe32(header,4,36+outData.length);putLe32(header,40,outData.length);try(FileOutputStream fos=new FileOutputStream(out)){fos.write(header);fos.write(outData);} }

    private void trimMp3(File src, File out, double startSec, double endSec) throws Exception {
        byte[] a=readAll(src); int pos=skipId3(a); double time=0; ByteArrayOutputStream bos=new ByteArrayOutputStream();
        while(pos+4<a.length){int h=mp3Header(a,pos); if(h==0){pos++;continue;} int len=frameLength(h); if(len<=0||pos+len>a.length)break; double dur=frameSamples(h)/(double)sampleRate(h); double next=time+dur; if(next>startSec && time<endSec)bos.write(a,pos,len); if(time>=endSec)break;time=next;pos+=len;}
        if(bos.size()==0)throw new IOException("در بازه انتخابی فریم صوتی پیدا نشد"); try(FileOutputStream fos=new FileOutputStream(out)){fos.write(bos.toByteArray());}
    }

    private boolean hasMp3Encoder(){MediaCodecList list=new MediaCodecList(MediaCodecList.ALL_CODECS);for(MediaCodecInfo info:list.getCodecInfos())if(info.isEncoder())for(String t:info.getSupportedTypes())if(t.equalsIgnoreCase("audio/mpeg"))return true;return false;}
    private void transcodeToMp3(File src, File out, int bitrate) throws Exception {
        MediaExtractor ex=new MediaExtractor(); ex.setDataSource(src.getAbsolutePath()); int track=-1;
        for(int i=0;i<ex.getTrackCount();i++){MediaFormat f=ex.getTrackFormat(i);String m=f.getString(MediaFormat.KEY_MIME);if(m!=null&&m.startsWith("audio/")){track=i;break;}}
        if(track<0)throw new IOException("ترک صوتی پیدا نشد"); ex.selectTrack(track); MediaFormat inFmt=ex.getTrackFormat(track); String mime=inFmt.getString(MediaFormat.KEY_MIME);
        MediaCodec dec=MediaCodec.createDecoderByType(mime); dec.configure(inFmt,null,null,0); dec.start();
        int sr=inFmt.containsKey(MediaFormat.KEY_SAMPLE_RATE)?inFmt.getInteger(MediaFormat.KEY_SAMPLE_RATE):44100; int ch=inFmt.containsKey(MediaFormat.KEY_CHANNEL_COUNT)?inFmt.getInteger(MediaFormat.KEY_CHANNEL_COUNT):2;
        MediaFormat ef=MediaFormat.createAudioFormat("audio/mpeg",sr,ch); ef.setInteger(MediaFormat.KEY_BIT_RATE,Math.max(32000,bitrate));
        MediaCodec enc=MediaCodec.createEncoderByType("audio/mpeg"); enc.configure(ef,null,null,MediaCodec.CONFIGURE_FLAG_ENCODE); enc.start();
        try(FileOutputStream fos=new FileOutputStream(out)){boolean extractorDone=false,encoderInputDone=false,encoderDone=false;MediaCodec.BufferInfo di=new MediaCodec.BufferInfo(),ei=new MediaCodec.BufferInfo();
            while(!encoderDone){if(!extractorDone){int ib=dec.dequeueInputBuffer(10000);if(ib>=0){ByteBuffer b=dec.getInputBuffer(ib);b.clear();int n=ex.readSampleData(b,0);if(n<0){dec.queueInputBuffer(ib,0,0,0,MediaCodec.BUFFER_FLAG_END_OF_STREAM);extractorDone=true;}else{dec.queueInputBuffer(ib,0,n,Math.max(0,ex.getSampleTime()),ex.getSampleFlags());ex.advance();}}}
                int od=dec.dequeueOutputBuffer(di,10000);if(od>=0){ByteBuffer pcm=dec.getOutputBuffer(od);boolean eos=(di.flags&MediaCodec.BUFFER_FLAG_END_OF_STREAM)!=0;if(di.size>0){int eb=enc.dequeueInputBuffer(10000);if(eb>=0){ByteBuffer dst=enc.getInputBuffer(eb);dst.clear();pcm.position(di.offset);pcm.limit(di.offset+di.size);dst.put(pcm);enc.queueInputBuffer(eb,0,di.size,Math.max(0,di.presentationTimeUs),eos?MediaCodec.BUFFER_FLAG_END_OF_STREAM:0);if(eos)encoderInputDone=true;}}else if(eos&&!encoderInputDone){int eb=enc.dequeueInputBuffer(10000);if(eb>=0){enc.queueInputBuffer(eb,0,0,Math.max(0,di.presentationTimeUs),MediaCodec.BUFFER_FLAG_END_OF_STREAM);encoderInputDone=true;}}dec.releaseOutputBuffer(od,false);}
                while(true){int oe=enc.dequeueOutputBuffer(ei,0);if(oe==MediaCodec.INFO_TRY_AGAIN_LATER)break;if(oe>=0){ByteBuffer ob=enc.getOutputBuffer(oe);if((ei.flags&MediaCodec.BUFFER_FLAG_CODEC_CONFIG)==0&&ei.size>0){byte[] b=new byte[ei.size];ob.position(ei.offset);ob.limit(ei.offset+ei.size);ob.get(b);fos.write(b);}boolean eos=(ei.flags&MediaCodec.BUFFER_FLAG_END_OF_STREAM)!=0;enc.releaseOutputBuffer(oe,false);if(eos){encoderDone=true;break;}}}
                if(extractorDone&&!encoderInputDone){int eb=enc.dequeueInputBuffer(0);if(eb>=0){enc.queueInputBuffer(eb,0,0,0,MediaCodec.BUFFER_FLAG_END_OF_STREAM);encoderInputDone=true;}}}
        }finally{try{dec.stop();}catch(Exception ignored){}try{dec.release();}catch(Exception ignored){}try{enc.stop();}catch(Exception ignored){}try{enc.release();}catch(Exception ignored){}ex.release();}
    }

    private void transcodeToAac(File src, File out, int bitrate) throws Exception {
        MediaExtractor ex=new MediaExtractor(); ex.setDataSource(src.getAbsolutePath()); int track=-1;
        for(int i=0;i<ex.getTrackCount();i++){MediaFormat f=ex.getTrackFormat(i);String m=f.getString(MediaFormat.KEY_MIME);if(m!=null&&m.startsWith("audio/")){track=i;break;}}
        if(track<0)throw new IOException("ترک صوتی پیدا نشد"); ex.selectTrack(track); MediaFormat inFmt=ex.getTrackFormat(track);
        String mime=inFmt.getString(MediaFormat.KEY_MIME); if(mime==null)throw new IOException("فرمت صوت ناشناخته");
        int sr=inFmt.containsKey(MediaFormat.KEY_SAMPLE_RATE)?inFmt.getInteger(MediaFormat.KEY_SAMPLE_RATE):44100;
        int ch=inFmt.containsKey(MediaFormat.KEY_CHANNEL_COUNT)?inFmt.getInteger(MediaFormat.KEY_CHANNEL_COUNT):2;
        MediaCodec dec=MediaCodec.createDecoderByType(mime); dec.configure(inFmt,null,null,0); dec.start();
        MediaFormat encFmt=MediaFormat.createAudioFormat("audio/mp4a-latm",sr,ch);
        encFmt.setInteger(MediaFormat.KEY_AAC_PROFILE,MediaCodecInfo.CodecProfileLevel.AACObjectLC);
        encFmt.setInteger(MediaFormat.KEY_BIT_RATE,Math.max(24000,bitrate)); encFmt.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE,16384);
        MediaCodec enc=MediaCodec.createEncoderByType("audio/mp4a-latm"); enc.configure(encFmt,null,null,MediaCodec.CONFIGURE_FLAG_ENCODE); enc.start();
        MediaMuxer mux=new MediaMuxer(out.getAbsolutePath(),MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
        boolean extractorDone=false,decoderDone=false,encoderInputDone=false,encoderOutputDone=false,muxStarted=false; int outTrack=-1;
        MediaCodec.BufferInfo di=new MediaCodec.BufferInfo(), ei=new MediaCodec.BufferInfo();
        while(!encoderOutputDone){
            if(!extractorDone){
                int ib=dec.dequeueInputBuffer(10000);
                if(ib>=0){ByteBuffer b=dec.getInputBuffer(ib);b.clear();int n=ex.readSampleData(b,0);long pts=ex.getSampleTime();
                    if(n<0){dec.queueInputBuffer(ib,0,0,0,MediaCodec.BUFFER_FLAG_END_OF_STREAM);extractorDone=true;}
                    else{dec.queueInputBuffer(ib,0,n,Math.max(0,pts),ex.getSampleFlags());ex.advance();}}
            }
            int od=dec.dequeueOutputBuffer(di,10000);
            if(od==MediaCodec.INFO_OUTPUT_FORMAT_CHANGED){}
            else if(od>=0){
                ByteBuffer pcm=dec.getOutputBuffer(od); boolean eos=(di.flags&MediaCodec.BUFFER_FLAG_END_OF_STREAM)!=0;
                if(di.size>0){
                    int eb=enc.dequeueInputBuffer(10000);
                    if(eb>=0){ByteBuffer dst=enc.getInputBuffer(eb);dst.clear();pcm.position(di.offset);pcm.limit(di.offset+di.size);dst.put(pcm);enc.queueInputBuffer(eb,0,di.size,Math.max(0,di.presentationTimeUs),eos?MediaCodec.BUFFER_FLAG_END_OF_STREAM:0);if(eos)encoderInputDone=true;}
                } else if(eos && !encoderInputDone){
                    int eb=enc.dequeueInputBuffer(10000); if(eb>=0){enc.queueInputBuffer(eb,0,0,Math.max(0,di.presentationTimeUs),MediaCodec.BUFFER_FLAG_END_OF_STREAM);encoderInputDone=true;}
                }
                dec.releaseOutputBuffer(od,false); if(eos)decoderDone=true;
            }
            while(true){
                int oe=enc.dequeueOutputBuffer(ei,0); if(oe==MediaCodec.INFO_TRY_AGAIN_LATER)break;
                if(oe==MediaCodec.INFO_OUTPUT_FORMAT_CHANGED){if(muxStarted)throw new IOException("encoder format changed twice");outTrack=mux.addTrack(enc.getOutputFormat());mux.start();muxStarted=true;}
                else if(oe>=0){ByteBuffer ob=enc.getOutputBuffer(oe);if((ei.flags&MediaCodec.BUFFER_FLAG_CODEC_CONFIG)!=0)ei.size=0;if(ei.size>0&&muxStarted){ob.position(ei.offset);ob.limit(ei.offset+ei.size);mux.writeSampleData(outTrack,ob,ei);}boolean eos=(ei.flags&MediaCodec.BUFFER_FLAG_END_OF_STREAM)!=0;enc.releaseOutputBuffer(oe,false);if(eos){encoderOutputDone=true;break;}}
            }
            if(decoderDone && !encoderInputDone){int eb=enc.dequeueInputBuffer(0);if(eb>=0){enc.queueInputBuffer(eb,0,0,0,MediaCodec.BUFFER_FLAG_END_OF_STREAM);encoderInputDone=true;}}
        }
        try{dec.stop();}catch(Exception ignored){} try{dec.release();}catch(Exception ignored){} try{enc.stop();}catch(Exception ignored){} try{enc.release();}catch(Exception ignored){} ex.release(); if(muxStarted)mux.stop(); mux.release(); if(!muxStarted)throw new IOException("خروجی AAC ساخته نشد");
    }

    private static int skipId3(byte[] a){if(a.length<10)return 0;if(a[0]=='I'&&a[1]=='D'&&a[2]=='3'){int s=(a[6]&127)<<21|(a[7]&127)<<14|(a[8]&127)<<7|(a[9]&127);return Math.min(a.length,10+s);}return 0;}
    private static int mp3Header(byte[] a,int p){if(p+4>a.length)return 0;int h=((a[p]&255)<<24)|((a[p+1]&255)<<16)|((a[p+2]&255)<<8)|(a[p+3]&255);if((h&0xffe00000)!=0xffe00000)return 0;int ver=(h>>19)&3,layer=(h>>17)&3,br=(h>>12)&15,sr=(h>>10)&3; if(ver==1||layer!=1||br==0||br==15||sr==3)return 0;return h;}
    private static int sampleRate(int h){int ver=(h>>19)&3,idx=(h>>10)&3;int[] base={44100,48000,32000};int s=base[idx];return ver==2?s/2:ver==0?s/4:s;}
    private static int bitrate(int h){int ver=(h>>19)&3,idx=(h>>12)&15;int[] v1={0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0};int[] v2={0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,0};return (ver==3?v1[idx]:v2[idx])*1000;}
    private static int frameLength(int h){int br=bitrate(h),sr=sampleRate(h),ver=(h>>19)&3,pad=(h>>9)&1;if(br==0)return 0;return (ver==3?144:72)*br/sr+pad;}
    private static int frameSamples(int h){return ((h>>19)&3)==3?1152:576;}
    private static int le16(byte[] a,int p){return (a[p]&255)|((a[p+1]&255)<<8);} private static int le32(byte[] a,int p){return (a[p]&255)|((a[p+1]&255)<<8)|((a[p+2]&255)<<16)|((a[p+3]&255)<<24);} private static void putLe32(byte[] a,int p,int v){a[p]=(byte)v;a[p+1]=(byte)(v>>8);a[p+2]=(byte)(v>>16);a[p+3]=(byte)(v>>24);}
    private static int findChunk(byte[] a,String s){for(int i=12;i+8<a.length;i++){if(a[i]==s.charAt(0)&&a[i+1]==s.charAt(1)&&a[i+2]==s.charAt(2)&&a[i+3]==s.charAt(3))return i;int n=le32(a,i+4);i+=Math.max(0,n+3);}return -1;}
    private static byte[] readAll(File f)throws IOException{try(FileInputStream in=new FileInputStream(f);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[1024*64];int n;while((n=in.read(b))>0)out.write(b,0,n);return out.toByteArray();}}
    private static void copy(File a,File b)throws IOException{try(FileInputStream in=new FileInputStream(a);FileOutputStream out=new FileOutputStream(b)){byte[] buf=new byte[1024*64];int n;while((n=in.read(buf))>0)out.write(buf,0,n);}}
    private static String extension(String n){int p=n.lastIndexOf('.');return p>0?n.substring(p+1):"";} private static String mimeForName(String n){String e=extension(n).toLowerCase(Locale.US);if(e.equals("mp3"))return "audio/mpeg";if(e.equals("wav"))return "audio/wav";if(e.equals("m4a"))return "audio/mp4";if(e.equals("aac"))return "audio/aac";if(e.equals("mp4"))return "video/mp4";return "application/octet-stream";} private static String safeName(String n){return n==null?"output":n.replaceAll("[^\\p{L}\\p{N}._-]","_");}
}
