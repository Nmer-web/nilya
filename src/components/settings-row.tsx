import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Spinner, T, Tap } from '@/components/ui';
import { color as C } from '@/theme/tokens';

export function SettingsSection({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <View className="px-5 pt-6">
      <T variant="cardTitle" color={C.textSecondary} style={{ paddingBottom: 8, paddingLeft: 4 }}>
        {title}
      </T>
      <View className="overflow-hidden border-y border-nilya-border bg-nilya-surface">{children}</View>
      {footer ? <View className="px-1 pt-2">{footer}</View> : null}
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  right,
  last,
  busy,
  selected,
  disclosure = Boolean(onPress),
  accessibilityHint,
  accessibilityLabel,
  style,
}: {
  icon?: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  last?: boolean;
  busy?: boolean;
  selected?: boolean;
  disclosure?: boolean;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const rowClassName = last
    ? 'min-h-14 flex-row items-center gap-3 bg-nilya-surface px-4 py-3'
    : 'min-h-14 flex-row items-center gap-3 border-b border-nilya-border bg-nilya-surface px-4 py-3';

  const content = (
    <>
      {icon ? <Icon name={icon} role="inline" color={C.textPrimary} decorative /> : null}
      <T variant="bodyMedium" style={{ flex: 1, minWidth: 0 }}>
        {label}
      </T>
      {busy ? <Spinner color={C.textPrimary} /> : null}
      {!busy && value !== undefined ? (
        <T
          variant="metadata"
          color={C.textSecondary}
          selectable={!onPress}
          numberOfLines={2}
          style={{ maxWidth: '56%', flexShrink: 1, textAlign: 'right' }}
        >
          {value}
        </T>
      ) : null}
      {!busy ? right : null}
      {onPress && disclosure ? (
        <Icon name="chevronRight" role="metadata" color={C.textSecondary} decorative />
      ) : null}
    </>
  );

  const spokenLabel = accessibilityLabel ?? (value ? `${label}, ${value}` : label);

  if (onPress) {
    return (
      <Tap
        onPress={onPress}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={spokenLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ busy: Boolean(busy), disabled: Boolean(busy), selected }}
        className={rowClassName}
        style={style}
      >
        {content}
      </Tap>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={spokenLabel}
      className={rowClassName}
      style={style}
    >
      {content}
    </View>
  );
}
