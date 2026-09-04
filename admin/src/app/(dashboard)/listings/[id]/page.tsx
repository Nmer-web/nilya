import { ArrowLeft, ImageOff, MapPin, Star, TriangleAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ListingActions } from "@/components/listing-actions";
import { ErrorState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  ListingStatusBadge,
  Pill,
  StatusBadge,
  SuspendedBadge,
} from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireAdmin } from "@/lib/admin";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  listingImageUrl,
} from "@/lib/format";
import {
  detailKindForCategory,
  humanizeMarketplaceValue,
  listingPriceText,
  ownerLabel,
} from "@/lib/marketplace";
import { createClient } from "@/lib/supabase/server";
import {
  LISTING_TYPE_LABEL,
  type AdminListingDetail,
} from "@/lib/types";

export default async function ListingDetailPage(
  props: PageProps<"/listings/[id]">
) {
  await requireAdmin();
  const { id } = await props.params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      `id,title,brand,description,price_cents,original_price_cents,currency,condition,
       listing_type,size,color,city,country_code,tagline,status,category_slug,created_at,updated_at,
       published_at,seller_id,
       seller:profiles!listings_seller_id_fkey(
         id,display_name,avatar_url,avatar_color,city,country_code,is_verified,
         suspended_at,created_at,rating_avg,rating_count,lifetime_sales),
       category:categories!listings_category_slug_fkey(
         slug,label,listing_type,requires_perfume_details),
       images:listing_images(storage_path,position),
       food_details(
         listing_id,price_unit,quantity,ingredients,allergens,expiry_date,halal_status,
         preparation_type,storage_requirements,delivery_requirements,created_at,updated_at),
       perfume_details(
         listing_id,brand,fragrance_name,fragrance_type,volume_ml,sealed,
         authenticity_declared,fragrance_notes,target_audience,created_at,updated_at),
       job_details(
         listing_id,employer,sector,contract_type,schedule,work_mode,location,
         salary_min_cents,salary_max_cents,salary_currency,required_experience,
         application_method,application_value,application_deadline,created_at,updated_at),
       service_details(
         listing_id,pricing_mode,service_area,delivery_mode,availability,experience,
         created_at,updated_at)`
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <>
        <PageHeader
          breadcrumb={
            <Link
              href="/listings"
              className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ArrowLeft className="size-4" aria-hidden />
              All listings
            </Link>
          }
          title="Could not load listing"
        />
        <Card>
          <ErrorState
            icon={TriangleAlert}
            title="The listing details are unavailable"
            message={error.message}
          />
        </Card>
      </>
    );
  }

  if (!data) notFound();

  const listing = data as unknown as AdminListingDetail;
  const images = [...(listing.images ?? [])].sort(
    (a, b) => a.position - b.position
  );

  const commonDetails: [string, string | null][] = [
    ["Category", listing.category?.label ?? listing.category_slug],
    ["Listing type", LISTING_TYPE_LABEL[listing.listing_type]],
    [
      "Location",
      [listing.city, listing.country_code].filter(Boolean).join(", ") || null,
    ],
    ["Created", formatDateTime(listing.created_at)],
    ["Published", listing.published_at ? formatDateTime(listing.published_at) : null],
    ["Last updated", formatDateTime(listing.updated_at)],
  ];

  const productDetails: [string, string | null][] =
    listing.listing_type === "product" || listing.listing_type === "food"
      ? [
          [
            "Condition",
            listing.condition
              ? humanizeMarketplaceValue(listing.condition)
              : null,
          ],
          ["Size", listing.size],
          ["Colour", listing.color],
          ["Brand", listing.brand],
        ]
      : [];
  const details = [...commonDetails.slice(0, 2), ...productDetails, ...commonDetails.slice(2)];

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link
            href="/listings"
            className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All listings
          </Link>
        }
        title={listing.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ListingStatusBadge status={listing.status} />
            <Pill>{LISTING_TYPE_LABEL[listing.listing_type]}</Pill>
            <span className="tabular font-medium text-foreground">
              {listingPriceText(listing)}
            </span>
            {listing.price_cents != null &&
            listing.original_price_cents != null &&
            listing.original_price_cents > listing.price_cents ? (
              <span className="tabular text-muted-foreground line-through">
                {formatMoney(listing.original_price_cents, listing.currency)}
              </span>
            ) : null}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <Card className="gap-0 overflow-hidden p-0">
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
                {images.map((image, index) => {
                  const src = listingImageUrl(image.storage_path);
                  return (
                    <div
                      key={image.storage_path}
                      className="relative aspect-square bg-muted"
                    >
                      {src ? (
                        <Image
                          src={src}
                          alt={`${listing.title} — photo ${index + 1}`}
                          fill
                          sizes="(min-width: 1024px) 300px, 50vw"
                          className="object-cover"
                          priority={index === 0}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <ImageOff className="size-6" aria-hidden />
                <p className="text-sm">This listing has no photos.</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-foreground">Description</h2>
            {listing.tagline ? (
              <p className="mt-2 text-sm font-medium text-foreground">
                {listing.tagline}
              </p>
            ) : null}
            {listing.description ? (
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {listing.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground italic">
                The seller did not write a description.
              </p>
            )}

            <Separator className="my-5" />

            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {value ?? <span className="text-muted-foreground">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <SpecialisedDetails listing={listing} />
        </div>

        <aside className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Moderation</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              Every decision is written to the audit log with your account and
              the reason you give.
            </p>
            <ListingActions listingId={listing.id} status={listing.status} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              {ownerLabel(listing.listing_type)}
            </h2>
            {listing.seller ? (
              <>
                <Link
                  href={`/users/${listing.seller.id}`}
                  className="flex items-center gap-3 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <UserAvatar
                    name={listing.seller.display_name}
                    avatarPath={listing.seller.avatar_url}
                    color={listing.seller.avatar_color}
                    className="size-10"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground underline-offset-4 hover:underline">
                      {listing.seller.display_name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Joined {formatDate(listing.seller.created_at)}
                    </span>
                  </span>
                </Link>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {listing.seller.suspended_at ? <SuspendedBadge /> : null}
                  {listing.seller.is_verified ? (
                    <StatusBadge status="verified" />
                  ) : null}
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Rating</dt>
                    <dd className="flex items-center gap-1 font-medium">
                      {listing.seller.rating_count > 0 ? (
                        <>
                          <Star
                            className="size-3.5 fill-[#EF9F27] text-[#EF9F27]"
                            aria-hidden
                          />
                          {listing.seller.rating_avg?.toFixed(1)}
                          <span className="font-normal text-muted-foreground">
                            ({listing.seller.rating_count})
                          </span>
                        </>
                      ) : (
                        <span className="font-normal text-muted-foreground">
                          Not yet rated
                        </span>
                      )}
                    </dd>
                  </div>
                  {listing.listing_type === "product" ||
                  listing.listing_type === "food" ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Lifetime sales</dt>
                      <dd className="tabular font-medium">
                        {listing.seller.lifetime_sales}
                      </dd>
                    </div>
                  ) : null}
                  {listing.seller.city ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Location</dt>
                      <dd className="flex items-center gap-1 font-medium">
                        <MapPin className="size-3.5 text-muted-foreground" aria-hidden />
                        {[listing.seller.city, listing.seller.country_code]
                          .filter(Boolean)
                          .join(", ")}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                The {ownerLabel(listing.listing_type).toLowerCase()} profile for
                this listing no longer exists.
              </p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

function SpecialisedDetails({ listing }: { listing: AdminListingDetail }) {
  const kind =
    listing.listing_type === "product"
      ? detailKindForCategory(listing.category)
      : listing.listing_type;

  if (kind === "product") return null;

  if (kind === "food" && listing.food_details) {
    const food = listing.food_details;
    return (
      <SpecialisedCard
        title="Food & grocery details"
        rows={[
          ["Price unit", humanizeMarketplaceValue(food.price_unit)],
          ["Quantity", String(food.quantity)],
          ["Ingredients", food.ingredients],
          ["Allergens", food.allergens],
          ["Expiry date", formatDate(food.expiry_date)],
          ["Halal status", humanizeMarketplaceValue(food.halal_status)],
          ["Preparation", humanizeMarketplaceValue(food.preparation_type)],
          ["Storage requirements", food.storage_requirements],
          ["Delivery requirements", food.delivery_requirements],
        ]}
      />
    );
  }

  if (kind === "perfume" && listing.perfume_details) {
    const perfume = listing.perfume_details;
    return (
      <SpecialisedCard
        title="Perfume & incense details"
        rows={[
          ["Brand", perfume.brand],
          ["Fragrance name", perfume.fragrance_name],
          ["Fragrance type", humanizeMarketplaceValue(perfume.fragrance_type)],
          ["Volume", `${perfume.volume_ml} ml`],
          ["Sealed", perfume.sealed ? "Yes" : "No"],
          [
            "Authenticity declared",
            perfume.authenticity_declared ? "Yes" : "No",
          ],
          ["Fragrance notes", perfume.fragrance_notes],
          ["Target audience", humanizeMarketplaceValue(perfume.target_audience)],
        ]}
      />
    );
  }

  if (kind === "job" && listing.job_details) {
    const job = listing.job_details;
    return (
      <SpecialisedCard
        title="Job details"
        rows={[
          ["Employer", job.employer],
          ["Sector", job.sector],
          ["Contract", humanizeMarketplaceValue(job.contract_type)],
          ["Schedule", job.schedule],
          ["Work mode", humanizeMarketplaceValue(job.work_mode)],
          ["Work location", job.location],
          [
            "Salary",
            job.salary_min_cents === job.salary_max_cents
              ? formatMoney(job.salary_min_cents, job.salary_currency)
              : `${formatMoney(job.salary_min_cents, job.salary_currency)}–${formatMoney(
                  job.salary_max_cents,
                  job.salary_currency
                )}`,
          ],
          ["Required experience", job.required_experience],
          [
            "Application method",
            job.application_method === "in_app"
              ? "Nilya in-app application"
              : humanizeMarketplaceValue(job.application_method),
          ],
          ["Application destination", job.application_value],
          ["Application deadline", formatDate(job.application_deadline)],
        ]}
      />
    );
  }

  if (kind === "service" && listing.service_details) {
    const service = listing.service_details;
    return (
      <SpecialisedCard
        title="Service details"
        rows={[
          ["Pricing mode", humanizeMarketplaceValue(service.pricing_mode)],
          ["Service area", service.service_area],
          ["Delivery mode", humanizeMarketplaceValue(service.delivery_mode)],
          ["Availability", service.availability],
          ["Experience", service.experience],
        ]}
      />
    );
  }

  return (
    <Card className="border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold text-destructive">
            Required {kind} details are missing
          </h2>
          <p className="mt-1 text-sm text-red-800">
            This Nilya listing cannot be safely approved until its specialised
            detail record exists.
          </p>
        </div>
      </div>
    </Card>
  );
}

function SpecialisedCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string | null]>;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </dt>
            <dd className="mt-1 break-words whitespace-pre-wrap text-sm font-medium text-foreground">
              {value ?? <span className="text-muted-foreground">—</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
