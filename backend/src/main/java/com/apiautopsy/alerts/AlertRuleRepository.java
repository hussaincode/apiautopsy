package com.apiautopsy.alerts;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AlertRuleRepository extends JpaRepository<AlertRule, UUID> {
    Optional<AlertRule> findByScheduleId(UUID scheduleId);
    List<AlertRule> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
}
