INSERT INTO alert_rules (
    workspace_id,
    schedule_id,
    enabled,
    alert_on_failure,
    consecutive_failures_threshold,
    email_recipients,
    created_at,
    updated_at
)
SELECT
    s.workspace_id,
    s.id,
    TRUE,
    TRUE,
    1,
    '{}',
    NOW(),
    NOW()
FROM schedules s
WHERE NOT EXISTS (
    SELECT 1
    FROM alert_rules ar
    WHERE ar.schedule_id = s.id
);
