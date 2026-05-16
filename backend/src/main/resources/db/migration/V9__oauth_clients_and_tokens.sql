create table oauth_clients (
    client_id varchar(80) primary key,
    name varchar(160) not null,
    redirect_uris varchar(1000) not null,
    scopes varchar(500) not null,
    public_client boolean not null default true,
    created_at timestamptz not null default now()
);

create table oauth_authorization_codes (
    id uuid primary key,
    code_hash varchar(64) not null unique,
    client_id varchar(80) not null references oauth_clients(client_id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    redirect_uri varchar(500) not null,
    scopes varchar(500) not null,
    code_challenge varchar(128),
    code_challenge_method varchar(12),
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null default now()
);

create table oauth_access_tokens (
    id uuid primary key,
    token_hash varchar(64) not null unique,
    client_id varchar(80) not null references oauth_clients(client_id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    scopes varchar(500) not null,
    expires_at timestamptz not null,
    last_used_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
);

create index idx_oauth_codes_hash on oauth_authorization_codes(code_hash);
create index idx_oauth_tokens_active_hash on oauth_access_tokens(token_hash) where revoked_at is null;
create index idx_oauth_tokens_user_client on oauth_access_tokens(user_id, client_id);

insert into oauth_clients (client_id, name, redirect_uris, scopes, public_client)
values (
    'claude-mcp',
    'Claude MCP Connector',
    'https://claude.ai/api/mcp/auth_callback
https://claude.com/api/mcp/auth_callback
http://127.0.0.1:5173/oauth/callback',
    'workspaces:read requests:read requests:execute schedules:read reports:read status:read',
    true
) on conflict (client_id) do nothing;
