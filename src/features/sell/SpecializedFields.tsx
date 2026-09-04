import React from 'react';
import { Text, View } from 'react-native';

import type { SpecializedDraft } from '@/features/sell/draft';
import { FieldError, FieldLabel, SellTextField } from '@/features/sell/wizard';
import type { ListingDetailKind } from '@/lib/listing-types';
import { Tap } from '@/components/ui';
import { color as C, radius, space, touch, type } from '@/theme/tokens';

type SetSpecialized = <K extends keyof SpecializedDraft>(
  kind: K,
  changes: Partial<SpecializedDraft[K]>
) => void;

type Props = {
  kind: ListingDetailKind;
  values: SpecializedDraft;
  setValues: SetSpecialized;
  errors?: Partial<Record<string, string>>;
};

const PRICE_UNITS = [
  ['item', 'Per item'], ['kg', 'Per kg'], ['g', 'Per gram'], ['litre', 'Per litre'],
  ['ml', 'Per ml'], ['pack', 'Per pack'], ['dozen', 'Per dozen'],
] as const;
const HALAL = [['halal', 'Halal'], ['not_halal', 'Not halal'], ['not_specified', 'Not specified']] as const;
const PREPARATION = [['homemade', 'Homemade'], ['packaged', 'Packaged']] as const;
const FRAGRANCE_TYPES = [
  ['parfum', 'Parfum'], ['eau_de_parfum', 'Eau de parfum'], ['eau_de_toilette', 'Eau de toilette'],
  ['cologne', 'Cologne'], ['perfume_oil', 'Perfume oil'], ['attar', 'Attar'], ['oud', 'Oud'],
  ['incense', 'Incense'], ['bakhoor', 'Bakhoor'], ['other', 'Other'],
] as const;
const AUDIENCES = [['women', 'Women'], ['men', 'Men'], ['unisex', 'Unisex'], ['kids', 'Kids']] as const;
const CONTRACTS = [
  ['full_time', 'Full time'], ['part_time', 'Part time'], ['fixed_term', 'Fixed term'],
  ['temporary', 'Temporary'], ['freelance', 'Freelance'], ['internship', 'Internship'],
] as const;
const WORK_MODES = [['onsite', 'On site'], ['hybrid', 'Hybrid'], ['remote', 'Remote']] as const;
const APPLICATION_METHODS = [
  ['in_app', 'In Nilya'], ['external_url', 'Application link'], ['email', 'Email'], ['phone', 'Phone'],
] as const;
const DELIVERY_MODES = [['onsite', 'On site'], ['remote', 'Remote'], ['either', 'Either']] as const;

export function SpecializedFields({ kind, values, setValues, errors = {} }: Props) {
  if (kind === 'food') {
    const food = values.food;
    return (
      <FieldStack>
        <ChoiceField label="Price unit" value={food.priceUnit} options={PRICE_UNITS} onChange={(priceUnit) => setValues('food', { priceUnit })} error={errors.priceUnit} />
        <SellTextField label="Quantity" value={food.quantity} onChangeText={(quantity) => setValues('food', { quantity: numeric(quantity) })} keyboardType="decimal-pad" placeholder="Example: 1.5" error={errors.quantity} />
        <SellTextField label="Ingredients" value={food.ingredients} onChangeText={(ingredients) => setValues('food', { ingredients })} multiline maxLength={4000} placeholder="List every ingredient" error={errors.ingredients} />
        <SellTextField label="Allergens" value={food.allergens} onChangeText={(allergens) => setValues('food', { allergens })} multiline maxLength={1000} placeholder="Example: milk, nuts — or None known" error={errors.allergens} />
        <SellTextField label="Expiry date" value={food.expiryDate} onChangeText={(expiryDate) => setValues('food', { expiryDate: dateText(expiryDate) })} maxLength={10} placeholder="YYYY-MM-DD" error={errors.expiryDate} />
        <ChoiceField label="Halal status" value={food.halalStatus} options={HALAL} onChange={(halalStatus) => setValues('food', { halalStatus })} error={errors.halalStatus} />
        <ChoiceField label="Preparation" value={food.preparationType} options={PREPARATION} onChange={(preparationType) => setValues('food', { preparationType })} error={errors.preparationType} />
        <SellTextField label="Storage requirements" value={food.storageRequirements} onChangeText={(storageRequirements) => setValues('food', { storageRequirements })} multiline maxLength={1000} placeholder="Refrigeration, temperature, handling…" error={errors.storageRequirements} />
        <SellTextField label="Delivery requirements" value={food.deliveryRequirements} onChangeText={(deliveryRequirements) => setValues('food', { deliveryRequirements })} multiline maxLength={1000} placeholder="Cold delivery, delivery window…" error={errors.deliveryRequirements} />
      </FieldStack>
    );
  }

  if (kind === 'perfume') {
    const perfume = values.perfume;
    return (
      <FieldStack>
        <InfoText>Condition is New for every perfume sold on Nilya.</InfoText>
        <SellTextField label="Fragrance name" value={perfume.fragranceName} onChangeText={(fragranceName) => setValues('perfume', { fragranceName })} maxLength={160} placeholder="Name on the bottle or packaging" error={errors.fragranceName} />
        <ChoiceField label="Fragrance type" value={perfume.fragranceType} options={FRAGRANCE_TYPES} onChange={(fragranceType) => setValues('perfume', { fragranceType })} error={errors.fragranceType} />
        <SellTextField label="Volume (ml)" value={perfume.volumeMl} onChangeText={(volumeMl) => setValues('perfume', { volumeMl: numeric(volumeMl) })} keyboardType="decimal-pad" placeholder="Example: 100" error={errors.volumeMl} />
        <ChoiceField label="Sealed" value={perfume.sealed ? 'yes' : 'no'} options={[['yes', 'Yes'], ['no', 'No']] as const} onChange={(value) => setValues('perfume', { sealed: value === 'yes' })} />
        <ChoiceField label="Target audience" value={perfume.targetAudience} options={AUDIENCES} onChange={(targetAudience) => setValues('perfume', { targetAudience })} error={errors.targetAudience} />
        <SellTextField label="Fragrance notes" value={perfume.fragranceNotes} onChangeText={(fragranceNotes) => setValues('perfume', { fragranceNotes })} multiline maxLength={2000} placeholder="Top, heart and base notes" error={errors.fragranceNotes} />
        <Declaration checked={perfume.authenticityDeclared} onPress={() => setValues('perfume', { authenticityDeclared: !perfume.authenticityDeclared })} error={errors.authenticityDeclared} />
      </FieldStack>
    );
  }

  if (kind === 'job') {
    const job = values.job;
    const needsTarget = job.applicationMethod && job.applicationMethod !== 'in_app';
    const targetLabel = job.applicationMethod === 'email' ? 'Application email' : job.applicationMethod === 'phone' ? 'Application phone' : 'Application URL';
    return (
      <FieldStack>
        <SellTextField label="Employer" value={job.employer} onChangeText={(employer) => setValues('job', { employer })} maxLength={160} placeholder="Company or organisation" error={errors.employer} />
        <SellTextField label="Sector" value={job.sector} onChangeText={(sector) => setValues('job', { sector })} maxLength={120} placeholder="Example: hospitality" error={errors.sector} />
        <ChoiceField label="Contract type" value={job.contractType} options={CONTRACTS} onChange={(contractType) => setValues('job', { contractType })} error={errors.contractType} />
        <SellTextField label="Schedule" value={job.schedule} onChangeText={(schedule) => setValues('job', { schedule })} maxLength={500} placeholder="Days, hours and shifts" error={errors.schedule} />
        <ChoiceField label="Work mode" value={job.workMode} options={WORK_MODES} onChange={(workMode) => setValues('job', { workMode })} error={errors.workMode} />
        <SellTextField label="Location" value={job.location} onChangeText={(location) => setValues('job', { location })} maxLength={240} placeholder="City, area or remote region" error={errors.location} />
        <SellTextField label="Required experience" value={job.requiredExperience} onChangeText={(requiredExperience) => setValues('job', { requiredExperience })} multiline maxLength={2000} placeholder="Skills and experience applicants need" error={errors.requiredExperience} />
        <ChoiceField label="Application method" value={job.applicationMethod} options={APPLICATION_METHODS} onChange={(applicationMethod) => setValues('job', { applicationMethod, applicationValue: applicationMethod === 'in_app' ? '' : job.applicationValue })} error={errors.applicationMethod} />
        {needsTarget ? <SellTextField label={targetLabel} value={job.applicationValue} onChangeText={(applicationValue) => setValues('job', { applicationValue })} maxLength={500} autoCapitalize="none" keyboardType={job.applicationMethod === 'email' ? 'email-address' : job.applicationMethod === 'phone' ? 'phone-pad' : 'url'} placeholder={job.applicationMethod === 'external_url' ? 'https://…' : undefined} error={errors.applicationValue} /> : null}
        <SellTextField label="Application deadline" value={job.applicationDeadline} onChangeText={(applicationDeadline) => setValues('job', { applicationDeadline: dateText(applicationDeadline) })} maxLength={10} placeholder="YYYY-MM-DD" error={errors.applicationDeadline} />
      </FieldStack>
    );
  }

  if (kind === 'service') {
    const service = values.service;
    return (
      <FieldStack>
        <InfoText>The category you selected is the service category buyers will browse.</InfoText>
        <SellTextField label="Service area" value={service.serviceArea} onChangeText={(serviceArea) => setValues('service', { serviceArea })} maxLength={500} placeholder="Where you provide this service" error={errors.serviceArea} />
        <ChoiceField label="Delivery mode" value={service.deliveryMode} options={DELIVERY_MODES} onChange={(deliveryMode) => setValues('service', { deliveryMode })} error={errors.deliveryMode} />
        <SellTextField label="Availability" value={service.availability} onChangeText={(availability) => setValues('service', { availability })} multiline maxLength={1000} placeholder="Days, hours and notice needed" error={errors.availability} />
        <SellTextField label="Experience" value={service.experience} onChangeText={(experience) => setValues('service', { experience })} multiline maxLength={2000} placeholder="Relevant experience and qualifications" error={errors.experience} />
      </FieldStack>
    );
  }

  return null;
}

function FieldStack({ children }: { children: React.ReactNode }) {
  return <View style={{ gap: space.space24 }}>{children}</View>;
}

function InfoText({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ borderRadius: radius.radiusMedium, backgroundColor: C.primarySoft, padding: space.space16 }}>
      <Text style={{ ...type.metadata, color: C.primary }}>{children}</Text>
    </View>
  );
}

export function ChoiceField<const Value extends string>({ label, value, options, onChange, error }: {
  label: string;
  value: Value | '';
  options: readonly (readonly [Value, string])[];
  onChange: (value: Value) => void;
  error?: string;
}) {
  return (
    <View>
      <FieldLabel label={label} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.space8 }}>
        {options.map(([option, optionLabel]) => {
          const selected = value === option;
          return (
            <Tap key={option} onPress={() => onChange(option)} accessibilityRole="radio" accessibilityLabel={optionLabel} accessibilityState={{ selected }} style={{ minHeight: touch.minimum, justifyContent: 'center', paddingHorizontal: space.space16, borderRadius: radius.radiusPill, borderWidth: 1, borderColor: selected ? C.primary : C.border, backgroundColor: selected ? C.primarySoft : C.surface }}>
              <Text style={{ ...type.metadataMedium, color: selected ? C.primary : C.textPrimary }}>{optionLabel}</Text>
            </Tap>
          );
        })}
      </View>
      <FieldError message={error} />
    </View>
  );
}

function Declaration({ checked, onPress, error }: { checked: boolean; onPress: () => void; error?: string }) {
  return (
    <View>
      <Tap onPress={onPress} accessibilityRole="checkbox" accessibilityLabel="I declare this fragrance is authentic" accessibilityState={{ checked }} style={{ minHeight: touch.large, flexDirection: 'row', alignItems: 'center', gap: space.space12, borderRadius: radius.radiusMedium, borderWidth: 1, borderColor: checked ? C.primary : C.border, backgroundColor: checked ? C.primarySoft : C.surface, padding: space.space12 }}>
        <View style={{ width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: checked ? C.primary : C.bgMuted }}>
          <Text style={{ color: C.textInverse }}>{checked ? '✓' : ''}</Text>
        </View>
        <Text style={{ ...type.metadataMedium, color: C.textPrimary, flex: 1 }}>I declare this fragrance is authentic.</Text>
      </Tap>
      <FieldError message={error} />
    </View>
  );
}

function numeric(value: string): string {
  return value.replace(/[^0-9.,]/g, '').slice(0, 20);
}

function dateText(value: string): string {
  return value.replace(/[^0-9-]/g, '').slice(0, 10);
}
