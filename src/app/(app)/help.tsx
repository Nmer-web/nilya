import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, T, Tap } from "@/components/ui";
import {
  HELP_CATEGORIES,
  getHelpArticlesForCategory,
  searchHelpArticles,
  type HelpArticle,
} from "@/lib/help-content";
import {
  color as C,
  radius,
  space,
  touch,
  type as typography,
} from "@/theme/tokens";

export default function HelpCentreRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = React.useState("");
  const trimmedQuery = query.trim();
  const results = React.useMemo(() => searchHelpArticles(query), [query]);

  const openArticle = (slug: string) => {
    router.push({ pathname: "/help/[slug]", params: { slug } });
  };

  return (
    <View className="flex-1 bg-nilya-background">
      <ScreenHeader title="Help Centre" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + space.space40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pb-2 pt-6">
          <T variant="sectionTitle" accessibilityRole="header">
            How can we help?
          </T>
          <T variant="body" color={C.textSecondary} className="mt-2" selectable>
            Find guidance for the buying, selling, account, and safety features
            available in NILYA.
          </T>
        </View>

        <View
          className="mx-5 mt-4 flex-row items-center border border-nilya-border bg-nilya-surface pl-4"
          style={{
            minHeight: touch.standard,
            borderRadius: radius.radiusMedium,
          }}
        >
          <Icon
            name="search"
            role="inline"
            color={C.textSecondary}
            decorative
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for help"
            placeholderTextColor={C.textSecondary}
            accessibilityLabel="Search for help"
            autoCapitalize="none"
            returnKeyType="search"
            selectionColor={C.primary}
            style={{
              ...typography.body,
              color: C.textPrimary,
              flex: 1,
              minHeight: touch.standard,
              paddingHorizontal: space.space12,
              paddingVertical: space.space12,
            }}
          />
          {query.length > 0 ? (
            <Tap
              onPress={() => setQuery("")}
              accessibilityRole="button"
              accessibilityLabel="Clear help search"
              style={{
                width: touch.minimum,
                height: touch.minimum,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name="close"
                role="metadata"
                color={C.textSecondary}
                decorative
              />
            </Tap>
          ) : null}
        </View>

        {trimmedQuery ? (
          <View className="pt-7">
            <View className="flex-row items-end justify-between px-5 pb-2">
              <T variant="sectionTitle" accessibilityRole="header">
                Search results
              </T>
              <T
                variant="metadata"
                color={C.textSecondary}
                accessibilityLiveRegion="polite"
              >
                {results.length} {results.length === 1 ? "article" : "articles"}
              </T>
            </View>
            {results.length > 0 ? (
              <ArticleList articles={results} onOpen={openArticle} />
            ) : (
              <EmptyState
                icon="search"
                title="No matching articles"
                body="Try a different word or clear the search to browse every topic."
                style={{ paddingVertical: space.space40 }}
              />
            )}
          </View>
        ) : (
          HELP_CATEGORIES.map((category) => {
            const articles = getHelpArticlesForCategory(category.key);
            return (
              <View key={category.key} className="pt-7">
                <T
                  variant="sectionTitle"
                  accessibilityRole="header"
                  className="px-5 pb-2"
                >
                  {category.label}
                </T>
                <ArticleList articles={articles} onOpen={openArticle} />
              </View>
            );
          })
        )}

        <View className="mx-5 mt-8 border-t border-nilya-border pt-5">
          <T variant="cardTitle" accessibilityRole="header">
            Need more help?
          </T>
          <T variant="body" color={C.textSecondary} className="mt-2" selectable>
            Direct support requests are not available in NILYA yet. This Help
            Centre covers the journeys the app currently supports.
          </T>
        </View>
      </ScrollView>
    </View>
  );
}

function ArticleList({
  articles,
  onOpen,
}: {
  articles: readonly HelpArticle[];
  onOpen: (slug: string) => void;
}) {
  return (
    <View className="border-y border-nilya-border bg-nilya-surface">
      {articles.map((article, index) => (
        <Tap
          key={article.slug}
          onPress={() => onOpen(article.slug)}
          accessibilityRole="button"
          accessibilityLabel={article.title}
          accessibilityHint="Opens this Help Centre article"
          className={
            index === articles.length - 1
              ? "min-h-16 flex-row items-center gap-3 px-5 py-3"
              : "min-h-16 flex-row items-center gap-3 border-b border-nilya-border px-5 py-3"
          }
        >
          <View className="min-w-0 flex-1">
            <T variant="bodyMedium">{article.title}</T>
            <T
              variant="metadata"
              color={C.textSecondary}
              className="mt-1"
              numberOfLines={2}
            >
              {article.summary}
            </T>
          </View>
          <Icon
            name="chevronRight"
            role="metadata"
            color={C.textSecondary}
            decorative
          />
        </Tap>
      ))}
    </View>
  );
}
