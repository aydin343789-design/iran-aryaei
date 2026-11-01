package ir.aryaei.tools;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.OutputStream;

/**
 * Saves a finished MP3 into the public "Download/Neday-Pahlavi" folder through
 * MediaStore. Needs NO storage permission on Android 10+ (API 29+), and the
 * file shows up in the Files app right away.
 */
@CapacitorPlugin(name = "MediaSaver")
public class MediaSaverPlugin extends Plugin {

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        final String data = call.getString("data");
        final String name = call.getString("name", "nedaye-pahlavi.mp3");
        final String mime = call.getString("mime", "audio/mpeg");

        if (data == null || data.isEmpty()) {
            call.reject("no-data");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("unsupported-android-version");
            return;
        }

        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            ContentResolver resolver = getContext().getContentResolver();

            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Neday-Pahlavi");
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);

            Uri item = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (item == null) {
                call.reject("insert-failed");
                return;
            }

            try (OutputStream out = resolver.openOutputStream(item)) {
                if (out == null) {
                    throw new IOException("no-output-stream");
                }
                out.write(bytes);
                out.flush();
            }

            values.clear();
            values.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(item, values, null, null);

            JSObject result = new JSObject();
            result.put("uri", item.toString());
            result.put("path", "Download/Neday-Pahlavi/" + name);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("save-failed: " + e.getMessage());
        }
    }
}
