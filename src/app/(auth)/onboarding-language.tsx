import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Button, T, Tap } from '@/components/ui';
import { LANGUAGES } from '@/lib/onboarding';
import { useOnboarding } from '@/store/onboarding-store';
import { color as C, radius, space, touch } from '@/theme/tokens';

export default function OnboardingLanguage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useOnboarding();

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader border={false} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.gutterRegular,
          paddingTop: space.space8,
          paddingBottom: insets.bottom + space.space32,
        }}
      >
        <T variant="screenTitle">Choose your language</T>
        <T variant="body" color={C.textSecondary} style={{ marginTop: space.space8, marginBottom: space.space24 }}>
          You can change this later in Settings.
        </T>

        <View style={{ gap: space.space12 }}>
          {LANGUAGES.map((l) => {
            const selected = language === l.code;
            return (
              <LanguageRow
                key={l.code}
                label={l.label}
                native={l.native}
                selected={selected}
                onPress={() => setLanguage(l.code)}
              />
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        <Button
          label="Continue"
          disabled={!language}
          onPress={() => router.push('/onboarding-country')}
          style={{ marginTop: space.space24 }}
        />
      </ScrollView>
    </View>
  );
}

function LanguageRow({
  label,
  native,
  selected,
  onPress,
}: {
  label: string;
  native: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.space16,
        minHeight: touch.large,
        paddingHorizontal: space.space16,
        borderRadius: radius.radiusLarge,
        borderCurve: 'continuous',
        backgroundColor: selected ? C.primarySoft : C.surface,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? C.primary : C.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <T variant="bodyMedium">{label}</T>
        <T variant="metadata" color={C.textSecondary}>
          {native}
        </T>
      </View>
      {selected ? (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.radiusPill,
            backgroundColor: C.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="check" role="metadata" color={C.textInverse} />
        </View>
      ) : null}
    </Tap>
  );
}
