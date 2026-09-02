import { formatProfileLocation } from '@/lib/profile-presentation';

export function listingShareContent(title: string, formattedPrice: string) {
  const realTitle = title.trim();
  const realPrice = formattedPrice.trim();
  return {
    title: `${realTitle} on NILYA`,
    message: `${realTitle} on NILYA - ${realPrice}`,
  };
}

export function sellerShareContent(profile: {
  display_name: string;
  city: string | null;
  country_code: string | null;
}) {
  const displayName = profile.display_name.trim();
  const location = formatProfileLocation(profile.city, profile.country_code);
  return {
    title: displayName,
    message: location
      ? `${displayName} on NILYA - ${location}`
      : `${displayName} on NILYA`,
  };
}
