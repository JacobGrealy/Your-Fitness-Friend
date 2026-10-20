package dev.awefit.app;

import java.util.Calendar;
import java.util.Locale;

/** Calendar-only rules, independent of Android so JVM tests exercise DST and midnight. */
public final class ReminderRules {
    public static final String[] KEYS = { "breakfast", "lunch", "dinner", "weighIn" };
    // Separate namespace from legacy LocalNotifications (1001/1002/1003/1010), so
    // migrating/cancelling old alarms cannot dismiss a smart notification already shown.
    public static final int[] IDS = { 21001, 21002, 21003, 21010 };

    private ReminderRules() {}

    public static String localDay(Calendar time) {
        return String.format(Locale.US, "%04d-%02d-%02d", time.get(Calendar.YEAR),
            time.get(Calendar.MONTH) + 1, time.get(Calendar.DAY_OF_MONTH));
    }

    public static boolean suppressed(Calendar now, String completedDay, boolean completed) {
        return completed && localDay(now).equals(completedDay);
    }

    /** weekday is JS Sunday=0 through Saturday=6, or -1 for daily. Never catch up past times. */
    public static Calendar next(Calendar now, int hour, int minute, int weekday, boolean skipToday) {
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || weekday < -1 || weekday > 6) {
            throw new IllegalArgumentException("Invalid reminder time");
        }
        Calendar day = (Calendar) now.clone();
        // Walk dates at noon, then construct each candidate's wall time from scratch. Otherwise
        // crossing a missing DST hour can permanently drag subsequent candidates an hour late.
        day.set(Calendar.HOUR_OF_DAY, 12);
        for (int offset = 0; offset < 9; offset++) {
            Calendar next = (Calendar) day.clone();
            next.set(Calendar.HOUR_OF_DAY, hour);
            next.set(Calendar.MINUTE, minute);
            next.set(Calendar.SECOND, 0);
            next.set(Calendar.MILLISECOND, 0);
            if (next.after(now) && (weekday < 0 || next.get(Calendar.DAY_OF_WEEK) == weekday + 1)
                    && !(skipToday && localDay(next).equals(localDay(now)))) return next;
            day.add(Calendar.DATE, 1);
        }
        throw new IllegalStateException("No future reminder date");
    }
}
