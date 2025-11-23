-- Tabla para almacenar configuración de seguridad y secretos TOTP cifrados
create table if not exists user_security_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  totp_enabled boolean default false not null,
  totp_secret_encrypted text,
  backup_codes_encrypted text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table user_security_settings enable row level security;

create policy "Users manage their own security settings"
  on user_security_settings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
