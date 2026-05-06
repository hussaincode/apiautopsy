package com.apiautopsy.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ScheduleAssertionRepository extends JpaRepository<ScheduleAssertion, UUID> {
    List<ScheduleAssertion> findByScheduleIdOrderByCreatedAtAsc(UUID scheduleId);
    List<ScheduleAssertion> findByScheduleIdAndEnabledTrueOrderByCreatedAtAsc(UUID scheduleId);
}
