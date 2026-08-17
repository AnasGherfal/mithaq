create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create type public.account_status as enum ('active', 'suspended', 'deletion_pending', 'deleted');
create type public.waitlist_status as enum ('draft', 'submitted', 'qualified', 'invited', 'withdrawn', 'declined', 'deleted');
create type public.gender as enum ('woman', 'man');
create type public.residency_type as enum ('libya', 'diaspora');
create type public.marital_status as enum ('never_married', 'divorced', 'widowed');
create type public.marriage_timeline as enum ('within_6_months', '6_to_12_months', '1_to_2_years', 'unsure');
create type public.tristate_preference as enum ('yes', 'no', 'depends');
create type public.photo_privacy_preference as enum ('none', 'blurred', 'after_mutual_interest', 'explicit_approval', 'after_family_involvement');
create type public.family_involvement_preference as enum ('early', 'after_initial_interest', 'later', 'unsure');
create type public.consent_type as enum ('age_18_plus', 'terms', 'privacy', 'waitlist_processing', 'communications');
create type public.consent_event_type as enum ('granted', 'withdrawn');
create type public.deletion_scope as enum ('waitlist_data', 'entire_account');
create type public.deletion_status as enum ('requested', 'identity_confirmed', 'in_progress', 'completed', 'rejected');

create table public.age_bands (
  id smallint primary key,
  label text not null unique,
  min_age smallint not null check (min_age >= 18),
  max_age smallint,
  sort_order smallint not null unique,
  check (max_age is null or max_age >= min_age)
);

insert into public.age_bands (id, label, min_age, max_age, sort_order) values
  (1, '18-24', 18, 24, 1),
  (2, '25-29', 25, 29, 2),
  (3, '30-34', 30, 34, 3),
  (4, '35-39', 35, 39, 4),
  (5, '40-44', 40, 44, 5),
  (6, '45-49', 45, 49, 6),
  (7, '50-54', 50, 54, 7),
  (8, '55+', 55, null, 8);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  account_status public.account_status not null default 'active',
  preferred_locale text not null default 'ar' check (preferred_locale in ('ar', 'en')),
  timezone text not null default 'Africa/Tripoli',
  phone_country_iso char(2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.waitlist_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  status public.waitlist_status not null default 'draft',
  questionnaire_version text not null default '2026-08-17.v1',
  gender public.gender,
  age_band_id smallint references public.age_bands(id),
  residency_type public.residency_type,
  current_country_code char(2),
  current_city text check (current_city is null or char_length(current_city) between 1 and 100),
  libyan_origin_region text check (libyan_origin_region is null or char_length(libyan_origin_region) <= 100),
  marital_status public.marital_status,
  has_children boolean,
  libyan_self_attestation boolean,
  started_at timestamptz not null default now(),
  questionnaire_completed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.waitlist_preferences (
  application_id uuid primary key references public.waitlist_applications(id) on delete cascade,
  marriage_timeline public.marriage_timeline,
  willing_identity_verification boolean,
  photo_privacy_preference public.photo_privacy_preference,
  family_involvement_preference public.family_involvement_preference,
  relocation_willingness public.tristate_preference,
  open_to_libya boolean,
  open_to_diaspora boolean,
  preferred_partner_age_min smallint check (preferred_partner_age_min is null or preferred_partner_age_min >= 18),
  preferred_partner_age_max smallint check (preferred_partner_age_max is null or preferred_partner_age_max >= 18),
  accepts_partner_with_children public.tristate_preference,
  updated_at timestamptz not null default now(),
  check (preferred_partner_age_min is null or preferred_partner_age_max is null or preferred_partner_age_max >= preferred_partner_age_min),
  check (open_to_libya is null or open_to_diaspora is null or open_to_libya or open_to_diaspora)
);

create table public.waitlist_accepted_marital_statuses (
  application_id uuid not null references public.waitlist_applications(id) on delete cascade,
  marital_status public.marital_status not null,
  primary key (application_id, marital_status)
);

create table public.waitlist_preferred_countries (
  application_id uuid not null references public.waitlist_applications(id) on delete cascade,
  country_code char(2) not null,
  primary key (application_id, country_code)
);

create table public.waitlist_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  consent_type public.consent_type not null,
  event_type public.consent_event_type not null,
  document_version text not null,
  document_sha256 text not null check (document_sha256 ~ '^[0-9a-f]{64}$'),
  locale text not null check (locale in ('ar', 'en')),
  supersedes_id uuid references public.waitlist_consents(id),
  recorded_at timestamptz not null default now(),
  request_id uuid not null default gen_random_uuid()
);

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references public.users(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{8,16}$'),
  status text not null default 'active' check (status in ('active', 'disabled', 'expired')),
  max_uses integer check (max_uses is null or max_uses > 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  request_scope public.deletion_scope not null,
  status public.deletion_status not null default 'requested',
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  user_visible_note_code text
);

create table private.phone_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  provider text not null,
  provider_request_id text,
  purpose text not null check (purpose in ('waitlist_signup', 'waitlist_login', 'phone_change')),
  channel text not null default 'sms' check (channel = 'sms'),
  status text not null check (status in ('requested', 'sent', 'verified', 'failed', 'expired', 'rate_limited')),
  attempt_number smallint not null default 1 check (attempt_number > 0),
  phone_country_iso char(2),
  phone_last4 char(4),
  requested_at timestamptz not null default now(),
  verified_at timestamptz,
  expires_at timestamptz,
  failure_code text,
  request_id uuid not null default gen_random_uuid()
);

create table private.referral_events (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete cascade,
  referred_user_id uuid references public.users(id) on delete set null,
  anonymous_session_id uuid,
  event_type text not null check (event_type in ('opened', 'started', 'phone_verified', 'submitted')),
  occurred_at timestamptz not null default now()
);

create index waitlist_applications_status_submitted_idx on public.waitlist_applications (status, submitted_at);
create index waitlist_applications_gender_status_idx on public.waitlist_applications (gender, status);
create index waitlist_applications_country_status_idx on public.waitlist_applications (current_country_code, status);
create index waitlist_applications_age_status_idx on public.waitlist_applications (age_band_id, status);
create index deletion_requests_user_status_idx on public.deletion_requests (user_id, status);
create index referral_events_code_event_time_idx on private.referral_events (referral_code_id, event_type, occurred_at);

alter table public.age_bands enable row level security;
alter table public.users enable row level security;
alter table public.waitlist_applications enable row level security;
alter table public.waitlist_preferences enable row level security;
alter table public.waitlist_accepted_marital_statuses enable row level security;
alter table public.waitlist_preferred_countries enable row level security;
alter table public.waitlist_consents enable row level security;
alter table public.referral_codes enable row level security;
alter table public.deletion_requests enable row level security;

create policy "age bands are readable" on public.age_bands for select to authenticated using (true);

create policy "users read own row" on public.users for select to authenticated using (id = auth.uid());
create policy "users update own row" on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "applications read own" on public.waitlist_applications for select to authenticated using (user_id = auth.uid());
create policy "applications insert own" on public.waitlist_applications for insert to authenticated with check (user_id = auth.uid());
create policy "applications update own" on public.waitlist_applications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "preferences read own" on public.waitlist_preferences for select to authenticated using (exists (select 1 from public.waitlist_applications a where a.id = application_id and a.user_id = auth.uid()));
create policy "preferences insert own" on public.waitlist_preferences for insert to authenticated with check (exists (select 1 from public.waitlist_applications a where a.id = application_id and a.user_id = auth.uid()));
create policy "preferences update own" on public.waitlist_preferences for update to authenticated using (exists (select 1 from public.waitlist_applications a where a.id = application_id and a.user_id = auth.uid())) with check (exists (select 1 from public.waitlist_applications a where a.id = application_id and a.user_id = auth.uid()));

create policy "accepted statuses own" on public.waitlist_accepted_marital_statuses for all to authenticated using (exists (select 1 from public.waitlist_applications a where a.id = application_id and a.user_id = auth.uid())) with check (exists (select 1 from public.waitlist_applications a where a.id = application_id and a.user_id = auth.uid()));
create policy "preferred countries own" on public.waitlist_preferred_countries for all to authenticated using (exists (select 1 from public.waitlist_applications a where a.id = application_id and a.user_id = auth.uid())) with check (exists (select 1 from public.waitlist_applications a where a.id = application_id and a.user_id = auth.uid()));

create policy "consents read own" on public.waitlist_consents for select to authenticated using (user_id = auth.uid());
create policy "consents insert own" on public.waitlist_consents for insert to authenticated with check (user_id = auth.uid());

create policy "referral code read own" on public.referral_codes for select to authenticated using (owner_user_id = auth.uid());

create policy "deletion requests read own" on public.deletion_requests for select to authenticated using (user_id = auth.uid());
create policy "deletion requests insert own" on public.deletion_requests for insert to authenticated with check (user_id = auth.uid());

revoke insert, update, delete on public.age_bands from anon, authenticated;
revoke update, delete on public.waitlist_consents from anon, authenticated;
revoke insert, update, delete on public.referral_codes from anon, authenticated;
revoke update, delete on public.deletion_requests from anon, authenticated;
