-- Managed platform prerequisites, only in the new local Supabase CLI database.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
DO $$ BEGIN
 IF to_regclass('auth.users') IS NULL OR to_regclass('storage.objects') IS NULL OR
    to_regprocedure('auth.uid()') IS NULL THEN
   RAISE EXCEPTION 'Supabase Auth/Storage platform initialization is incomplete';
 END IF;
 IF EXISTS (SELECT 1 FROM auth.users) OR EXISTS (SELECT 1 FROM storage.objects) OR
    EXISTS (SELECT 1 FROM vault.decrypted_secrets) OR EXISTS (SELECT 1 FROM cron.job) THEN
   RAISE EXCEPTION 'Refusing a platform containing users, files, secrets or jobs';
 END IF;
END $$;
