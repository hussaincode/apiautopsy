package com.apiautopsy.alerts;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AlertIncidentRepository extends JpaRepository<AlertIncident, UUID> {
    List<AlertIncident> findTop100ByWorkspaceIdOrderByOpenedAtDesc(UUID workspaceId);
    List<AlertIncident> findTop10ByScheduleIdOrderByOpenedAtDesc(UUID scheduleId);
    Optional<AlertIncident> findFirstByScheduleIdAndStatusOrderByOpenedAtDesc(UUID scheduleId, AlertIncidentStatus status);
}
