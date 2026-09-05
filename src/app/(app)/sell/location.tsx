import { Host, Switch } from '@expo/ui';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Skeleton } from '@/components/skeleton';
import { Button, InlineError, T } from '@/components/ui';
import { LocationMap } from '@/features/location/map';
import { useLocation } from '@/features/location/useLocation';
import { useDraft } from '@/features/sell/DraftContext';
import { useSellerProfile } from '@/features/sell/seller-profile';
import { validateStepFields } from '@/features/sell/validation';
import { FieldLabel, SellStepScreen, StepFade } from '@/features/sell/wizard';
import { updateProfile } from '@/lib/mutations';
import { formatProfileLocation } from '@/lib/profile-presentation';
import { color as C, radius, space, type } from '@/theme/tokens';

const MAP_HEIGHT = 180;
/** A close viewport: this map shows one pin, not a search area. */
const PREVIEW_RADIUS_KM = 2;

/**
 * Step 6: where the listing is offered from.
 *
 * Entirely optional, in every direction. A seller who refuses the permission,
 * whose device cannot get a fix, or who simply does not want to be on the map
 * continues to the review step with nothing set, and publishes a listing that
 * behaves exactly as listings did before this step existed — it just does not
 * appear on the map. `validateStepFields` contributes no errors for step 6 for
 * that reason.
 *
 * Two facts are collected and they are stored in different places: the
 * coordinates and city belong to this listing, and the "show my location"
 * consent belongs to the seller's profile, because it governs every listing
 * they have.
 */
export default function LocationStep() {
  const router = useRouter();
  const { draft, patch, photos } = useDraft();
  const location = useLocation();
  const profile = useSellerProfile();

  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingConsent, setSavingConsent] = useState(false);
  /* The consent lives on the profile; this mirrors it so the switch responds
     immediately and falls back if the write is refused. */
  const [consent, setConsent] = useState<boolean | null>(null);

  /* Only an explicit press may overwrite what is in the draft. Without this
     an already-granted permission would silently replace a city the seller
     typed by hand the moment the screen mounted. */
  const requested = useRef(false);

  const showLocation = consent ?? profile.data?.showLocation ?? true;
  const hasCoordinates = draft.latitude !== null && draft.longitude !== null;
  const placeLabel = formatProfileLocation(draft.city, draft.countryCode);

  const saveBaseLocation = useCallback(
    async (latitude: number, longitude: number, city: string | null, countryCode: string | null) => {
      /* "If they haven't set one yet" — a seller who already has a base
         position keeps it; this step is about the listing, and silently
         moving their profile would be a side effect they did not ask for. */
      if (profile.data?.latitude !== null && profile.data?.latitude !== undefined) return;
      try {
        await updateProfile({
          latitude,
          longitude,
          ...(profile.data?.city ? {} : { city }),
          ...(profile.data?.countryCode ? {} : { countryCode }),
        });
        profile.refresh();
      } catch {
        setSaveError('Your listing keeps this location, but your profile could not be updated.');
      }
    },
    [profile]
  );

  useEffect(() => {
    if (!requested.current || !location.coords) return;
    requested.current = false;

    const { latitude, longitude } = location.coords;
    patch({
      latitude,
      longitude,
      /* A reverse geocode that came back empty must not erase a city the
         seller already has. */
      ...(location.city ? { city: location.city } : {}),
      ...(location.countryCode ? { countryCode: location.countryCode } : {}),
    });
    void saveBaseLocation(latitude, longitude, location.city, location.countryCode);
  }, [location.coords, location.city, location.countryCode, patch, saveBaseLocation]);

  const useCurrentPosition = useCallback(() => {
    setSaveError(null);
    requested.current = true;
    void location.refreshLocation();
  }, [location]);

  const changeConsent = useCallback(
    (next: boolean) => {
      const previous = showLocation;
      setConsent(next);
      setSavingConsent(true);
      setSaveError(null);
      void (async () => {
        try {
          await updateProfile({ showLocation: next });
          profile.refresh();
        } catch {
          setConsent(previous);
          setSaveError('That setting could not be saved. Try again.');
        } finally {
          setSavingConsent(false);
        }
      })();
    },
    [showLocation, profile]
  );

  const clearLocation = useCallback(() => {
    patch({ latitude: null, longitude: null });
  }, [patch]);

  return (
    <SellStepScreen
      step={6}
      title="Where are you selling from?"
      subtitle="Buyers nearby will find your listing first"
      errors={validateStepFields(6, draft, photos)}
      onAttempt={() => undefined}
      onContinue={() => router.push('/sell/review')}
    >
      <StepFade>
        {hasCoordinates ? (
          <LocationMap
            center={{ latitude: draft.latitude as number, longitude: draft.longitude as number }}
            radiusKm={PREVIEW_RADIUS_KM}
            height={MAP_HEIGHT}
            interactive={false}
            borderRadius={radius.radiusLarge}
            placeholderLabel={placeLabel}
            accessibilityLabel={
              placeLabel ? `Map showing ${placeLabel}` : 'Map showing the selected location'
            }
            markers={[
              {
                id: 'draft',
                coordinate: {
                  latitude: draft.latitude as number,
                  longitude: draft.longitude as number,
                },
                imageUrl: null,
                count: 1,
              },
            ]}
          />
        ) : (
          <EmptyMap loading={location.loading && location.permissionGranted} />
        )}

        {hasCoordinates ? (
          <View
            style={{
              marginTop: space.space12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.space8,
            }}
          >
            <Icon name="pin" role="metadata" color={C.primary} decorative />
            <T variant="metadata" color={C.textSecondary} style={{ flex: 1 }}>
              {placeLabel
                ? `Pinned near ${placeLabel}`
                : 'Pinned. Buyers see the area, never the exact address.'}
            </T>
            <Button label="Remove" variant="ghost" buttonSize="compact" onPress={clearLocation} />
          </View>
        ) : null}

        {/*
          Rendered only where it could work. In a client whose binary has no
          location module the button would do nothing at all, and a control
          that cannot do its job must not be shown (Principle V).
        */}
        {location.available ? (
          <Button
            label="Use my current location"
            variant={hasCoordinates ? 'secondary' : 'primary'}
            onPress={useCurrentPosition}
            loading={location.loading && !profile.loading}
            loadingLabel="Finding you…"
            style={{ marginTop: space.space20 }}
          >
            <Icon
              name="pin"
              role="inline"
              color={hasCoordinates ? C.textPrimary : C.textInverse}
              decorative
            />
          </Button>
        ) : (
          <View
            style={{
              marginTop: space.space20,
              padding: space.space16,
              borderRadius: radius.radiusMedium,
              borderCurve: 'continuous',
              backgroundColor: C.bgMuted,
            }}
          >
            <Text style={{ ...type.metadata, color: C.textSecondary }}>
              This build cannot read your location. Enter your city below — your listing
              publishes either way.
            </Text>
          </View>
        )}

        {location.permissionDenied ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              marginTop: space.space12,
              padding: space.space16,
              borderRadius: radius.radiusMedium,
              borderCurve: 'continuous',
              backgroundColor: C.bgMuted,
            }}
          >
            <Text style={{ ...type.metadata, color: C.textSecondary }}>
              Location permission denied. You can still enter your city manually.
            </Text>
          </View>
        ) : null}

        {location.error ? (
          <InlineError
            message={location.error}
            actionLabel="Try again"
            onAction={useCurrentPosition}
            style={{ marginTop: space.space12 }}
          />
        ) : null}

        {saveError ? <InlineError message={saveError} style={{ marginTop: space.space12 }} /> : null}

        <View style={{ marginTop: space.space24 }}>
          <FieldLabel label="Or search a city" />
          <TextInput
            accessibilityLabel="City"
            value={draft.city ?? ''}
            onChangeText={(value) => patch({ city: value.trim() ? value.slice(0, 120) : null })}
            placeholder="Khartoum"
            placeholderTextColor={C.inkFaint}
            selectionColor={C.primary}
            autoCapitalize="words"
            autoCorrect={false}
            style={{
              minHeight: 52,
              borderRadius: radius.radiusMedium,
              borderCurve: 'continuous',
              backgroundColor: C.bgMuted,
              paddingHorizontal: space.space16,
              ...type.body,
              color: C.textPrimary,
            }}
          />
          <Text style={{ ...type.caption, color: C.textSecondary, marginTop: space.space8 }}>
            A city on its own still shows on your listing. Only a pin puts it on the map.
          </Text>
        </View>

        <View
          style={{
            marginTop: space.space24,
            paddingTop: space.space20,
            borderTopWidth: 1,
            borderTopColor: C.border,
          }}
        >
          {profile.loading ? (
            <Skeleton width="100%" height={32} />
          ) : (
            <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
              <Switch
                label="Show my location to buyers"
                value={showLocation}
                disabled={savingConsent}
                onValueChange={changeConsent}
              />
            </Host>
          )}
          <Text
            accessibilityLiveRegion="polite"
            style={{ ...type.caption, color: C.textSecondary, marginTop: space.space12 }}
          >
            {savingConsent
              ? 'Saving…'
              : showLocation
                ? 'Buyers see the area your listings are in, and roughly how far away you are. Never your address.'
                : 'Your listings stay off the map. Everything else about them is unchanged.'}
          </Text>
        </View>
      </StepFade>
    </SellStepScreen>
  );
}

/** The map's footprint before there is anything to draw in it. */
function EmptyMap({ loading }: { loading: boolean }) {
  if (loading) return <Skeleton width="100%" height={MAP_HEIGHT} round={radius.radiusLarge} />;

  return (
    <View
      style={{
        height: MAP_HEIGHT,
        borderRadius: radius.radiusLarge,
        borderCurve: 'continuous',
        backgroundColor: C.bgMuted,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.space8,
        paddingHorizontal: space.space24,
      }}
    >
      <Icon name="pin" role="navigation" color={C.inkFaint} decorative />
      <T variant="metadata" color={C.textSecondary} style={{ textAlign: 'center' }}>
        No location set. Your listing publishes without one.
      </T>
    </View>
  );
}
