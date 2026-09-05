import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Button, PressableScale, Spinner, T, Tap } from '@/components/ui';
import { useDraft } from '@/features/sell/DraftContext';
import { SELL_STEP_COUNT, type SellStep, type StepErrors } from '@/features/sell/validation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { haptic } from '@/lib/haptics';
import { color as C, duration, elevation, radius, scale, space, touch, type } from '@/theme/tokens';

export const EDGE = space.space20;

/** Each step's route, so screens and the review's edit links agree. */
export const STEP_ROUTES = {
  1: '/sell/photos',
  2: '/sell/details',
  3: '/sell/category',
  4: '/sell/attributes',
  5: '/sell/pricing',
  6: '/sell/location',
  7: '/sell/review',
} as const;

/**
 * The shared wizard chrome: close and step counter over an animated progress
 * bar, a scrolling body that gives way to the keyboard, and a footer with Back
 * and Continue pinned above the safe area.
 *
 * Continue never goes dead. When the step has errors it dims, and pressing it
 * reveals the inline messages instead of advancing — a control that looked
 * disabled but explained nothing would leave the seller guessing what to fix.
 */
export function SellStepScreen({
  step,
  title,
  subtitle,
  children,
  errors,
  onAttempt,
  onContinue,
  continueLabel = 'Continue',
  busy = false,
  busyLabel,
  footerNote,
}: {
  step: SellStep;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  errors: StepErrors;
  /** Called when Continue is pressed while errors remain; the screen then shows them. */
  onAttempt: () => void;
  onContinue: () => void;
  continueLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  footerNote?: React.ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useReducedMotion();
  const { save, discard } = useDraft();
  const [closing, setClosing] = useState(false);
  const progress = useSharedValue(step / SELL_STEP_COUNT);
  const valid = Object.keys(errors).length === 0;

  useEffect(() => {
    progress.set(
      reduceMotion ? step / SELL_STEP_COUNT : withTiming(step / SELL_STEP_COUNT, { duration: 250 })
    );
  }, [progress, reduceMotion, step]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const leave = () => router.dismissTo('/');

  const press = () => {
    if (busy) return;
    if (!valid) {
      haptic('selection-committed');
      onAttempt();
      return;
    }
    onContinue();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top + space.space8, paddingHorizontal: EDGE }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: touch.minimum }}>
          <IconButton icon="close" label="Close the sell flow" onPress={() => setClosing(true)} />
          <Text
            accessibilityLiveRegion="polite"
            style={{ ...type.metadataMedium, color: C.textSecondary, fontVariant: ['tabular-nums'] }}
          >
            Step {step} of {SELL_STEP_COUNT}
          </Text>
        </View>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step} of ${SELL_STEP_COUNT}`}
          accessibilityValue={{ min: 0, max: SELL_STEP_COUNT, now: step }}
          style={{ height: 4, marginTop: space.space12, borderRadius: radius.radiusPill, backgroundColor: C.bgMuted, overflow: 'hidden' }}
        >
          <Animated.View style={[{ height: 4, borderRadius: radius.radiusPill, backgroundColor: C.primary }, barStyle]} />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: EDGE,
          paddingTop: space.space24,
          paddingBottom: touch.large + Math.max(insets.bottom, space.space12) + space.space48,
        }}
      >
        <Text accessibilityRole="header" style={{ ...type.display, fontSize: 26, lineHeight: 32, color: C.textPrimary }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ ...type.body, color: C.textSecondary, marginTop: space.space8 }}>{subtitle}</Text>
        ) : null}
        <View style={{ marginTop: space.space24 }}>{children}</View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderTopWidth: 1,
          borderTopColor: C.border,
          backgroundColor: C.background,
          paddingHorizontal: EDGE,
          paddingTop: space.space12,
          paddingBottom: Math.max(insets.bottom, space.space12),
          gap: space.space8,
        }}
      >
        {footerNote}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space12 }}>
          <Tap
            onPress={() => (step === 1 ? setClosing(true) : router.back())}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={step === 1 ? 'Close the sell flow' : 'Back to the previous step'}
            style={{ minHeight: touch.large, minWidth: touch.large, justifyContent: 'center', paddingHorizontal: space.space8 }}
          >
            <T variant="button" color={busy ? C.inkFaint : C.textPrimary}>
              Back
            </T>
          </Tap>
          <PressableScale
            onPress={press}
            scale={scale.buttonPressed}
            accessibilityRole="button"
            accessibilityLabel={busy ? (busyLabel ?? continueLabel) : continueLabel}
            accessibilityHint={valid ? undefined : 'Shows what still needs filling in'}
            accessibilityState={{ busy, disabled: busy }}
            style={{
              flex: 1,
              minHeight: touch.large,
              borderRadius: radius.radiusLarge,
              borderCurve: 'continuous',
              backgroundColor: C.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.space8,
              opacity: valid || busy ? 1 : 0.4,
            }}
          >
            {busy ? <Spinner color={C.textInverse} /> : null}
            <T variant="button" color={C.textInverse}>
              {busy ? (busyLabel ?? 'Working…') : continueLabel}
            </T>
          </PressableScale>
        </View>
      </View>

      <ConfirmSheet
        visible={closing}
        title="Leave the sell flow?"
        body="Your photos stay on this device only for this session. Everything else can be saved as a draft."
        actions={[
          {
            label: 'Save draft',
            onPress: () => {
              setClosing(false);
              void save().then(leave);
            },
          },
          {
            label: 'Discard',
            destructive: true,
            onPress: () => {
              setClosing(false);
              void discard().then(leave);
            },
          },
          { label: 'Cancel', onPress: () => setClosing(false) },
        ]}
        onDismiss={() => setClosing(false)}
      />
    </KeyboardAvoidingView>
  );
}

/**
 * A three-way choice, drawn as a bottom card rather than `Alert.alert`, which
 * the web build does not implement and which cannot carry three buttons on
 * every platform.
 */
export function ConfirmSheet({
  visible,
  title,
  body,
  actions,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  body?: string;
  actions: { label: string; onPress: () => void; destructive?: boolean }[];
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: C.overlay }}>
        <Tap accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} style={{ flex: 1 }} />
        <View
          style={{
            backgroundColor: C.surface,
            borderTopLeftRadius: radius.radiusSheet,
            borderTopRightRadius: radius.radiusSheet,
            borderCurve: 'continuous',
            padding: EDGE,
            paddingBottom: Math.max(insets.bottom, space.space16),
            gap: space.space8,
            ...elevation.sheet,
          }}
        >
          <Text accessibilityRole="header" style={{ ...type.sectionTitle, color: C.textPrimary }}>
            {title}
          </Text>
          {body ? (
            <Text style={{ ...type.metadata, color: C.textSecondary, marginBottom: space.space8 }}>{body}</Text>
          ) : null}
          {actions.map((action, index) => {
            const primary = index === 0;
            return (
              <Button
                key={action.label}
                label={action.label}
                variant={primary ? 'primary' : action.destructive ? 'destructive' : 'ghost'}
                onPress={action.onPress}
              />
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

/** The inline error under a field, shown only after a failed Continue. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" style={{ ...type.metadata, color: C.errorText, marginTop: space.space8 }}>
      {message}
    </Text>
  );
}

export function FieldLabel({ label, trailing }: { label: string; trailing?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.space12, marginBottom: space.space8 }}>
      <Text style={{ ...type.metadataMedium, fontSize: 14, color: C.textPrimary }}>{label}</Text>
      {trailing}
    </View>
  );
}

/** A labeled input on the warm grey fill, 52px tall, with a live counter. */
export function SellTextField({
  label,
  value,
  onChangeText,
  maxLength,
  multiline = false,
  error,
  hint,
  style,
  ...rest
}: Omit<TextInputProps, 'style'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
  error?: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      <FieldLabel
        label={label}
        trailing={
          maxLength ? (
            <Text style={{ ...type.caption, color: C.inkFaint, fontVariant: ['tabular-nums'] }}>
              {value.length}/{maxLength}
            </Text>
          ) : null
        }
      />
      <View
        style={{
          minHeight: multiline ? 132 : 52,
          borderRadius: radius.radiusMedium,
          borderCurve: 'continuous',
          backgroundColor: C.bgMuted,
          borderWidth: 1.5,
          borderColor: error ? C.error : focused ? C.primary : 'transparent',
          paddingHorizontal: space.space16,
          paddingVertical: multiline ? space.space12 : 0,
          justifyContent: multiline ? 'flex-start' : 'center',
        }}
      >
        <TextInput
          {...rest}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? 5 : 1}
          placeholderTextColor={C.inkFaint}
          selectionColor={C.primary}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          style={{
            ...type.body,
            color: C.textPrimary,
            padding: 0,
            minHeight: multiline ? 108 : 24,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
      </View>
      {error ? <FieldError message={error} /> : hint ? (
        <Text style={{ ...type.caption, color: C.textSecondary, marginTop: space.space8 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** A 48px selectable pill: `border` outline at rest, primary fill when selected. */
export function SelectPill({
  label,
  selected = false,
  dashed = false,
  onPress,
  accessibilityLabel,
  icon,
}: {
  label: string;
  selected?: boolean;
  dashed?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  icon?: 'plus';
}) {
  return (
    <PressableScale
      onPress={onPress}
      scale={scale.buttonPressed}
      motionRole="selection"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      style={{
        minHeight: touch.standard,
        paddingHorizontal: space.space16,
        borderRadius: radius.radiusMedium,
        borderCurve: 'continuous',
        borderWidth: 1.5,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: selected ? C.primary : C.border,
        backgroundColor: selected ? C.primary : C.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.space4,
      }}
    >
      {icon ? <Icon name={icon} role="metadata" color={selected ? C.textInverse : C.textPrimary} decorative /> : null}
      <Text style={{ ...type.metadataMedium, fontSize: 14, color: selected ? C.textInverse : C.textPrimary }}>{label}</Text>
    </PressableScale>
  );
}

/** A small sheet with one text field, for a custom size or colour. */
export function TextEntrySheet({
  visible,
  title,
  placeholder,
  initialValue = '',
  maxLength = 40,
  onSubmit,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  initialValue?: string;
  maxLength?: number;
  onSubmit: (value: string) => void;
  onDismiss: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: C.overlay }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Tap accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} style={{ flex: 1 }} />
        {/* Mounted fresh each time the sheet opens, so the field starts from
            the current value without an effect resetting state. */}
        {visible ? (
          <TextEntryForm
            title={title}
            placeholder={placeholder}
            initialValue={initialValue}
            maxLength={maxLength}
            onSubmit={onSubmit}
            onDismiss={onDismiss}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TextEntryForm({
  title,
  placeholder,
  initialValue,
  maxLength,
  onSubmit,
  onDismiss,
}: {
  title: string;
  placeholder: string;
  initialValue: string;
  maxLength: number;
  onSubmit: (value: string) => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);
  const trimmed = value.trim();
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderTopLeftRadius: radius.radiusSheet,
        borderTopRightRadius: radius.radiusSheet,
        borderCurve: 'continuous',
        padding: EDGE,
        paddingBottom: Math.max(insets.bottom, space.space16),
        gap: space.space16,
        ...elevation.sheet,
      }}
    >
      <Text accessibilityRole="header" style={{ ...type.sectionTitle, color: C.textPrimary }}>
        {title}
      </Text>
      <SellTextField
        label="Your own value"
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => trimmed && onSubmit(trimmed)}
      />
      <Button label="Use this" disabled={!trimmed} onPress={() => onSubmit(trimmed)} />
      <Button label="Cancel" variant="ghost" onPress={onDismiss} />
    </View>
  );
}

/** Fades a step's content in, as the previous Sell screen did. */
export function StepFade({ children }: { children: React.ReactNode }) {
  const { reduceMotion } = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    opacity.set(reduceMotion ? 1 : withTiming(1, { duration: duration.standard }));
  }, [opacity, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
