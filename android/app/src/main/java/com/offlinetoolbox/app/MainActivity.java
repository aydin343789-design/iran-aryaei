package com.offlinetoolbox.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeToolsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
