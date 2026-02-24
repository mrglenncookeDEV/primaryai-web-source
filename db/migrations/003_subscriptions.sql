create table if not exists subscriptions (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  plan_id text not null references plans(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on subscriptions(user_id);
