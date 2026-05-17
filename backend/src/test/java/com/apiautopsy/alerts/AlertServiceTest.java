package com.apiautopsy.alerts;

import com.apiautopsy.auth.EmailService;
import com.apiautopsy.executions.Execution;
import com.apiautopsy.executions.ExecutionRepository;
import com.apiautopsy.executions.SsrfGuard;
import com.apiautopsy.schedules.Schedule;
import com.apiautopsy.schedules.ScheduleRepository;
import com.apiautopsy.security.CryptoService;
import com.apiautopsy.users.User;
import com.apiautopsy.workspaces.Workspace;
import com.apiautopsy.workspaces.WorkspaceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {
    private final AlertRuleRepository rules = mock(AlertRuleRepository.class);
    private final AlertIncidentRepository incidents = mock(AlertIncidentRepository.class);
    private final ScheduleRepository schedules = mock(ScheduleRepository.class);
    private final ExecutionRepository executions = mock(ExecutionRepository.class);
    private final WorkspaceService workspaceService = mock(WorkspaceService.class);
    private final EmailService emailService = mock(EmailService.class);
    private final CryptoService cryptoService = mock(CryptoService.class);
    private final SsrfGuard ssrfGuard = mock(SsrfGuard.class);
    private final AlertService service = new AlertService(rules, incidents, schedules, executions, workspaceService, emailService, cryptoService, ssrfGuard);

    @Test
    void scheduledFailureCreatesDefaultAlertRuleAndOpensIncident() {
        Schedule schedule = schedule();
        Execution execution = failedExecution(schedule);
        when(rules.findByScheduleId(schedule.id)).thenReturn(Optional.empty());
        when(rules.save(any(AlertRule.class))).thenAnswer(invocation -> {
            AlertRule rule = invocation.getArgument(0);
            rule.id = UUID.randomUUID();
            return rule;
        });
        when(incidents.findFirstByScheduleIdAndStatusOrderByOpenedAtDesc(schedule.id, AlertIncidentStatus.OPEN)).thenReturn(Optional.empty());

        service.evaluateScheduleExecution(schedule, execution);

        ArgumentCaptor<AlertRule> ruleCaptor = ArgumentCaptor.forClass(AlertRule.class);
        verify(rules).save(ruleCaptor.capture());
        assertThat(ruleCaptor.getValue().enabled).isTrue();
        assertThat(ruleCaptor.getValue().alertOnFailure).isTrue();
        assertThat(ruleCaptor.getValue().schedule).isSameAs(schedule);

        ArgumentCaptor<AlertIncident> incidentCaptor = ArgumentCaptor.forClass(AlertIncident.class);
        verify(incidents).save(incidentCaptor.capture());
        AlertIncident incident = incidentCaptor.getValue();
        assertThat(incident.status).isEqualTo(AlertIncidentStatus.OPEN);
        assertThat(incident.reason).contains("Request failed with status 500");
        assertThat(incident.execution).isSameAs(execution);
        verify(emailService).sendAlertTriggered(java.util.List.of("owner@apiautopsy.com"), schedule.name, incident.reason);
    }

    @Test
    void recoveredExecutionResolvesOpenIncident() {
        Schedule schedule = schedule();
        AlertRule rule = new AlertRule();
        rule.id = UUID.randomUUID();
        rule.workspace = schedule.workspace;
        rule.schedule = schedule;
        rule.enabled = true;
        rule.alertOnFailure = true;
        AlertIncident incident = new AlertIncident();
        incident.id = UUID.randomUUID();
        incident.workspace = schedule.workspace;
        incident.schedule = schedule;
        incident.alertRule = rule;
        incident.status = AlertIncidentStatus.OPEN;
        incident.reason = "Previous failure";
        incident.openedAt = Instant.now().minusSeconds(120);
        incident.lastTriggeredAt = incident.openedAt;
        when(rules.findByScheduleId(schedule.id)).thenReturn(Optional.of(rule));
        when(incidents.findFirstByScheduleIdAndStatusOrderByOpenedAtDesc(schedule.id, AlertIncidentStatus.OPEN)).thenReturn(Optional.of(incident));

        Execution execution = new Execution();
        execution.schedule = schedule;
        execution.success = true;
        execution.statusCode = 200;
        execution.assertionPassed = true;
        execution.responseTimeMs = 90;
        service.evaluateScheduleExecution(schedule, execution);

        assertThat(incident.status).isEqualTo(AlertIncidentStatus.RESOLVED);
        assertThat(incident.resolvedAt).isNotNull();
        verify(incidents).save(incident);
        verify(emailService).sendAlertResolved(java.util.List.of("owner@apiautopsy.com"), schedule.name);
    }

    private Schedule schedule() {
        User owner = new User();
        owner.id = UUID.randomUUID();
        owner.email = "owner@apiautopsy.com";
        Workspace workspace = new Workspace();
        workspace.id = UUID.randomUUID();
        workspace.name = "APIAutopsy";
        workspace.owner = owner;
        Schedule schedule = new Schedule();
        schedule.id = UUID.randomUUID();
        schedule.workspace = workspace;
        schedule.createdBy = owner;
        schedule.name = "Production health check";
        return schedule;
    }

    private Execution failedExecution(Schedule schedule) {
        Execution execution = new Execution();
        execution.schedule = schedule;
        execution.workspace = schedule.workspace;
        execution.success = false;
        execution.assertionPassed = true;
        execution.statusCode = 500;
        execution.responseTimeMs = 320;
        execution.executedAt = Instant.now();
        return execution;
    }
}
