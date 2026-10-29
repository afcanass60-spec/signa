-- =====================================================================
-- Signa : schéma de base de données Supabase
-- À coller dans Supabase > SQL Editor > New query, puis "Run".
-- =====================================================================

-- ---------- Profils (un par utilisateur) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_premium boolean not null default false,
  is_admin boolean not null default false,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

-- crée automatiquement le profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "lire son profil" on public.profiles;
create policy "lire son profil" on public.profiles
  for select using (auth.uid() = id);
-- Aucune policy d'UPDATE : un utilisateur ne peut PAS se passer premium ou admin.
-- Seul le webhook Stripe (clé service_role, qui contourne RLS) modifie is_premium.

-- fonctions utilitaires pour les règles
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create or replace function public.is_premium() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_premium or is_admin from profiles where id = auth.uid()), false);
$$;

-- ---------- Signes de référence (enregistrés dans le Studio) ----------
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  sign_slug text not null,
  frames jsonb not null,                -- 30 images × 203 valeurs
  premium boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint frames_is_array check (jsonb_typeof(frames) = 'array')
);
create index if not exists templates_sign_idx on public.templates (sign_slug);

alter table public.templates enable row level security;

drop policy if exists "lire les références" on public.templates;
create policy "lire les références" on public.templates
  for select to authenticated
  using (not premium or public.is_premium());

drop policy if exists "admins ajoutent" on public.templates;
create policy "admins ajoutent" on public.templates
  for insert to authenticated with check (public.is_admin());

drop policy if exists "admins suppriment" on public.templates;
create policy "admins suppriment" on public.templates
  for delete to authenticated using (public.is_admin());

-- ---------- Essais des élèves ----------
create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  sign_slug text not null,
  score smallint not null check (score between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists attempts_user_idx on public.attempts (user_id, created_at);

alter table public.attempts enable row level security;

drop policy if exists "lire ses essais" on public.attempts;
create policy "lire ses essais" on public.attempts
  for select using (auth.uid() = user_id);

drop policy if exists "ajouter ses essais" on public.attempts;
create policy "ajouter ses essais" on public.attempts
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Pour te donner les droits d'admin (accès au Studio), après t'être inscrit :
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'ton@email.fr');
-- ---------------------------------------------------------------------
