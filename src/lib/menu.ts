// Villa menu from https://kurunduwatta-hospitality.vercel.app/dining,
// with simple Sinhala names. The id stays based on the original dish name
// so saved recipes keep working.

type Dish = [id: string, name: string];

export const MENU: { category: string; dishes: Dish[] }[] = [
  {
    category: "ලංකාවේ විශේෂ කෑම",
    dishes: [
      ["traditional-sri-lankan-rice-and-curry-set", "බත් සහ කරි"],
      ["sri-lankan-seafood-curry-pot", "මුහුදු කෑම කරිය"],
      ["devilled-dish", "ඩෙවල් කෑම"],
      ["live-style-kothu-roti", "කොත්තු රොටි"],
      ["pol-roti-platter", "පොල් රොටි"],
    ],
  },
  {
    category: "බුෆේ",
    dishes: [
      ["breakfast-buffet", "උදේ බුෆේ"],
      ["lunch-buffet", "දවල් බුෆේ"],
      ["dinner-buffet", "රෑ බුෆේ"],
      ["high-tea", "හවස තේ"],
    ],
  },
  {
    category: "බාබකියු රෑ",
    dishes: [
      ["classic-meat-and-poultry-bbq", "මස් සහ කුකුල් මස් බාබකියු"],
      ["surf-and-turf-seafood-and-meat-bbq", "මුහුදු කෑම සහ මස් බාබකියු"],
      ["grand-villa-bbq-and-live-station", "විලා විශේෂ බාබකියු"],
    ],
  },
  {
    category: "සෙට් මෙනු",
    dishes: [
      ["sri-lankan-breakfast-traditional", "ලංකාවේ උදේ කෑම"],
      ["sri-lankan-breakfast-village-farm-style", "ගැමි උදේ කෑම"],
      ["continental-breakfast", "බටහිර උදේ කෑම (සරල)"],
      ["full-english-western-breakfast", "බටහිර උදේ කෑම (පුරා)"],
      ["sri-lankan-lunch-classic", "ලංකාවේ දවල් කෑම"],
      ["sri-lankan-lunch-village-farm-style", "ගැමි දවල් කෑම"],
      ["continental-western-lunch", "බටහිර දවල් කෑම"],
      ["pasta-or-rice-bowl-lunch", "පාස්තා හෝ බත් බඳුන"],
      ["sri-lankan-dinner-classic", "ලංකාවේ රෑ කෑම"],
      ["sri-lankan-dinner-village-farm-style", "ගැමි රෑ කෑම"],
      ["western-grilled-dinner", "බටහිර ග්‍රිල් රෑ කෑම"],
      ["pasta-dinner", "පාස්තා රෑ කෑම"],
    ],
  },
  {
    category: "සුප් සහ කෙටි කෑම",
    dishes: [
      ["cream-of-wild-mushroom-soup", "හතු සුප්"],
      ["roasted-tomato-and-basil-soup", "තක්කාලි සුප්"],
      ["sri-lankan-spicy-chicken-and-corn-soup", "කුකුල් මස් සහ බඩඉරිඟු සුප්"],
      ["garlic-butter-chicken", "සුදුළූණු බටර් චිකන්"],
      ["crispy-vegetable-spring-rolls", "එළවළු රෝල්ස්"],
    ],
  },
  {
    category: "සලාද",
    dishes: [
      ["classic-caesar-salad", "සීසර් සලාද"],
      ["sri-lankan-green-mango-and-avocado-salad", "අමු අඹ සහ අලිගැටපේර සලාද"],
      ["villa-tea-garden-salad", "තේ වත්ත සලාද"],
    ],
  },
  {
    category: "ප්‍රධාන කෑම සහ ග්‍රිල්",
    dishes: [
      ["grilled-fresh-catch-of-the-day", "අද අල්ලපු මාළු ග්‍රිල්"],
      ["pan-seared-chicken-breast", "බැදපු චිකන්"],
      ["villa-gourmet-beef-chicken-burger", "හරක් මස් / චිකන් බර්ගර්"],
      ["grilled-pork-chops-with-bbq-glaze", "ග්‍රිල් කරපු ඌරු මස්"],
    ],
  },
  {
    category: "පාස්තා සහ බත්",
    dishes: [
      ["spaghetti-carbonara-bolognese", "ස්පැගටි"],
      ["penne-arrabbiata", "සැර පාස්තා"],
      ["villa-special-mixed-fried-rice-noodles", "මික්ස් ෆ්‍රයිඩ් රයිස් / නූඩ්ල්ස්"],
      ["vegetable-chopsuey-rice", "එළවළු චොප්සුයි බත්"],
    ],
  },
  {
    category: "තේ වෙලාවට කෑම",
    dishes: [
      ["hot-butter-cuttlefish", "හොට් බටර් දැල්ලෝ"],
      ["spicy-devilled-sausages", "සොසේජස් ඩෙවල්"],
      ["basket-of-french-fries", "අල චිප්ස්"],
      ["sri-lankan-fried-cassava-chips", "මඤ්ඤොක්කා චිප්ස්"],
    ],
  },
  {
    category: "අතුරුපස",
    dishes: [
      ["traditional-curd-and-kithul-treacle", "මී කිරි සහ කිතුල් පැණි"],
      ["sri-lankan-watalappan", "වටලප්පන්"],
      ["warm-chocolate-lava-cake", "චොකලට් කේක්"],
      ["tropical-fresh-fruit-salad-with-ice-cream", "පලතුරු සලාද සහ අයිස්ක්‍රීම්"],
    ],
  },
  {
    category: "බීම",
    dishes: [
      ["fresh-tropical-fruit-juices", "පලතුරු යුෂ"],
      ["fresh-king-coconut", "තැඹිලි"],
      ["ceylon-pure-tea-spiced-chai-green-tea", "තේ"],
      ["barista-coffee", "කෝපි"],
      ["soft-drinks-and-chilled-mineral-water", "සිසිල් බීම සහ වතුර"],
    ],
  },
];

/** Simple everyday meals for villa staff (not the guest menu). */
export const STAFF_MENU: { category: string; dishes: Dish[] }[] = [
  {
    category: "සේවක උදේ කෑම",
    dishes: [
      ["staff-bread-dhal", "පාන් සහ පරිප්පු"],
      ["staff-string-hoppers", "ඉඳිආප්ප සහ හොදි"],
      ["staff-milk-rice", "කිරිබත් සහ ලුණුමිරිස්"],
      ["staff-pittu", "පිට්ටු සහ පොල් සම්බෝල"],
    ],
  },
  {
    category: "සේවක දවල් / රෑ කෑම",
    dishes: [
      ["staff-rice-veg", "බත් සහ එළවළු කරි"],
      ["staff-rice-chicken", "බත් සහ කුකුල් මස් කරිය"],
      ["staff-rice-fish", "බත් සහ මාළු කරිය"],
      ["staff-rice-egg", "බත් සහ බිත්තර කරිය"],
      ["staff-fried-rice", "සරල ෆ්‍රයිඩ් රයිස්"],
    ],
  },
  {
    category: "සේවක හවස තේ",
    dishes: [
      ["staff-tea-biscuits", "තේ සහ බිස්කට්"],
      ["staff-tea-snack", "තේ සහ කෙටි කෑම"],
    ],
  },
];

export const CATEGORIES = MENU.map((m) => m.category);
export const STAFF_CATEGORIES = STAFF_MENU.map((m) => m.category);

/** Id for a dish the chef adds. Works for Sinhala names too. */
export function newDishId(name: string) {
  const latin = name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return latin || `dish-${Date.now().toString(36)}`;
}
