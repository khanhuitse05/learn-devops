create table if not exists orders (
  id serial primary key,
  customer_name text not null,
  total_usd numeric(10, 2) not null,
  status text not null default 'created',
  created_at timestamptz not null default now()
);

insert into orders (id, customer_name, total_usd, status)
values
  (1, 'Demo User', 29.00, 'paid'),
  (2, 'Mobile App User', 49.00, 'created')
on conflict (id) do nothing;

select setval(
  pg_get_serial_sequence('orders', 'id'),
  greatest((select coalesce(max(id), 1) from orders), 1),
  true
);
