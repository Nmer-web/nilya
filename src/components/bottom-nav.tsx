import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrostedBar } from '@/components/frosted-bar';
import { Icon, type IconName } from '@/components/icon';
import { T, Tap } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { color as C } from '@/theme/tokens';

/** Routes that keep the nav visible, mirroring the design's `showNav`. */
export const NAV_ROUTES = [
  '/',
  '/explore',
  '/sell',
  '/inbox',
  '/profile',
  '/favorites',
  '/notifications',
  '/orders',
];

/** Nav content height above the safe-area inset: 9px top pad + icon + label. */
const NAV_CONTENT = 50;

/** Height the nav occupies, so screens can float action bars directly above it. */
export function useNavHeight() {
  const insets = useSafeAreaInsets();
  return NAV_CONTENT + Math.max(insets.bottom, 12);
}

/**
 * Bottom padding that clears the floating nav with a little air beneath the
 * last row. Already includes the safe-area inset — don't add it again.
 */
export function useNavClearance() {
  return useNavHeight() + 20;
}

const TABS: { href: string; icon: IconName; label: string }[] = [
  { href: '/', icon: 'home', label: 'Home' },
  { href: '/explore', icon: 'search', label: 'Explore' },
  { href: '/inbox', icon: 'chat', label: 'Inbox' },
  { href: '/profile', icon: 'person', label: 'Profile' },
];

export function BottomNav({ pathname }: { pathname: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { offerState } = useApp();

  /**
   * Nothing is "current" on Sell (its pill has no selected state) or on a
   * nav-bearing pushed screen — Favorites, Notifications and Orders all leave
   * every tab grey, matching the design.
   */
  const activeHref = TABS.some((t) => t.href === pathname) ? pathname : null;

  /**
   * Tab switch.
   *
   * `dismissTo` is the only primitive with the semantics tabs need: it pops
   * back to the destination when it is already in the stack, and otherwise
   * replaces the current route and drops anything above it. `navigate` would
   * append a duplicate on every press (it only pops when `payload.pop` is set,
   * which the imperative router never does), and `replace` would flatten the
   * back stack entirely.
   */
  const go = (href: string) => {
    if (href === pathname) return;
    router.dismissTo(href as never);
  };

  const item = ({ href, icon, label }: (typeof TABS)[number]) => {
    const active = activeHref === href;
    const tint = active ? C.text : C.textTertiary;
    return (
      <Tap
        key={href}
        onPress={() => go(href)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
        style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 }}
      >
        <View>
          <Icon name={icon} size={22} color={tint} strokeWidth={1.75} />
          {href === '/inbox' && (
            <View
              style={{
                position: 'absolute',
                top: -6,
                right: -12,
                minWidth: 16,
                height: 16,
                paddingHorizontal: 4,
                borderRadius: 8,
                backgroundColor: C.accent,
                borderWidth: 1.5,
                borderColor: C.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <T w={700} size={10} color={C.onDark}>
                {offerState === 'open' ? '3' : '2'}
              </T>
            </View>
          )}
        </View>
        <T w={500} size={10.5} color={tint}>
          {label}
        </T>
      </Tap>
    );
  };

  return (
    <FrostedBar
      edge="top"
      intensity={30}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: 9,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 6,
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}
    >
      {item(TABS[0])}
      {item(TABS[1])}

      {/* Sell is the primary action, so it reads as a filled pill rather than a tab. */}
      <Tap
        onPress={() => go('/sell')}
        accessibilityRole="button"
        accessibilityLabel="Sell an item"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}
      >
        <View
          style={{
            height: 32,
            paddingHorizontal: 15,
            borderRadius: 16,
            backgroundColor: C.accent,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            shadowColor: C.accent,
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
            elevation: 4,
          }}
        >
          <Icon name="plus" size={15} color={C.onDark} strokeWidth={2.6} />
          <T w={600} size={12.5} color={C.onDark}>
            Sell
          </T>
        </View>
      </Tap>

      {item(TABS[2])}
      {item(TABS[3])}
    </FrostedBar>
  );
}
