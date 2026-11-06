// Villa menu taken from https://kurunduwatta-hospitality.vercel.app/dining
// The website lists dishes only, so ingredients start empty and the chef
// fills in per-person quantities on the Recipes page.

export const MENU: { category: string; dishes: string[] }[] = [
  {
    category: "Sri Lankan Signature Dishes",
    dishes: [
      "Traditional Sri Lankan Rice & Curry Set",
      "Sri Lankan Seafood Curry Pot",
      "Devilled Dish",
      "Live Style Kothu Roti",
      "Pol Roti Platter",
    ],
  },
  {
    category: "Buffets",
    dishes: ["Breakfast Buffet", "Lunch Buffet", "Dinner Buffet", "High Tea"],
  },
  {
    category: "Live BBQ Night",
    dishes: [
      "Classic Meat & Poultry BBQ",
      "Surf & Turf / Seafood & Meat BBQ",
      "Grand Villa BBQ & Live Station",
    ],
  },
  {
    category: "Set Menus",
    dishes: [
      "Sri Lankan Breakfast (Traditional)",
      "Sri Lankan Breakfast (Village / Farm Style)",
      "Continental Breakfast",
      "Full English / Western Breakfast",
      "Sri Lankan Lunch (Classic)",
      "Sri Lankan Lunch (Village / Farm Style)",
      "Continental / Western Lunch",
      "Pasta or Rice Bowl Lunch",
      "Sri Lankan Dinner (Classic)",
      "Sri Lankan Dinner (Village / Farm Style)",
      "Western Grilled Dinner",
      "Pasta Dinner",
    ],
  },
  {
    category: "Soups & Appetizers",
    dishes: [
      "Cream of Wild Mushroom Soup",
      "Roasted Tomato & Basil Soup",
      "Sri Lankan Spicy Chicken & Corn Soup",
      "Garlic Butter Chicken",
      "Crispy Vegetable Spring Rolls",
    ],
  },
  {
    category: "Salads",
    dishes: [
      "Classic Caesar Salad",
      "Sri Lankan Green Mango & Avocado Salad",
      "Villa Tea Garden Salad",
    ],
  },
  {
    category: "International Mains & Grill",
    dishes: [
      "Grilled Fresh Catch of the Day",
      "Pan-Seared Chicken Breast",
      "Villa Gourmet Beef / Chicken Burger",
      "Grilled Pork Chops with BBQ Glaze",
    ],
  },
  {
    category: "Pasta & Rice",
    dishes: [
      "Spaghetti Carbonara / Bolognese",
      "Penne Arrabbiata",
      "Villa Special Mixed Fried Rice / Noodles",
      "Vegetable Chopsuey Rice",
    ],
  },
  {
    category: "Snacks & Tea-Time Bites",
    dishes: [
      "Hot Butter Cuttlefish",
      "Spicy Devilled Sausages",
      "Basket of French Fries",
      "Sri Lankan Fried Cassava Chips",
    ],
  },
  {
    category: "Desserts",
    dishes: [
      "Traditional Curd & Kithul Treacle",
      "Sri Lankan Watalappan",
      "Warm Chocolate Lava Cake",
      "Tropical Fresh Fruit Salad with Ice Cream",
    ],
  },
  {
    category: "Beverages",
    dishes: [
      "Fresh Tropical Fruit Juices",
      "Fresh King Coconut",
      "Ceylon Pure Tea / Spiced Chai / Green Tea",
      "Barista Coffee",
      "Soft Drinks & Chilled Mineral Water",
    ],
  },
];

export const CATEGORIES = MENU.map((m) => m.category);

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
