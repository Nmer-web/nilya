import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrostedBar } from '@/components/frosted-bar';
import { Icon } from '@/components/icon';
import { ListingThumb, THUMB } from '@/components/product-card';
import { FadeIn } from '@/components/skeleton';
import { Avatar, Chip, PressableScale, T, Tap } from '@/components/ui';
import { getProduct } from '@/data/catalog';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { euro, useApp } from '@/store/app-store';
import { avatarColor, color as C } from '@/theme/tokens';

/** The chat is always about the Nike listing, as in the design. */
const LISTING = 1;

export default function Chat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { msgs, typing, sendMessage, openSheet, flash } = useApp();
  const [draft, setDraft] = useState('');
  const scroller = useRef<ScrollView>(null);

  const p = getProduct(LISTING);
  const canSend = draft.trim().length > 0;

  const send = (text = draft) => {
    if (!text.trim()) return;
    sendMessage(text);
    setDraft('');
  };

  useEffect(() => {
    const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [msgs.length, typing]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── header ── */}
      <FrostedBar
        edge="bottom"
        style={{
          paddingTop: insets.top,
          paddingBottom: 10,
          paddingHorizontal: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Tap
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevronLeft" size={20} color={C.text} strokeWidth={2} />
        </Tap>
        <Avatar initials="YA" bg={avatarColor.yousif} size={34} fontSize={13} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={600} size={15}>
            Yousif Adam
          </T>
          <T size={11.5} color={C.textSecondary}>
            Usually replies in an hour
          </T>
        </View>
        {/*
          This was a dead control — an affordance with no handler. It now opens
          the report sheet, which is the one conversation-level action a
          marketplace actually needs at hand.
        */}
        <Tap
          onPress={() => openSheet({ kind: 'report', productId: LISTING })}
          accessibilityRole="button"
          accessibilityLabel="Report this conversation"
          hitSlop={8}
          style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="dotsVertical" size={19} color={C.text} />
        </Tap>
      </FrostedBar>

      {/* ── listing strip ── */}
      <Tap
        onPress={() => router.push({ pathname: '/listing/[id]', params: { id: LISTING } })}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
          paddingVertical: 10,
          paddingHorizontal: 16,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <ListingThumb width={THUMB.sm} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={500} size={13.5} numberOfLines={1}>
            {p.t}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 1 }}>
            <T w={700} size={15}>
              {euro(p.pr)}
            </T>
            <T size={12} color={C.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
              {p.cd}
            </T>
          </View>
        </View>
        {/* A chevron, not a text link: the whole strip is the target. */}
        <Icon name="chevronRight" size={17} color={C.textMuted} strokeWidth={1.9} />
      </Tap>

      {/* ── transcript ── */}
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
      >
        <T size={11.5} color={C.textMuted} style={{ textAlign: 'center', paddingBottom: 14 }}>
          Today
        </T>

        {/*
          Bubbles carry no border: fill alone separates them from the canvas,
          and §14 asks not to overuse borders. Each arrives with a short rise —
          keyed by index, so only the newly appended one animates.

          Runs from the same sender are grouped: they sit 2pt apart instead of
          8, and only the last bubble in a run gets the pointed corner. A tail
          on every bubble makes a three-line reply look like three separate
          messages arriving at once.
        */}
        {msgs.map((m, i) => {
          const startsRun = i === 0 || msgs[i - 1].me !== m.me;
          const endsRun = i === msgs.length - 1 || msgs[i + 1].me !== m.me;

          return (
            <FadeIn key={i} y={6} duration={200} style={{ marginTop: startsRun && i > 0 ? 8 : 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: m.me ? 'flex-end' : 'flex-start' }}>
                <View
                  style={{
                    maxWidth: '76%',
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    backgroundColor: m.me ? C.bubbleOut : C.bubbleIn,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    borderBottomLeftRadius: m.me || !endsRun ? 18 : 5,
                    borderBottomRightRadius: m.me && endsRun ? 5 : 18,
                  }}
                >
                  <T size={14.5} lh={20.3} color={m.me ? C.primaryText : C.text}>
                    {m.t}
                  </T>
                </View>
              </View>
            </FadeIn>
          );
        })}

        {typing && <TypingBubble />}
      </ScrollView>

      {/* ── quick replies ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 7, paddingHorizontal: 16, paddingBottom: 8 }}
      >
        <Chip label="Buy now" active height={32} round={16} onPress={() => router.push({ pathname: '/delivery', params: { id: LISTING } })} />
        <Chip
          label="Make offer"
          height={32}
          round={16}
          onPress={() => openSheet({ kind: 'offer', mode: 'buyer', productId: LISTING, amount: Math.round(p.pr * 0.85) })}
        />
        <Chip label="View listing" height={32} round={16} onPress={() => router.push({ pathname: '/listing/[id]', params: { id: LISTING } })} />
        <Chip label="Is the price firm?" height={32} round={16} onPress={() => send('Is the price firm?')} />
      </ScrollView>

      {/* ── composer ── */}
      <FrostedBar
        edge="top"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingTop: 9,
          paddingBottom: Math.max(insets.bottom, 10),
        }}
      >
        <PressableScale
          scale={0.94}
          onPress={() => flash('Photo attachments are coming soon')}
          accessibilityRole="button"
          accessibilityLabel="Attach a photo"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="plus" size={18} color={C.text} />
        </PressableScale>

        {/*
          Multiline, growing to four lines before it scrolls. A single-line
          field turns anything longer than a sentence into a horizontal crawl,
          and in a marketplace the longest messages are the ones that matter —
          measurements, condition questions, collection arrangements.
        */}
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => send()}
          placeholder="Message…"
          placeholderTextColor={C.textSecondary}
          returnKeyType="send"
          multiline
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 38,
            maxHeight: 108,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
            paddingHorizontal: 15,
            paddingTop: Platform.OS === 'ios' ? 10 : 8,
            paddingBottom: Platform.OS === 'ios' ? 10 : 8,
            fontSize: 14.5,
            lineHeight: 19,
            color: C.text,
          }}
        />

        <PressableScale
          scale={0.94}
          onPress={() => send()}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: canSend ? C.text : C.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="send" size={17} color={canSend ? C.primaryText : C.textMuted} />
        </PressableScale>
      </FrostedBar>
    </KeyboardAvoidingView>
  );
}

/** Three dots that pulse in sequence while the seller is replying. */
function TypingBubble() {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
      <View
        style={{
          flexDirection: 'row',
          gap: 4,
          paddingVertical: 12,
          paddingHorizontal: 15,
          backgroundColor: C.bubbleIn,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          borderBottomRightRadius: 18,
          borderBottomLeftRadius: 5,
        }}
      >
        {[0, 150, 300].map((delay) => (
          <TypingDot key={delay} delay={delay} />
        ))}
      </View>
    </View>
  );
}

function TypingDot({ delay }: { delay: number }) {
  const v = useAnimatedValue(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(v, { toValue: 0, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);

  return (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: C.textMuted,
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.14] }) }],
      }}
    />
  );
}
