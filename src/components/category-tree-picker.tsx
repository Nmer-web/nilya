import React, { useMemo, useState } from 'react';
import { I18nManager, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale, T, Tap } from '@/components/ui';
import {
  categoryChildren,
  categoryHasChildren,
  categoryIconName,
  categoryPath,
} from '@/lib/categories';
import type { CategoryRow } from '@/lib/database.types';
import { haptic } from '@/lib/haptics';
import { color as C, radius, space, touch } from '@/theme/tokens';

/**
 * One hierarchy picker shared by Sell, Edit Product and filters. Parents drill
 * down; Sell/Edit select active leaves, while filters may expose an explicit
 * “All” row for a branch. The tree itself always comes from Supabase.
 */
export function CategoryTreePicker({
  categories,
  selectedSlug,
  onSelect,
  allowParentSelection = false,
  disabled = false,
}: {
  categories: readonly CategoryRow[];
  selectedSlug: string | null;
  onSelect: (category: CategoryRow) => void;
  /** Filters may select a whole branch; Sell/Edit require a leaf. */
  allowParentSelection?: boolean;
  disabled?: boolean;
}) {
  const [trail, setTrail] = useState<CategoryRow[]>(() => {
    const path = categoryPath(categories, selectedSlug);
    const selected = path.at(-1);
    return selected && categoryHasChildren(categories, selected.id) ? path : path.slice(0, -1);
  });
  const parent = trail.at(-1) ?? null;
  const choices = useMemo(
    () => categoryChildren(categories, parent?.id ?? null),
    [categories, parent?.id]
  );

  return (
    <View>
      <View
        className="flex-row items-center"
        style={{ minHeight: touch.large, borderBottomWidth: 1, borderBottomColor: C.border }}
      >
        {parent ? (
          <Tap
            onPress={() => setTrail((current) => current.slice(0, -1))}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Back one category level"
            style={{ width: touch.minimum, height: touch.minimum, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon
              name={I18nManager.isRTL ? 'chevronRight' : 'chevronLeft'}
              role="navigation"
              color={C.textPrimary}
              decorative
            />
          </Tap>
        ) : null}
        <T
          variant="bodyMedium"
          numberOfLines={2}
          style={{ flex: 1, textAlign: parent ? 'center' : 'left', paddingHorizontal: space.space8 }}
        >
          {parent?.label ?? 'Choose a category'}
        </T>
        {parent ? <View style={{ width: touch.minimum }} /> : null}
      </View>

      {parent && allowParentSelection ? (
        <PressableScale
          onPress={() => {
            haptic('selection-committed');
            onSelect(parent);
          }}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Filter by all ${parent.label} products`}
          accessibilityState={{ selected: selectedSlug === parent.slug, disabled }}
          className="flex-row items-center"
          style={{
            minHeight: 68,
            gap: space.space12,
            paddingVertical: space.space12,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <View
            accessible={false}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.radiusPill,
              backgroundColor: selectedSlug === parent.slug ? C.primary : C.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={selectedSlug === parent.slug ? 'check' : 'grid'}
              role="navigation"
              color={selectedSlug === parent.slug ? C.textInverse : C.primary}
              decorative
            />
          </View>
          <T variant={selectedSlug === parent.slug ? 'bodyMedium' : 'body'} numberOfLines={2} style={{ flex: 1 }}>
            All {parent.label}
          </T>
        </PressableScale>
      ) : null}

      {choices.map((category, index) => {
        const hasChildren = categoryHasChildren(categories, category.id);
        const selected = !hasChildren && selectedSlug === category.slug;
        return (
          <PressableScale
            key={category.id}
            onPress={() => {
              haptic('selection-committed');
              if (hasChildren) setTrail((current) => [...current, category]);
              else onSelect(category);
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={
              hasChildren ? `Open ${category.label} category` : `Select ${category.label} category`
            }
            accessibilityState={{ selected, disabled }}
            className="flex-row items-center"
            style={{
              minHeight: 68,
              gap: space.space12,
              paddingVertical: space.space12,
              borderBottomWidth: index === choices.length - 1 ? 0 : 1,
              borderBottomColor: C.border,
            }}
          >
            <View
              accessible={false}
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.radiusPill,
                backgroundColor: selected ? C.primary : C.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={selected ? 'check' : categoryIconName(category.icon_key)}
                role="navigation"
                color={selected ? C.textInverse : C.primary}
                decorative
              />
            </View>
            <T variant={selected ? 'bodyMedium' : 'body'} numberOfLines={2} style={{ flex: 1 }}>
              {category.label}
            </T>
            {hasChildren ? (
              <Icon
                name={I18nManager.isRTL ? 'chevronLeft' : 'chevronRight'}
                role="navigation"
                color={C.textSecondary}
                decorative
              />
            ) : null}
          </PressableScale>
        );
      })}

      {choices.length === 0 ? (
        <View style={{ minHeight: 120, alignItems: 'center', justifyContent: 'center', padding: space.space20 }}>
          <T variant="body" color={C.textSecondary} align="center">
            No active categories are available here.
          </T>
        </View>
      ) : null}
    </View>
  );
}
