import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/ui';
import { color as C, scale, space, touch, type } from '@/theme/tokens';

/** Routes that keep the nav visible. */
export const NAV_ROUTES = [
  '/',
  '/explore',
  '/inbox',
  '/profile',
  '/favorites',
  '/notifications',
  '/orders',
];

/** Fixed tab-bar height, excluding the device safe-area inset. */
const NAV_HEIGHT = 68;

/** Height the nav occupies above the screen's bottom edge, inset included. */
export function useNavHeight() {
  const insets = useSafeAreaInsets();
  return NAV_HEIGHT + insets.bottom;
}

/**
 * Bottom padding that clears the nav with a little air beneath the last row.
 * Already includes the safe-area inset; do not add it again.
 */
export function useNavClearance() {
  return useNavHeight() + space.space16;
}

/**
 * The five marketplace destinations stay visible and labelled so category
 * drilling still feels anchored inside Browse.
 */
const TABS: { href: string; icon: IconName; label: string }[] = [
  { href: '/', icon: 'home', label: 'Home' },
  { href: '/explore', icon: 'grid', label: 'Browse' },
  { href: '/sell', icon: 'plusCircle', label: 'Sell' },
  { href: '/inbox', icon: 'inbox', label: 'Inbox' },
  { href: '/profile', icon: 'person', label: 'Profile' },
];

export function BottomNav({ pathname }: { pathname: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /** Pushed utility screens leave every tab grey; the Sell wizard's steps all light Sell. */
  const activeHref = TABS.some((t) => t.href === pathname)
    ? pathname
    : pathname.startsWith('/category/')
      ? '/explore'
    : pathname.startsWith('/sell/')
      ? '/sell'
      : null;

  /**
   * `dismissTo` pops back to the destination when it is already in the stack,
   * and otherwise replaces the current route and drops anything above it.
   */
  const go = (href: string) => {
    if (href === pathname) return;
    router.dismissTo(href as never);
  };

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: NAV_HEIGHT + insets.bottom,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: C.surface,
        paddingBottom: insets.bottom,
        paddingHorizontal: space.space4,
        borderTopWidth: 1,
        borderTopColor: C.border,
      }}
    >
      {TABS.map(({ href, icon, label }) => {
        const active = activeHref === href;
        return (
          <PressableScale
            key={href}
            scale={scale.buttonPressed}
            motionRole="selection"
            onPress={() => go(href)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={{
              flex: 1,
              height: NAV_HEIGHT,
              minWidth: touch.minimum,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={icon}
              size={27}
              strokeWidth={1.8}
              color={active ? C.primary : C.textSecondary}
              fill={active && icon === 'grid' ? C.primary : 'none'}
              decorative
            />
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={{
                ...type.metadataMedium,
                marginTop: 2,
                color: active ? C.primary : C.textSecondary,
              }}
            >
              {label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
