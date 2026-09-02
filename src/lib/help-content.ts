export type HelpCategoryKey =
  | "buying"
  | "selling"
  | "listings"
  | "messaging-offers"
  | "orders"
  | "account-profile"
  | "safety"
  | "delivery"
  | "payments";

export type HelpCategory = {
  key: HelpCategoryKey;
  label: string;
};

export type HelpArticleSection = {
  heading: string;
  paragraphs?: readonly string[];
  steps?: readonly string[];
};

export type HelpArticle = {
  slug: string;
  title: string;
  summary: string;
  category: HelpCategoryKey;
  keywords: readonly string[];
  sections: readonly HelpArticleSection[];
  relatedSlugs: readonly string[];
};

export const HELP_CATEGORIES: readonly HelpCategory[] = [
  { key: "buying", label: "Buying" },
  { key: "selling", label: "Selling" },
  { key: "listings", label: "Listings" },
  { key: "messaging-offers", label: "Messaging & offers" },
  { key: "orders", label: "Orders" },
  { key: "account-profile", label: "Account & profile" },
  { key: "safety", label: "Safety" },
  { key: "delivery", label: "Delivery" },
  { key: "payments", label: "Payments" },
];

export const HELP_ARTICLES: readonly HelpArticle[] = [
  {
    slug: "buying-a-product",
    title: "Buying a product",
    summary:
      "Review an active product, choose delivery, and continue to payment.",
    category: "buying",
    keywords: ["buy now", "checkout", "product", "purchase"],
    sections: [
      {
        heading: "Before checkout",
        paragraphs: [
          "Open an active product and review its photos, description, seller details, price, and available delivery information.",
          "Use Message seller if you need to ask a question before buying.",
        ],
      },
      {
        heading: "Buy now",
        steps: [
          "Select Buy now on the product page.",
          "Choose one of the delivery options available for that product and country.",
          "Review the item price, delivery fee, configured platform fee, and total.",
          "Continue to Stripe to enter payment details.",
        ],
      },
      {
        heading: "After payment",
        paragraphs: [
          "NILYA confirms the order only after the backend verifies the Stripe payment result. Open Orders & shipping from Profile to see the current status.",
        ],
      },
    ],
    relatedSlugs: [
      "choosing-delivery",
      "checkout-and-payment-status",
      "messaging-a-seller",
    ],
  },
  {
    slug: "messaging-a-seller",
    title: "Messaging a seller",
    summary: "Start or reopen a product conversation from its product page.",
    category: "buying",
    keywords: ["message seller", "chat", "inbox", "conversation"],
    sections: [
      {
        heading: "Start a conversation",
        steps: [
          "Open the product you want to discuss.",
          "Select Message seller.",
          "Write your message in the conversation that opens.",
        ],
      },
      {
        heading: "Find it again",
        paragraphs: [
          "Your product conversations appear in Inbox. Opening Message seller again reuses the conversation for that buyer, seller, and product when one already exists.",
        ],
      },
    ],
    relatedSlugs: [
      "making-and-managing-offers",
      "staying-safe-on-nilya",
      "buying-a-product",
    ],
  },
  {
    slug: "publishing-a-product",
    title: "Publishing a product",
    summary:
      "Create a private draft, review its details, and publish it when ready.",
    category: "selling",
    keywords: ["sell", "publish", "draft", "photos", "new product"],
    sections: [
      {
        heading: "Create and publish",
        steps: [
          "Open Sell and add product photos.",
          "Enter the requested product information, details, price, and location information.",
          "Review the product before publishing it.",
          "Select Publish product when the draft is complete.",
        ],
      },
      {
        heading: "Product condition",
        paragraphs: [
          "NILYA is for NEW products only. Publish only products that meet that marketplace rule.",
        ],
      },
    ],
    relatedSlugs: [
      "new-products-only",
      "managing-your-listings",
      "using-holiday-mode",
    ],
  },
  {
    slug: "using-holiday-mode",
    title: "Using Holiday mode",
    summary:
      "Temporarily hide active products and prevent new checkout attempts.",
    category: "selling",
    keywords: ["holiday", "vacation", "pause", "hide products"],
    sections: [
      {
        heading: "Turn it on or off",
        steps: [
          "Open Profile.",
          "Select Holiday mode.",
          "Use the switch to save your current setting.",
        ],
      },
      {
        heading: "What changes",
        paragraphs: [
          "While Holiday mode is on, your active products are hidden from marketplace discovery and cannot start a new checkout. Your products and account data are not deleted.",
        ],
      },
    ],
    relatedSlugs: ["managing-your-listings", "publishing-a-product"],
  },
  {
    slug: "setting-bundle-discounts",
    title: "Setting bundle discounts",
    summary:
      "Save seller bundle tiers and understand where they currently appear.",
    category: "selling",
    keywords: ["bundle", "discount", "tiers", "seller settings"],
    sections: [
      {
        heading: "Manage your settings",
        steps: [
          "Open Profile and select Bundle discounts.",
          "Enable the setting and choose the quantity and percentage for each tier you want to offer.",
          "Save your changes.",
        ],
      },
      {
        heading: "Current checkout behaviour",
        paragraphs: [
          "Saved bundle discounts can be shown with your seller information. They are informational and are not automatically applied at checkout.",
        ],
      },
    ],
    relatedSlugs: ["managing-your-listings", "publishing-a-product"],
  },
  {
    slug: "managing-your-listings",
    title: "Managing your listings",
    summary:
      "Find products by status and use the listing actions that are available today.",
    category: "listings",
    keywords: [
      "my listings",
      "active",
      "drafts",
      "reserved",
      "sold",
      "removed",
      "delete",
    ],
    sections: [
      {
        heading: "Find your products",
        paragraphs: [
          "Open Profile and select My listings. Products are grouped into Active, Drafts, Reserved, Sold, and Removed tabs using their stored status.",
        ],
      },
      {
        heading: "Available actions",
        paragraphs: [
          "You can open a product to view it. Active products can be deactivated, and private drafts can be deleted from My listings.",
        ],
      },
    ],
    relatedSlugs: ["publishing-a-product", "using-holiday-mode"],
  },
  {
    slug: "making-and-managing-offers",
    title: "Making and managing offers",
    summary:
      "Use a product conversation to create, answer, or withdraw an offer.",
    category: "messaging-offers",
    keywords: [
      "offer",
      "accept",
      "decline",
      "withdraw",
      "conversation",
      "inbox",
    ],
    sections: [
      {
        heading: "Buyer actions",
        paragraphs: [
          "A buyer can make an offer from a conversation about an active NEW product. Only one current offer is available in that conversation at a time.",
          "A pending offer can be withdrawn by the buyer before the seller answers it.",
        ],
      },
      {
        heading: "Seller actions",
        paragraphs: [
          "The seller can accept or decline a pending offer from the conversation. The offer card shows its current stored status.",
        ],
      },
    ],
    relatedSlugs: ["messaging-a-seller", "staying-safe-on-nilya"],
  },
  {
    slug: "viewing-your-orders",
    title: "Viewing your orders",
    summary: "See orders you bought or sold and open their current details.",
    category: "orders",
    keywords: ["orders", "shipping", "bought", "sold", "payment status"],
    sections: [
      {
        heading: "Open your orders",
        steps: [
          "Open Profile.",
          "Select Orders & shipping.",
          "Choose an order to see its current order and payment status.",
        ],
      },
      {
        heading: "Refresh a pending result",
        paragraphs: [
          "If payment is still pending after returning from Stripe, refresh the order to request its latest backend-confirmed status.",
        ],
      },
    ],
    relatedSlugs: ["checkout-and-payment-status", "choosing-delivery"],
  },
  {
    slug: "editing-your-profile",
    title: "Editing your profile",
    summary:
      "Update the public profile details supported by the profile editor.",
    category: "account-profile",
    keywords: ["edit profile", "name", "photo", "bio", "city", "country"],
    sections: [
      {
        heading: "Update your details",
        steps: [
          "Open Profile and select Edit profile.",
          "Update your supported public details, such as your name, photo, bio, city, or country.",
          "Save your changes.",
        ],
      },
    ],
    relatedSlugs: ["managing-account-settings", "publishing-a-product"],
  },
  {
    slug: "managing-account-settings",
    title: "Managing account settings",
    summary:
      "Review your email, password reset, language, region, and sign-out options.",
    category: "account-profile",
    keywords: [
      "settings",
      "email",
      "password",
      "language",
      "country",
      "sign out",
    ],
    sections: [
      {
        heading: "Settings available today",
        paragraphs: [
          "Open Settings from Profile to view your account email, send a password-reset email, edit your country or region, or sign out.",
          "The language setting is stored on this device. Translated app content is not available yet.",
        ],
      },
    ],
    relatedSlugs: ["editing-your-profile", "staying-safe-on-nilya"],
  },
  {
    slug: "staying-safe-on-nilya",
    title: "Staying safe on NILYA",
    summary:
      "Keep conversations and payment details in the supported app flows.",
    category: "safety",
    keywords: ["safety", "private", "credentials", "stripe", "messages"],
    sections: [
      {
        heading: "Messages and personal information",
        paragraphs: [
          "Use NILYA messaging for product conversations. Do not send card numbers, passwords, one-time codes, or other private payment credentials in a message.",
        ],
      },
      {
        heading: "Payments and product claims",
        paragraphs: [
          "Enter card details only in the Stripe-hosted checkout opened by NILYA. Review the product information and seller details shown in the app before deciding to buy.",
        ],
      },
    ],
    relatedSlugs: [
      "checkout-and-payment-status",
      "messaging-a-seller",
      "new-products-only",
    ],
  },
  {
    slug: "new-products-only",
    title: "NEW products only",
    summary:
      "Understand the product condition required for the NILYA marketplace.",
    category: "safety",
    keywords: ["new products", "condition", "marketplace rule", "selling"],
    sections: [
      {
        heading: "Marketplace rule",
        paragraphs: [
          "NILYA is a marketplace for NEW products only. Sellers must publish products that meet this condition and provide accurate product details and photos.",
        ],
      },
    ],
    relatedSlugs: ["publishing-a-product", "staying-safe-on-nilya"],
  },
  {
    slug: "choosing-delivery",
    title: "Choosing delivery",
    summary:
      "Select from the delivery options configured for the product and country.",
    category: "delivery",
    keywords: ["delivery", "shipping", "fee", "option", "country"],
    sections: [
      {
        heading: "At checkout",
        paragraphs: [
          "Checkout shows the delivery options currently available for the product and country. Each option uses its stored label and fee.",
        ],
        steps: [
          "Select an available delivery option.",
          "Review the delivery fee and updated total before continuing.",
        ],
      },
    ],
    relatedSlugs: ["buying-a-product", "viewing-your-orders"],
  },
  {
    slug: "checkout-and-payment-status",
    title: "Checkout and payment status",
    summary:
      "Pay in Stripe-hosted checkout and rely on the backend-confirmed result.",
    category: "payments",
    keywords: ["payment", "stripe", "checkout", "pending", "total", "card"],
    sections: [
      {
        heading: "Payment details",
        paragraphs: [
          "NILYA opens Stripe-hosted checkout for card payment. Card details are entered there and are not stored by the NILYA app.",
          "Review the item price, delivery fee, configured platform fee, and total shown before continuing.",
        ],
      },
      {
        heading: "Confirmation",
        paragraphs: [
          "Returning from Stripe does not by itself confirm an order. NILYA uses the backend-verified payment result. If an order remains pending, open it from Orders & shipping and refresh its status.",
        ],
      },
    ],
    relatedSlugs: [
      "buying-a-product",
      "viewing-your-orders",
      "staying-safe-on-nilya",
    ],
  },
];

const categoryLabels = new Map(
  HELP_CATEGORIES.map((category) => [category.key, category.label]),
);

const articleBySlug = new Map(
  HELP_ARTICLES.map((article) => [article.slug, article]),
);

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

function searchableText(article: HelpArticle) {
  return normalizeSearchText(
    [
      article.title,
      article.summary,
      categoryLabels.get(article.category) ?? "",
      ...article.keywords,
      ...article.sections.flatMap((section) => [
        section.heading,
        ...(section.paragraphs ?? []),
        ...(section.steps ?? []),
      ]),
    ].join(" "),
  );
}

export function getHelpCategoryLabel(key: HelpCategoryKey) {
  return categoryLabels.get(key) ?? key;
}

export function getHelpArticle(slug: string) {
  return articleBySlug.get(slug);
}

export function getHelpArticlesForCategory(category: HelpCategoryKey) {
  return HELP_ARTICLES.filter((article) => article.category === category);
}

export function getRelatedHelpArticles(article: HelpArticle) {
  return article.relatedSlugs.flatMap((slug) => {
    const related = getHelpArticle(slug);
    return related ? [related] : [];
  });
}

export function searchHelpArticles(query: string) {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return HELP_ARTICLES;

  return HELP_ARTICLES.filter((article) => {
    const haystack = searchableText(article);
    return terms.every((term) => haystack.includes(term));
  });
}
