CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','USER')),
  provider TEXT NOT NULL DEFAULT 'LOCAL',
  provider_subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('OWNER','ADMIN','MEMBER')),
  invited_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','INVITED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS')),
  url TEXT NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}',
  query_params JSONB NOT NULL DEFAULT '{}',
  body_type TEXT NOT NULL DEFAULT 'NONE',
  body JSONB NOT NULL DEFAULT '{}',
  auth_type TEXT NOT NULL DEFAULT 'NONE',
  auth_encrypted TEXT,
  certificate_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  certificate_pem_encrypted TEXT NOT NULL,
  private_key_pem_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  api_request_id UUID NOT NULL REFERENCES api_requests(id) ON DELETE CASCADE,
  schedule_id UUID,
  status_code INT,
  success BOOLEAN NOT NULL,
  response_time_ms BIGINT NOT NULL,
  response_headers JSONB NOT NULL DEFAULT '{}',
  response_body TEXT,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  api_request_id UUID NOT NULL REFERENCES api_requests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('INTERVAL','CRON')),
  interval_minutes INT,
  cron_expression TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_members_user ON workspace_members(user_id);
CREATE INDEX idx_requests_workspace ON api_requests(workspace_id);
CREATE INDEX idx_executions_request_time ON executions(api_request_id, executed_at DESC);
CREATE INDEX idx_schedules_due ON schedules(enabled, next_run_at);

ALTER TABLE api_requests
  ADD CONSTRAINT fk_api_requests_certificate
  FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE SET NULL;

ALTER TABLE executions
  ADD CONSTRAINT fk_executions_schedule
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL;
