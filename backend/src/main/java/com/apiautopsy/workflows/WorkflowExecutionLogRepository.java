package com.apiautopsy.workflows;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkflowExecutionLogRepository extends JpaRepository<WorkflowExecutionLog, UUID> {
    List<WorkflowExecutionLog> findByWorkflowExecutionIdOrderByStepOrderAsc(UUID workflowExecutionId);
}
