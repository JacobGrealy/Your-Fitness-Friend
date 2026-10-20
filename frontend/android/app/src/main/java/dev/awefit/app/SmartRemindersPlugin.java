package dev.awefit.app;

import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

/** Persists only settings and per-date completion flags; no API key, cookies or background network. */
@CapacitorPlugin(name = "SmartReminders")
public class SmartRemindersPlugin extends Plugin {
    @PluginMethod
    public void configure(PluginCall call) {
        String userId = call.getString("userId", "");
        JSObject settings = call.getObject("settings");
        JSObject completion = call.getObject("completion");
        if (userId.isEmpty() || settings == null || completion == null) {
            call.reject("Reminder configuration requires a user, settings and completion date");
            return;
        }
        try {
            for (int i = 0; i < ReminderRules.KEYS.length; i++) {
                JSONObject item = settings.optJSONObject(ReminderRules.KEYS[i]);
                if (item != null && item.optBoolean("enabled", false)) {
                    ReminderRules.next(java.util.Calendar.getInstance(), item.getInt("hour"),
                        item.getInt("minute"), i == 3 ? item.getInt("weekday") : -1, false);
                }
            }
        } catch (Exception invalid) {
            call.reject("Invalid reminder time", invalid);
            return;
        }
        SharedPreferences prefs = SmartReminderReceiver.preferences(getContext());
        if (!userId.equals(prefs.getString("userId", ""))) {
            SmartReminderReceiver.clear(getContext());
        }
        SharedPreferences.Editor edit = prefs.edit().putString("userId", userId)
            .putString("settings", settings.toString());
        String date = completion.optString("date", "");
        JSONObject meals = completion.optJSONObject("meals");
        for (int i = 0; i < ReminderRules.KEYS.length; i++) {
            Boolean done = null;
            if (i < 3 && meals != null && meals.has(ReminderRules.KEYS[i])) {
                done = meals.optBoolean(ReminderRules.KEYS[i], false);
            } else if (i == 3 && completion.has("weighIn") && !completion.isNull("weighIn")) {
                done = completion.optBoolean("weighIn", false);
            }
            // Unknown/offline status is omitted: preserve previously known flags for this user.
            if (done != null) {
                edit.putBoolean("complete:" + i, done).putString("day:" + i, date);
                if (done) {
                    NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
                    if (manager != null) manager.cancel(ReminderRules.IDS[i]);
                }
            }
        }
        if (!edit.commit()) {
            call.reject("Could not persist reminder state");
            return;
        }
        SmartReminderReceiver.reconcile(getContext());
        call.resolve();
    }

    @PluginMethod
    public void clear(PluginCall call) {
        SmartReminderReceiver.clear(getContext());
        call.resolve();
    }
}
