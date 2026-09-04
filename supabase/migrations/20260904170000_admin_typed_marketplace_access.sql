-- Give authenticated Nilya administrators read-only moderation visibility into
-- the specialised marketplace records introduced with typed listings. Sellers
-- and customers keep their existing policies; this only adds the admin branch.

drop policy if exists "admins read all food details" on public.food_details;
create policy "admins read all food details"
  on public.food_details for select to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "admins read all perfume details" on public.perfume_details;
create policy "admins read all perfume details"
  on public.perfume_details for select to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "admins read all job details" on public.job_details;
create policy "admins read all job details"
  on public.job_details for select to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "admins read all service details" on public.service_details;
create policy "admins read all service details"
  on public.service_details for select to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "admins read all job applications" on public.job_applications;
create policy "admins read all job applications"
  on public.job_applications for select to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "admins read all service quote requests" on public.service_quote_requests;
create policy "admins read all service quote requests"
  on public.service_quote_requests for select to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "admins read all service bookings" on public.service_bookings;
create policy "admins read all service bookings"
  on public.service_bookings for select to authenticated
  using (public.is_admin((select auth.uid())));

-- Keep the existing admin RPC signature so deployed clients do not change.
-- A child category inherits the parent's listing contract. Without this, a
-- child created under Jobs, Services, Food or Perfumes would silently use the
-- old product defaults and sellers could not publish the expected detail type.
create or replace function public.admin_create_category(
  p_slug       text,
  p_label      text,
  p_parent_id  uuid,
  p_icon_key   text,
  p_sort_order smallint,
  p_is_active  boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor                   uuid := auth.uid();
  v_id                      uuid;
  v_parent_parent_id        uuid;
  v_listing_type            public.listing_type := 'product';
  v_requires_perfume_detail boolean := false;
begin
  if not public.is_admin(v_actor) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_parent_id is not null then
    select parent.parent_id, parent.listing_type, parent.requires_perfume_details
      into v_parent_parent_id, v_listing_type, v_requires_perfume_detail
    from public.categories parent
    where parent.id = p_parent_id;

    if not found then
      raise exception 'parent category does not exist' using errcode = '23503';
    end if;

    if v_parent_parent_id is not null then
      raise exception 'categories are two levels deep' using errcode = '23514';
    end if;
  end if;

  insert into public.categories
    (slug, label, parent_id, icon_key, sort_order, is_active,
     listing_type, requires_perfume_details)
  values
    (p_slug, btrim(p_label), p_parent_id,
     nullif(btrim(coalesce(p_icon_key, '')), ''), p_sort_order, p_is_active,
     v_listing_type, v_requires_perfume_detail)
  returning id into v_id;

  insert into public.admin_audit_log
    (actor_id, action, target_type, target_id, before, after, note)
  values
    (v_actor, 'category.create', 'category', v_id, null,
     jsonb_build_object('slug', p_slug, 'label', btrim(p_label),
                        'parent_id', p_parent_id, 'icon_key', p_icon_key,
                        'sort_order', p_sort_order, 'is_active', p_is_active,
                        'listing_type', v_listing_type,
                        'requires_perfume_details', v_requires_perfume_detail),
     null);

  return v_id;
end $$;

revoke execute on function
  public.admin_create_category(text, text, uuid, text, smallint, boolean)
from public, anon;
grant execute on function
  public.admin_create_category(text, text, uuid, text, smallint, boolean)
to authenticated;
