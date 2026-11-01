package ir.aryaei.tools;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // local (non-npm) plugins must be registered before super.onCreate
        registerPlugin(MediaSaverPlugin.class);
        super.onCreate(savedInstanceState);

        // The online studio voice (Microsoft Read-Aloud endpoint) only accepts a
        // User-Agent containing "Edg/". A normal Android WebView UA is rejected,
        // so we append an Edg token to the WebView UA — the app's JS WebSocket
        // handshakes then carry it and the online section works in the APK.
        try {
            WebView webview = getBridge() != null ? getBridge().getWebView() : null;
            if (webview != null && webview.getSettings() != null) {
                String ua = webview.getSettings().getUserAgentString();
                if (ua == null || !ua.contains("Edg/")) {
                    webview.getSettings()
                            .setUserAgentString((ua == null ? "" : ua) + " Edg/143.0.0.0");
                }
            }
        } catch (Throwable ignored) {
            // never break app startup over the UA tweak
        }
    }
}
