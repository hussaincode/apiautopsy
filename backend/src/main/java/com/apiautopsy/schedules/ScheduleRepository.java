package com.apiautopsy.schedules;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {
    List<Schedule> findByWorkspaceId(UUID workspaceId);
    Optional<Schedule> findByPublicSlugAndPublicStatusEnabledTrue(String publicSlug);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Schedule> findTop25ByEnabledTrueAndNextRunAtLessThanEqualOrderByNextRunAtAsc(Instant now);
}
