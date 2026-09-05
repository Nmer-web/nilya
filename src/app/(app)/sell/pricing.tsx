import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { formatPrice } from '@/components/listing-card';
import { SellCountryPicker } from '@/components/sell-country-picker';
import { Skeleton } from '@/components/skeleton';
import { InlineError } from '@/components/ui';
import { useDraft } from '@/features/sell/DraftContext';
import { ChoiceField } from '@/features/sell/SpecializedFields';
import { useSellerProfile } from '@/features/sell/seller-profile';
import { validateStepFields } from '@/features/sell/validation';
import { FieldError, FieldLabel, SellStepScreen, StepFade } from '@/features/sell/wizard';
import { useAsync } from '@/hooks/use-async';
import { retryableReadMessage } from '@/lib/errors';
import { parseEuroCents } from '@/lib/listing-publication';
import { fetchDeliveryOptions } from '@/lib/mutations';
import { fetchPlatformSettings } from '@/lib/queries';
import { color as C, radius, space, type } from '@/theme/tokens';

function cents(value: string): number | null {
  try {
    return parseEuroCents(value);
  } catch {
    return null;
  }
}

/** Digits and one decimal separator, nothing else. */
function sanitizeMoney(value: string): string {
  const cleaned = value.replace(/[^0-9.,]/g, '').replace(',', '.');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length > 0 ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

/**
 * Step 5: price, an optional original price, and where the product ships
 * from.
 *
 * There is no quantity and no shipping choice here: a listing is one item,
 * and delivery options are set per country by NILYA. The options for the
 * chosen country are shown so the seller knows what buyers will be offered.
 */
export default function PricingStep() {
  const router = useRouter();
  const { draft, patch, photos, setSpecialized } = useDraft();
  const [attempted, setAttempted] = useState(false);
  const settings = useAsync(fetchPlatformSettings, 'platform-settings');
  const profile = useSellerProfile();

  const currency = (settings.data?.base_currency ?? '').trim().toUpperCase();
  const currencyReady = currency === 'EUR';

  /* Pre-fill the country from the profile once, without overriding a choice. */
  useEffect(() => {
    if (draft.countryCode === null && profile.data?.countryCode) patch({ countryCode: profile.data.countryCode });
  }, [draft.countryCode, patch, profile.data?.countryCode]);

  const errors = validateStepFields(5, draft, photos);
  if (!settings.loading && !currencyReady) errors.currency = 'Pricing is unavailable until the marketplace currency is confirmed.';
  const shown = attempted ? errors : {};

  const commerce = draft.listingType === 'product' || draft.listingType === 'food';
  const isJob = draft.listingType === 'job';
  const isService = draft.listingType === 'service';
  const quoteOnly = isService && draft.specialized.service.pricingMode === 'quote';
  const showPrice = !isJob && !quoteOnly;
  const showOriginal = commerce;
  const screenTitle = isJob ? 'Set compensation' : isService ? 'Set service pricing' : 'Set the price';

  const price = cents(draft.price);
  const original = draft.originalPrice.trim() ? cents(draft.originalPrice) : null;
  const discount = price !== null && original !== null && original > price ? Math.round((1 - price / original) * 100) : null;

  return (
    <SellStepScreen
      step={5}
      title={screenTitle}
      errors={errors}
      onAttempt={() => setAttempted(true)}
      onContinue={() => router.push('/sell/location')}
    >
      <StepFade>
        {isService ? (
          <ChoiceField
            label="Pricing mode"
            value={draft.specialized.service.pricingMode}
            options={[["fixed", "Fixed price"], ["hourly", "Per hour"], ["daily", "Per day"], ["quote", "Quote required"]] as const}
            onChange={(pricingMode) => {
              setSpecialized('service', { pricingMode });
              if (pricingMode === 'quote') patch({ price: '', originalPrice: '' });
            }}
            error={shown.pricingMode}
          />
        ) : null}

        {isJob ? (
          <View style={{ gap: space.space20 }}>
            <View>
              <FieldLabel label={`Minimum salary${currencyReady ? ` (${currency})` : ''}`} />
              <MoneyInput value={draft.specialized.job.salaryMin} onChangeText={(salaryMin) => setSpecialized('job', { salaryMin: sanitizeMoney(salaryMin) })} symbol={currencyReady ? '€' : ''} accessibilityLabel="Minimum salary" large error={Boolean(shown.salaryMin)} />
              <FieldError message={shown.salaryMin ?? shown.currency} />
            </View>
            <View>
              <FieldLabel label={`Maximum salary${currencyReady ? ` (${currency})` : ''}`} />
              <MoneyInput value={draft.specialized.job.salaryMax} onChangeText={(salaryMax) => setSpecialized('job', { salaryMax: sanitizeMoney(salaryMax) })} symbol={currencyReady ? '€' : ''} accessibilityLabel="Maximum salary" error={Boolean(shown.salaryMax)} />
              <FieldError message={shown.salaryMax} />
            </View>
          </View>
        ) : showPrice ? (
          <View style={{ marginTop: isService ? space.space24 : 0 }}>
            <FieldLabel label={`${isService ? 'Price' : 'Price'}${currencyReady ? ` (${currency})` : ''}`} />
            <MoneyInput
              value={draft.price}
              onChangeText={(value) => patch({ price: sanitizeMoney(value) })}
              symbol={currencyReady ? '€' : ''}
              accessibilityLabel="Price"
              large
              error={Boolean(shown.price)}
            />
            <FieldError message={shown.price ?? shown.currency} />
          </View>
        ) : (
          <View style={{ marginTop: space.space16, padding: space.space16, borderRadius: radius.radiusMedium, backgroundColor: C.primarySoft }}>
            <Text style={{ ...type.metadata, color: C.primary }}>Customers will request a quote before a price is agreed.</Text>
            <FieldError message={shown.currency} />
          </View>
        )}
        {settings.error ? (
          <InlineError message="The marketplace currency could not be confirmed." actionLabel="Retry" onAction={settings.refetch} style={{ marginTop: space.space12 }} />
        ) : null}

        {showOriginal ? <View style={{ marginTop: space.space24 }}>
          <FieldLabel
            label="Original price"
            trailing={
              discount !== null ? (
                <View
                  accessible
                  accessibilityLabel={`${discount} percent off`}
                  style={{ paddingHorizontal: space.space8, minHeight: 22, justifyContent: 'center', borderRadius: radius.radiusPill, backgroundColor: C.accent }}
                >
                  <Text style={{ ...type.caption, fontFamily: type.metadataMedium.fontFamily, color: C.textPrimary }}>−{discount}%</Text>
                </View>
              ) : (
                <Text style={{ ...type.caption, color: C.inkFaint }}>Optional</Text>
              )
            }
          />
          <MoneyInput
            value={draft.originalPrice}
            onChangeText={(value) => patch({ originalPrice: sanitizeMoney(value) })}
            symbol={currencyReady ? '€' : ''}
            accessibilityLabel="Original price"
            error={Boolean(shown.originalPrice)}
          />
          {shown.originalPrice ? (
            <FieldError message={shown.originalPrice} />
          ) : (
            <Text style={{ ...type.caption, color: C.textSecondary, marginTop: space.space8 }}>
              Shown struck through beside the price when it is higher.
            </Text>
          )}
        </View> : null}

        <View style={{ marginTop: space.space24 }}>
          <FieldLabel label={isJob ? 'Job country' : isService ? 'Provider country' : 'Ships from'} />
          {profile.loading && draft.countryCode === null ? (
            <Skeleton width="100%" height={52} round={radius.radiusMedium} />
          ) : (
            <SellCountryPicker
              value={draft.countryCode ?? ''}
              onChange={(code) => patch({ countryCode: code })}
              variant="row"
            />
          )}
          <FieldError message={shown.countryCode} />
          {profile.error ? (
            <InlineError message="Your profile country could not be read; choose one above." actionLabel="Retry" onAction={profile.refetch} style={{ marginTop: space.space12 }} />
          ) : null}
        </View>

        {commerce && draft.countryCode && currencyReady ? (
          <View style={{ marginTop: space.space24 }}>
            <FieldLabel label="Delivery buyers can choose" />
            <Text style={{ ...type.caption, color: C.textSecondary, marginBottom: space.space8 }}>
              Set per country by NILYA. Each listing is one item, so there is no quantity to set.
            </Text>
            <DeliveryPreview countryCode={draft.countryCode} currency={currency} />
          </View>
        ) : null}
      </StepFade>
    </SellStepScreen>
  );
}

function MoneyInput({
  value,
  onChangeText,
  symbol,
  accessibilityLabel,
  large = false,
  error = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  symbol: string;
  accessibilityLabel: string;
  large?: boolean;
  error?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const size = large ? 32 : 18;
  return (
    <View
      style={{
        minHeight: large ? 72 : 52,
        borderRadius: radius.radiusMedium,
        borderCurve: 'continuous',
        backgroundColor: C.bgMuted,
        borderWidth: 1.5,
        borderColor: error ? C.error : focused ? C.primary : 'transparent',
        paddingHorizontal: space.space16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.space8,
      }}
    >
      {symbol ? (
        <Text style={{ ...type.cardTitle, fontSize: size, lineHeight: size + 8, color: value ? C.textPrimary : C.inkFaint }}>{symbol}</Text>
      ) : null}
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder="0.00"
        placeholderTextColor={C.inkFaint}
        selectionColor={C.primary}
        keyboardType="decimal-pad"
        inputMode="decimal"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          ...type.cardTitle,
          fontSize: size,
          lineHeight: size + 8,
          color: C.textPrimary,
          padding: 0,
          fontVariant: ['tabular-nums'],
        }}
      />
    </View>
  );
}

function DeliveryPreview({ countryCode, currency }: { countryCode: string; currency: string }) {
  const options = useAsync(() => fetchDeliveryOptions(countryCode), `sell-delivery:${countryCode}`);
  const rows = options.data ?? [];
  if (options.loading) {
    return (
      <View style={{ gap: space.space12 }}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="100%" height={40} />
      </View>
    );
  }
  if (options.error) {
    return (
      <InlineError
        message={retryableReadMessage(options.error, 'Delivery information could not be loaded. You can still continue.')}
        actionLabel="Retry"
        onAction={options.refetch}
      />
    );
  }
  if (rows.length === 0) {
    return <Text style={{ ...type.metadata, color: C.textSecondary }}>No delivery information is currently available for this country.</Text>;
  }
  return (
    <View>
      {rows.map((option, index) => (
        <View
          key={option.id}
          accessible
          accessibilityLabel={`${option.name}, ${option.price_cents === 0 ? 'Free' : formatPrice(option.price_cents, currency)}`}
          style={{
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.space12,
            paddingVertical: space.space12,
            borderBottomWidth: index === rows.length - 1 ? 0 : 1,
            borderBottomColor: C.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ ...type.bodyMedium, color: C.textPrimary }}>{option.name}</Text>
            {option.subtitle ? <Text style={{ ...type.metadata, color: C.textSecondary, marginTop: 2 }}>{option.subtitle}</Text> : null}
          </View>
          <Text style={{ ...type.bodyMedium, color: C.textPrimary }}>
            {option.price_cents === 0 ? 'Free' : formatPrice(option.price_cents, currency)}
          </Text>
        </View>
      ))}
    </View>
  );
}
