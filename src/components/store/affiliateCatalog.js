// Shared affiliate catalog for Health now and the broader Personal store later.
export const AMAZON_ASSOCIATE_TAG = "syncworksapp-20";

export const SEEQ_AFFILIATE_URL =
  "https://www.seeqsupply.com/JACOB78279";

export const WEWARD_REFERRAL_URL =
  "https://wewardapp.go.link/profile?adj_t=1rg2xpwh&userId=22865998";

export function amazonSearchUrl(query) {
  const params = new URLSearchParams({
    k: String(query || "fitness").trim() || "fitness",
    tag: AMAZON_ASSOCIATE_TAG,
  });

  return `https://www.amazon.com/s?${params.toString()}`;
}

export const HEALTH_STORE_CATEGORIES = [
  { id: "all", label: "For You" },
  { id: "protein", label: "Protein" },
  { id: "creatine", label: "Creatine" },
  { id: "preworkout", label: "Pre-Workout" },
  { id: "hydration", label: "Hydration" },
  { id: "recovery", label: "Recovery" },
  { id: "equipment", label: "Equipment" },
  { id: "home-gym", label: "Home Gym" },
  { id: "meal-prep", label: "Meal Prep" },
];

export const HEALTH_STORE_ITEMS = [
  {
    id: "protein-powder",
    category: "protein",
    title: "Protein Powder",
    eyebrow: "Recovery fuel",
    description:
      "A convenient way to help close a daily protein gap when food alone is not practical.",
    query: "protein powder high protein",
    badge: "Popular",
  },
  {
    id: "creatine-monohydrate",
    category: "creatine",
    title: "Creatine Monohydrate",
    eyebrow: "Training staple",
    description:
      "A common performance supplement for people who choose to include creatine in their training routine.",
    query: "creatine monohydrate powder",
    badge: "Strength",
  },
  {
    id: "preworkout",
    category: "preworkout",
    title: "Pre-Workout",
    eyebrow: "Before training",
    description:
      "Browse pre-workout options. Review caffeine and stimulant content before choosing a product.",
    query: "pre workout powder fitness",
    badge: "Energy",
  },
  {
    id: "electrolytes",
    category: "hydration",
    title: "Electrolytes",
    eyebrow: "Hydration",
    description:
      "Useful to browse when heat, sweat, or longer training sessions increase fluid needs.",
    query: "electrolyte powder hydration fitness",
    badge: "Hydrate",
  },
  {
    id: "shaker",
    category: "protein",
    title: "Shaker Bottles",
    eyebrow: "Gym bag",
    description:
      "Simple bottles for protein, hydration mixes, and grab-and-go training days.",
    query: "protein shaker bottle gym",
    badge: "Everyday",
  },
  {
    id: "lifting-straps",
    category: "equipment",
    title: "Lifting Straps",
    eyebrow: "Strength gear",
    description:
      "Browse grip-support options for pulling movements and heavier training sessions.",
    query: "lifting straps weightlifting",
    badge: "Pull Day",
  },
  {
    id: "resistance-bands",
    category: "equipment",
    title: "Resistance Bands",
    eyebrow: "Flexible training",
    description:
      "Portable resistance for warmups, accessory work, travel, and home sessions.",
    query: "resistance bands fitness set",
    badge: "Portable",
  },
  {
    id: "adjustable-dumbbells",
    category: "home-gym",
    title: "Adjustable Dumbbells",
    eyebrow: "Home gym",
    description:
      "A space-saving way to add multiple working loads to a home training setup.",
    query: "adjustable dumbbells home gym",
    badge: "Home Gym",
  },
  {
    id: "bench",
    category: "home-gym",
    title: "Adjustable Benches",
    eyebrow: "Home gym",
    description:
      "Browse flat and adjustable benches for presses, rows, and accessory work.",
    query: "adjustable workout bench home gym",
    badge: "Setup",
  },
  {
    id: "foam-roller",
    category: "recovery",
    title: "Foam Rollers",
    eyebrow: "Recovery gear",
    description:
      "A simple recovery accessory for mobility work and post-training routines.",
    query: "foam roller muscle recovery",
    badge: "Recovery",
  },
  {
    id: "massage-gun",
    category: "recovery",
    title: "Massage Tools",
    eyebrow: "Recovery gear",
    description:
      "Browse handheld recovery tools for people who prefer them as part of a mobility routine.",
    query: "massage gun muscle recovery fitness",
    badge: "Recovery",
  },
  {
    id: "meal-prep",
    category: "meal-prep",
    title: "Meal Prep Containers",
    eyebrow: "Nutrition setup",
    description:
      "Make planned meals and portions easier to carry through a busy training week.",
    query: "meal prep containers reusable",
    badge: "Nutrition",
  },
  {
    id: "food-scale",
    category: "meal-prep",
    title: "Food Scales",
    eyebrow: "Nutrition setup",
    description:
      "Useful for people who choose to measure portions while learning their nutrition targets.",
    query: "digital food scale nutrition meal prep",
    badge: "Tracking",
  },
];
