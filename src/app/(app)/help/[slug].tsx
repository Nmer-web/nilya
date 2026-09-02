import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { ScreenHeader } from "@/components/screen-header";
import { Button, EmptyState, T, Tap } from "@/components/ui";
import {
  getHelpArticle,
  getHelpCategoryLabel,
  getRelatedHelpArticles,
  type HelpArticle,
} from "@/lib/help-content";
import { color as C, radius, space } from "@/theme/tokens";

export default function HelpArticleRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const article = slug ? getHelpArticle(slug) : undefined;

  const openArticle = (nextSlug: string) => {
    router.push({ pathname: "/help/[slug]", params: { slug: nextSlug } });
  };

  return (
    <View className="flex-1 bg-nilya-background">
      <ScreenHeader title="Help Centre" />
      {article ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: insets.bottom + space.space40,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-5 pb-2 pt-6">
            <T variant="metadataMedium" color={C.textSecondary}>
              {getHelpCategoryLabel(article.category)}
            </T>
            <T
              variant="screenTitle"
              accessibilityRole="header"
              className="mt-2"
              selectable
            >
              {article.title}
            </T>
            <T
              variant="body"
              color={C.textSecondary}
              className="mt-3"
              selectable
            >
              {article.summary}
            </T>
          </View>

          <View className="px-5 pt-3">
            {article.sections.map((section) => (
              <View
                key={section.heading}
                className="border-t border-nilya-border py-6"
              >
                <T variant="sectionTitle" accessibilityRole="header" selectable>
                  {section.heading}
                </T>
                {section.paragraphs?.map((paragraph) => (
                  <T
                    key={paragraph}
                    variant="body"
                    color={C.textSecondary}
                    className="mt-3"
                    selectable
                  >
                    {paragraph}
                  </T>
                ))}
                {section.steps ? (
                  <View className="mt-4 gap-4">
                    {section.steps.map((step, stepIndex) => (
                      <ArticleStep
                        key={step}
                        number={stepIndex + 1}
                        text={step}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          <RelatedArticles article={article} onOpen={openArticle} />
        </ScrollView>
      ) : (
        <EmptyState
          icon="info"
          title="Article unavailable"
          body="This help article does not exist or is no longer available."
          action={
            <Button
              label="Back to Help Centre"
              onPress={() => router.replace("/help")}
            />
          }
        />
      )}
    </View>
  );
}

function ArticleStep({ number, text }: { number: number; text: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View
        className="h-8 w-8 items-center justify-center bg-nilya-surface-2"
        style={{ borderRadius: radius.radiusPill }}
      >
        <T variant="caption">{number}</T>
      </View>
      <T
        variant="body"
        style={{ flex: 1, paddingTop: space.space4 }}
        selectable
      >
        {text}
      </T>
    </View>
  );
}

function RelatedArticles({
  article,
  onOpen,
}: {
  article: HelpArticle;
  onOpen: (slug: string) => void;
}) {
  const related = getRelatedHelpArticles(article);
  if (related.length === 0) return null;

  return (
    <View className="pt-2">
      <T
        variant="sectionTitle"
        accessibilityRole="header"
        className="px-5 pb-2"
      >
        Related articles
      </T>
      <View className="border-y border-nilya-border bg-nilya-surface">
        {related.map((item, index) => (
          <Tap
            key={item.slug}
            onPress={() => onOpen(item.slug)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            accessibilityHint="Opens this related Help Centre article"
            className={
              index === related.length - 1
                ? "min-h-14 flex-row items-center gap-3 px-5 py-3"
                : "min-h-14 flex-row items-center gap-3 border-b border-nilya-border px-5 py-3"
            }
          >
            <T variant="bodyMedium" style={{ flex: 1 }}>
              {item.title}
            </T>
            <Icon
              name="chevronRight"
              role="metadata"
              color={C.textSecondary}
              decorative
            />
          </Tap>
        ))}
      </View>
    </View>
  );
}
