
create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  delivery_date date default current_date,
  order_no text not null,
  customer_name text not null,
  address text not null,
  phone text,
  driver text not null default 'Driver 1',
  notes text,
  status text not null default 'New',
  receiver_name text,
  proof_photo_url text,
  failed_reason text,
  completed_at timestamptz
);

create index if not exists deliveries_delivery_date_idx on deliveries(delivery_date);
create index if not exists deliveries_order_no_idx on deliveries(order_no);
create index if not exists deliveries_driver_idx on deliveries(driver);
create index if not exists deliveries_status_idx on deliveries(status);

-- Storage bucket needed:
-- Create bucket named: delivery-proofs
-- Make it private or public depending on your preference.
