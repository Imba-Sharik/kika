export type ProductTag =
  | "ready"
  | "quick"
  | "scratch"
  | "high-protein"
  | "low-carb"
  | "high-carb"
  | "low-cal"
  | "kids-friendly"

export type Product = {
  id: string
  name: string
  emoji: string
  price: number
  unit: string
  category: string
  ingredients: string[]
  tags: ProductTag[]
}

export type PriceCap = { category: string; maxPrice: number }
export type Household = { householdSize: number; kidsAges: number[] }
export type DietGoal = "none" | "lose-weight" | "gain-muscle" | "balanced" | "low-carb" | "keto" | "detox"
export type CookingPreference = "none" | "ready" | "quick" | "scratch"
export type RecurringItem = { productHint: string; everyDays: number }

export type ParseResult = {
  excludeIngredients: string[]
  hideIds: string[]
  favorIds: string[]
  priceCaps: PriceCap[]
  household: Household
  dietGoal: DietGoal
  cookingPreference: CookingPreference
  recurring: RecurringItem[]
}

export const EMPTY_RESULT: ParseResult = {
  excludeIngredients: [],
  hideIds: [],
  favorIds: [],
  priceCaps: [],
  household: { householdSize: 0, kidsAges: [] },
  dietGoal: "none",
  cookingPreference: "none",
  recurring: [],
}

export type RecipeResult = {
  recipeName: string
  neededIds: string[]
  missingItems: string[]
}

export type BannerFilter = {
  source: "profile" | "hyperlocal"
  title: string
  productIds: string[]
}
