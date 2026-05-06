import { getAiBaseUrl } from "@/shared/api/strapi"
import type { Product, ParseResult, RecipeResult, PriceCap, RecurringItem, DietGoal, CookingPreference } from "./types"

export async function searchRecipe(text: string, products: Product[], signal?: AbortSignal, brand?: string): Promise<RecipeResult | null> {
  try {
    const res = await fetch(`${getAiBaseUrl()}/vkusvill/recipe-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        brand,
        products: products.map(p => ({ id: p.id, name: p.name, category: p.category })),
      }),
      signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      recipeName: typeof data.recipeName === "string" ? data.recipeName : "",
      neededIds: Array.isArray(data.neededIds) ? data.neededIds : [],
      missingItems: Array.isArray(data.missingItems) ? data.missingItems : [],
    }
  } catch {
    return null
  }
}

export async function parseWithClaude(text: string, products: Product[], signal?: AbortSignal, brand?: string): Promise<ParseResult | null> {
  try {
    const res = await fetch(`${getAiBaseUrl()}/vkusvill/parse-prefs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        brand,
        products: products.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price, unit: p.unit })),
      }),
      signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      excludeIngredients: Array.isArray(data.excludeIngredients) ? data.excludeIngredients : [],
      hideIds: Array.isArray(data.hideIds) ? data.hideIds : [],
      favorIds: Array.isArray(data.favorIds) ? data.favorIds : [],
      priceCaps: Array.isArray(data.priceCaps)
        ? data.priceCaps.filter(
            (c: unknown): c is PriceCap =>
              typeof c === "object" && c !== null && typeof (c as PriceCap).category === "string" && typeof (c as PriceCap).maxPrice === "number",
          )
        : [],
      household: data.household && typeof data.household === "object"
        ? {
            householdSize: Number(data.household.householdSize) || 0,
            kidsAges: Array.isArray(data.household.kidsAges)
              ? data.household.kidsAges.filter((a: unknown): a is number => typeof a === "number")
              : [],
          }
        : { householdSize: 0, kidsAges: [] },
      dietGoal: typeof data.dietGoal === "string" ? (data.dietGoal as DietGoal) : "none",
      cookingPreference: typeof data.cookingPreference === "string" ? (data.cookingPreference as CookingPreference) : "none",
      recurring: Array.isArray(data.recurring)
        ? data.recurring.filter(
            (r: unknown): r is RecurringItem =>
              typeof r === "object" && r !== null && typeof (r as RecurringItem).productHint === "string" && typeof (r as RecurringItem).everyDays === "number",
          )
        : [],
    }
  } catch {
    return null
  }
}
