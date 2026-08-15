import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { ScrollView, View, type StyleProp, type TextStyle } from 'react-native';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon, type IconName } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { T, Tap } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { color as C } from '@/theme/tokens';

type Notification = {
  id: string;
  icon: IconName;
  iconColor: string;
  discBg: string;
  title: string;
  body: string;
  when: string;
  /** Unread items carry a terracotta dot until "Mark all read" is pressed. */
  unread?: boolean;
  /** Null where the prototype row has no real entity to open. */
  href: Href | null;
  fill?: boolean;
};

const TODAY: Notification[] = [
  {
    id: 'n1',
    icon: 'chat',
    iconColor: C.text,
    discBg: C.surfaceSecondary,
    title: 'Yousif sent you a message',
    body: '“Yes, no problem. I can post it tomorrow.”',
    when: '12 min',
    unread: true,
    /*
     * Was `/chat`, a route that no longer exists — real threads are addressed
     * by conversation id, and this prototype notification has none to give.
     * Left without a destination until notifications are real rows.
     */
    href: null,
  },
  {
    id: 'n2',
    icon: 'offerNote',
    iconColor: C.accent,
    discBg: C.accentBg,
    title: "Leila offered €22 for your Levi's 501",
    body: 'Respond within 22 hours',
    when: '1 h',
    unread: true,
    href: { pathname: '/inbox', params: { tab: 'offers' } },
  },
  {
    id: 'n3',
    icon: 'heart',
    // Black, to match the favourite heart everywhere else in the app.
    iconColor: C.text,
    discBg: C.surfaceSecondary,
    title: 'Price dropped on Nike Air Max 270',
    body: '€52 → €45 · in your favorites',
    when: '3 h',
    href: '/favorites',
    fill: true,
  },
];

const EARLIER: Notification[] = [
  {
    id: 'n4',
    icon: 'truck',
    iconColor: C.text,
    discBg: C.surfaceSecondary,
    title: 'Order #SS28491 has shipped',
    body: 'Arriving Thu 14 — Fri 15 Aug',
    when: 'Yest.',
    href: { pathname: '/order/[id]', params: { id: 'SS28491' } },
  },
  {
    id: 'n5',
    icon: 'check',
    iconColor: C.success,
    discBg: C.successBg,
    title: 'Leila left you a 5-star review',
    body: '“Fast shipping, item exactly as described.”',
    when: 'Mon',
    href: '/profile',
  },
];

export default function Notifications() {
  const router = useRouter();
  const navClearance = useNavClearance();
  const { notifRead, markNotifsRead } = useApp();

  const row = (n: Notification, first: boolean) => (
    <Tap
      key={n.id}
      onPress={n.href ? () => router.push(n.href!) : undefined}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: 16,
        backgroundColor: C.surface,
        borderTopWidth: first ? 1 : 0,
        borderBottomWidth: 1,
        borderColor: C.border,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: n.discBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          name={n.icon}
          size={18}
          color={n.iconColor}
          fill={n.fill ? n.iconColor : 'none'}
          strokeWidth={n.icon === 'check' ? 1.9 : 1.8}
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <T w={500} size={14} lh={18.9}>
          {n.title}
        </T>
        <T size={12.5} color={C.textSecondary} style={{ marginTop: 2 }}>
          {n.body}
        </T>
      </View>

      <T size={11.5} color={C.textMuted}>
        {n.when}
      </T>
      {n.unread && !notifRead && (
        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.accent }} />
      )}
    </Tap>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader
        title="Notifications"
        right={
          <Tap onPress={markNotifsRead} accessibilityRole="button" hitSlop={8} style={{ paddingRight: 8 }}>
            <T w={600} size={12.5} color={C.text}>
              Mark all read
            </T>
          </Tap>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: navClearance }}
      >
        <GroupLabel style={{ paddingTop: 16 }}>Today</GroupLabel>
        {TODAY.map((n, i) => row(n, i === 0))}

        <GroupLabel style={{ paddingTop: 20 }}>Earlier</GroupLabel>
        {EARLIER.map((n, i) => row(n, i === 0))}
      </ScrollView>
    </View>
  );
}

function GroupLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <T
      w={600}
      size={12}
      color={C.textMuted}
      tracking={0.48}
      style={[{ paddingHorizontal: 16, paddingBottom: 8, textTransform: 'uppercase' }, style]}
    >
      {children}
    </T>
  );
}
