import type { Product } from "./types"

// Travel-каталог для /aviasales. Каждая «карточка товара» — направление
// (route + средняя длительность + цена round-trip из Москвы для одного человека).
// Используем тот же Product-тип чтобы не плодить типы — emoji = флаг,
// price = средняя цена round-trip в ₽, unit = "за человека", category = регион.

export const PRODUCTS_TRAVEL: Product[] = [
  // Россия
  { id: "msk-sochi", name: "Москва → Сочи, 7 дней", emoji: "🏖️", price: 12000, unit: "за человека", category: "Россия", ingredients: [], tags: ["ready"] },
  { id: "msk-kaliningrad", name: "Москва → Калининград, 4 дня", emoji: "🌊", price: 8000, unit: "за человека", category: "Россия", ingredients: [], tags: ["ready"] },
  { id: "msk-kazan", name: "Москва → Казань, 3 дня", emoji: "🕌", price: 7000, unit: "за человека", category: "Россия", ingredients: [], tags: ["ready"] },
  { id: "msk-spb", name: "Москва → СПб, weekend", emoji: "🎭", price: 5000, unit: "за человека", category: "Россия", ingredients: [], tags: ["ready"] },
  { id: "msk-altai", name: "Москва → Горно-Алтайск, 7 дней", emoji: "🏔️", price: 22000, unit: "за человека", category: "Россия", ingredients: [], tags: ["ready"] },

  // СНГ / Кавказ (visa-free)
  { id: "msk-tbilisi", name: "Москва → Тбилиси, 5 дней", emoji: "🇬🇪", price: 22000, unit: "за человека", category: "СНГ", ingredients: [], tags: ["ready"] },
  { id: "msk-yerevan", name: "Москва → Ереван, 4 дня", emoji: "🇦🇲", price: 19000, unit: "за человека", category: "СНГ", ingredients: [], tags: ["ready"] },
  { id: "msk-baku", name: "Москва → Баку, 4 дня", emoji: "🇦🇿", price: 24000, unit: "за человека", category: "СНГ", ingredients: [], tags: ["ready"] },
  { id: "msk-tashkent", name: "Москва → Ташкент, 5 дней", emoji: "🇺🇿", price: 17000, unit: "за человека", category: "СНГ", ingredients: [], tags: ["ready"] },
  { id: "msk-bishkek", name: "Москва → Бишкек, 5 дней", emoji: "🇰🇬", price: 18000, unit: "за человека", category: "СНГ", ingredients: [], tags: ["ready"] },
  { id: "msk-almaty", name: "Москва → Алматы, 5 дней", emoji: "🇰🇿", price: 21000, unit: "за человека", category: "СНГ", ingredients: [], tags: ["ready"] },
  { id: "msk-minsk", name: "Москва → Минск, weekend", emoji: "🇧🇾", price: 6000, unit: "за человека", category: "СНГ", ingredients: [], tags: ["ready"] },

  // Ближний Восток / Азия (visa-free или on-arrival)
  { id: "msk-istanbul", name: "Москва → Стамбул, weekend", emoji: "🇹🇷", price: 18000, unit: "за человека", category: "Ближний Восток", ingredients: [], tags: ["ready"] },
  { id: "msk-antalya", name: "Москва → Анталия, 7 дней", emoji: "🌅", price: 32000, unit: "за человека", category: "Ближний Восток", ingredients: [], tags: ["ready"] },
  { id: "msk-dubai", name: "Москва → Дубай, 5 дней", emoji: "🇦🇪", price: 35000, unit: "за человека", category: "Ближний Восток", ingredients: [], tags: ["ready"] },
  { id: "msk-cairo", name: "Москва → Каир, 6 дней", emoji: "🇪🇬", price: 32000, unit: "за человека", category: "Африка", ingredients: [], tags: ["ready"] },

  // Юго-Восточная Азия
  { id: "msk-bali", name: "Москва → Бали, 10 дней", emoji: "🇮🇩", price: 65000, unit: "за человека", category: "Азия", ingredients: [], tags: ["ready"] },
  { id: "msk-bangkok", name: "Москва → Бангкок, 10 дней", emoji: "🇹🇭", price: 55000, unit: "за человека", category: "Азия", ingredients: [], tags: ["ready"] },
  { id: "msk-phuket", name: "Москва → Пхукет, 10 дней", emoji: "🏝️", price: 70000, unit: "за человека", category: "Азия", ingredients: [], tags: ["ready"] },
  { id: "msk-vietnam", name: "Москва → Нячанг, 10 дней", emoji: "🇻🇳", price: 60000, unit: "за человека", category: "Азия", ingredients: [], tags: ["ready"] },
  { id: "msk-male", name: "Москва → Мальдивы, 7 дней", emoji: "🇲🇻", price: 95000, unit: "за человека", category: "Азия", ingredients: [], tags: ["ready"] },
  { id: "msk-tokyo", name: "Москва → Токио, 7 дней", emoji: "🇯🇵", price: 110000, unit: "за человека", category: "Азия", ingredients: [], tags: ["ready"] },
  { id: "msk-seoul", name: "Москва → Сеул, 7 дней", emoji: "🇰🇷", price: 75000, unit: "за человека", category: "Азия", ingredients: [], tags: ["ready"] },
  { id: "msk-shanghai", name: "Москва → Шанхай, 5 дней", emoji: "🇨🇳", price: 60000, unit: "за человека", category: "Азия", ingredients: [], tags: ["ready"] },

  // Европа (Шенген — нужна виза)
  { id: "msk-belgrade", name: "Москва → Белград, 5 дней", emoji: "🇷🇸", price: 28000, unit: "за человека", category: "Европа", ingredients: [], tags: ["ready"] },
  { id: "msk-rome", name: "Москва → Рим, 5 дней", emoji: "🇮🇹", price: 45000, unit: "за человека", category: "Европа", ingredients: [], tags: ["ready"] },
  { id: "msk-paris", name: "Москва → Париж, 5 дней", emoji: "🇫🇷", price: 50000, unit: "за человека", category: "Европа", ingredients: [], tags: ["ready"] },
  { id: "msk-barcelona", name: "Москва → Барселона, 5 дней", emoji: "🇪🇸", price: 42000, unit: "за человека", category: "Европа", ingredients: [], tags: ["ready"] },
  { id: "msk-prague", name: "Москва → Прага, 5 дней", emoji: "🇨🇿", price: 35000, unit: "за человека", category: "Европа", ingredients: [], tags: ["ready"] },
  { id: "msk-budapest", name: "Москва → Будапешт, 4 дня", emoji: "🇭🇺", price: 32000, unit: "за человека", category: "Европа", ingredients: [], tags: ["ready"] },
  { id: "msk-reykjavik", name: "Москва → Рейкьявик, 5 дней", emoji: "🇮🇸", price: 85000, unit: "за человека", category: "Европа", ingredients: [], tags: ["ready"] },

  // Северная и Южная Америка
  { id: "msk-cuba", name: "Москва → Гавана, 10 дней", emoji: "🇨🇺", price: 95000, unit: "за человека", category: "Америка", ingredients: [], tags: ["ready"] },
  { id: "msk-mexico", name: "Москва → Канкун, 10 дней", emoji: "🇲🇽", price: 110000, unit: "за человека", category: "Америка", ingredients: [], tags: ["ready"] },
  { id: "msk-rio", name: "Москва → Рио-де-Жанейро, 10 дней", emoji: "🇧🇷", price: 130000, unit: "за человека", category: "Америка", ingredients: [], tags: ["ready"] },
  { id: "msk-lima", name: "Москва → Лима, 12 дней", emoji: "🇵🇪", price: 145000, unit: "за человека", category: "Америка", ingredients: [], tags: ["ready"] },

  // Африка / экзотика
  { id: "msk-zanzibar", name: "Москва → Занзибар, 7 дней", emoji: "🇹🇿", price: 80000, unit: "за человека", category: "Африка", ingredients: [], tags: ["ready"] },
  { id: "msk-marrakech", name: "Москва → Марракеш, 6 дней", emoji: "🇲🇦", price: 55000, unit: "за человека", category: "Африка", ingredients: [], tags: ["ready"] },
  { id: "msk-capetown", name: "Москва → Кейптаун, 10 дней", emoji: "🇿🇦", price: 120000, unit: "за человека", category: "Африка", ingredients: [], tags: ["ready"] },
]
