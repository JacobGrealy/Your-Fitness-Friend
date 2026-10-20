package dev.awefit.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.util.Calendar;
import org.json.JSONObject;

/** Device-local reminders. Re-arm first, then suppress completed dates before posting anything. */
public class SmartReminderReceiver extends BroadcastReceiver {
    static final String PREFS = "awefit.smartReminders";
    static final String CHANNEL = "awefit-smart-reminders";
    static final String[] TITLES = { "Breakfast", "Lunch", "Dinner", "Weigh-in" };
    static final String[] BODIES = {
        "Log your breakfast while it is fresh.", "Log your lunch — it takes ten seconds.",
        "Log your dinner and finish the day.", "Step on the scale and log it — the trend is what matters."
    };

    static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static PendingIntent alarm(Context context, int index) {
        return PendingIntent.getBroadcast(context, ReminderRules.IDS[index],
            new Intent(context, SmartReminderReceiver.class).putExtra("index", index),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static JSONObject settings(Context context) {
        try { return new JSONObject(preferences(context).getString("settings", "{}")); }
        catch (Exception e) { return new JSONObject(); }
    }

    static boolean completed(Context context, int index, Calendar now) {
        SharedPreferences prefs = preferences(context);
        return ReminderRules.suppressed(now, prefs.getString("day:" + index, ""),
            prefs.getBoolean("complete:" + index, false));
    }

    static void schedule(Context context, int index, boolean skipCompletedToday) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        PendingIntent pending = alarm(context, index);
        manager.cancel(pending);
        JSONObject reminder = settings(context).optJSONObject(ReminderRules.KEYS[index]);
        if (preferences(context).getString("userId", "").isEmpty() || reminder == null
                || !reminder.optBoolean("enabled", false)) return;
        Calendar now = Calendar.getInstance();
        try {
            long at = ReminderRules.next(now, reminder.getInt("hour"), reminder.getInt("minute"),
                index == 3 ? reminder.getInt("weekday") : -1,
                skipCompletedToday && completed(context, index, now)).getTimeInMillis();
            if (Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()) {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
            } else {
                manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
            }
        } catch (Exception e) {
            // Invalid stored settings must not create an alarm at an unintended time.
            android.util.Log.w("AweFitReminders", "Unable to schedule " + index, e);
        }
    }

    static void reconcile(Context context) {
        for (int index = 0; index < ReminderRules.KEYS.length; index++) {
            schedule(context, index, true);
        }
    }

    static void clear(Context context) {
        preferences(context).edit().clear().commit();
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        NotificationManager notifications = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        for (int i = 0; i < ReminderRules.IDS.length; i++) {
            if (alarms != null) alarms.cancel(alarm(context, i));
            if (notifications != null) notifications.cancel(ReminderRules.IDS[i]);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!intent.hasExtra("index")) {
            // BOOT_COMPLETED / TIME_SET / TIMEZONE_CHANGED / MY_PACKAGE_REPLACED.
            reconcile(context);
            return;
        }
        int index = intent.getIntExtra("index", -1);
        if (index < 0 || index >= ReminderRules.IDS.length) return;
        // Re-arm independently of whether this occurrence is suppressed, even while JS is closed.
        schedule(context, index, true);
        JSONObject reminder = settings(context).optJSONObject(ReminderRules.KEYS[index]);
        Calendar now = Calendar.getInstance();
        if (preferences(context).getString("userId", "").isEmpty() || reminder == null
                || !reminder.optBoolean("enabled", false) || completed(context, index, now)) return;
        // Do not deliver an alarm from yesterday after a time-zone change or long device sleep.
        if (now.get(Calendar.HOUR_OF_DAY) != reminder.optInt("hour", -1)
                || (index == 3 && now.get(Calendar.DAY_OF_WEEK) != reminder.optInt("weekday", -1) + 1)) return;
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context,
                Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(new NotificationChannel(CHANNEL,
                "Meal and weigh-in reminders", NotificationManager.IMPORTANCE_DEFAULT));
        }
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) return;
        PendingIntent tap = PendingIntent.getActivity(context, ReminderRules.IDS[index], launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        manager.notify(ReminderRules.IDS[index], new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle(TITLES[index])
            .setContentText(BODIES[index]).setContentIntent(tap).setAutoCancel(true).build());
    }
}
