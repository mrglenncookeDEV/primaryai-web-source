create table if not exists plans (
  id text primary key,
  name text not null,
  stripe_price_id text,
  monthly_price_cents integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
