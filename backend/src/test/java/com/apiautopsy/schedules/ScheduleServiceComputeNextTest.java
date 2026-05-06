package com.apiautopsy.schedules;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class ScheduleServiceComputeNextTest {
    private final ScheduleService service = new ScheduleService(null, null, null, null, null, null, null, null, null);

    @Test
    void disabledSchedulesAreMovedFarIntoFuture() throws Exception {
        Schedule schedule = new Schedule();
        schedule.enabled = false;
        schedule.scheduleType = ScheduleType.INTERVAL;
        schedule.intervalMinutes = 5;

        Instant next = computeNext(schedule);

        assertThat(next).isAfter(Instant.now().plus(Duration.ofDays(300)));
    }

    @Test
    void intervalSchedulesUseConfiguredMinutes() throws Exception {
        Schedule schedule = new Schedule();
        schedule.enabled = true;
        schedule.scheduleType = ScheduleType.INTERVAL;
        schedule.intervalMinutes = 5;

        Instant next = computeNext(schedule);

        assertThat(next).isBetween(Instant.now().plusSeconds(290), Instant.now().plusSeconds(310));
    }

    private Instant computeNext(Schedule schedule) throws Exception {
        Method method = ScheduleService.class.getDeclaredMethod("computeNext", Schedule.class);
        method.setAccessible(true);
        return (Instant) method.invoke(service, schedule);
    }
}
