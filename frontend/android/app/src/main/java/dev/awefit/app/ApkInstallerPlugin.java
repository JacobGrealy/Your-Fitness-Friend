package dev.awefit.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Hands a downloaded APK to Android's package installer (FF-0044).
 *
 * Why a native plugin instead of just opening the URL: a link to an .apk inside a
 * WebView does nothing useful, and handing it to a Custom Tab leaves the user to
 * find the download, dismiss Chrome's "this type of file can harm your device"
 * warning and tap the file. Doing the fetch here and firing ACTION_VIEW means the
 * user taps Update once and sees the system installer.
 *
 * The download runs off the main thread; the call resolves as soon as the
 * installer activity has been launched, which is the last thing this app controls.
 * The install itself is always the system's dialog — an app cannot silently
 * replace itself.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    /** Shown when Android has not been told this app may install packages. */
    private static final String ERR_PERMISSION = "install_permission_required";

    @PluginMethod
    public void install(final PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("install needs a url");
            return;
        }

        // Android 8+ requires the user to allow this app as an install source.
        // Check before downloading: no point pulling 4 MB for nothing.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !canInstallPackages()) {
            openInstallSettings();
            call.reject(
                    "AweFit needs permission to install apps. Allow it in Settings, then tap Update again.",
                    ERR_PERMISSION);
            return;
        }

        new Thread(() -> {
            File apk = null;
            try {
                apk = download(url);
                launchInstaller(apk);
                JSObject result = new JSObject();
                result.put("started", true);
                result.put("path", apk.getAbsolutePath());
                call.resolve(result);
            } catch (Exception error) {
                call.reject(error.getMessage() == null ? "install failed" : error.getMessage());
            }
        }).start();
    }

    private boolean canInstallPackages() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O
                || getContext().getPackageManager().canRequestPackageInstalls();
    }

    /** Sends the user to this app's "install unknown apps" switch. */
    private void openInstallSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception ignored) {
            // Some builds do not expose the per-app screen; the rejection message
            // already tells the user what to change.
        }
    }

    private File download(String url) throws Exception {
        File target = new File(getContext().getCacheDir(), "awefit-update.apk");
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(60000);
        connection.setInstanceFollowRedirects(true);
        connection.connect();
        try {
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new Exception("download failed: HTTP " + status);
            }
            try (InputStream in = connection.getInputStream();
                 FileOutputStream out = new FileOutputStream(target)) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                }
            }
        } finally {
            connection.disconnect();
        }
        // A truncated or HTML error page would fail at install time with a vague
        // message; check the ZIP magic here so the failure names the real problem.
        if (target.length() < 1024 * 100 || !isZip(target)) {
            throw new Exception("that download does not look like an APK (" + target.length() + " bytes)");
        }
        return target;
    }

    private boolean isZip(File file) {
        try (InputStream in = new java.io.FileInputStream(file)) {
            return in.read() == 'P' && in.read() == 'K';
        } catch (Exception error) {
            return false;
        }
    }

    private void launchInstaller(File apk) {
        Uri uri = FileProvider.getUriForFile(
                getContext(), getContext().getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }
}
