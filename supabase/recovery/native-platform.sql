-- Native PostgreSQL testing adapter ONLY; never a substitute for Supabase services.
-- Real application functions/RLS run unchanged. No HTTP, credentials, Auth sessions,
-- storage files, Vault secrets or background execution are provided by this adapter.
CREATE ROLE anon NOLOGIN NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE supabase_admin NOLOGIN SUPERUSER;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE SCHEMA extensions;
CREATE SCHEMA cron;
CREATE SCHEMA net;
CREATE SCHEMA vault;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions;
CREATE TABLE auth.users (
 id uuid PRIMARY KEY,
 email text,
 encrypted_password text,
 raw_app_meta_data jsonb,
 raw_user_meta_data jsonb,
 created_at timestamptz,
 updated_at timestamptz
);
CREATE TABLE storage.buckets (
 id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false,
 file_size_limit bigint, allowed_mime_types text[]
);
CREATE TABLE storage.objects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id),
 name text, owner uuid, metadata jsonb
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA auth, storage TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
-- Empty representation, with the same columns used by current app functions.
CREATE TABLE cron.job (jobid bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 jobname text UNIQUE, schedule text, command text, active boolean NOT NULL DEFAULT false);
CREATE VIEW vault.decrypted_secrets AS
 SELECT NULL::text AS name, NULL::text AS decrypted_secret WHERE false;
CREATE FUNCTION net.http_post(url text, body jsonb DEFAULT '{}'::jsonb,
 params jsonb DEFAULT '{}'::jsonb, headers jsonb DEFAULT '{"Content-Type":"application/json"}'::jsonb,
 timeout_milliseconds integer DEFAULT 1000) RETURNS bigint LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Outbound HTTP is unavailable in native recovery testing'; END $$;
