import React from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SettingsSection } from '@/components/settings-row';
import { Skeleton } from '@/components/skeleton';
import { Button, InlineError, ScreenError, T, Toggle } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import {
  BUNDLE_DISCOUNT_TIER_COUNT,
  MAX_BUNDLE_ITEMS,
  MAX_BUNDLE_DISCOUNT_PERCENT,
  bundleDiscountDraftsEqual,
  bundleDiscountSettingsToDraft,
  validateBundleDiscountDraft,
  type BundleDiscountDraft,
} from '@/lib/bundle-discounts';
import { retryableReadMessage } from '@/lib/errors';
import { saveBundleDiscountSettings } from '@/lib/mutations';
import { fetchOwnBundleDiscountSettings } from '@/lib/queries';
import { useApp } from '@/store/app-store';
import { useAuth } from '@/store/auth-store';
import {
  color as C,
  opacity,
  radius,
  space,
  touch,
  type as typography,
} from '@/theme/tokens';

export default function BundleDiscountsRoute() {
  const { user } = useAuth();
  if (!user) return null;
  return <BundleDiscountsScreen key={user.id} userId={user.id} />;
}

function BundleDiscountsScreen({ userId }: { userId: string }) {
  const settings = useAsync(
    fetchOwnBundleDiscountSettings,
    `bundle-discounts:${userId}`
  );

  if (settings.loading) {
    return (
      <View className="flex-1 bg-nilya-background">
        <ScreenHeader title="Bundle discounts" />
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Loading bundle discount settings"
          className="gap-5 px-5 pt-6"
        >
          <Skeleton width="88%" height={16} />
          <Skeleton width="68%" height={16} />
          <Skeleton width="100%" height={76} round={radius.radiusMedium} />
          {Array.from({ length: BUNDLE_DISCOUNT_TIER_COUNT }, (_, index) => (
            <Skeleton
              key={index}
              width="100%"
              height={88}
              round={radius.radiusMedium}
            />
          ))}
        </View>
      </View>
    );
  }

  if (settings.error) {
    return (
      <View className="flex-1 bg-nilya-background">
        <ScreenHeader title="Bundle discounts" />
        <ScreenError
          error={settings.error}
          title="Could not load bundle discounts"
          fallback="Check your connection and try again."
          onRetry={settings.refetch}
        />
      </View>
    );
  }

  const initial = bundleDiscountSettingsToDraft(settings.data);
  const version = settings.data?.updated_at ?? `${userId}:not-configured`;
  return <BundleDiscountEditor key={version} initial={initial} />;
}

function BundleDiscountEditor({ initial }: { initial: BundleDiscountDraft }) {
  const insets = useSafeAreaInsets();
  const { flash } = useApp();
  const [persisted, setPersisted] = React.useState(initial);
  const [draft, setDraft] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [writeError, setWriteError] = React.useState<string | null>(null);
  const [retryDraft, setRetryDraft] = React.useState<BundleDiscountDraft | null>(null);
  const validation = validateBundleDiscountDraft(draft);
  const dirty = !bundleDiscountDraftsEqual(draft, persisted);

  const changeDraft = (next: BundleDiscountDraft) => {
    setDraft(next);
    setWriteError(null);
    setRetryDraft(null);
  };

  const changeTier = (
    index: number,
    field: 'minItems' | 'discountPercent',
    value: string
  ) => {
    const tiers = draft.tiers.map((tier, tierIndex) =>
      tierIndex === index ? { ...tier, [field]: value } : tier
    );
    changeDraft({ ...draft, tiers });
  };

  const persistDraft = async (attempt: BundleDiscountDraft) => {
    if (saving) return;
    const attemptValidation = validateBundleDiscountDraft(attempt);
    if (!attemptValidation.values) return;

    const rollback = persisted;
    setSaving(true);
    setWriteError(null);
    try {
      const confirmed = await saveBundleDiscountSettings(attemptValidation.values);
      const confirmedDraft = bundleDiscountSettingsToDraft(confirmed);
      setPersisted(confirmedDraft);
      setDraft(confirmedDraft);
      setRetryDraft(null);
      const confirmation = confirmed.is_enabled
        ? 'Bundle discounts are on'
        : 'Bundle discounts are off';
      flash(confirmation);
      AccessibilityInfo.announceForAccessibility(confirmation);
    } catch (error) {
      setDraft(rollback);
      setRetryDraft(attempt);
      setWriteError(
        retryableReadMessage(error, 'Bundle discounts could not be saved.')
      );
      AccessibilityInfo.announceForAccessibility(
        'Bundle discounts were not changed. Try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const status = dirty
    ? draft.isEnabled
      ? 'On — not saved yet.'
      : 'Off — not saved yet.'
    : draft.isEnabled
      ? 'On'
      : 'Off';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-nilya-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Bundle discounts" />
      <ScrollView
        className="flex-1 bg-nilya-background"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.space40 }}
      >
        <View className="px-5 pb-1 pt-6">
          <T variant="sectionTitle" accessibilityRole="header">
            Bundle discounts
          </T>
          <T variant="body" color={C.textSecondary} className="mt-2" selectable>
            Offer buyers a discount when they purchase multiple products from you.
          </T>
        </View>

        <SettingsSection
          title="Status"
          footer={
            validation.formError ? <InlineError message={validation.formError} /> : undefined
          }
        >
          <View className="min-h-20 flex-row items-center gap-4 px-4 py-4">
            <View className="min-w-0 flex-1">
              <T variant="bodyMedium">Bundle discounts</T>
              <T
                variant="metadata"
                color={C.textSecondary}
                className="mt-1"
                accessibilityLiveRegion="polite"
              >
                {saving ? 'Saving…' : status}
              </T>
            </View>
            <Toggle
              on={draft.isEnabled}
              onPress={saving
                ? undefined
                : () => changeDraft({ ...draft, isEnabled: !draft.isEnabled })}
              accessibilityLabel="Bundle discounts"
              accessibilityHint="Changes are applied after you save"
            />
          </View>
        </SettingsSection>

        <SettingsSection
          title="Discount tiers"
          footer={
            <T variant="caption" color={C.textSecondary} selectable>
              Use whole numbers. Nilya bundles contain up to {MAX_BUNDLE_ITEMS} items. Each later item count must be higher, and discounts can be up to {MAX_BUNDLE_DISCOUNT_PERCENT}%.
            </T>
          }
        >
          {draft.tiers.map((tier, index) => (
            <BundleTierRow
              key={index}
              index={index}
              minItems={tier.minItems}
              discountPercent={tier.discountPercent}
              minItemsError={validation.errors[index]?.minItems}
              discountError={validation.errors[index]?.discountPercent}
              editable={!saving}
              last={index === draft.tiers.length - 1}
              onMinItemsChange={(value) => changeTier(index, 'minItems', value)}
              onDiscountChange={(value) => changeTier(index, 'discountPercent', value)}
            />
          ))}
        </SettingsSection>

        <View className="gap-4 px-5 pt-6">
          {writeError ? (
            <InlineError
              message={writeError}
              actionLabel={retryDraft ? 'Retry' : undefined}
              onAction={retryDraft ? () => void persistDraft(retryDraft) : undefined}
            />
          ) : null}
          <Button
            label="Save"
            loading={saving}
            loadingLabel="Saving…"
            disabled={!dirty || validation.values === null || saving}
            onPress={() => void persistDraft(draft)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BundleTierRow({
  index,
  minItems,
  discountPercent,
  minItemsError,
  discountError,
  editable,
  last,
  onMinItemsChange,
  onDiscountChange,
}: {
  index: number;
  minItems: string;
  discountPercent: string;
  minItemsError?: string;
  discountError?: string;
  editable: boolean;
  last: boolean;
  onMinItemsChange: (value: string) => void;
  onDiscountChange: (value: string) => void;
}) {
  const tierNumber = index + 1;
  return (
    <View className={`gap-3 px-4 py-4 ${last ? '' : 'border-b border-nilya-border'}`}>
      <T variant="bodyMedium">Tier {tierNumber}</T>
      <View className="flex-row items-start gap-3">
        <TierNumberInput
          label="Minimum items"
          accessibilityLabel={`Tier ${tierNumber} minimum items`}
          value={minItems}
          suffix="items"
          error={minItemsError}
          editable={editable}
          onChangeText={onMinItemsChange}
        />
        <TierNumberInput
          label="Discount"
          accessibilityLabel={`Tier ${tierNumber} discount percent`}
          value={discountPercent}
          suffix="%"
          error={discountError}
          editable={editable}
          onChangeText={onDiscountChange}
        />
      </View>
    </View>
  );
}

function TierNumberInput({
  label,
  accessibilityLabel,
  value,
  suffix,
  error,
  editable,
  onChangeText,
}: {
  label: string;
  accessibilityLabel: string;
  value: string;
  suffix: string;
  error?: string;
  editable: boolean;
  onChangeText: (value: string) => void;
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View className="min-w-0 flex-1">
      <T variant="caption" color={C.textSecondary} className="mb-2">
        {label}
      </T>
      <View
        className="flex-row items-center gap-2 px-3"
        style={{
          minHeight: touch.standard,
          borderRadius: radius.radiusMedium,
          borderCurve: 'continuous',
          borderWidth: focused || error ? 2 : 1,
          borderColor: error ? C.error : focused ? C.primary : C.border,
          backgroundColor: C.surface,
          opacity: editable ? 1 : opacity.disabled,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={error}
          accessibilityState={{ disabled: !editable }}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={5}
          selectTextOnFocus
          selectionColor={C.primary}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: touch.minimum,
            padding: 0,
            color: C.textPrimary,
            fontVariant: ['tabular-nums'],
            ...typography.bodyMedium,
          }}
        />
        <T variant="metadata" color={C.textSecondary}>
          {suffix}
        </T>
      </View>
      {error ? (
        <T
          variant="caption"
          color={C.errorText}
          accessibilityLiveRegion="polite"
          className="mt-1"
        >
          {error}
        </T>
      ) : null}
    </View>
  );
}
