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
import { ImageSlot } from '@/components/image-slot';
import { FadeIn } from '@/components/skeleton';
import { Avatar, Chip, T, Tap } from '@/components/ui';
import { getProduct } from '@/data/catalog';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { euro, useApp } from '@/store/app-store';
import { avatarColor, color as C, radius } from '@/theme/tokens';

/** The chat is always about the Nike listing, as in the design. */
const LISTING = 1;

export default function Chat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { msgs, typing, sendMessage, openSheet } = useApp();
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
      style={{ flex: 1, backgroundColor: C.bg }}
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
        <Tap
          accessibilityRole="button"
          accessibilityLabel="Conversation options"
          hitSlop={8}
          style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="dotsVertical" size={19} color={C.text} />
        </Tap>
      </FrostedBar>

      {/* ── listing strip ── */}
      <Tap
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: LISTING } })}
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
        <View style={{ width: 40, height: 48, borderRadius: radius.md, overflow: 'hidden', backgroundColor: C.well }}>
          <ImageSlot label={p.t} tiny />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={500} size={13.5} numberOfLines={1}>
            {p.t}
          </T>
          <T w={700} size={15} style={{ marginTop: 1 }}>
            {euro(p.pr)}
          </T>
        </View>
        <T w={600} size={12.5} color={C.accent}>
          View listing
        </T>
      </Tap>

      {/* ── transcript ── */}
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        contentContainerStyle={{ padding: 16, paddingBottom: 8, gap: 8 }}
      >
        <T size={11.5} color={C.textTertiary} style={{ textAlign: 'center', paddingBottom: 6 }}>
          Today
        </T>

        {/*
          Bubbles carry no border: fill alone separates them from the canvas,
          and §14 asks not to overuse borders. Each arrives with a short rise —
          keyed by index, so only the newly appended one animates.
        */}
        {msgs.map((m, i) => (
          <FadeIn key={i} y={6} duration={200}>
            <View style={{ flexDirection: 'row', justifyContent: m.me ? 'flex-end' : 'flex-start' }}>
              <View
                style={{
                  maxWidth: '76%',
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  backgroundColor: m.me ? C.bubbleOut : C.bubbleIn,
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                  borderBottomLeftRadius: m.me ? 18 : 5,
                  borderBottomRightRadius: m.me ? 5 : 18,
                }}
              >
                <T size={14.5} lh={20.3} color={m.me ? C.onDark : C.text}>
                  {m.t}
                </T>
              </View>
            </View>
          </FadeIn>
        ))}

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
        <Chip label="View listing" height={32} round={16} onPress={() => router.push({ pathname: '/product/[id]', params: { id: LISTING } })} />
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
        <Tap
          accessibilityRole="button"
          accessibilityLabel="Attach"
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
        </Tap>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => send()}
          placeholder="Message…"
          placeholderTextColor={C.textSecondary}
          returnKeyType="send"
          style={{
            flex: 1,
            minWidth: 0,
            height: 40,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
            paddingHorizontal: 15,
            fontSize: 14.5,
            color: C.text,
          }}
        />

        <Tap
          onPress={() => send()}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: canSend ? C.text : C.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="send" size={17} color={C.onDark} />
        </Tap>
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
        backgroundColor: C.textTertiary,
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.14] }) }],
      }}
    />
  );
}
