package dev.awefit.app;

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.Calendar;
import java.util.TimeZone;

public class ReminderRulesTest {
    private Calendar time(int year, int month, int day, int hour, int minute) {
        Calendar result = Calendar.getInstance(TimeZone.getTimeZone("America/New_York"));
        result.clear();
        result.set(year, month - 1, day, hour, minute);
        return result;
    }

    @Test public void completedMealSkipsOnlyToday() {
        Calendar now = time(2026, 10, 20, 8, 0);
        Calendar next = ReminderRules.next(now, 12, 30, -1, true);
        assertEquals("2026-10-21", ReminderRules.localDay(next));
        assertEquals(12, next.get(Calendar.HOUR_OF_DAY));
        assertEquals(30, next.get(Calendar.MINUTE));
        assertTrue(ReminderRules.suppressed(now, "2026-10-20", true));
        assertFalse(ReminderRules.suppressed(next, "2026-10-20", true));
    }

    @Test public void deletingLastEntryRestoresOnlyFutureOccurrence() {
        assertEquals("2026-10-20", ReminderRules.localDay(ReminderRules.next(time(2026,10,20,8,0), 12,30,-1,false)));
        assertEquals("2026-10-21", ReminderRules.localDay(ReminderRules.next(time(2026,10,20,13,0), 12,30,-1,false)));
    }

    @Test public void weeklyWeighInSurvivesSuppressionWithoutReopeningApp() {
        Calendar next = ReminderRules.next(time(2026,10,18,7,0), 8,0,0,true);
        assertEquals("2026-10-25", ReminderRules.localDay(next));
        assertEquals(Calendar.SUNDAY, next.get(Calendar.DAY_OF_WEEK));
    }

    @Test public void backdatedEntryDoesNotSuppressToday() {
        assertFalse(ReminderRules.suppressed(time(2026,10,20,7,0), "2026-10-19", true));
        assertFalse(ReminderRules.suppressed(time(2026,10,20,7,0), "2026-10-20", false));
    }

    @Test public void midnightAndYearBoundary() {
        Calendar next = ReminderRules.next(time(2026,12,31,23,59), 8,0,-1,false);
        assertEquals("2027-01-01", ReminderRules.localDay(next));
    }

    @Test public void dstUsesLocalWallTimeNot24HourIntervals() {
        Calendar next = ReminderRules.next(time(2026,3,7,8,0), 8,0,-1,true);
        assertEquals("2026-03-08", ReminderRules.localDay(next));
        assertEquals(8, next.get(Calendar.HOUR_OF_DAY));
        Calendar after = ReminderRules.next(time(2026,11,1,8,0), 8,0,-1,true);
        assertEquals("2026-11-02", ReminderRules.localDay(after));
        assertEquals(8, after.get(Calendar.HOUR_OF_DAY));
    }

    @Test public void crossingMissingDstHourDoesNotDragLaterWeekday() {
        Calendar next = ReminderRules.next(time(2026,3,7,8,0), 2,30,1,false);
        assertEquals("2026-03-09", ReminderRules.localDay(next));
        assertEquals(2, next.get(Calendar.HOUR_OF_DAY));
    }
}
