-- Keep typed listing edits atomic and validate external job destinations at
-- the database boundary. The function stores no JSON: jsonb is only the RPC
-- transport shape and every searchable value is written to a typed column.

alter table public.job_details
  drop constraint if exists job_salary_currency_format,
  add constraint job_salary_currency_format
    check (salary_currency = upper(salary_currency) and salary_currency ~ '^[A-Z]{3}$'),
  drop constraint if exists job_application_value_format,
  add constraint job_application_value_format check (
    application_method = 'in_app'
    or (application_method = 'external_url' and application_value ~* '^https://[^[:space:]]+$')
    or (application_method = 'email' and application_value ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (application_method = 'phone' and application_value ~ '^\+?[0-9][0-9 ()-]{5,24}$')
  );

create or replace function public.validate_active_service_detail()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.listings listing
    where listing.id = new.listing_id
      and listing.status = 'active'
      and (
        (new.pricing_mode = 'quote' and listing.price_cents is not null)
        or (new.pricing_mode <> 'quote' and listing.price_cents is null)
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'service price must match its pricing mode';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_active_service_detail() from public;

create trigger service_details_validate_active_price
  after insert or update of pricing_mode on public.service_details
  for each row execute function public.validate_active_service_detail();

create or replace function public.update_own_typed_listing(
  p_listing_id uuid,
  p_title text,
  p_description text,
  p_brand text,
  p_color text,
  p_size text,
  p_category_slug text,
  p_listing_type public.listing_type,
  p_price_cents integer,
  p_original_price_cents integer,
  p_currency char(3),
  p_city text,
  p_country_code char(2),
  p_details jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  prior_status public.listing_status;
  existing_type public.listing_type;
  target_type public.listing_type;
  target_perfume boolean;
  detail_kind text := p_details ->> 'kind';
begin
  select listing.status, listing.listing_type
    into prior_status, existing_type
  from public.listings listing
  where listing.id = p_listing_id
    and listing.seller_id = (select auth.uid())
    and listing.status in ('draft', 'active', 'removed')
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'listing is not editable by this user';
  end if;
  if existing_type <> p_listing_type then
    raise exception using errcode = '23514', message = 'listing type cannot be changed after creation';
  end if;

  select category.listing_type, category.requires_perfume_details
    into target_type, target_perfume
  from public.categories category
  where category.slug = p_category_slug and category.is_active;

  if target_type is null or target_type <> p_listing_type then
    raise exception using errcode = '23514', message = 'listing type must match its category';
  end if;
  if (p_listing_type = 'food' and detail_kind <> 'food')
    or (p_listing_type = 'job' and detail_kind <> 'job')
    or (p_listing_type = 'service' and detail_kind <> 'service')
    or (p_listing_type = 'product' and target_perfume and detail_kind <> 'perfume')
    or (p_listing_type = 'product' and not target_perfume and detail_kind <> 'product') then
    raise exception using errcode = '23514', message = 'detail payload must match the selected category';
  end if;

  -- Taking an active row private lets the detail and core fields move together.
  -- The RPC is one transaction, so other sessions never observe this state.
  update public.listings set status = 'draft' where id = p_listing_id;

  if detail_kind = 'food' then
    insert into public.food_details (
      listing_id, price_unit, quantity, ingredients, allergens, expiry_date,
      halal_status, preparation_type, storage_requirements, delivery_requirements
    ) values (
      p_listing_id,
      p_details #>> '{values,price_unit}',
      (p_details #>> '{values,quantity}')::numeric,
      p_details #>> '{values,ingredients}',
      p_details #>> '{values,allergens}',
      (p_details #>> '{values,expiry_date}')::date,
      p_details #>> '{values,halal_status}',
      p_details #>> '{values,preparation_type}',
      p_details #>> '{values,storage_requirements}',
      p_details #>> '{values,delivery_requirements}'
    )
    on conflict (listing_id) do update set
      price_unit = excluded.price_unit,
      quantity = excluded.quantity,
      ingredients = excluded.ingredients,
      allergens = excluded.allergens,
      expiry_date = excluded.expiry_date,
      halal_status = excluded.halal_status,
      preparation_type = excluded.preparation_type,
      storage_requirements = excluded.storage_requirements,
      delivery_requirements = excluded.delivery_requirements;
  elsif detail_kind = 'perfume' then
    insert into public.perfume_details (
      listing_id, brand, fragrance_name, fragrance_type, volume_ml, sealed,
      authenticity_declared, fragrance_notes, target_audience
    ) values (
      p_listing_id,
      p_details #>> '{values,brand}',
      p_details #>> '{values,fragrance_name}',
      p_details #>> '{values,fragrance_type}',
      (p_details #>> '{values,volume_ml}')::numeric,
      (p_details #>> '{values,sealed}')::boolean,
      (p_details #>> '{values,authenticity_declared}')::boolean,
      p_details #>> '{values,fragrance_notes}',
      p_details #>> '{values,target_audience}'
    )
    on conflict (listing_id) do update set
      brand = excluded.brand,
      fragrance_name = excluded.fragrance_name,
      fragrance_type = excluded.fragrance_type,
      volume_ml = excluded.volume_ml,
      sealed = excluded.sealed,
      authenticity_declared = excluded.authenticity_declared,
      fragrance_notes = excluded.fragrance_notes,
      target_audience = excluded.target_audience;
  elsif detail_kind = 'job' then
    insert into public.job_details (
      listing_id, employer, sector, contract_type, schedule, work_mode,
      location, salary_min_cents, salary_max_cents, salary_currency,
      required_experience, application_method, application_value,
      application_deadline
    ) values (
      p_listing_id,
      p_details #>> '{values,employer}',
      p_details #>> '{values,sector}',
      p_details #>> '{values,contract_type}',
      p_details #>> '{values,schedule}',
      p_details #>> '{values,work_mode}',
      p_details #>> '{values,location}',
      (p_details #>> '{values,salary_min_cents}')::integer,
      (p_details #>> '{values,salary_max_cents}')::integer,
      (p_details #>> '{values,salary_currency}')::char(3),
      p_details #>> '{values,required_experience}',
      p_details #>> '{values,application_method}',
      nullif(p_details #>> '{values,application_value}', ''),
      (p_details #>> '{values,application_deadline}')::date
    )
    on conflict (listing_id) do update set
      employer = excluded.employer,
      sector = excluded.sector,
      contract_type = excluded.contract_type,
      schedule = excluded.schedule,
      work_mode = excluded.work_mode,
      location = excluded.location,
      salary_min_cents = excluded.salary_min_cents,
      salary_max_cents = excluded.salary_max_cents,
      salary_currency = excluded.salary_currency,
      required_experience = excluded.required_experience,
      application_method = excluded.application_method,
      application_value = excluded.application_value,
      application_deadline = excluded.application_deadline;
  elsif detail_kind = 'service' then
    insert into public.service_details (
      listing_id, pricing_mode, service_area, delivery_mode, availability, experience
    ) values (
      p_listing_id,
      p_details #>> '{values,pricing_mode}',
      p_details #>> '{values,service_area}',
      p_details #>> '{values,delivery_mode}',
      p_details #>> '{values,availability}',
      p_details #>> '{values,experience}'
    )
    on conflict (listing_id) do update set
      pricing_mode = excluded.pricing_mode,
      service_area = excluded.service_area,
      delivery_mode = excluded.delivery_mode,
      availability = excluded.availability,
      experience = excluded.experience;
  end if;

  update public.listings
  set title = p_title,
      description = p_description,
      brand = p_brand,
      color = p_color,
      size = p_size,
      category_slug = p_category_slug,
      price_cents = p_price_cents,
      original_price_cents = p_original_price_cents,
      currency = p_currency,
      city = p_city,
      country_code = p_country_code,
      status = prior_status
  where id = p_listing_id;

  return p_listing_id;
end;
$$;

revoke all on function public.update_own_typed_listing(
  uuid, text, text, text, text, text, text, public.listing_type,
  integer, integer, char(3), text, char(2), jsonb
) from public;
grant execute on function public.update_own_typed_listing(
  uuid, text, text, text, text, text, text, public.listing_type,
  integer, integer, char(3), text, char(2), jsonb
) to authenticated;
