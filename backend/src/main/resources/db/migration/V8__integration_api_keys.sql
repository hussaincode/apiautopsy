create table integration_api_keys (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    name varchar(120) not null,
    key_prefix varchar(24) not null,
    key_hash varchar(64) not null unique,
    scope varchar(64) not null default 'MCP_CONNECTOR',
    created_at timestamptz not null default now(),
    last_used_at timestamptz,
    revoked_at timestamptz
);

create index idx_integration_api_keys_user_id on integration_api_keys(user_id);
create index idx_integration_api_keys_active_hash on integration_api_keys(key_hash) where revoked_at is null;
