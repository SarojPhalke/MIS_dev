-- Enable extensions (Supabase-compatible)
create extension if not exists "uuid-ossp";

-- ======================================================
-- ENUMs
-- ======================================================
create type role_enum as enum ('admin','engineer','manager','operator');
create type asset_type_enum as enum ('machine','utility','auxiliary');
create type asset_status_enum as enum ('active','under_amc','inactive','disposed');
create type entry_status_enum as enum ('open','ack','in_progress','resolved','closed');
create type trans_direction_enum as enum ('issue','return');
create type pm_bd_enum as enum ('pm','bd');
create type shift_id_enum as enum ('A','B');

-- ======================================================
-- USERS, ROLES & PERMISSIONS (RBAC + per-user function rights)
-- ======================================================
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  full_name text,
  role role_enum not null default 'operator',
  phone text,
  active boolean default true,
  created_at timestamptz default now(),
  created_by uuid references public.users(id) on delete set null,
  updated_at timestamptz,
  updated_by uuid references public.users(id) on delete set null
);

-- Functions/Features list (granular actions that admin can grant)
--error in this:
create table if not exists public.functions_master (
  id bigserial primary key,
  function_key text unique not null, -- e.g. 'create_bd','ack_bd','issue_spare','view_kpi'
  description text
);

-- Role -> function mapping (default capabilities per role)

CREATE TABLE IF NOT EXISTS public.role_functions (
  role role_enum NOT NULL,
  function_id BIGINT NOT NULL
    REFERENCES public.functions_master(id) ON DELETE CASCADE,
  PRIMARY KEY (role, function_id)
);

-- User-specific overrides (admin grants rights to a particular user for a particular function)
create table if not exists public.user_functions (
  user_id uuid references public.users(id) on delete cascade,
  function_id bigint references public.functions_master(id) on delete cascade,
  allowed boolean default true,
  granted_by uuid references public.users(id) on delete set null,
  granted_at timestamptz default now(),
  primary key(user_id, function_id)
);

-- ======================================================
-- Audit log table (for compliance)
-- ======================================================
create table if not exists public.audit_logs (
  id bigserial primary key,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  object_type text,
  object_id text,
  details jsonb,
  created_at timestamptz default now()
);

-- ======================================================
-- Shift table
-- ======================================================
create table if not exists public.shift_table (
  shift_id shift_id_enum primary key,
  shift_from time not null,
  shift_to time not null,
  description text
);

-- ======================================================
-- Asset master
-- ======================================================
create table if not exists public.asset_master (
  id bigserial primary key,
  asset_code text unique not null,
  asset_name text not null,
  asset_location text,
  bu_name text,
  asset_type asset_type_enum not null,
  manufacturer text,
  model_number text,
  model_name text,
  install_date date,
  asset_status asset_status_enum default 'active',
  warranty_expiry date,
  qr_code text unique, -- code printed on QR tag; app will map scan -> asset
  created_at timestamptz default now(),
  created_by uuid references public.users(id) on delete set null,
  updated_at timestamptz,
  updated_by uuid references public.users(id) on delete set null
);

create index if not exists idx_asset_bu_name on public.asset_master(bu_name);
create index if not exists idx_asset_location on public.asset_master(asset_location);

-- ======================================================
-- SPARE PARTS INVENTORY
-- ======================================================
create table if not exists public.spare_parts_inventory (
  id bigserial primary key,
  part_code text unique not null,
  part_name text not null,
  part_no text,
  min_level integer default 0 check (min_level >= 0),
  reorder_level integer default 1 check (reorder_level >= 0),
  current_stock integer default 0 check (current_stock >= 0),
  unit_cost numeric(12,2) default 0,
  supplier text,
  spare_location text,
  bu_name text,
  created_at timestamptz default now(),
  last_updated timestamptz default now(),
  last_updated_by uuid references public.users(id) on delete set null
);

create index if not exists idx_spare_part_code on public.spare_parts_inventory(part_code);

-- ======================================================
-- SPARE USAGE / TAXATION (records spare consumption tied to PM/BM)
-- Spare_taxation table: part_code, part_quantity, pm_id/bm_id, asset_code
-- ======================================================
create table if not exists public.spare_usage (
  id bigserial primary key,
  part_id bigint references public.spare_parts_inventory(id) on delete set null,
  part_code text, -- denormalized for reporting
  quantity integer check (quantity > 0),
  pm_bd_id bigint, -- reference to PM or BD master entry id (we'll link to pm_entry_engineer/bd_entry_engineer)
  pm_bd_type pm_bd_enum not null,
  asset_id bigint references public.asset_master(id) on delete set null,
  remarks text,
  created_at timestamptz default now(),
  created_by uuid references public.users(id) on delete set null
);

create index if not exists idx_spare_usage_part_id on public.spare_usage(part_id);

-- ======================================================
-- SPARE ISSUE / RETURN TRANSACTIONS
-- transaction_id, transaction_date, asset_code, pm/bm_id, direction (issue/return),
-- quantity, created_by, timestamp, balance, purpose
-- ======================================================
create table if not exists public.spare_transactions (
  id bigserial primary key,
  transaction_uuid uuid default uuid_generate_v4() not null,
  transaction_date timestamptz default now(),
  part_id bigint references public.spare_parts_inventory(id) on delete set null,
  part_code text,
  asset_id bigint references public.asset_master(id) on delete set null,
  pm_bd_id bigint,
  pm_bd_type pm_bd_enum,
  direction trans_direction_enum not null,
  quantity integer not null check (quantity > 0),
  purpose text,
  balance_after integer, -- store stock balance after transaction for audit (managed by app or trigger)
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_spare_txn_part_id on public.spare_transactions(part_id);
create index if not exists idx_spare_txn_tx_uuid on public.spare_transactions(transaction_uuid);

-- NOTE: For correctness, the application backend should wrap spare issue/return
-- in a transaction that updates spare_parts_inventory.current_stock and inserts spare_transactions.
-- Optionally, we can add a DB trigger to reject negative stock — but many teams prefer to handle business logic in app layer.

-- ======================================================
-- BREAKDOWN (BD) tables: operator + engineer
-- bd_entry_operator: bd_id, shift_ID, entry_date(current), entry_time, asset_code, bd_status,
-- asset_location, BU_name, operator_name, key_issue, nature_of_complaint, note.
-- ======================================================
create table if not exists public.bd_entry_operator (
  id bigserial primary key, -- bd_id
  bd_code text unique, -- optional human readable code
  shift_id shift_id_enum,
  entry_date date default current_date,
  entry_time time default (now()::time),
  asset_id bigint references public.asset_master(id) on delete set null,
  bd_status entry_status_enum default 'open',
  asset_location text,
  bu_name text,
  operator_name text,
  key_issue text,
  nature_of_complaint text,
  note text,
  reported_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_bd_entry_operator_asset on public.bd_entry_operator(asset_id);
create index if not exists idx_bd_entry_operator_status on public.bd_entry_operator(bd_status);

-- bd_entry_engineer: bd_id(match), action_taken, engineer_findings, job_completion_date, responsible_person,
-- spare reference columns for referencing spare_usage table
create table if not exists public.bd_entry_engineer (
  id bigserial primary key,
  bd_operator_id bigint references public.bd_entry_operator(id) on delete cascade, -- 1:1 link
  action_taken text,
  engineer_findings text,
  job_start timestamptz,
  job_completion_date timestamptz,
  responsible_person uuid references public.users(id) on delete set null,
  spare_usage_id bigint -- optional pointer or you can have multiple spare_usage rows referencing this id
);

create index if not exists idx_bd_engineer_opid on public.bd_entry_engineer(bd_operator_id);

-- ======================================================
-- PREVENTIVE MAINTENANCE (PM) operator + engineer (schema same as BD but with pm semantics)
-- pm_entry_operator
-- ======================================================
create table if not exists public.pm_entry_operator (
  id bigserial primary key, -- pm_id
  pm_code text unique,
  shift_id shift_id_enum,
  entry_date date default current_date,
  entry_time time default (now()::time),
  asset_id bigint references public.asset_master(id) on delete set null,
  pm_status entry_status_enum default 'open',
  asset_location text,
  bu_name text,
  operator_name text,
  key_issue text,
  nature_of_activity text,
  note text,
  reported_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_pm_entry_operator_asset on public.pm_entry_operator(asset_id);

-- pm_entry_engineer
create table if not exists public.pm_entry_engineer (
  id bigserial primary key,
  pm_operator_id bigint references public.pm_entry_operator(id) on delete cascade,
  action_taken text,
  engineer_findings text,
  job_start timestamptz,
  job_completion_date timestamptz,
  responsible_person uuid references public.users(id) on delete set null,
  spare_usage_id bigint
);

create index if not exists idx_pm_engineer_opid on public.pm_entry_engineer(pm_operator_id);

-- ======================================================
-- PM SCHEDULE & PM COMPLIANCE
-- pm_schedule: PM_ID, PM_frequency, last_PM_date, next_PM_date, checklist_ref, responsible_person, asset_id, pm_title, bd/pm_status
-- pm_compliance: pm_id, bu_name, asset_location, remarks, shift_ID
-- ======================================================
create table if not exists public.pm_schedule (
  id bigserial primary key,
  pm_title text,
  asset_id bigint references public.asset_master(id) on delete cascade,
  frequency_interval text, -- e.g. '7 days' or '1 month' (app should standardize). Could be interval type; text for flexibility.
  pm_frequency_interval interval, -- optional: normalized interval if you want interval arithmetic
  last_pm_date date,
  next_pm_date date,
  checklist_ref text, -- pointer to checklist id or document
  responsible_person uuid references public.users(id) on delete set null,
  status text check (status in ('scheduled','completed','overdue')) default 'scheduled',
  created_at timestamptz default now(),
  updated_at timestamptz
);

create index if not exists idx_pm_schedule_asset on public.pm_schedule(asset_id);

create table if not exists public.pm_compliance (
  id bigserial primary key,
  pm_schedule_id bigint references public.pm_schedule(id) on delete cascade,
  pm_date date default current_date,
  bu_name text,
  asset_location text,
  remarks text,
  shift_id shift_id_enum,
  reported_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ======================================================
-- REMINDER / NOTIFICATION LOG (for popups, email, message)
-- ======================================================
create table if not exists public.reminder_log (
  id bigserial primary key,
  reminder_uuid uuid default uuid_generate_v4() not null,
  target_user uuid references public.users(id) on delete set null,
  target_role role_enum,
  object_type text, -- e.g., 'pm_schedule','bd_entry'
  object_id text,
  message text,
  channel text, -- e.g., 'email','popup','sms'
  scheduled_at timestamptz,
  sent_at timestamptz,
  status text check (status in ('pending','sent','failed')) default 'pending',
  retry_count integer default 0,
  created_at timestamptz default now()
);

-- ======================================================
-- VIEWS: Combined BD/PM views (operator + engineer joined)
-- breakdown_entry_view = join of bd_entry_operator + bd_entry_engineer
-- pm_entry_view similarly
-- ======================================================
create view if not exists public.breakdown_entry_view as
select
  op.id as bd_id,
  op.bd_code,
  op.shift_id,
  op.entry_date,
  op.entry_time,
  op.asset_id,
  a.asset_code as asset_code,
  op.bd_status,
  op.asset_location,
  op.bu_name,
  op.operator_name,
  op.key_issue,
  op.nature_of_complaint,
  op.note,
  eng.action_taken,
  eng.engineer_findings,
  eng.job_start,
  eng.job_completion_date,
  eng.responsible_person,
  eng.spare_usage_id
from public.bd_entry_operator op
left join public.bd_entry_engineer eng on eng.bd_operator_id = op.id
left join public.asset_master a on a.id = op.asset_id;

--wsl postgres compatible query
CREATE OR REPLACE VIEW public.breakdown_entry_view AS
SELECT
op.id as bd_id,
  op.bd_code,
  op.shift_id,
  op.entry_date,
  op.entry_time,
  op.asset_id,
  a.asset_code as asset_code,
  op.bd_status,
  op.asset_location,
  op.bu_name,
  op.operator_name,
  op.key_issue,
  op.nature_of_complaint,
  op.note,
  eng.action_taken,
  eng.engineer_findings,
  eng.job_start,
  eng.job_completion_date,
  eng.responsible_person,
  eng.spare_usage_id
from public.bd_entry_operator op
left join public.bd_entry_engineer eng on eng.bd_operator_id = op.id
left join public.asset_master a on a.id = op.asset_id;
--------------------------------------------------------

CREATE OR REPLACE VIEW public.pm_entry_view as
select
  op.id as pm_id,
  op.pm_code,
  op.shift_id,
  op.entry_date,
  op.entry_time,
  op.asset_id,
  a.asset_code as asset_code,
  op.pm_status,
  op.asset_location,
  op.bu_name,
  op.operator_name,
  op.key_issue,
  op.nature_of_activity,
  op.note,
  eng.action_taken,
  eng.engineer_findings,
  eng.job_start,
  eng.job_completion_date,
  eng.responsible_person,
  eng.spare_usage_id
from public.pm_entry_operator op
left join public.pm_entry_engineer eng on eng.pm_operator_id = op.id
left join public.asset_master a on a.id = op.asset_id;

-- ======================================================
-- UTILITY LOGS (flexible core table)
-- I will ask you what exact measurements you want (power, water, gas meters, units, sample rate).
-- For now: a flexible schema that stores raw reading + metadata.
-- ======================================================
-- UTILITIES MONITORING MODULE (Enhanced: Power, Water, Gas, Emission & MECDL)
-- ======================================================

-- ========================
-- 1️⃣ BASE TABLE: utility_logs
-- ========================
-- Daily raw readings from meters (Power, Water, Gas, Air)
CREATE TABLE IF NOT EXISTS public.business_units (
  id BIGSERIAL PRIMARY KEY,

  bu_code TEXT NOT NULL UNIQUE,        -- e.g. 'BU-ENG', 'BU-FORGING'
  bu_name TEXT NOT NULL,               -- e.g. 'Engine Shop'

  description TEXT,

  active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,

  created_by UUID
    REFERENCES public.users(id) ON DELETE SET NULL,

  updated_by UUID
    REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_business_units_active
ON public.business_units(active);


CREATE TABLE IF NOT EXISTS public.locations (
  id BIGSERIAL PRIMARY KEY,

  location_code TEXT NOT NULL UNIQUE,      -- e.g. 'PLANT1-A1'
  location_name TEXT NOT NULL,              -- e.g. 'Plant 1 – Bay A'
  
  business_unit_id BIGINT
    REFERENCES public.business_units(id) ON DELETE SET NULL,

  description TEXT,

  active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,

  created_by UUID
    REFERENCES public.users(id) ON DELETE SET NULL,

  updated_by UUID
    REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_locations_business_unit
ON public.locations(business_unit_id);

CREATE INDEX IF NOT EXISTS idx_locations_active
ON public.locations(active);


create table if not exists public.utility_logs (
  id bigserial primary key,
  utility_type varchar(20) not null check (utility_type in ('Power','Water','Air','Gas')),
  meter_point varchar(100) not null,
  reading_unit varchar(20) not null, -- e.g. 'kWh','m³','Nm³'
  reading_value numeric(12,2) not null check (reading_value >= 0),
  timestamp timestamptz not null default now(),
  asset_id bigint references public.asset_master(id) on delete set null,
  business_unit_id bigint references public.business_units(id) on delete set null,
  location_id bigint references public.locations(id) on delete set null,
  recorded_by uuid references public.users(id) on delete set null,
  remarks text,
  created_at timestamptz default now(),
  created_by uuid references public.users(id) on delete set null,
  updated_at timestamptz,
  updated_by uuid references public.users(id) on delete set null
);
--above has syntax error fixed below
CREATE TABLE IF NOT EXISTS public.utility_logs ( 
  id BIGSERIAL PRIMARY KEY,

  utility_type VARCHAR(20) NOT NULL
    CHECK (utility_type IN ('Power','Water','Air','Gas')),

  meter_point VARCHAR(100) NOT NULL,
  reading_unit VARCHAR(20) NOT NULL, -- e.g. 'kWh','m³','Nm³'

  reading_value NUMERIC(12,2) NOT NULL
    CHECK (reading_value >= 0),

  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),

  asset_id BIGINT
    REFERENCES public.asset_master(id) ON DELETE SET NULL,

  business_unit_id BIGINT
    REFERENCES public.business_units(id) ON DELETE SET NULL,

  location_id BIGINT
    REFERENCES public.locations(id) ON DELETE SET NULL,

  recorded_by UUID
    REFERENCES public.users(id) ON DELETE SET NULL,

  remarks TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),

  created_by UUID
    REFERENCES public.users(id) ON DELETE SET NULL,

  updated_at TIMESTAMPTZ,

  updated_by UUID
    REFERENCES public.users(id) ON DELETE SET NULL
);

create index if not exists idx_utility_logs_timestamp on public.utility_logs(timestamp);
create index if not exists idx_utility_logs_type on public.utility_logs(utility_type);

-- ========================
-- 2️⃣ CARBON EMISSION LOGS (Derived layer)
-- ========================
create table if not exists public.carbon_emission_logs (
  id bigserial primary key,
  utility_log_id bigint references public.utility_logs(id) on delete cascade,
  asset_id bigint references public.asset_master(id) on delete set null,
  business_unit_id bigint references public.business_units(id) on delete set null,
  location_id bigint references public.locations(id) on delete set null,
  source_type varchar(50) not null, -- e.g. Electricity, DG Set, LPG Furnace
  record_date date not null,
  energy_consumed_kwh numeric(10,2),
  fuel_consumed_litre numeric(10,2),
  emission_factor numeric(10,4) check (emission_factor >= 0),
  co2e_kg numeric(12,2) generated always as (
    coalesce(energy_consumed_kwh,0) * coalesce(emission_factor,0)
    + coalesce(fuel_consumed_litre,0) * coalesce(emission_factor,0)
  ) stored,
  scope_category varchar(20) check (scope_category in ('Scope 1','Scope 2','Scope 3')),
  remarks text,
  recorded_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_carbon_emission_date on public.carbon_emission_logs(record_date);

-- ========================
-- 3️⃣ WATER QUALITY LOGS (ETP/STP/RO)
-- ========================
create table if not exists public.water_quality_logs (
  id bigserial primary key,
  sample_point varchar(100) not null,
  asset_id bigint references public.asset_master(id) on delete set null,
  business_unit_id bigint references public.business_units(id) on delete set null,
  location_id bigint references public.locations(id) on delete set null,
  record_date date not null,
  ph numeric(4,2) check (ph between 0 and 14),
  tds_mg_l numeric(8,2),
  hardness_mg_l numeric(8,2),
  conductivity_us_cm numeric(8,2),
  temperature_c numeric(6,2),
  chlorine_mg_l numeric(8,2),
  cod_mg_l numeric(8,2),
  bod_mg_l numeric(8,2),
  remarks text,
  recorded_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_water_quality_date on public.water_quality_logs(record_date);

-- ========================
-- 4️⃣ MACHINE & EQUIPMENT CONDITION LOGS (MECDL)
-- ========================
create table if not exists public.machine_equipment_condition_logs (
  id bigserial primary key,
  asset_id bigint references public.asset_master(id) on delete cascade,
  business_unit_id bigint references public.business_units(id) on delete set null,
  location_id bigint references public.locations(id) on delete set null,
  log_date date not null default current_date,
  shift shift_id_enum,
  temperature_c numeric(6,2),
  vibration_mm_s numeric(6,2),
  noise_db numeric(6,2),
  pressure_bar numeric(6,2),
  current_amp numeric(6,2),
  voltage_v numeric(6,2),
  remarks text,
  recorded_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_mecd_log_asset on public.machine_equipment_condition_logs(asset_id);

-- ========================
-- 5️⃣ REPORTING VIEWS (UTILITY SUMMARY)
-- ========================

-- Daily utility consumption summary
create or replace view public.utility_daily_summary as
select
  date_trunc('day', u.timestamp) as record_day,
  u.utility_type,
  u.reading_unit,
  u.location_id,
  u.business_unit_id,
  sum(u.reading_value) as total_consumption
from public.utility_logs u
group by 1,2,3,4,5
order by record_day desc;

-- ========================
-- 6️⃣ REFRESH FUNCTION (Auto-refresh daily or via Supabase schedule)
-- ========================
create or replace function public.refresh_utility_views()
returns void as $$
begin
  refresh materialized view concurrently public.kpi_spare_cost; -- existing KPI refresh
  -- Placeholder: future materialized utility KPIs (carbon summary, etc.)
end;
$$ language plpgsql;

-- ========================
-- 7️⃣ RBAC INTEGRATION (Optional permissions entries)
-- ========================
insert into public.functions_master (function_key, description) values
  ('view_utility_logs', 'View Utility Logs and Summaries'),
  ('add_utility_logs', 'Add Utility Readings'),
  ('view_mecd_logs', 'View Machine Equipment Condition Logs'),
  ('add_mecd_logs', 'Add Machine Equipment Condition Data')
on conflict (function_key) do nothing;

-- ======================================================
-- END OF UTILITIES MONITORING MODULE
-- ======================================================

-- ====== PLEASE REVIEW: tell me what metrics/columns you want here (e.g., cumulative vs interval reading,
-- sample frequency, sensor_id, power_quality_params (pf, voltage, current), CO2 etc). I will refine after your input.

-- ======================================================
-- KPI tables / logs (flexible)
-- KPI storage for pre-calculated values and raw events to derive KPIs.
-- ======================================================
-- KPI MODULE (Enhanced for MIS KPI Monitoring)
-- Replaces previous KPI section
-- ======================================================

--### ✅ 6. Integration Mapping Summary

--| KPI Metric       | Tables Involved                                          | Columns Used                       | Materialized View          |
--| ---------------- | -------------------------------------------------------- | ---------------------------------- | -------------------------- |
--| Spare Cost       | `spare_usage`, `spare_parts_inventory`, `asset_master`   | quantity × unit_cost               | `kpi_spare_cost`           |
--| Availability     | `downtime_logs`, `asset_master`                          | start_time, end_time, planned_time | `kpi_machine_availability` |
--| MTTR             | `bd_entry_operator`, `bd_entry_engineer`, `asset_master` | job_start, job_completion_date     | `kpi_mttr`                 |
--| MTBF             | `bd_entry_operator`, `asset_master`                      | entry_date, count of failures      | `kpi_mtbf`                 |
--| Uptime           | `downtime_logs`, `asset_master`                          | downtime duration vs planned time  | `kpi_uptime`               |
--| Combined Summary | joins all above views                                    | —                                  | `view_asset_kpi_summary`   |

---
-- ======================================================
-- SUPPORTING TABLES
-- ======================================================

-- Downtime Logs (planned + unplanned)
create table if not exists public.downtime_logs (
  id bigserial primary key,
  asset_id bigint references public.asset_master(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  downtime_type text check (downtime_type in ('planned','unplanned')),
  planned_production_time interval,  -- optional; used for availability/uptime calc
  remarks text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_downtime_asset_time
  on public.downtime_logs(asset_id, start_time);

-- ======================================================
-- KPI MASTER (metadata for KPI definitions)
-- ======================================================
create table if not exists public.kpi_master (
  id bigserial primary key,
  kpi_key text unique not null, -- e.g., 'mttr','mtbf','uptime','availability','spare_cost'
  display_name text,
  description text,
  unit text,
  created_at timestamptz default now()
);

-- KPI data logs (optional, for caching computed values or storing custom KPIs)
create table if not exists public.kpi_data (
  id bigserial primary key,
  kpi_id bigint references public.kpi_master(id) on delete cascade,
  measured_at timestamptz default now(),
  value numeric,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ======================================================
-- KPI MATERIALIZED VIEWS
-- ======================================================

-- 1️⃣ Spare Part Cost KPI
create materialized view if not exists public.kpi_spare_cost as
select
  date_trunc('day', s.created_at) as period_day,
  a.id as asset_id,
  a.asset_code,
  sum(s.quantity * sp.unit_cost) as total_spare_cost
from public.spare_usage s
left join public.spare_parts_inventory sp on s.part_id = sp.id
left join public.asset_master a on s.asset_id = a.id
group by 1, 2, 3
order by period_day desc;

create index if not exists idx_kpi_spare_cost_period on public.kpi_spare_cost(period_day);

-- 2️⃣ Machine Availability KPI
create materialized view if not exists public.kpi_machine_availability as
select
  a.id as asset_id,
  a.asset_code,
  date_trunc('day', d.start_time) as period_day,
  sum(extract(epoch from (d.end_time - d.start_time))/3600) as downtime_hours,
  sum(extract(epoch from d.planned_production_time)/3600) as planned_hours,
  case 
    when sum(extract(epoch from d.planned_production_time)) > 0
    then round((1 - (sum(extract(epoch from (d.end_time - d.start_time))) / sum(extract(epoch from d.planned_production_time)))) * 100, 2)
    else null
  end as availability_percent
from public.downtime_logs d
join public.asset_master a on d.asset_id = a.id
group by 1,2,3
order by period_day desc;

create index if not exists idx_kpi_machine_availability_period on public.kpi_machine_availability(period_day);

-- 3️⃣ MTTR (Mean Time To Repair)
create materialized view if not exists public.kpi_mttr as
select
  a.id as asset_id,
  a.asset_code,
  date_trunc('day', eng.job_completion_date) as period_day,
  avg(extract(epoch from (eng.job_completion_date - eng.job_start))/60) as mttr_minutes
from public.bd_entry_engineer eng
join public.bd_entry_operator op on op.id = eng.bd_operator_id
join public.asset_master a on op.asset_id = a.id
where eng.job_completion_date is not null and eng.job_start is not null
group by 1,2,3
order by period_day desc;

create index if not exists idx_kpi_mttr_period on public.kpi_mttr(period_day);

-- 4️⃣ MTBF (Mean Time Between Failures)
create materialized view if not exists public.kpi_mtbf as
select
  a.id as asset_id,
  a.asset_code,
  count(op.id) as failure_count,
  extract(epoch from (max(op.entry_date::timestamptz) - min(op.entry_date::timestamptz)))/3600 as total_operating_hours,
  case when count(op.id) > 1
       then (extract(epoch from (max(op.entry_date::timestamptz) - min(op.entry_date::timestamptz)))/3600) / (count(op.id) - 1)
       else null end as mtbf_hours
from public.asset_master a
join public.bd_entry_operator op on op.asset_id = a.id
group by 1,2
order by a.asset_code;

-- 5️⃣ Uptime %
create materialized view if not exists public.kpi_uptime as
select
  a.id as asset_id,
  a.asset_code,
  date_trunc('day', d.start_time) as period_day,
  sum(extract(epoch from d.planned_production_time)/3600) as planned_hours,
  sum(extract(epoch from (d.end_time - d.start_time))/3600) as downtime_hours,
  round(((sum(extract(epoch from d.planned_production_time)) -
         sum(extract(epoch from (d.end_time - d.start_time)))) /
         nullif(sum(extract(epoch from d.planned_production_time)),0)) * 100, 2) as uptime_percent
from public.downtime_logs d
join public.asset_master a on d.asset_id = a.id
group by 1,2,3
order by period_day desc;

create index if not exists idx_kpi_uptime_period on public.kpi_uptime(period_day);

-- ======================================================
-- 6️⃣ UNIFIED KPI SUMMARY VIEW
-- ======================================================
create materialized view if not exists public.view_asset_kpi_summary as
select
  a.id as asset_id,
  a.asset_code,
  coalesce(mttr.mttr_minutes, 0) as avg_mttr_min,
  coalesce(mtbf.mtbf_hours, 0) as avg_mtbf_hours,
  coalesce(av.availability_percent, 0) as availability_percent,
  coalesce(up.uptime_percent, 0) as uptime_percent,
  coalesce(sp.total_spare_cost, 0) as total_spare_cost,
  greatest(
    coalesce(mttr.period_day, now()),
    coalesce(mtbf.asset_code::timestamptz, now()),
    coalesce(av.period_day, now()),
    coalesce(up.period_day, now()),
    coalesce(sp.period_day, now())
  ) as last_updated
from public.asset_master a
left join public.kpi_mttr mttr on mttr.asset_id = a.id
left join public.kpi_mtbf mtbf on mtbf.asset_id = a.id
left join public.kpi_machine_availability av on av.asset_id = a.id
left join public.kpi_uptime up on up.asset_id = a.id
left join public.kpi_spare_cost sp on sp.asset_id = a.id;

create index if not exists idx_kpi_summary_asset on public.view_asset_kpi_summary(asset_id);

-- ======================================================
-- 7️⃣ AUTOMATED REFRESH FUNCTION + SCHEDULER
-- ======================================================
create or replace function public.refresh_all_kpi_views()
returns void as $$
begin
  refresh materialized view concurrently public.kpi_mttr;
  refresh materialized view concurrently public.kpi_mtbf;
  refresh materialized view concurrently public.kpi_uptime;
  refresh materialized view concurrently public.kpi_spare_cost;
  refresh materialized view concurrently public.kpi_machine_availability;
  refresh materialized view concurrently public.view_asset_kpi_summary;
end;
$$ language plpgsql;

-- ======================================================
-- OPTIONAL: Schedule KPI refresh daily (works with pg_cron or Supabase scheduled function)
-- ======================================================
-- Example for pg_cron (local Postgres):
-- select cron.schedule('daily_kpi_refresh', '0 2 * * *', $$ call public.refresh_all_kpi_views(); $$);

-- For Supabase: Use Supabase "Scheduled Functions" UI to run:
-- select public.refresh_all_kpi_views();

-- ======================================================
-- GENERIC LOGS & EXTRA FIELDS
-- BD_log and PM_log summary table for quick reporting (denormalized)
-- includes: asset_code, key_issue, reported_by, acknowledged_by, action_taken, entry_date, job_completion_date, status, description
-- ======================================================
create table if not exists public.log_summary (
  id bigserial primary key,
  source_type pm_bd_enum not null,
  source_id bigint not null, -- id from pm_entry_operator or bd_entry_operator
  asset_id bigint references public.asset_master(id) on delete set null,
  asset_code text,
  key_issue text,
  description text,
  reported_by uuid references public.users(id) on delete set null,
  acknowledged_by uuid references public.users(id) on delete set null,
  action_taken text,
  entry_date timestamptz,
  job_completion_date timestamptz,
  status entry_status_enum,
  created_at timestamptz default now()
);

-- ======================================================
-- Indexes for performance (more can be added when we profile)
-- ======================================================
create index if not exists idx_log_summary_asset on public.log_summary(asset_id);
create index if not exists idx_pm_compliance_pm_schedule_id on public.pm_compliance(pm_schedule_id);

-- ======================================================
-- Example triggers (optional): update spare_parts_inventory.last_updated
-- ======================================================
create or replace function public.fn_update_spare_last_updated() returns trigger as $$
begin
  update public.spare_parts_inventory set last_updated = now(), last_updated_by = NEW.created_by where id = NEW.part_id;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_spare_txn_after_insert
after insert on public.spare_transactions
for each row
execute procedure public.fn_update_spare_last_updated();

-- ======================================================
-- Helpful helper view: asset_by_qr (quick lookup when QR scanned)
-- ======================================================
create view if not exists public.asset_by_qr as
select id, asset_code, asset_name, asset_location, bu_name, asset_type, asset_status from public.asset_master where qr_code is not null;

-- ======================================================
-- Final remark: initial seed for functions_master (common functions)
-- ======================================================
insert into public.functions_master (function_key, description) values
  ('create_bd','Create Breakdown entry'),
  ('ack_bd','Acknowledge Breakdown'),
  ('resolve_bd','Resolve/Close Breakdown'),
  ('create_pm','Create Preventive Maintenance entry'),
  ('complete_pm','Complete PM'),
  ('issue_spare','Issue Spare Part'),
  ('return_spare','Return Spare Part'),
  ('view_kpi','View KPI Dashboard')
on conflict (function_key) do nothing;

-- ======================================================
-- END OF SCHEMA
-- ======================================================
