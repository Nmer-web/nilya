-- Covering indexes for the seven foreign keys the performance advisor flagged.
--
-- These matter for two reasons beyond joins: every one of them references
-- profiles, offers or orders with ON DELETE CASCADE / SET NULL, and Postgres
-- has to scan the referencing table on each parent delete. Without an index
-- that is a seq scan per deleted row.
--
-- Plain CREATE INDEX rather than CONCURRENTLY: migrations run in a transaction,
-- which forbids CONCURRENTLY, and these tables are currently empty so there is
-- no lock duration to worry about. Revisit if these are ever added to a
-- populated database.

create index if not exists messages_sender     on messages   (sender_id);
create index if not exists offers_buyer        on offers     (buyer_id);
create index if not exists offers_seller       on offers     (seller_id);
create index if not exists offers_counter_of   on offers     (counter_of);
create index if not exists orders_offer        on orders     (offer_id);
create index if not exists reviews_author      on reviews    (author_id);
create index if not exists disputes_opened_by  on disputes   (opened_by);
