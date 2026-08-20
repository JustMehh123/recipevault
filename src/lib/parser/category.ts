import type { GroceryCategory } from "@/types";

/**
 * Ordered keyword -> category lookup table used to file an ingredient under
 * a grocery aisle. Order matters: more specific keywords should appear
 * before generic ones since the first match wins.
 */
const CATEGORY_KEYWORDS: Array<[GroceryCategory, string[]]> = [
  [
    "Produce",
    [
      "lettuce", "spinach", "kale", "arugula", "cabbage", "broccoli", "cauliflower",
      "carrot", "celery", "onion", "shallot", "garlic", "ginger", "potato", "sweet potato",
      "tomato", "cucumber", "zucchini", "squash", "pepper", "chili", "jalapeno", "avocado",
      "mushroom", "corn", "pea", "bean sprout", "scallion", "green onion", "leek", "radish",
      "beet", "asparagus", "eggplant", "apple", "banana", "orange", "lemon", "lime", "berry",
      "strawberry", "blueberry", "raspberry", "grape", "melon", "mango", "pineapple", "pear",
      "peach", "plum", "cherry", "kiwi", "cilantro", "parsley", "basil", "mint", "dill",
      "chive", "rosemary", "thyme", "sage", "herb", "fruit", "vegetable", "watermelon",
    ],
  ],
  [
    "Meat & Seafood",
    [
      "chicken", "beef", "pork", "lamb", "turkey", "bacon", "sausage", "ham", "steak",
      "ground beef", "ground turkey", "mince", "shrimp", "prawn", "salmon", "tuna", "fish",
      "cod", "tilapia", "crab", "lobster", "clam", "mussel", "scallop", "meat", "chorizo",
      "pepperoni", "anchovy", "duck", "veal",
    ],
  ],
  [
    "Dairy & Eggs",
    [
      "milk", "cream", "cheese", "butter", "yogurt", "yoghurt", "egg", "mozzarella",
      "parmesan", "cheddar", "feta", "ricotta", "sour cream", "buttermilk", "half and half",
      "cream cheese", "mascarpone", "ghee", "custard",
    ],
  ],
  [
    "Bakery",
    [
      "bread", "bun", "bagel", "tortilla", "pita", "roll", "baguette", "croissant",
      "naan", "biscuit", "muffin", "pastry", "pie crust", "dough", "breadcrumb",
    ],
  ],
  [
    "Frozen",
    ["frozen", "ice cream", "popsicle", "puff pastry"],
  ],
  [
    "Spices & Condiments",
    [
      "salt", "pepper", "cumin", "paprika", "cinnamon", "nutmeg", "clove", "cardamom",
      "turmeric", "oregano", "chili powder", "curry powder", "vanilla", "bay leaf",
      "mustard", "ketchup", "mayonnaise", "mayo", "soy sauce", "hot sauce", "vinegar",
      "sriracha", "worcestershire", "sauce", "spice", "seasoning", "extract", "syrup",
      "honey", "jam", "jelly", "salsa", "pesto", "tahini", "miso", "sesame oil",
    ],
  ],
  [
    "Beverages",
    ["water", "juice", "soda", "wine", "beer", "coffee", "tea", "broth", "stock", "cider"],
  ],
  [
    "Pantry",
    [
      "flour", "sugar", "rice", "pasta", "noodle", "oat", "cereal", "oil", "olive oil",
      "vegetable oil", "canola oil", "baking powder", "baking soda", "yeast", "cornstarch",
      "cornmeal", "bread crumb", "panko", "lentil", "chickpea", "bean", "quinoa", "nut",
      "almond", "walnut", "pecan", "cashew", "peanut", "peanut butter", "chocolate", "cocoa",
      "coconut milk", "coconut", "can of", "canned", "tomato paste", "tomato sauce",
      "stock cube", "bouillon", "gelatin", "raisin", "date", "seed", "granola", "tortilla chip",
    ],
  ],
];

/** Categorizes an ingredient by name for grocery-aisle grouping. */
export function categorizeIngredient(name: string): GroceryCategory {
  const normalized = name.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category;
    }
  }
  return "Other";
}
