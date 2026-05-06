ALTER TABLE executions
    ADD COLUMN assertion_passed BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN assertion_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN response_size_bytes BIGINT NOT NULL DEFAULT 0;

ALTER TABLE schedules
    ADD COLUMN slo_uptime_target DOUBLE PRECISION NOT NULL DEFAULT 99.0,
    ADD COLUMN slo_latency_p95_ms BIGINT NOT NULL DEFAULT 1000,
    ADD COLUMN public_status_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN public_slug VARCHAR(80);

ALTER TABLE alert_rules
    ADD COLUMN webhook_url_encrypted TEXT;

CREATE TABLE schedule_assertions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    name VARCHAR(160) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    expected_status_code INTEGER,
    json_path VARCHAR(300),
    expected_value TEXT,
    contains_text TEXT,
    max_latency_ms BIGINT,
    max_response_size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_schedule_assertion_type CHECK (type IN ('STATUS_CODE', 'JSON_PATH_EXISTS', 'JSON_PATH_EQUALS', 'BODY_CONTAINS', 'MAX_LATENCY_MS', 'MAX_RESPONSE_SIZE_BYTES')),
    CONSTRAINT chk_schedule_assertion_latency CHECK (max_latency_ms IS NULL OR max_latency_ms >= 1),
    CONSTRAINT chk_schedule_assertion_size CHECK (max_response_size_bytes IS NULL OR max_response_size_bytes >= 1)
);

CREATE UNIQUE INDEX uq_schedules_public_slug ON schedules(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX idx_schedule_assertions_schedule ON schedule_assertions(schedule_id);
CREATE INDEX idx_executions_schedule_time ON executions(schedule_id, executed_at DESC);
