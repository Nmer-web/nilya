import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { ImageSlot } from '@/components/image-slot';
import { TabTitle } from '@/components/screen-header';
import { Avatar, Button, Card, EmptyState, Segmented, T, Tap } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { avatarColor, color as C } from '@/theme/tokens';

type Tab = 'Messages' | 'Offers';

const THREADS = [
  {
    id: 't1',
    name: 'Yousif Adam',
    initials: 'YA',
    av: avatarColor.yousif,
    when: '14:08',
    preview: 'Yes, no problem. I can post it tomorrow.',
    item: 'Nike Air Max 270 · €45',
    thumb: 'Nike Air Max 270',
    unread: true,
  },
  {
    id: 't2',
    name: 'Amal Mohamed',
    initials: 'AM',
    av: avatarColor.amal,
    when: 'Yesterday',
    preview: 'The jebena set can be collected in Al Riyadh.',
    item: 'Jebena Coffee Set · €40',
    thumb: 'Jebena Coffee Set',
    unread: false,
  },
  {
    id: 't3',
    name: 'Leila M.',
    initials: 'LM',
    av: avatarColor.nour,
    when: 'Mon',
    preview: 'Thank you! Received the coat today 🤍',
    item: 'Zara Wool Blend Coat · €28',
    thumb: 'Zara Wool Blend Coat',
    unread: false,
  },
];

export default function Inbox() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { offerState, setOfferState, openSheet, flash } = useApp();

  /** Notifications deep-link straight to the Offers tab. */
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(initialTab === 'offers' ? 'Offers' : 'Messages');

  const offerOpen = offerState === 'open' || offerState === 'countered';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ paddingTop: 2, paddingBottom: 14 }}>
          <TabTitle>Inbox</TabTitle>
        </View>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'Messages', label: 'Messages' },
            {
              key: 'Offers',
              label: 'Offers',
              badge:
                offerState === 'open' ? (
                  <View
                    style={{
                      minWidth: 18,
                      height: 18,
                      paddingHorizontal: 5,
                      borderRadius: 9,
                      backgroundColor: C.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <T w={700} size={11} color={C.onDark}>
                      1
                    </T>
                  </View>
                ) : undefined,
            },
          ]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: navClearance }}
      >
        {tab === 'Messages' &&
          THREADS.map((t, i) => (
            <Tap
              key={t.id}
              onPress={() => router.push('/chat')}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: C.surface,
                borderTopWidth: i === 0 ? 1 : 0,
                borderBottomWidth: 1,
                borderColor: C.border,
              }}
            >
              <Avatar initials={t.initials} bg={t.av} size={44} fontSize={15} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <T w={600} size={14.5} numberOfLines={1} style={{ flex: 1 }}>
                    {t.name}
                  </T>
                  <T size={11.5} color={C.textTertiary}>
                    {t.when}
                  </T>
                </View>
                <T
                  w={t.unread ? 500 : 400}
                  size={13}
                  color={t.unread ? C.text : C.textSecondary}
                  numberOfLines={1}
                  style={{ marginTop: 2 }}
                >
                  {t.preview}
                </T>
                <T size={12} color={C.textTertiary} style={{ marginTop: 2 }}>
                  {t.item}
                </T>
              </View>
              <View style={{ width: 36, height: 44, borderRadius: 7, overflow: 'hidden', backgroundColor: C.well }}>
                <ImageSlot label={t.thumb} tiny />
              </View>
              {t.unread && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent }} />}
            </Tap>
          ))}

        {tab === 'Offers' &&
          (offerOpen ? (
            <View style={{ paddingHorizontal: 16 }}>
              <Card padded>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View
                    style={{ width: 52, height: 64, borderRadius: 9, overflow: 'hidden', backgroundColor: C.well }}
                  >
                    <ImageSlot label="Levi's 501 Straight" tiny />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T w={600} size={14.5} lh={18.9}>
                      {offerState === 'countered' ? 'You countered at €27' : 'Leila M. offered €22'}
                    </T>
                    <T size={13} color={C.textSecondary} style={{ marginTop: 2 }}>
                      for Levi&apos;s 501 Straight · listed €32
                    </T>
                    <T size={12} color={C.textTertiary} style={{ marginTop: 5 }}>
                      {offerState === 'countered' ? 'Waiting on Leila · 24 h left' : 'Expires in 22 h'}
                    </T>
                  </View>
                </View>

                {offerState === 'open' && (
                  <View style={{ flexDirection: 'row', gap: 7, marginTop: 14 }}>
                    <Button
                      label="Accept"
                      height={42}
                      size={13.5}
                      style={{ flex: 1, borderRadius: 11 }}
                      onPress={() => {
                        setOfferState('accepted');
                        flash('Offer accepted — Leila can now pay €22');
                      }}
                    />
                    <Button
                      label="Counter"
                      variant="strong"
                      height={42}
                      size={13.5}
                      style={{ flex: 1, borderRadius: 11, borderWidth: 1 }}
                      onPress={() => openSheet({ kind: 'offer', mode: 'counter', productId: 5, amount: 27 })}
                    />
                    <Tap
                      onPress={() => {
                        setOfferState('declined');
                        flash('Offer declined');
                      }}
                      accessibilityRole="button"
                      style={{
                        width: 78,
                        height: 42,
                        borderRadius: 11,
                        borderWidth: 1,
                        borderColor: C.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <T w={500} size={13.5} color={C.textSecondary}>
                        Decline
                      </T>
                    </Tap>
                  </View>
                )}
              </Card>
            </View>
          ) : (
            <EmptyState
              icon="offerTicket"
              title="No open offers"
              body="When a buyer offers on one of your listings, it lands here."
              style={{ paddingVertical: 60 }}
            />
          ))}
      </ScrollView>
    </View>
  );
}
