import { useRouter } from 'expo-router';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { T, Tap } from '@/components/ui';
import { color as C } from '@/theme/tokens';

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
  titleSize = 17,
  style,
}: {
  title?: string;
  right?: React.ReactNode;
  dismiss?: boolean;
  border?: boolean;
  titleSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          paddingTop: insets.top,
          paddingBottom: 10,
          paddingHorizontal: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderBottomWidth: border ? 1 : 0,
          borderBottomColor: C.border,
        },
        style,
      ]}
    >
      <Tap
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={dismiss ? 'Close' : 'Back'}
        hitSlop={8}
        style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name={dismiss ? 'close' : 'chevronLeft'} size={20} color={C.text} strokeWidth={2} />
      </Tap>
      {!!title && (
        <T w={600} size={titleSize} numberOfLines={1} style={{ flex: 1 }}>
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
      <T w={600} size={28} tracking={-0.6}>
        {children}
      </T>
      {!!sub && (
        <T size={13.5} color={C.textSecondary} style={{ marginTop: 4 }}>
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
  color = C.text,
  fill = 'none',
  label,
}: {
  name: IconName;
  onPress?: () => void;
  color?: string;
  fill?: string;
  label: string;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(250,249,245,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      }}
    >
      <Icon name={name} size={19} color={color} fill={fill} strokeWidth={name === 'heart' ? 1.8 : 2} />
    </Tap>
  );
}
