package com.apiautopsy.executions;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ExecutionRepository extends JpaRepository<Execution, UUID> {
    List<Execution> findTop100ByWorkspaceIdOrderByExecutedAtDesc(UUID workspaceId);
    List<Execution> findTop100ByApiRequestIdOrderByExecutedAtDesc(UUID apiRequestId);
    List<Execution> findTop100ByScheduleIdOrderByExecutedAtDesc(UUID scheduleId);
    List<Execution> findTop500ByScheduleIdOrderByExecutedAtDesc(UUID scheduleId);

    @Query("select count(e), sum(case when e.success = true then 1 else 0 end), avg(e.responseTimeMs) from Execution e where e.workspace.id = :workspaceId and e.executedAt >= :since")
    Object[] aggregateWorkspace(UUID workspaceId, Instant since);

    @Query("select count(e), sum(case when e.success = true then 1 else 0 end), avg(e.responseTimeMs) from Execution e where e.schedule.id = :scheduleId and e.executedAt >= :since")
    Object[] aggregateSchedule(UUID scheduleId, Instant since);
}
