insert into plans (id, name, monthly_price_cents, stripe_price_id)
values
  ('starter', 'Starter', 1900, null),
  ('pro', 'Pro', 4900, null)
on conflict (id) do update
set
  name = excluded.name,
  monthly_price_cents = excluded.monthly_price_cents,
  stripe_price_id = excluded.stripe_price_id;
