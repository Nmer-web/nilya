import { avatarColor } from '@/theme/tokens';

export type Product = {
  id: number;
  /** Title */
  t: string;
  /** Brand */
  b: string;
  /** Price, EUR */
  pr: number;
  /** Previous price, when it has dropped */
  old?: number;
  /** Condition */
  cd: string;
  city: string;
  /** ISO country code — drives which delivery ladder applies */
  cc: string;
  country: string;
  /** Size */
  sz: string;
  /** Colour */
  clr: string;
  cat: string;
  /** Seller name */
  s: string;
  /** Seller avatar colour */
  av: string;
  /** Seller lifetime sales */
  sales: number;
  /** Spotlight tagline */
  tag?: string;
  desc: string;
};

export const PRODUCTS: Product[] = [
  {
    id: 1,
    t: 'Nike Air Max 270',
    b: 'Nike',
    pr: 45,
    old: 52,
    cd: 'Very good',
    city: 'Lyon',
    cc: 'FR',
    country: 'France',
    sz: 'EU 42',
    clr: 'Black',
    cat: 'Shoes',
    s: 'Yousif Adam',
    av: avatarColor.yousif,
    sales: 24,
    tag: 'Price dropped',
    desc: 'Excellent condition. Only worn a few times, no visible damage. Comes with the original box. Smoke-free home.',
  },
  {
    id: 2,
    t: 'Zara Wool Blend Coat',
    b: 'Zara',
    pr: 28,
    cd: 'Good',
    city: 'Paris',
    cc: 'FR',
    country: 'France',
    sz: 'M',
    clr: 'Camel',
    cat: 'Women',
    s: 'Ahmed Ibrahim',
    av: avatarColor.ahmed,
    sales: 24,
    desc: 'Warm mid-length coat, worn for two winters. Small mark on the inner lining, invisible when worn.',
  },
  {
    id: 3,
    t: 'Hand-embroidered Toub',
    b: 'Handmade',
    pr: 65,
    cd: 'New',
    city: 'Cairo',
    cc: 'EG',
    country: 'Egypt',
    sz: 'One size',
    clr: 'Indigo',
    cat: 'Sudanese',
    s: 'Nour Bashir',
    av: avatarColor.nour,
    sales: 57,
    tag: 'Handmade',
    desc: 'Hand-embroidered by my aunt in Omdurman. Cotton, never worn. Ships folded in tissue paper.',
  },
  {
    id: 4,
    t: 'iPhone 12 · 128GB',
    b: 'Apple',
    pr: 260,
    cd: 'Very good',
    city: 'London',
    cc: 'GB',
    country: 'United Kingdom',
    sz: '128GB',
    clr: 'Blue',
    cat: 'Electronics',
    s: 'Yousif Adam',
    av: avatarColor.yousif,
    sales: 24,
    desc: 'Battery health 89%. Always in a case, screen has no scratches. Unlocked, reset and ready.',
  },
  {
    id: 5,
    t: "Levi's 501 Straight",
    b: "Levi's",
    pr: 32,
    cd: 'Good',
    city: 'Paris',
    cc: 'FR',
    country: 'France',
    sz: 'W32 L32',
    clr: 'Indigo',
    cat: 'Men',
    s: 'Ahmed Ibrahim',
    av: avatarColor.ahmed,
    sales: 24,
    desc: 'Classic straight fit, honest fading at the knees. No rips.',
  },
  {
    id: 6,
    t: 'Jebena Coffee Set',
    b: 'Handmade',
    pr: 40,
    cd: 'New',
    city: 'Khartoum',
    cc: 'SD',
    country: 'Sudan',
    sz: '6 cups',
    clr: 'Clay',
    cat: 'Home',
    s: 'Amal Mohamed',
    av: avatarColor.amal,
    sales: 38,
    tag: 'Local pickup',
    desc: 'Clay jebena with six glasses and a woven tray. Collect from Al Riyadh, or I can arrange delivery inside Khartoum.',
  },
  {
    id: 7,
    t: 'Adidas Samba OG',
    b: 'Adidas',
    pr: 55,
    cd: 'Very good',
    city: 'Amsterdam',
    cc: 'NL',
    country: 'Netherlands',
    sz: 'EU 40',
    clr: 'White',
    cat: 'Shoes',
    s: 'Sara Hassan',
    av: avatarColor.sara,
    sales: 12,
    desc: 'Worn about ten times. Soles clean, no creasing on the toe box.',
  },
  {
    id: 8,
    t: 'Leather Shopper Tote',
    b: 'Mango',
    pr: 38,
    cd: 'Good',
    city: 'Doha',
    cc: 'QA',
    country: 'Qatar',
    sz: 'Large',
    clr: 'Tan',
    cat: 'Bags',
    s: 'Huda Elamin',
    av: avatarColor.huda,
    sales: 31,
    desc: 'Real leather, softened nicely with use. One pen mark inside the pocket.',
  },
  {
    id: 9,
    t: 'Karkadeh & Spice Set',
    b: 'Handmade',
    pr: 18,
    cd: 'New',
    city: 'Omdurman',
    cc: 'SD',
    country: 'Sudan',
    sz: '4 jars',
    clr: 'Mixed',
    cat: 'Home',
    s: 'Amal Mohamed',
    av: avatarColor.amal,
    sales: 38,
    desc: 'Dried hibiscus, cardamom, cloves and cinnamon. Sealed jars, packed this week.',
  },
  {
    id: 10,
    t: 'Kids Denim Jacket',
    b: 'H&M',
    pr: 14,
    cd: 'Good',
    city: 'Paris',
    cc: 'FR',
    country: 'France',
    sz: '5–6y',
    clr: 'Blue',
    cat: 'Kids',
    s: 'Ahmed Ibrahim',
    av: avatarColor.ahmed,
    sales: 24,
    desc: 'Outgrown but plenty of life left. Washed and ready.',
  },
  {
    id: 11,
    t: 'Silver Anklet, handmade',
    b: 'Handmade',
    pr: 25,
    cd: 'New',
    city: 'Khartoum',
    cc: 'SD',
    country: 'Sudan',
    sz: '24 cm',
    clr: 'Silver',
    cat: 'Sudanese',
    s: 'Nour Bashir',
    av: avatarColor.nour,
    sales: 57,
    desc: 'Traditional filigree work, bought directly from the silversmith in Souq Omdurman.',
  },
  {
    id: 12,
    t: 'Nintendo Switch Lite',
    b: 'Nintendo',
    pr: 110,
    cd: 'Very good',
    city: 'Toronto',
    cc: 'CA',
    country: 'Canada',
    sz: '—',
    clr: 'Turquoise',
    cat: 'Electronics',
    s: 'Yousif Adam',
    av: avatarColor.yousif,
    sales: 24,
    desc: 'Includes charger and a screen protector already applied. Buttons all responsive.',
  },
  {
    id: 13,
    t: 'Sauvage EDT 100ml',
    b: 'Dior',
    pr: 72,
    cd: 'New',
    city: 'Dubai',
    cc: 'AE',
    country: 'UAE',
    sz: '100ml',
    clr: '—',
    cat: 'Beauty',
    s: 'Huda Elamin',
    av: avatarColor.huda,
    sales: 31,
    desc: 'Sealed box, bought at duty free. Wrong scent for me.',
  },
  {
    id: 14,
    t: 'Puma Velocity Runners',
    b: 'Puma',
    pr: 30,
    cd: 'Good',
    city: 'Oslo',
    cc: 'NO',
    country: 'Norway',
    sz: 'EU 43',
    clr: 'Grey',
    cat: 'Sports',
    s: 'Sara Hassan',
    av: avatarColor.sara,
    sales: 12,
    desc: 'Used for a season of park runs. Cushioning still good.',
  },
];

/**
 * Home's category rail.
 *
 * `Sports` trails the recommended set because it is the only chip that reaches
 * its listing — dropping it to match the shortlist exactly would strand that
 * product behind `All`.
 */
export const CATS = ['All', 'Women', 'Men', 'Kids', 'Home', 'Electronics', 'Shoes', 'Beauty', 'From Sudan', 'Sports'];

export const EXCATS = [
  'All',
  'Women',
  'Men',
  'Kids',
  'Home',
  'Electronics',
  'Beauty',
  'Shoes',
  'Bags',
  'Sports',
  'Sudanese',
];

export type Review = {
  n: string;
  ini: string;
  avBg: string;
  stars: string;
  when: string;
  t: string;
};

export const REVIEWS: Review[] = [
  {
    n: 'Leila M.',
    ini: 'LM',
    avBg: avatarColor.nour,
    stars: '★★★★★',
    when: 'Mon',
    t: 'Fast shipping and the coat was exactly as described. Wrapped beautifully.',
  },
  {
    n: 'Osman K.',
    ini: 'OK',
    avBg: avatarColor.sara,
    stars: '★★★★★',
    when: '2 wks',
    t: 'Very easy to deal with, answered every question. Would buy again.',
  },
  {
    n: 'Amal M.',
    ini: 'AM',
    avBg: avatarColor.amal,
    stars: '★★★★☆',
    when: '1 mo',
    t: 'Item arrived a day later than expected but in perfect condition.',
  },
];

/** The signed-in user. Their listings are the ones shown on the Profile tab. */
export const ME = 'Ahmed Ibrahim';

export const getProduct = (id: number): Product => PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];

export const myListings = (): Product[] => PRODUCTS.filter((p) => p.s === ME);

export const listingsBy = (seller: string): Product[] => PRODUCTS.filter((p) => p.s === seller);

export const initialsOf = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('');
