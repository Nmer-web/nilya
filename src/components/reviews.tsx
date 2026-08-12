import React from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Avatar, Card, T } from '@/components/ui';
import { REVIEWS } from '@/data/catalog';
import { color as C } from '@/theme/tokens';

/** Stacked review cards, shared by the Profile and Seller profile tabs. */
export function ReviewList() {
  return (
    <View style={{ paddingHorizontal: 16, gap: 10 }}>
      {REVIEWS.map((r) => (
        <Card key={r.n} style={{ padding: 14, borderRadius: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Avatar initials={r.ini} bg={r.avBg} size={30} fontSize={11.5} />
            <T w={600} size={13.5} style={{ flex: 1 }}>
              {r.n}
            </T>
            <T w={600} size={12} color={C.text}>
              {r.stars}
            </T>
            <T size={11.5} color={C.textTertiary}>
              {r.when}
            </T>
          </View>
          <T size={13.5} lh={20.25} style={{ marginTop: 9 }}>
            {r.t}
          </T>
        </Card>
      ))}
    </View>
  );
}

/** Five filled stars, at the size used beside a seller's name. */
export function StarRow({ size = 12 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1.5 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" size={size} color={C.text} />
      ))}
    </View>
  );
}
