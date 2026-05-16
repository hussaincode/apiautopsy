ALTER TABLE schedule_assertions ADD COLUMN IF NOT EXISTS header_name VARCHAR(160);

ALTER TABLE schedule_assertions DROP CONSTRAINT IF EXISTS chk_schedule_assertion_type;
ALTER TABLE schedule_assertions ADD CONSTRAINT chk_schedule_assertion_type CHECK (
    type IN (
        'STATUS_CODE',
        'JSON_PATH_EXISTS',
        'JSON_PATH_EQUALS',
        'BODY_CONTAINS',
        'HEADER_EXISTS',
        'MAX_LATENCY_MS',
        'MAX_RESPONSE_SIZE_BYTES'
    )
);

ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS discord_webhook_url_encrypted TEXT;
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS teams_webhook_url_encrypted TEXT;
