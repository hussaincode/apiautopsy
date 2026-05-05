ALTER TABLE schedules
  ADD COLUMN created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE schedules s
SET created_by_user_id = w.owner_id
FROM workspaces w
WHERE s.workspace_id = w.id
  AND s.created_by_user_id IS NULL;

CREATE INDEX idx_schedules_created_by ON schedules(created_by_user_id);
