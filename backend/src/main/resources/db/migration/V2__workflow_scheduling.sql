ALTER TABLE schedules
  ALTER COLUMN api_request_id DROP NOT NULL;

ALTER TABLE schedules
  ADD COLUMN target_type TEXT NOT NULL DEFAULT 'REQUEST' CHECK (target_type IN ('REQUEST','WORKFLOW')),
  ADD COLUMN collection_id UUID REFERENCES collections(id) ON DELETE CASCADE;

CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  api_request_id UUID NOT NULL REFERENCES api_requests(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  depends_on_step_id UUID REFERENCES workflow_steps(id) ON DELETE SET NULL,
  stop_on_failure BOOLEAN NOT NULL DEFAULT true,
  extraction_rules JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, step_order)
);

CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  success BOOLEAN NOT NULL,
  total_duration_ms BIGINT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE workflow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  workflow_step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES executions(id) ON DELETE SET NULL,
  step_order INT NOT NULL,
  step_name TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  response_time_ms BIGINT NOT NULL,
  status_code INT,
  extracted_variables JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_steps_collection_order ON workflow_steps(collection_id, step_order);
CREATE INDEX idx_workflow_executions_collection_time ON workflow_executions(collection_id, started_at DESC);
CREATE INDEX idx_workflow_logs_execution_order ON workflow_execution_logs(workflow_execution_id, step_order);
CREATE INDEX idx_schedules_target ON schedules(target_type, collection_id);
