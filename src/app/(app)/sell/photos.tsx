import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

import { Icon } from '@/components/icon';
import { Tap } from '@/components/ui';
import { useDraft } from '@/features/sell/DraftContext';
import { PHOTO_MAX, validateStepFields } from '@/features/sell/validation';
import { EDGE, FieldError, SellStepScreen, StepFade } from '@/features/sell/wizard';
import {
  createListingPhotoPreparationQueue,
  disposeListingPhoto,
  getPendingListingPhotoAssets,
  ingestListingPhotoAssets,
  openListingImageLibrary,
  type LocalListingPhoto,
} from '@/lib/listing-photos';
import { useApp } from '@/store/app-store';
import { color as C, duration, radius, space, touch, type } from '@/theme/tokens';

const GAP = space.space8;

/**
 * Step 1: photographs.
 *
 * Three square slots per row. The first is the cover; tapping any other photo
 * makes it the cover, which is the reordering that matters for a listing.
 * Photos go through the same preparation pipeline the previous Sell screen
 * used — re-rendered to JPEG within the bucket's limit — and stay in memory
 * until published.
 */
export default function PhotosStep() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { draft, photos, setPhotos } = useDraft();
  const { flash } = useApp();
  const [queue] = useState(createListingPhotoPreparationQueue);
  const [attempted, setAttempted] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const mounted = useRef(true);
  const photosRef = useRef(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const errors = validateStepFields(1, draft, photos);
  const cell = Math.floor((width - EDGE * 2 - GAP * 2) / 3);

  const addAndPrepare = useCallback(
    async (assets: Parameters<typeof ingestListingPhotoAssets>[0]) => {
      const available = Math.max(0, PHOTO_MAX - photosRef.current.length);
      const additions = ingestListingPhotoAssets(assets, photosRef.current).slice(0, available);
      if (additions.length === 0) return;
      setPickError(null);
      setPhotos((previous) => [...previous, ...additions]);
      for (const addition of additions) {
        const prepared = await queue.prepare(addition);
        /* The seller may have removed it, or left the flow, while it prepared. */
        setPhotos((previous) => {
          if (!previous.some((photo) => photo.id === prepared.id)) {
            disposeListingPhoto(prepared);
            return previous;
          }
          return previous.map((photo) => (photo.id === prepared.id ? prepared : photo));
        });
      }
    },
    [queue, setPhotos]
  );

  /* Android can destroy the activity behind the picker; its result is
     restored exactly once here. A no-op elsewhere. */
  useEffect(() => {
    let cancelled = false;
    void getPendingListingPhotoAssets()
      .then(async (assets) => {
        if (!cancelled && assets.length > 0) await addAndPrepare(assets);
      })
      .catch((caught) => {
        if (!cancelled) setPickError(caught instanceof Error ? caught.message : 'The interrupted image selection could not be restored.');
      });
    return () => {
      cancelled = true;
    };
  }, [addAndPrepare]);

  const pick = async () => {
    try {
      const remaining = PHOTO_MAX - photosRef.current.length;
      const assets = await openListingImageLibrary(remaining);
      if (__DEV__) {
        console.log('[NILYA][PHOTOS] picker returned', {
          requested: remaining,
          returned: assets.length,
          keys: assets.map((asset) => asset.assetId ?? asset.fileName ?? asset.uri.slice(-24)),
        });
      }
      /* Say what came back. A seller who tapped one photo and expected several
         learns here that the picker returned one, rather than wondering later. */
      if (assets.length > 0) {
        flash(assets.length === 1 ? '1 photo selected' : `${assets.length} photos selected`);
      }
      await addAndPrepare(assets);
    } catch (caught) {
      setPickError(caught instanceof Error ? caught.message : 'Could not open your image library.');
    }
  };

  const remove = (id: string) => {
    setPhotos((previous) => {
      const target = previous.find((photo) => photo.id === id);
      if (target) disposeListingPhoto(target);
      return previous.filter((photo) => photo.id !== id);
    });
  };

  const makeCover = (id: string) => {
    setPhotos((previous) => {
      const target = previous.find((photo) => photo.id === id);
      return target ? [target, ...previous.filter((photo) => photo.id !== id)] : previous;
    });
  };

  const retry = async (photo: LocalListingPhoto) => {
    setPhotos((previous) => previous.map((item) => (item.id === photo.id ? { ...item, state: 'preparing', error: null } : item)));
    const prepared = await queue.prepare({ ...photo, state: 'preparing', error: null });
    setPhotos((previous) => {
      if (!previous.some((item) => item.id === prepared.id)) {
        disposeListingPhoto(prepared);
        return previous;
      }
      return previous.map((item) => (item.id === prepared.id ? prepared : item));
    });
  };

  return (
    <SellStepScreen
      step={1}
      title="Add photos"
      subtitle={`Up to ${PHOTO_MAX}. The first one is the cover buyers see in the grid.`}
      errors={errors}
      onAttempt={() => setAttempted(true)}
      onContinue={() => router.push('/sell/details')}
    >
      <StepFade>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {photos.map((photo, index) => (
            <PhotoSlot
              key={photo.id}
              photo={photo}
              index={index}
              size={cell}
              onRemove={() => remove(photo.id)}
              onMakeCover={() => makeCover(photo.id)}
              onRetry={() => void retry(photo)}
            />
          ))}
          {photos.length < PHOTO_MAX ? (
            <Tap
              onPress={() => void pick()}
              accessibilityRole="button"
              accessibilityLabel={photos.length === 0 ? 'Add product photos' : 'Add more photos'}
              accessibilityHint={`Opens your image library; you can choose up to ${PHOTO_MAX - photos.length} more`}
              style={{
                width: cell,
                height: cell,
                borderRadius: radius.radiusMedium,
                borderCurve: 'continuous',
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: C.border,
                backgroundColor: C.surface,
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.space4,
              }}
            >
              <Icon name="camera" role="action" color={C.textPrimary} decorative />
              <Text style={{ ...type.caption, color: C.textSecondary }}>Add</Text>
            </Tap>
          ) : null}
        </View>

        <Text
          accessibilityLiveRegion="polite"
          style={{ ...type.metadataMedium, color: C.textPrimary, marginTop: space.space16, fontVariant: ['tabular-nums'] }}
        >
          {photos.length} of {PHOTO_MAX} photos
        </Text>
        <Text style={{ ...type.metadata, color: C.textSecondary, marginTop: space.space4 }}>
          Add at least 1 photo. Good lighting and a plain background sell faster.
        </Text>
        <Text style={{ ...type.metadata, color: C.textSecondary, marginTop: space.space8 }}>
          To add several at once, tap each photo in your library before confirming. On some Android
          phones you need to press and hold the first photo to start selecting more.
        </Text>
        {attempted ? <FieldError message={errors.photos} /> : null}
        <FieldError message={pickError ?? undefined} />
      </StepFade>
    </SellStepScreen>
  );
}

function PhotoSlot({
  photo,
  index,
  size,
  onRemove,
  onMakeCover,
  onRetry,
}: {
  photo: LocalListingPhoto;
  index: number;
  size: number;
  onRemove: () => void;
  onMakeCover: () => void;
  onRetry: () => void;
}) {
  const cover = index === 0;
  const failed = photo.state === 'error';
  const preparing = photo.state === 'preparing';

  return (
    <View style={{ width: size, height: size }}>
      <Tap
        onPress={failed ? onRetry : cover ? undefined : onMakeCover}
        disabled={cover && !failed}
        accessibilityRole={failed || !cover ? 'button' : 'image'}
        accessibilityLabel={
          failed
            ? `Photo ${index + 1} could not be prepared. ${photo.error ?? ''} Tap to retry`
            : cover
              ? `Cover photo`
              : `Photo ${index + 1}. Tap to make it the cover`
        }
        style={{
          width: size,
          height: size,
          borderRadius: radius.radiusMedium,
          borderCurve: 'continuous',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: failed ? C.error : C.border,
          backgroundColor: C.bgMuted,
        }}
      >
        <Image
          source={{ uri: photo.previewUri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={duration.standard}
          accessible={false}
        />
        {preparing ? (
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: C.floatingSurface }}>
            <Text accessibilityLiveRegion="polite" style={{ ...type.caption, color: C.textPrimary }}>
              Preparing…
            </Text>
          </View>
        ) : null}
        {failed ? (
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: C.floatingSurface, padding: space.space8 }}>
            <Text style={{ ...type.caption, color: C.errorText, textAlign: 'center' }} numberOfLines={3}>
              {photo.error ?? 'Could not prepare'}
            </Text>
            <Text style={{ ...type.caption, fontFamily: type.metadataMedium.fontFamily, color: C.textPrimary, marginTop: space.space4 }}>Retry</Text>
          </View>
        ) : null}
        {cover && !failed ? (
          <View
            style={{
              position: 'absolute',
              left: space.space8,
              bottom: space.space8,
              minHeight: 22,
              justifyContent: 'center',
              paddingHorizontal: space.space8,
              borderRadius: radius.radiusPill,
              backgroundColor: C.primary,
            }}
          >
            <Text style={{ ...type.caption, fontSize: 11, lineHeight: 14, fontFamily: type.metadataMedium.fontFamily, color: C.textInverse }}>Cover</Text>
          </View>
        ) : null}
      </Tap>

      <Tap
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove photo ${index + 1}`}
        hitSlop={8}
        style={{
          position: 'absolute',
          top: space.space4,
          right: space.space4,
          width: 28,
          height: 28,
          borderRadius: radius.radiusPill,
          backgroundColor: C.surface,
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 28,
        }}
      >
        <Icon name="close" role="metadata" color={C.textPrimary} decorative />
      </Tap>
      {/* The visual X is 28px; the hit slop above brings it to the 44px minimum. */}
      <View accessible={false} pointerEvents="none" style={{ position: 'absolute', width: touch.minimum, height: touch.minimum, top: -4, right: -4 }} />
    </View>
  );
}
