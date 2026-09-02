-- Keep public profile ratings derived from transaction-gated review rows.
-- Reviews are immutable to app roles, so insert/delete cover the supported
-- lifecycle while avoiding a second source of truth in client code.

create or replace function public.recalculate_profile_rating(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialize reviews for one subject so concurrent inserts cannot overwrite
  -- each other's aggregate with a stale count.
  perform 1
  from public.profiles
  where id = p_profile_id
  for update;

  update public.profiles as profile
  set
    rating_avg = aggregate.rating_avg,
    rating_count = aggregate.rating_count
  from (
    select
      round(avg(review.rating)::numeric, 1) as rating_avg,
      count(*)::integer as rating_count
    from public.reviews as review
    where review.subject_id = p_profile_id
  ) as aggregate
  where profile.id = p_profile_id;
end;
$$;

create or replace function public.sync_profile_rating_after_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_profile_rating(old.subject_id);
    return old;
  end if;

  perform public.recalculate_profile_rating(new.subject_id);
  return new;
end;
$$;

revoke all on function public.recalculate_profile_rating(uuid)
  from public, anon, authenticated;
revoke all on function public.sync_profile_rating_after_review()
  from public, anon, authenticated;

create trigger reviews_sync_profile_rating
  after insert or delete on public.reviews
  for each row execute function public.sync_profile_rating_after_review();

-- Correct any existing aggregate drift when this migration is applied.
update public.profiles as profile
set
  rating_avg = (
    select round(avg(review.rating)::numeric, 1)
    from public.reviews as review
    where review.subject_id = profile.id
  ),
  rating_count = (
    select count(*)::integer
    from public.reviews as review
    where review.subject_id = profile.id
  );
