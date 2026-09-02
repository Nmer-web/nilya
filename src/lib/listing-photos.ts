import { File as ExpoFile } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export const LISTING_PHOTO_LIMIT = 10;
export const LISTING_PHOTO_MAX_BYTES = 5_242_880;
export const LISTING_PHOTO_MIME = 'image/jpeg' as const;
export const LISTING_PHOTO_EXTENSION = 'jpg' as const;

export type PhotoPreparationState = 'preparing' | 'ready' | 'error';

export type PreparedPhotoUpload = {
  uri: string;
  mimeType: typeof LISTING_PHOTO_MIME;
  extension: typeof LISTING_PHOTO_EXTENSION;
  byteLength: number;
  width: number;
  height: number;
  ownsObjectUrl: boolean;
};

export type LocalListingPhoto = {
  id: string;
  dedupeKey: string;
  previewUri: string;
  ownsPreviewObjectUrl: boolean;
  sourceUri: string;
  sourceMimeType: string | null;
  sourceFileSize: number | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  state: PhotoPreparationState;
  prepared: PreparedPhotoUpload | null;
  error: string | null;
};

export class ListingPhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ListingPhotoError';
  }
}

export type ListingPhotoPreparationQueue = {
  prepare(photo: LocalListingPhoto): Promise<LocalListingPhoto>;
};

/**
 * Creates one serial preparation lane for a Sell composer. Picker returns,
 * Android-restored results, and tile retries all use this lane so two large
 * images are never decoded/re-rendered at the same time.
 */
export function createListingPhotoPreparationQueue(): ListingPhotoPreparationQueue {
  let tail: Promise<void> = Promise.resolve();
  return {
    prepare(photo) {
      const result = tail.then(() => prepareListingPhoto(photo));
      tail = result.then(
        () => undefined,
        () => undefined
      );
      return result;
    },
  };
}

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function assetKey(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.assetId) return `asset:${asset.assetId}`;
  return `uri:${asset.uri}|${asset.fileName ?? ''}|${asset.fileSize ?? ''}`;
}

function sourcePreview(asset: ImagePicker.ImagePickerAsset): {
  uri: string;
  ownsObjectUrl: boolean;
} {
  if (Platform.OS === 'web' && asset.file && typeof URL !== 'undefined') {
    return { uri: URL.createObjectURL(asset.file), ownsObjectUrl: true };
  }
  return { uri: asset.uri, ownsObjectUrl: false };
}

/** Converts picker results to immediate, stable preview models without trusting MIME metadata. */
export function ingestListingPhotoAssets(
  assets: readonly ImagePicker.ImagePickerAsset[],
  existing: readonly LocalListingPhoto[]
): LocalListingPhoto[] {
  const known = new Set(existing.map((photo) => photo.dedupeKey));
  const available = Math.max(0, LISTING_PHOTO_LIMIT - existing.length);
  const additions: LocalListingPhoto[] = [];

  for (const asset of assets) {
    if (additions.length >= available) break;
    const dedupeKey = assetKey(asset);
    if (known.has(dedupeKey)) continue;
    known.add(dedupeKey);

    const preview = sourcePreview(asset);
    additions.push({
      id: randomId(),
      dedupeKey,
      previewUri: preview.uri,
      ownsPreviewObjectUrl: preview.ownsObjectUrl,
      sourceUri: preview.uri,
      sourceMimeType: asset.mimeType ?? asset.file?.type ?? null,
      sourceFileSize: asset.fileSize ?? asset.file?.size ?? null,
      sourceWidth: asset.width > 0 ? asset.width : null,
      sourceHeight: asset.height > 0 ? asset.height : null,
      state: 'preparing',
      prepared: null,
      error: null,
    });
  }

  return additions;
}

export async function openListingImageLibrary(
  remaining: number
): Promise<ImagePicker.ImagePickerAsset[]> {
  if (remaining <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    allowsEditing: false,
    selectionLimit: Math.min(remaining, LISTING_PHOTO_LIMIT),
    orderedSelection: true,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    quality: 1,
    exif: false,
    base64: false,
  });
  return result.canceled ? [] : result.assets;
}

/** Restores an Android picker result after activity destruction. It is a no-op elsewhere. */
export async function getPendingListingPhotoAssets(): Promise<ImagePicker.ImagePickerAsset[]> {
  if (Platform.OS !== 'android') return [];
  const result = await ImagePicker.getPendingResultAsync();
  if (result && 'code' in result) {
    throw new ListingPhotoError(result.message || 'The interrupted image selection could not be restored.');
  }
  return result && 'canceled' in result && !result.canceled ? result.assets : [];
}

function isJpeg(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[bytes.byteLength - 2] === 0xff &&
    bytes[bytes.byteLength - 1] === 0xd9
  );
}

export async function readPreparedPhotoBytes(uri: string): Promise<Uint8Array> {
  try {
    if (Platform.OS === 'web') {
      if (!uri.startsWith('blob:')) {
        throw new ListingPhotoError('The prepared web photo is no longer available. Select it again.');
      }
      const response = await fetch(uri);
      if (!response.ok) throw new ListingPhotoError('The prepared photo could not be read.');
      return new Uint8Array(await response.arrayBuffer());
    }

    if (!uri.startsWith('file://')) {
      throw new ListingPhotoError('This photo does not have a readable local file. Select it again.');
    }
    const file = new ExpoFile(uri);
    if (!file.exists) throw new ListingPhotoError('This photo is no longer on the device. Select it again.');
    return await file.bytes();
  } catch (error) {
    if (error instanceof ListingPhotoError) throw error;
    throw new ListingPhotoError(
      error instanceof Error
        ? `The prepared photo could not be read: ${error.message}`
        : 'The prepared photo could not be read.'
    );
  }
}

function validatePreparedBytes(bytes: Uint8Array, width: number, height: number): void {
  if (bytes.byteLength === 0) throw new ListingPhotoError('The selected photo is empty.');
  if (!isJpeg(bytes)) throw new ListingPhotoError('The selected photo could not be converted to JPEG.');
  if (width <= 0 || height <= 0) {
    throw new ListingPhotoError('The selected photo has invalid dimensions.');
  }
}

const releasedObjectUrls = new Set<string>();

function releaseObjectUrl(uri: string, owned: boolean): void {
  if (
    !owned ||
    !uri.startsWith('blob:') ||
    typeof URL === 'undefined' ||
    releasedObjectUrls.has(uri)
  ) {
    return;
  }
  URL.revokeObjectURL(uri);
  releasedObjectUrls.add(uri);
}

async function renderJpeg(
  sourceUri: string,
  sourceWidth: number | null,
  sourceHeight: number | null,
  maxDimension: number | null,
  compress: number
): Promise<{ resultUri: string; width: number; height: number }> {
  const context = ImageManipulator.manipulate(sourceUri);
  if (
    maxDimension &&
    sourceWidth &&
    sourceHeight &&
    Math.max(sourceWidth, sourceHeight) > maxDimension
  ) {
    if (sourceWidth >= sourceHeight) context.resize({ width: maxDimension });
    else context.resize({ height: maxDimension });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress });
  return { resultUri: result.uri, width: result.width, height: result.height };
}

/**
 * Re-renders one real picker asset to metadata-free JPEG bytes and enforces the
 * bucket's actual limit. Attempts are serial so ten large decodes cannot pile up.
 */
export async function prepareListingPhoto(photo: LocalListingPhoto): Promise<LocalListingPhoto> {
  const attempts = [
    { maxDimension: null, compress: 0.92 },
    { maxDimension: 3200, compress: 0.84 },
    { maxDimension: 2600, compress: 0.76 },
    { maxDimension: 2100, compress: 0.68 },
    { maxDimension: 1700, compress: 0.58 },
    { maxDimension: 1400, compress: 0.48 },
  ] as const;

  let measuredWidth = photo.sourceWidth;
  let measuredHeight = photo.sourceHeight;

  try {
    for (const attempt of attempts) {
      let renderedUri: string | null = null;
      let ownsRenderedUrl = false;
      try {
        const rendered = await renderJpeg(
          photo.sourceUri,
          measuredWidth,
          measuredHeight,
          attempt.maxDimension,
          attempt.compress
        );
        renderedUri = rendered.resultUri;
        ownsRenderedUrl = Platform.OS === 'web' && rendered.resultUri.startsWith('blob:');
        measuredWidth ??= rendered.width;
        measuredHeight ??= rendered.height;
        const bytes = await readPreparedPhotoBytes(rendered.resultUri);
        validatePreparedBytes(bytes, rendered.width, rendered.height);

        if (bytes.byteLength <= LISTING_PHOTO_MAX_BYTES) {
          let preparedUri = rendered.resultUri;
          let ownsObjectUrl = ownsRenderedUrl;

          if (Platform.OS === 'web' && typeof URL !== 'undefined') {
            const byteCopy = Uint8Array.from(bytes);
            preparedUri = URL.createObjectURL(
              new Blob([byteCopy.buffer], { type: LISTING_PHOTO_MIME })
            );
            ownsObjectUrl = true;
          } else {
            // The returned resource adopts the rendered URL. Its eventual
            // remove/reset/unmount disposer now owns that URL.
            ownsRenderedUrl = false;
          }

          releaseObjectUrl(photo.previewUri, photo.ownsPreviewObjectUrl);
          return {
            ...photo,
            previewUri: preparedUri,
            ownsPreviewObjectUrl: false,
            state: 'ready',
            prepared: {
              uri: preparedUri,
              mimeType: LISTING_PHOTO_MIME,
              extension: LISTING_PHOTO_EXTENSION,
              byteLength: bytes.byteLength,
              width: rendered.width,
              height: rendered.height,
              ownsObjectUrl,
            },
            error: null,
          };
        }
      } finally {
        if (renderedUri) releaseObjectUrl(renderedUri, ownsRenderedUrl);
      }
    }

    throw new ListingPhotoError('This photo is still over 5 MB after preparation. Choose another photo.');
  } catch (error) {
    return {
      ...photo,
      state: 'error',
      prepared: null,
      error:
        error instanceof ListingPhotoError
          ? error.message
          : 'This photo could not be prepared. Choose a JPEG, PNG, WebP, or AVIF image.',
    };
  }
}

export async function prepareListingPhotosSequentially(
  photos: readonly LocalListingPhoto[],
  onPrepared?: (photo: LocalListingPhoto) => void
): Promise<LocalListingPhoto[]> {
  const prepared: LocalListingPhoto[] = [];
  for (const photo of photos) {
    const result = await prepareListingPhoto(photo);
    prepared.push(result);
    onPrepared?.(result);
  }
  return prepared;
}

/** Releases only object URLs that this module explicitly owns. */
export function disposeListingPhoto(photo: LocalListingPhoto): void {
  releaseObjectUrl(photo.previewUri, photo.ownsPreviewObjectUrl);
  if (photo.prepared) releaseObjectUrl(photo.prepared.uri, photo.prepared.ownsObjectUrl);
}

export function disposeListingPhotos(photos: readonly LocalListingPhoto[]): void {
  photos.forEach(disposeListingPhoto);
}
