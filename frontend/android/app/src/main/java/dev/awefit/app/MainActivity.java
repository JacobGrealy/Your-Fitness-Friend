package dev.awefit.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugin: downloads an APK and hands it to the system installer
        // (FF-0044). Registered before super.onCreate so the bridge sees it.
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(SmartRemindersPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
