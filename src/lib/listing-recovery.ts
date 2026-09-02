import AsyncStorage from '@react-native-async-storage/async-storage';

const RECOVERY_VERSION = 1 as const;
// Compatibility identifier: changing it could orphan an in-flight private publication recovery.
const RECOVERY_PREFIX = 'sawa.listing-publication.v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PublicationRecoveryStage =
  | 'draft-created'
  | 'uploading'
  | 'activating'
  | 'confirming'
  | 'cleanup-required';

export type PublicationRecoveryRecordV1 = {
  version: typeof RECOVERY_VERSION;
  sellerId: string;
  listingId: string;
  intendedPaths: string[];
  stage: PublicationRecoveryStage;
  updatedAt: string;
};

type PublicationStartGuardV1 = {
  version: typeof RECOVERY_VERSION;
  kind: 'start-guard';
  sellerId: string;
  updatedAt: string;
};

export type RecoveryLoadResult =
  | { kind: 'none' }
  | { kind: 'record'; record: PublicationRecoveryRecordV1 }
  | { kind: 'start-guard'; message: string }
  | { kind: 'invalid'; message: string; rawPreserved: true };

export function publicationRecoveryKey(sellerId: string): string {
  if (!UUID.test(sellerId)) throw new Error('Cannot scope publication recovery to an invalid seller.');
  return `${RECOVERY_PREFIX}:${sellerId}`;
}

function isRecord(value: unknown, expectedSellerId: string): value is PublicationRecoveryRecordV1 {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<PublicationRecoveryRecordV1>;
  const stages: PublicationRecoveryStage[] = [
    'draft-created',
    'uploading',
    'activating',
    'confirming',
    'cleanup-required',
  ];
  return (
    record.version === RECOVERY_VERSION &&
    record.sellerId === expectedSellerId &&
    UUID.test(record.sellerId) &&
    typeof record.listingId === 'string' &&
    UUID.test(record.listingId) &&
    Array.isArray(record.intendedPaths) &&
    record.intendedPaths.length >= 1 &&
    record.intendedPaths.length <= 10 &&
    record.intendedPaths.every((path, position) =>
      isGeneratedListingPath(path, record.listingId as string, position)
    ) &&
    typeof record.stage === 'string' &&
    stages.includes(record.stage as PublicationRecoveryStage) &&
    typeof record.updatedAt === 'string' &&
    Number.isFinite(Date.parse(record.updatedAt))
  );
}

function isStartGuard(value: unknown, expectedSellerId: string): value is PublicationStartGuardV1 {
  if (!value || typeof value !== 'object') return false;
  const guard = value as Partial<PublicationStartGuardV1>;
  return (
    guard.version === RECOVERY_VERSION &&
    guard.kind === 'start-guard' &&
    guard.sellerId === expectedSellerId &&
    UUID.test(guard.sellerId) &&
    typeof guard.updatedAt === 'string' &&
    Number.isFinite(Date.parse(guard.updatedAt))
  );
}

/**
 * Accept only the path grammar emitted by listing-publication.ts. A recovery
 * record is mutation authority, so merely being somewhere below the listing
 * folder is not sufficient: empty names, nested paths, backslashes, control
 * characters, different extensions, and edited positions all remain
 * untrusted local evidence and never reach Storage.
 */
function isGeneratedListingPath(path: unknown, listingId: string, position: number): boolean {
  if (typeof path !== 'string' || path.length > 180) return false;
  const filename = path.slice(listingId.length + 1);
  if (!path.startsWith(`${listingId}/`) || filename.length === 0) return false;
  const expected = new RegExp(
    `^${position}-[a-z0-9]+-[a-z0-9]+-${position}\\.jpg$`
  );
  return expected.test(filename);
}

export async function loadPublicationRecovery(sellerId: string): Promise<RecoveryLoadResult> {
  const raw = await AsyncStorage.getItem(publicationRecoveryKey(sellerId));
  if (raw === null) return { kind: 'none' };
  try {
    const value: unknown = JSON.parse(raw);
    if (isStartGuard(value, sellerId)) {
      return {
        kind: 'start-guard',
        message:
          'A private publication started before its exact recovery record could be saved. NILYA will not start another listing automatically. Retry the recovery check; if this continues, return Home and leave the saved recovery record unchanged.',
      };
    }
    return isRecord(value, sellerId)
      ? { kind: 'record', record: value }
      : {
          kind: 'invalid',
          rawPreserved: true,
          message:
            'The saved publication recovery record failed its integrity check. It was preserved, and no listing or photo was changed. Retry the check; if this continues, return Home and do not start another publication from this recovery record.',
        };
  } catch {
    return {
      kind: 'invalid',
      rawPreserved: true,
      message:
        'The saved publication recovery record could not be read safely. It was preserved, and no listing or photo was changed. Retry the check; if this continues, return Home and leave the saved recovery record unchanged.',
    };
  }
}

/**
 * Written before draft creation and replaced at the same key by the exact
 * listing/path record. It carries no listing identifier, so it can only block
 * a new publication after an interrupted first journal write; it never grants
 * authority for a Storage or database mutation.
 */
export async function savePublicationStartGuard(sellerId: string): Promise<void> {
  const guard: PublicationStartGuardV1 = {
    version: RECOVERY_VERSION,
    kind: 'start-guard',
    sellerId,
    updatedAt: new Date().toISOString(),
  };
  if (!isStartGuard(guard, sellerId)) throw new Error('Refusing to save an invalid publication start guard.');
  await AsyncStorage.setItem(publicationRecoveryKey(sellerId), JSON.stringify(guard));
}

export async function savePublicationRecovery(
  record: Omit<PublicationRecoveryRecordV1, 'version' | 'updatedAt'>
): Promise<PublicationRecoveryRecordV1> {
  const stored: PublicationRecoveryRecordV1 = {
    ...record,
    version: RECOVERY_VERSION,
    updatedAt: new Date().toISOString(),
  };
  if (!isRecord(stored, stored.sellerId)) throw new Error('Refusing to save invalid publication recovery data.');
  await AsyncStorage.setItem(publicationRecoveryKey(stored.sellerId), JSON.stringify(stored));
  return stored;
}

export async function clearPublicationRecovery(sellerId: string): Promise<void> {
  await AsyncStorage.removeItem(publicationRecoveryKey(sellerId));
}

export type SellerRecoveryEntry<T> =
  | { kind: 'none' }
  | { kind: 'integrity-error'; message: string; rawPreserved: true }
  | { kind: 'resumed'; result: T };

/**
 * Loads only the current seller's journal and refuses corrupt data without any
 * remote operation. The injected resume function owns reconciliation/cleanup.
 */
export async function orchestrateSellerRecovery<T>(
  sellerId: string,
  resume: (record: PublicationRecoveryRecordV1) => Promise<T>
): Promise<SellerRecoveryEntry<T>> {
  const loaded = await loadPublicationRecovery(sellerId);
  if (loaded.kind === 'none') return loaded;
  if (loaded.kind === 'start-guard') {
    return { kind: 'integrity-error', message: loaded.message, rawPreserved: true };
  }
  if (loaded.kind === 'invalid') {
    // Deliberately do not clear or rewrite the untrusted value. Without a
    // validated listing UUID and exact relative object paths, no remote action
    // is authorized and preserving the raw value is the safest evidence.
    return { kind: 'integrity-error', message: loaded.message, rawPreserved: true };
  }
  return { kind: 'resumed', result: await resume(loaded.record) };
}
