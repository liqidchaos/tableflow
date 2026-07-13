-- 012_indexes.sql
create index if not exists idx_orders_session on orders(session_id);
create index if not exists idx_orders_venue_status on orders(venue_id, status);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_table_sessions_table on table_sessions(table_id, status);
create index if not exists idx_item_requests_session on item_requests(session_id, status);
create index if not exists idx_item_requests_venue on item_requests(venue_id, status);
create index if not exists idx_menu_items_venue on menu_items(venue_id, is_available);
create index if not exists idx_inventory_venue on inventory_items(venue_id);
create index if not exists idx_payments_session on payments(session_id);
create index if not exists idx_ai_insights_venue on ai_insights(venue_id, is_read);
create index if not exists idx_venue_tables_qr on venue_tables(qr_code);
create index if not exists idx_venue_tables_venue on venue_tables(venue_id);
create index if not exists idx_staff_user on staff(user_id);
create index if not exists idx_staff_venue on staff(venue_id);
