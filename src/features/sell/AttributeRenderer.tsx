import React, { useState } from 'react';
import { Text, View } from 'react-native';

import type { AttributeField, ColorOption } from '@/config/categoryAttributes';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/ui';
import { FieldError, FieldLabel, SelectPill, TextEntrySheet } from '@/features/sell/wizard';
import { color as C, radius, scale, space, touch, type } from '@/theme/tokens';

/**
 * Draws one attribute field from its config entry.
 *
 * Switches on `field.type` and nothing else: the screen that renders these
 * knows no category names, and adding a category means touching only
 * `categoryAttributes.ts`.
 */
export function AttributeRenderer({
  field,
  value,
  onChange,
  error,
}: {
  field: AttributeField;
  value: string | null;
  onChange: (next: string | null) => void;
  error?: string;
}) {
  switch (field.type) {
    case 'singleSelect':
      return <SingleSelectField field={field} value={value} onChange={onChange} error={error} />;
    case 'colorSingle':
      return <ColorField field={field} value={value} onChange={onChange} error={error} />;
  }
}

function SingleSelectField({
  field,
  value,
  onChange,
  error,
}: {
  field: Extract<AttributeField, { type: 'singleSelect' }>;
  value: string | null;
  onChange: (next: string | null) => void;
  error?: string;
}) {
  const groups = field.groups ?? null;
  /* The group whose options contain the current value keeps the toggle honest
     after a draft is resumed; otherwise the first group leads. */
  const [groupIndex, setGroupIndex] = useState(() =>
    Math.max(0, groups ? groups.findIndex((group) => value !== null && group.options.includes(value)) : 0)
  );
  const [custom, setCustom] = useState(false);
  const options = groups ? groups[groupIndex].options : field.options;
  const isCustom = value !== null && !options.includes(value);

  return (
    <View>
      <FieldLabel
        label={field.label}
        trailing={
          groups ? (
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: space.space4 }}>
              {groups.map((group, index) => {
                const active = index === groupIndex;
                return (
                  <PressableScale
                    key={group.label}
                    onPress={() => setGroupIndex(index)}
                    scale={scale.buttonPressed}
                    motionRole="selection"
                    accessibilityRole="tab"
                    accessibilityLabel={`${group.label} sizes`}
                    accessibilityState={{ selected: active }}
                    style={{
                      minHeight: 32,
                      minWidth: touch.minimum,
                      paddingHorizontal: space.space12,
                      borderRadius: radius.radiusPill,
                      backgroundColor: active ? C.textPrimary : C.bgMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    hitSlop={6}
                  >
                    <Text style={{ ...type.caption, fontFamily: type.metadataMedium.fontFamily, color: active ? C.textInverse : C.textPrimary }}>
                      {group.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          ) : null
        }
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.space8 }}>
        {options.map((option) => (
          <SelectPill
            key={option}
            label={option}
            selected={value === option}
            onPress={() => onChange(value === option ? null : option)}
          />
        ))}
        {isCustom ? (
          <SelectPill
            label={value}
            selected
            onPress={() => setCustom(true)}
            accessibilityLabel={`${value}, your own ${field.label.toLowerCase()}. Tap to change`}
          />
        ) : null}
        {field.allowCustom ? (
          <SelectPill
            label={`Add ${field.label.toLowerCase()}`}
            dashed
            icon="plus"
            onPress={() => setCustom(true)}
            accessibilityLabel={`Add your own ${field.label.toLowerCase()}`}
          />
        ) : null}
      </View>
      {error ? <FieldError message={error} /> : field.hint ? (
        <Text style={{ ...type.caption, color: C.textSecondary, marginTop: space.space8 }}>{field.hint}</Text>
      ) : null}

      <TextEntrySheet
        visible={custom}
        title={`Your ${field.label.toLowerCase()}`}
        placeholder={field.key === 'size' ? 'e.g. EU 38' : `Your ${field.label.toLowerCase()}`}
        initialValue={isCustom ? value : ''}
        onSubmit={(next) => {
          setCustom(false);
          onChange(next);
        }}
        onDismiss={() => setCustom(false)}
      />
    </View>
  );
}

function ColorField({
  field,
  value,
  onChange,
  error,
}: {
  field: Extract<AttributeField, { type: 'colorSingle' }>;
  value: string | null;
  onChange: (next: string | null) => void;
  error?: string;
}) {
  const [custom, setCustom] = useState(false);
  const isCustom = value !== null && !field.options.some((option) => option.name === value);

  return (
    <View>
      <FieldLabel label={field.label} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.space12 }}>
        {field.options.map((option) => (
          <Swatch
            key={option.name}
            option={option}
            selected={value === option.name}
            onPress={() => onChange(value === option.name ? null : option.name)}
          />
        ))}
        {field.allowCustom ? (
          <PressableScale
            onPress={() => setCustom(true)}
            scale={scale.buttonPressed}
            motionRole="selection"
            accessibilityRole="button"
            accessibilityLabel={isCustom ? `${value}, your own colour. Tap to change` : 'Add your own colour'}
            accessibilityState={{ selected: isCustom }}
            style={{ width: 56, alignItems: 'center', gap: space.space4 }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.radiusPill,
                borderWidth: 1.5,
                borderStyle: isCustom ? 'solid' : 'dashed',
                borderColor: isCustom ? C.textPrimary : C.border,
                backgroundColor: C.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={isCustom ? 'check' : 'plus'} role="metadata" color={C.textPrimary} decorative />
            </View>
            <Text style={{ ...type.caption, color: C.textPrimary, textAlign: 'center' }} numberOfLines={1}>
              {isCustom ? value : 'Other'}
            </Text>
          </PressableScale>
        ) : null}
      </View>
      <FieldError message={error} />

      <TextEntrySheet
        visible={custom}
        title="Your colour"
        placeholder="e.g. Sage green"
        initialValue={isCustom ? value : ''}
        onSubmit={(next) => {
          setCustom(false);
          onChange(next);
        }}
        onDismiss={() => setCustom(false)}
      />
    </View>
  );
}

/** A 40px disc of the colour, ringed in ink with a check when selected. */
function Swatch({ option, selected, onPress }: { option: ColorOption; selected: boolean; onPress: () => void }) {
  const light = option.hex.toLowerCase() === C.surface.toLowerCase() || option.name === 'White' || option.name === 'Cream';
  return (
    <PressableScale
      onPress={onPress}
      scale={scale.buttonPressed}
      motionRole="selection"
      accessibilityRole="button"
      accessibilityLabel={option.name}
      accessibilityState={{ selected }}
      style={{ width: 56, alignItems: 'center', gap: space.space4 }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.radiusPill,
          backgroundColor: option.hex,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? C.textPrimary : C.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Icon name="check" role="metadata" color={light ? C.textPrimary : C.textInverse} decorative /> : null}
      </View>
      <Text style={{ ...type.caption, color: C.textPrimary, textAlign: 'center' }} numberOfLines={1}>
        {option.name}
      </Text>
    </PressableScale>
  );
}
