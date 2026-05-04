CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    alert_on_failure BOOLEAN NOT NULL DEFAULT TRUE,
    latency_threshold_ms BIGINT,
    consecutive_failures_threshold INTEGER NOT NULL DEFAULT 1,
    email_recipients TEXT[] NOT NULL DEFAULT '{}',
    slack_webhook_url_encrypted TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_alert_rules_schedule UNIQUE (schedule_id),
    CONSTRAINT chk_alert_rules_consecutive_failures CHECK (consecutive_failures_threshold >= 1),
    CONSTRAINT chk_alert_rules_latency CHECK (latency_threshold_ms IS NULL OR latency_threshold_ms >= 1)
);

CREATE TABLE alert_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES executions(id) ON DELETE SET NULL,
    status VARCHAR(16) NOT NULL,
    reason TEXT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    last_triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trigger_count INTEGER NOT NULL DEFAULT 1,
    last_status_code INTEGER,
    last_latency_ms BIGINT,
    last_error_message TEXT,
    CONSTRAINT chk_alert_incident_status CHECK (status IN ('OPEN', 'RESOLVED')),
    CONSTRAINT chk_alert_incident_trigger_count CHECK (trigger_count >= 1)
);

CREATE INDEX idx_alert_rules_workspace ON alert_rules(workspace_id);
CREATE INDEX idx_alert_incidents_workspace_opened ON alert_incidents(workspace_id, opened_at DESC);
CREATE INDEX idx_alert_incidents_schedule_status ON alert_incidents(schedule_id, status);
