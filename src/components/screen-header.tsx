import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale, T, Tap } from '@/components/ui';
import { useGoBack } from '@/hooks/use-go-back';
import { color as C, elevation, radius, space, touch } from '@/theme/tokens';

/**
 * Back-and-title bar used by every pushed screen.
 *
 * The design hard-codes a 56px top inset to clear the status bar; on device we
 * take the real safe-area inset instead so it lands correctly on every phone.
 */
export function ScreenHeader({
  title,
  right,
  /** Show a close cross rather than a back chevron, as on Verification. */
  dismiss,
  border = true,
  style,
}: {
  title?: string;
  right?: React.ReactNode;
  dismiss?: boolean;
  border?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const goBack = useGoBack();

  return (
    <View
      style={[
        {
          paddingTop: insets.top,
          paddingBottom: space.space8,
          paddingHorizontal: space.space12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.space4,
          borderBottomWidth: border ? 1 : 0,
          borderBottomColor: C.border,
        },
        style,
      ]}
    >
      <Tap
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel={dismiss ? 'Close' : 'Back'}
        style={{ width: touch.minimum, height: touch.minimum, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name={dismiss ? 'close' : 'chevronLeft'} role="action" color={C.textPrimary} />
      </Tap>
      {!!title && (
        <T variant="bodyMedium" style={{ flex: 1 }}>
          {title}
        </T>
      )}
      {!title && <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}

/** Large heading used at the top of the Explore, Sell and Inbox tabs. */
export function TabTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <View>
      <T variant="screenTitle" accessibilityRole="header">
        {children}
      </T>
      {!!sub && (
        <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4 }}>
          {sub}
        </T>
      )}
    </View>
  );
}

/** Circular icon button on a translucent disc, floating over product imagery. */
export function FloatingIconButton({
  name,
  onPress,
  color = C.textPrimary,
  fill = 'none',
  label,
  accessibilityState,
}: {
  name: IconName;
  onPress?: () => void;
  color?: string;
  fill?: string;
  label: string;
  accessibilityState?: {
    selected?: boolean;
    disabled?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={accessibilityState}
      style={{
        width: touch.minimum,
        height: touch.minimum,
        borderRadius: radius.radiusPill,
        backgroundColor: C.background,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...elevation.raised,
      }}
    >
      <Icon name={name} role="action" color={color} fill={fill} decorative />
    </PressableScale>
  );
}
