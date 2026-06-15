# Lakewood's Gingerbread House Delivery App - Version 1

## Included
- Office dashboard, no office login
- Add single delivery
- Bulk CSV paste/upload with preview before adding
- Duplicate order warning for today's date only
- Edit/delete orders
- Driver-only view selector
- Driver can mark Out for Delivery
- Driver can mark Delivered with proof required
- Driver can mark Failed Delivery with reason required
- History search for delivered and failed deliveries
- Supabase database setup file

## Later Add-ons
- Real driver login permissions
- Real SMS delivery texts through Twilio
- Office notifications when delivered
- Better photo storage security

## Setup
1. Create a Supabase project.
2. Run `supabase_schema.sql` in Supabase SQL editor.
3. Create a storage bucket named `delivery-proofs`.
4. Copy `.env.example` to `.env` and add your Supabase URL and anon key.
5. Run:
   npm install
   npm run dev

## Bulk Upload Format
CSV columns:
order number, customer name, address, phone, driver, notes

Example:
10482,Goldberg Family,"123 Main St, Lakewood NJ",7325551234,Driver 1,Leave by front door
