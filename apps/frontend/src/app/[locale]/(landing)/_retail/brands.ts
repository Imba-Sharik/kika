import type { LucideIcon } from "lucide-react"
import {
  User, ChefHat, Mic, Palette, MapPin, Target, Camera, Gem, RotateCw,
  Truck, Percent, Smartphone, Tag, Zap, Clock, Snowflake,
} from "lucide-react"

export type BusinessImpactItem = {
  Icon: LucideIcon
  feature: string
  metric: string
  metricLabel: string
  desc: string
  source: string
}

export type PrimeBenefit = {
  Icon: LucideIcon
  title: string
  subtitle: string
}

export type Brand = {
  key: "vkusvill" | "pyaterochka" | "magnit" | "samokat" | "perekrestok" | "chizhik" | "azbuka" | "ozon"
  name: string
  nameLogo: string
  /** Цвет акцентов UI (кнопки, иконки, банеры). Может быть приглушённой версией бренда. */
  color: string
  /** Фирменный цвет лого. Опционально — fallback на color. */
  logoColor?: string
  /**
   * Доменная область бренда. Влияет на каталог продуктов, тексты UI и системные
   * промпты бэка (бэк параметризован brand.domain).
   * - "grocery" — еда (vkusvill, pyaterochka, magnit и т.д.). recipe = блюдо.
   * - "marketplace" — общий маркетплейс (ozon). recipe = «проект» или «подбор».
   */
  domain?: "grocery" | "marketplace"
  hero: { title: string; subtitle: string }
  profilePlaceholder: string
  prime: {
    name: string
    price: number
    badge: string
    subtitle: string
    benefits: PrimeBenefit[]
  }
  benchmarksLabel: string
  businessImpact: BusinessImpactItem[]
  totalImpact: {
    headline: string
    calculation: string
    payback: string
    cost: string
  }
}

const BASE_PROFILE_PLACEHOLDER = `# Мои предпочтения

что я люблю:
- обожаю помидоры и огурцы
- часто беру кофе

аллергии и диета:
- у меня аллергия на орехи
- я веган
- уберите продукты с пальмовым маслом

состав семьи:
- у меня дети 3 и 7 лет

цель питания:
- хочу похудеть · набираю массу · кето · детокс

готовка:
- не люблю готовить, только готовое

регулярные покупки:
- каждую неделю молоко, хлеб и яйца

бюджет:
- мясо дороже 500₽ не показывай`

const MARKETPLACE_PROFILE_PLACEHOLDER = `# Мои предпочтения

что я люблю и часто беру:
- техника Apple, ценю минимализм
- читаю бизнес-книги и фантастику
- занимаюсь йогой 3 раза в неделю

размеры:
- одежда M, обувь 42
- ребёнку 7 лет, рост 122

что не показывать:
- не люблю громоздкие гаджеты
- без китайских no-name брендов
- без подделок и реплик

проекты на ближайшее время:
- собираю домашний офис
- ремонт ванной комнаты
- ищу подарок маме на 60-летие, бюджет 15000₽

бюджет:
- электроника максимум 100000₽
- одежда до 10000₽ за вещь`

export const BRANDS: Record<Brand["key"], Brand> = {
  vkusvill: {
    key: "vkusvill",
    name: "ВкусВилл",
    nameLogo: "ВКУСВИЛЛ",
    color: "#5FB246",
    hero: {
      title: "Повседневные продукты",
      subtitle: "То, что обычно лежит в корзине каждую неделю",
    },
    profilePlaceholder: BASE_PROFILE_PLACEHOLDER,
    prime: {
      name: "ВкусВилл Prime",
      price: 299,
      badge: "Early Access",
      subtitle: "Спасибо что часто заказываете — Prime открыт активным покупателям",
      benefits: [
        { Icon: Truck, title: "Бесплатная доставка", subtitle: "с любой суммы (обычно от 1500₽)" },
        { Icon: Percent, title: "−10% на подписку", subtitle: "Молоко, хлеб, кофе на автоповторе" },
        { Icon: Smartphone, title: "Scan & Go", subtitle: "Самопробив в магазине без касс" },
      ],
    },
    benchmarksLabel: "Бенчмарки Walmart, Coupang, Amazon, Klarna, HelloFresh",
    businessImpact: [
      { Icon: User, feature: "Профиль + AI-фильтры товаров", metric: "+20%", metricLabel: "AOV", desc: "Персонализация под аллергии, диету, семью, бюджет", source: "Coupang +24%, Walmart +15%" },
      { Icon: ChefHat, feature: "Recipe search · «хочу блины»", metric: "+25%", metricLabel: "cart fill", desc: "AI собирает корзину под рецепт за один запрос", source: "HelloFresh +30% basket size" },
      { Icon: Mic, feature: "Voice-companion Кохана", metric: "+35%", metricLabel: "session time", desc: "Голос + auto-fill профиля и поиска", source: "Spotify Voice +42% engagement" },
      { Icon: Palette, feature: "AI-banner (профиль)", metric: "+30%", metricLabel: "CTR", desc: "Personalized creative vs static banners", source: "Klarna gen-ads +28%, Coupang +30%" },
      { Icon: MapPin, feature: "Hyperlocal banner (geo + weather)", metric: "+15%", metricLabel: "conversion", desc: "Согревающие супы в дождь, лимонад в жару", source: "Walmart geo-promo +18%" },
      { Icon: Target, feature: "Banner CTA → product filter", metric: "+15%", metricLabel: "click-to-buy", desc: "Один клик = готовая релевантная подборка", source: "Amazon discovery +12%" },
      { Icon: Camera, feature: "Photo-to-cart (Claude Vision)", metric: "+25%", metricLabel: "cart fill rate", desc: "Фоткай холодильник → AI заполняет корзину", source: "Walmart Spark +25% conversion" },
      { Icon: Gem, feature: "ВкусВилл Prime подписка", metric: "2.4x", metricLabel: "LTV", desc: "Lock-in через free delivery + Scan & Go", source: "Amazon Prime 2.4x, Walmart+ +58% freq" },
      { Icon: RotateCw, feature: "Subscribe & Save", metric: "30%", metricLabel: "repeat orders", desc: "Auto-replenishment с −10% скидкой", source: "Amazon S&S 30% юзеров retention" },
    ],
    totalImpact: {
      headline: "+5.6 млрд ₽/год incremental margin",
      calculation: "AOV +20% × frequency +30% × adoption 50% × 1M users",
      payback: "3-4 мес",
      cost: "~50M ₽",
    },
  },

  pyaterochka: {
    key: "pyaterochka",
    name: "Пятёрочка",
    nameLogo: "ПЯТЁРОЧКА",
    color: "#D85B47",
    logoColor: "#E2001A",
    hero: {
      title: "Повседневные продукты",
      subtitle: "То, что обычно лежит в корзине каждую неделю",
    },
    profilePlaceholder: BASE_PROFILE_PLACEHOLDER,
    prime: {
      name: "Пятёрочка+",
      price: 199,
      badge: "Бета",
      subtitle: "Расширенный кэшбек и приоритетная сборка для активных покупателей",
      benefits: [
        { Icon: Tag, title: "+5% кэшбек на всё", subtitle: "поверх обычных акций" },
        { Icon: Percent, title: "−15% на подписку", subtitle: "товары на автоповторе" },
        { Icon: Smartphone, title: "Scan & Go", subtitle: "Самопробив без очередей" },
      ],
    },
    benchmarksLabel: "Бенчмарки Walmart, Aldi, Tesco, Carrefour, Kroger",
    businessImpact: [
      { Icon: User, feature: "Профиль + бюджет-фильтры", metric: "+18%", metricLabel: "AOV", desc: "Удержание low-budget покупателей через персонализацию", source: "Aldi loyalty +15%, Walmart +15%" },
      { Icon: Tag, feature: "Recipe search · бюджетные рецепты", metric: "+22%", metricLabel: "basket size", desc: "AI подбирает блюдо под лимит бюджета", source: "Tesco recipe +18%, HelloFresh +30%" },
      { Icon: Mic, feature: "Voice-companion для пожилых", metric: "+40%", metricLabel: "session time", desc: "Голос — критично для 50+ аудитории Пятёрочки", source: "Walmart voice +35% senior usage" },
      { Icon: Palette, feature: "AI-баннер «акции для вас»", metric: "+28%", metricLabel: "CTR", desc: "Персональные скидки vs общие промо-полосы", source: "Kroger Boost +30%, Klarna +28%" },
      { Icon: MapPin, feature: "Hyperlocal banner (магазин у дома)", metric: "+20%", metricLabel: "conversion", desc: "Что есть в ближайшей Пятёрочке + погода", source: "Walmart geo-promo +18%, Carrefour +22%" },
      { Icon: Target, feature: "Banner CTA → готовый список", metric: "+15%", metricLabel: "click-to-buy", desc: "«Набрать недельный набор за 1500₽»", source: "Amazon discovery +12%, Tesco +14%" },
      { Icon: Camera, feature: "Photo-to-cart (фото чека)", metric: "+30%", metricLabel: "repeat purchase", desc: "Сканируй прошлый чек → корзина за секунду", source: "Walmart Spark +25%, Lidl scan +35%" },
      { Icon: Gem, feature: "Пятёрочка+ подписка", metric: "+58%", metricLabel: "frequency", desc: "Lock-in через cashback + free delivery", source: "Walmart+ +58% freq, Amazon Prime 2.4x LTV" },
      { Icon: RotateCw, feature: "Авто-доставка регулярки", metric: "32%", metricLabel: "repeat orders", desc: "Молоко, хлеб, бытовая химия по расписанию", source: "Amazon S&S 30%, Kroger Auto 35%" },
    ],
    totalImpact: {
      headline: "+12.4 млрд ₽/год incremental margin",
      calculation: "AOV +18% × frequency +32% × adoption 40% × 18M активных карт «Х5 Клуб»",
      payback: "5-7 мес",
      cost: "~120M ₽",
    },
  },

  magnit: {
    key: "magnit",
    name: "Магнит",
    nameLogo: "МАГНИТ",
    color: "#C8553D",
    logoColor: "#E30613",
    hero: {
      title: "Повседневные продукты",
      subtitle: "То, что обычно лежит в корзине каждую неделю",
    },
    profilePlaceholder: BASE_PROFILE_PLACEHOLDER,
    prime: {
      name: "Магнит Plus",
      price: 249,
      badge: "Семейная подписка",
      subtitle: "Семейный кэшбек, персональные акции и бесплатная доставка от 1000₽",
      benefits: [
        { Icon: Truck, title: "Бесплатная доставка от 1000₽", subtitle: "по всей России включая малые города" },
        { Icon: Tag, title: "Семейный кэшбек 7%", subtitle: "на детские товары и хозтовары" },
        { Icon: Percent, title: "−10% на подписку", subtitle: "товары первой необходимости" },
      ],
    },
    benchmarksLabel: "Бенчмарки Walmart, Carrefour, Tesco, Kroger, Coupang",
    businessImpact: [
      { Icon: User, feature: "Профиль + семейные фильтры", metric: "+22%", metricLabel: "AOV", desc: "Большие чеки семей 4+ через персонализацию", source: "Coupang +24%, Walmart family +20%" },
      { Icon: ChefHat, feature: "Recipe search · недельное меню", metric: "+28%", metricLabel: "basket size", desc: "AI собирает корзину на 7 дней под бюджет семьи", source: "HelloFresh +30%, Tesco +22%" },
      { Icon: Mic, feature: "Voice — для регионов и пожилых", metric: "+45%", metricLabel: "regional engagement", desc: "Голос ломает digital divide в малых городах", source: "Walmart voice +35%, Kroger senior +50%" },
      { Icon: Palette, feature: "AI-баннер «для вашей семьи»", metric: "+32%", metricLabel: "CTR", desc: "Возраст детей + регион → релевантный креатив", source: "Klarna +28%, Coupang +30%" },
      { Icon: MapPin, feature: "Hyperlocal по 17000 магазинам", metric: "+18%", metricLabel: "conversion", desc: "Что в ближайшем Магните + локальная погода", source: "Walmart geo +18%, Carrefour +22%" },
      { Icon: Target, feature: "Banner → недельная корзина", metric: "+20%", metricLabel: "click-to-buy", desc: "Готовый список «семья 4 чел, 5000₽/нед»", source: "Amazon discovery +12%, Tesco +18%" },
      { Icon: Camera, feature: "Photo-to-cart (фото холодильника)", metric: "+28%", metricLabel: "cart fill", desc: "Чего не хватает — AI добавит автоматически", source: "Walmart Spark +25%, Coupang Vision +30%" },
      { Icon: Gem, feature: "Магнит Plus подписка", metric: "2.2x", metricLabel: "LTV", desc: "Семейная лояльность + бесплатная доставка", source: "Walmart+ +58% freq, Amazon Prime 2.4x" },
      { Icon: RotateCw, feature: "Авто-доставка крупного семейного", metric: "35%", metricLabel: "repeat orders", desc: "Молоко 2×/нед, хлеб, крупы — auto", source: "Amazon S&S 30%, Kroger Boost 35%" },
    ],
    totalImpact: {
      headline: "+18.2 млрд ₽/год incremental margin",
      calculation: "AOV +22% × frequency +35% × adoption 35% × 27M активных лояльных",
      payback: "6-8 мес",
      cost: "~180M ₽",
    },
  },

  samokat: {
    key: "samokat",
    name: "Самокат",
    nameLogo: "САМОКАТ",
    color: "#E76F8B",
    logoColor: "#FF335F",
    hero: {
      title: "Повседневные продукты",
      subtitle: "То, что обычно лежит в корзине каждую неделю",
    },
    profilePlaceholder: BASE_PROFILE_PLACEHOLDER,
    prime: {
      name: "Самокат+",
      price: 169,
      badge: "Subscriber Beta",
      subtitle: "Бесплатная доставка за 15 минут на любую сумму, безлимит",
      benefits: [
        { Icon: Zap, title: "Доставка 15 минут", subtitle: "от 0₽, безлимит" },
        { Icon: Snowflake, title: "Эксклюзивы по сезону", subtitle: "сезонные товары для подписчиков" },
        { Icon: Clock, title: "Приоритетная сборка", subtitle: "ваш заказ собирают первым" },
      ],
    },
    benchmarksLabel: "Бенчмарки Gopuff, Getir, GoPuff, Uber Eats, DoorDash",
    businessImpact: [
      { Icon: User, feature: "Профиль + impulse-фильтры", metric: "+25%", metricLabel: "AOV", desc: "Снеки/напитки/готовое под настроение и время", source: "Gopuff +22%, Getir +25%" },
      { Icon: Zap, feature: "Recipe search · «хочу прямо сейчас»", metric: "+30%", metricLabel: "cart fill", desc: "«Закуска под футбол» → пиво + чипсы + сыр", source: "Uber Eats AI +28%, DoorDash +32%" },
      { Icon: Mic, feature: "Voice-companion на ходу", metric: "+50%", metricLabel: "session time", desc: "Голосом удобнее когда за рулём / в спортзале", source: "Spotify Voice +42%, Alexa +55%" },
      { Icon: Palette, feature: "AI-баннер по моменту", metric: "+35%", metricLabel: "CTR", desc: "«Сейчас 23:00 в пятницу» → пиво и чипсы", source: "Gopuff dynamic +35%, Klarna +28%" },
      { Icon: MapPin, feature: "Hyperlocal погода × время", metric: "+30%", metricLabel: "conversion", desc: "Жара → лимонад. Дождь → горячее. 22:00 → снеки", source: "Walmart geo +18%, Coupang weather +30%" },
      { Icon: Target, feature: "Banner CTA → готовый сет", metric: "+22%", metricLabel: "click-to-buy", desc: "«Утренний кофе» → корзина за секунду", source: "Amazon discovery +12%, Gopuff +25%" },
      { Icon: Camera, feature: "Photo-to-cart (что закончилось)", metric: "+30%", metricLabel: "cart fill", desc: "Фоткай пустую полку → 15 мин и привезли", source: "Walmart Spark +25%, Gopuff Vision +30%" },
      { Icon: Gem, feature: "Самокат+ подписка", metric: "2.6x", metricLabel: "LTV", desc: "Free 15-min доставка делает Самокат default", source: "DoorDash DashPass 2.6x, Uber One +35%" },
      { Icon: RotateCw, feature: "Утренний автопилот", metric: "40%", metricLabel: "repeat orders", desc: "Йогурт + банан + кофе каждое утро на 7 дней", source: "Amazon S&S 30%, Gopuff routines 42%" },
    ],
    totalImpact: {
      headline: "+8.8 млрд ₽/год incremental margin",
      calculation: "AOV +25% × frequency +40% × adoption 60% × 4M MAU",
      payback: "4-5 мес",
      cost: "~80M ₽",
    },
  },

  perekrestok: {
    key: "perekrestok",
    name: "Перекрёсток",
    nameLogo: "ПЕРЕКРЁСТОК",
    color: "#3B8E5C",
    logoColor: "#0E7C42",
    hero: {
      title: "Повседневные продукты",
      subtitle: "То, что обычно лежит в корзине каждую неделю",
    },
    profilePlaceholder: BASE_PROFILE_PLACEHOLDER,
    prime: {
      name: "Перекрёсток Клуб Premium",
      price: 349,
      badge: "Premium",
      subtitle: "Кэшбек 10%, приоритетная доставка и закрытые акции на премиум-ассортимент",
      benefits: [
        { Icon: Tag, title: "Кэшбек 10%", subtitle: "на готовую еду и фермерское" },
        { Icon: Truck, title: "Доставка от 0₽", subtitle: "приоритетная сборка свежего" },
        { Icon: Smartphone, title: "Scan & Go", subtitle: "Самопробив без касс" },
      ],
    },
    benchmarksLabel: "Бенчмарки Whole Foods, Waitrose, Carrefour Premium, M&S, Coupang",
    businessImpact: [
      { Icon: User, feature: "Профиль + premium-фильтры", metric: "+24%", metricLabel: "AOV", desc: "Премиум-аудитория ценит точность подбора", source: "Whole Foods +22%, Coupang +24%" },
      { Icon: ChefHat, feature: "Recipe search + готовая еда", metric: "+30%", metricLabel: "ready-to-eat AOV", desc: "AI комбинирует кулинарию + ингредиенты", source: "M&S Food +28%, Waitrose +30%" },
      { Icon: Mic, feature: "Voice — для занятых профи", metric: "+38%", metricLabel: "session time", desc: "Голос экономит 60-90 сек на заказ", source: "Spotify Voice +42%, Alexa Shopping +35%" },
      { Icon: Palette, feature: "AI-баннер «фермерское меню»", metric: "+32%", metricLabel: "CTR", desc: "Фокус на свежее, готовое, премиум", source: "Klarna +28%, Whole Foods digital +35%" },
      { Icon: MapPin, feature: "Hyperlocal · что свежего сейчас", metric: "+22%", metricLabel: "conversion", desc: "Поставки фермерского отображаются live", source: "Waitrose local +25%, Carrefour +22%" },
      { Icon: Target, feature: "Banner → готовое меню на день", metric: "+18%", metricLabel: "click-to-buy", desc: "«Лёгкий ужин из кулинарии» → корзина", source: "Amazon discovery +12%, M&S +20%" },
      { Icon: Camera, feature: "Photo-to-cart по фермерскому", metric: "+25%", metricLabel: "cart fill", desc: "Фото → AI распознаёт и подбирает свежее", source: "Walmart Spark +25%, Whole Foods +27%" },
      { Icon: Gem, feature: "Перекрёсток Клуб Premium", metric: "2.8x", metricLabel: "LTV", desc: "Premium-tier через кэшбек + закрытые акции", source: "Amazon Prime 2.4x, Costco Executive 3x" },
      { Icon: RotateCw, feature: "Авто-доставка фермерской регулярки", metric: "35%", metricLabel: "repeat orders", desc: "Хлеб, молоко, готовые блюда по графику", source: "Amazon S&S 30%, Walmart+ 35%" },
    ],
    totalImpact: {
      headline: "+9.4 млрд ₽/год incremental margin",
      calculation: "AOV +24% × frequency +28% × adoption 40% × 8M активных Premium-карт",
      payback: "5-7 мес",
      cost: "~95M ₽",
    },
  },

  azbuka: {
    key: "azbuka",
    name: "Азбука Вкуса",
    nameLogo: "АЗБУКА ВКУСА",
    color: "#1B4332",
    logoColor: "#0F3023",
    hero: {
      title: "Премиум-ассортимент",
      subtitle: "Гастрономия, фермерское, готовые блюда от шефов",
    },
    profilePlaceholder: BASE_PROFILE_PLACEHOLDER,
    prime: {
      name: "АВ Клуб Premium",
      price: 499,
      badge: "Premium",
      subtitle: "Закрытые винные дегустации, шеф-меню от ресторанов АВ и приоритетная сборка свежего",
      benefits: [
        { Icon: Tag, title: "Кэшбек 12%", subtitle: "на готовую кухню и винотеку" },
        { Icon: Truck, title: "Доставка от 0₽", subtitle: "приоритетная сборка фермерского" },
        { Icon: Smartphone, title: "Закрытые предзаказы", subtitle: "редкие позиции до выкладки в зал" },
      ],
    },
    benchmarksLabel: "Бенчмарки Whole Foods, Waitrose, Eataly, Erewhon, Selfridges Food",
    businessImpact: [
      { Icon: User, feature: "Профиль + premium-фильтры", metric: "+26%", metricLabel: "AOV", desc: "AI помнит вино, сыр, диету — премиум ценит точность", source: "Whole Foods +22%, Erewhon +28%" },
      { Icon: ChefHat, feature: "Recipe search + кухня АВ", metric: "+34%", metricLabel: "ready-to-eat AOV", desc: "AI комбинирует готовое из ресторанов АВ + ингредиенты", source: "M&S Food +28%, Eataly +35%" },
      { Icon: Mic, feature: "Voice — для занятых HNW", metric: "+40%", metricLabel: "session time", desc: "Голос экономит 60-90 сек на премиум-заказ", source: "Spotify Voice +42%, Alexa Shopping +35%" },
      { Icon: Palette, feature: "AI-баннер «гастро-сезон»", metric: "+34%", metricLabel: "CTR", desc: "Сезон трюфеля, новый заход устриц, винные пары", source: "Klarna +28%, Whole Foods digital +35%" },
      { Icon: MapPin, feature: "Hyperlocal · что свежего сейчас", metric: "+24%", metricLabel: "conversion", desc: "Свежие поставки фермерского/рыбы — live по магазину", source: "Waitrose local +25%, Eataly +28%" },
      { Icon: Target, feature: "Banner → шеф-меню на ужин", metric: "+22%", metricLabel: "click-to-buy", desc: "«Ужин на двоих с вином 4500₽» → корзина", source: "Amazon discovery +12%, M&S +24%" },
      { Icon: Camera, feature: "Photo-to-cart премиум-фото", metric: "+28%", metricLabel: "cart fill", desc: "Фото блюда из ресторана → AI собирает рецепт", source: "Walmart Spark +25%, Whole Foods +30%" },
      { Icon: Gem, feature: "АВ Клуб Premium подписка", metric: "3.1x", metricLabel: "LTV", desc: "Premium-tier через кэшбек 12% + закрытые дегустации", source: "Costco Executive 3x, Amazon Prime 2.4x" },
      { Icon: RotateCw, feature: "Авто-поставка вина и фермерского", metric: "38%", metricLabel: "repeat orders", desc: "Винный клуб + сыры/хлеб от пекарен по графику", source: "Amazon S&S 30%, Naked Wines 40%" },
    ],
    totalImpact: {
      headline: "+6.8 млрд ₽/год incremental margin",
      calculation: "AOV +26% × frequency +30% × adoption 45% × 3M активных Premium-карт",
      payback: "4-6 мес",
      cost: "~85M ₽",
    },
  },

  chizhik: {
    key: "chizhik",
    name: "Чижик",
    nameLogo: "ЧИЖИК",
    color: "#D4A82C",
    logoColor: "#F5C518",
    hero: {
      title: "Повседневные продукты",
      subtitle: "То, что обычно лежит в корзине каждую неделю",
    },
    profilePlaceholder: BASE_PROFILE_PLACEHOLDER,
    prime: {
      name: "Чижик+",
      price: 99,
      badge: "Бета",
      subtitle: "Доступная подписка для частых покупок и максимальной выгоды",
      benefits: [
        { Icon: Tag, title: "−5% на всё", subtitle: "поверх и без того низких цен" },
        { Icon: Percent, title: "−15% на подписку", subtitle: "крупы, бакалея, бытовая химия" },
        { Icon: Clock, title: "Бронь дефицита", subtitle: "товары по акции — заранее" },
      ],
    },
    benchmarksLabel: "Бенчмарки Aldi, Lidl, Trader Joe's, Action, Dollar General",
    businessImpact: [
      { Icon: User, feature: "Профиль + бюджет-фильтры", metric: "+15%", metricLabel: "AOV", desc: "AI подбирает дешёвые альтернативы", source: "Aldi loyalty +15%, Lidl Plus +18%" },
      { Icon: ChefHat, feature: "Recipe search · бюджет 200₽/блюдо", metric: "+25%", metricLabel: "basket size", desc: "AI собирает блюдо под жёсткий лимит", source: "HelloFresh +30%, Lidl recipes +20%" },
      { Icon: Mic, feature: "Voice — для рабочей аудитории", metric: "+35%", metricLabel: "session time", desc: "Голос быстрее на ходу и без приложения", source: "Walmart voice +35%, Alexa +42%" },
      { Icon: Palette, feature: "AI-баннер «акция этой недели»", metric: "+25%", metricLabel: "CTR", desc: "Скидки и акции — главная мотивация", source: "Aldi Specials +28%, Klarna +28%" },
      { Icon: MapPin, feature: "Hyperlocal · что в магазине у дома", metric: "+18%", metricLabel: "conversion", desc: "Дискаунтеры — формат «рядом»", source: "Action +20%, Walmart geo +18%" },
      { Icon: Target, feature: "Banner → корзина «1500₽ на неделю»", metric: "+18%", metricLabel: "click-to-buy", desc: "Готовый недельный набор по бюджету", source: "Amazon discovery +12%, Aldi +20%" },
      { Icon: Camera, feature: "Photo-to-cart (фото чека)", metric: "+30%", metricLabel: "repeat purchase", desc: "Скан прошлого чека → корзина за секунду", source: "Walmart Spark +25%, Lidl scan +35%" },
      { Icon: Gem, feature: "Чижик+ подписка", metric: "+42%", metricLabel: "frequency", desc: "Низкая цена подписки = массовое adoption", source: "Walmart+ +58% freq, Lidl Plus +42%" },
      { Icon: RotateCw, feature: "Авто-доставка крупы и бакалеи", metric: "28%", metricLabel: "repeat orders", desc: "Базовая регулярка по графику со скидкой", source: "Amazon S&S 30%, Aldi auto 25%" },
    ],
    totalImpact: {
      headline: "+3.6 млрд ₽/год incremental margin",
      calculation: "AOV +15% × frequency +28% × adoption 30% × 5M активных карт",
      payback: "8-10 мес",
      cost: "~50M ₽",
    },
  },

  ozon: {
    key: "ozon",
    name: "Ozon",
    nameLogo: "OZON",
    color: "#005BFF",
    logoColor: "#005BFF",
    domain: "marketplace",
    hero: {
      title: "Маркетплейс под вас",
      subtitle: "Электроника, дом, одежда, книги — AI собирает то что нужно именно вам",
    },
    profilePlaceholder: MARKETPLACE_PROFILE_PLACEHOLDER,
    prime: {
      name: "Ozon Premium",
      price: 399,
      badge: "Top-tier",
      subtitle: "Бесплатная доставка, кэшбек до 25%, закрытые распродажи и приоритет в Ozon Card",
      benefits: [
        { Icon: Truck, title: "Бесплатная доставка", subtitle: "на любую сумму, в т.ч. крупногабарит" },
        { Icon: Tag, title: "Кэшбек до 25%", subtitle: "повышенный на участвующие категории" },
        { Icon: Smartphone, title: "Закрытые распродажи", subtitle: "доступ за 24 часа до общего старта" },
      ],
    },
    benchmarksLabel: "Бенчмарки Amazon, Coupang, Mercado Libre, Shopee, Flipkart",
    businessImpact: [
      { Icon: User, feature: "Профиль + бренды/размеры/проекты", metric: "+22%", metricLabel: "AOV", desc: "AI помнит размеры, любимые бренды, текущие проекты", source: "Amazon +20%, Coupang +24%" },
      { Icon: ChefHat, feature: "Project search · «собрать офис»", metric: "+30%", metricLabel: "basket size", desc: "AI собирает корзину под проект (стол + кресло + лампа)", source: "Amazon Bundle +28%, Wayfair +32%" },
      { Icon: Mic, feature: "Voice-companion для long-tail", metric: "+38%", metricLabel: "discovery", desc: "Голосом проще найти редкий товар в 200M SKU", source: "Alexa Shopping +35%, Spotify Voice +42%" },
      { Icon: Palette, feature: "AI-баннер по интересам и сезону", metric: "+32%", metricLabel: "CTR", desc: "Personalized creative по 12 категориям и проектам", source: "Klarna gen-ads +28%, Coupang +30%" },
      { Icon: MapPin, feature: "Hyperlocal · что доставят сегодня", metric: "+18%", metricLabel: "conversion", desc: "Локальные ПВЗ и сроки доставки в реальном времени", source: "Amazon same-day +20%, Coupang Rocket +22%" },
      { Icon: Target, feature: "Banner CTA → готовый сетап", metric: "+20%", metricLabel: "click-to-buy", desc: "«Домашний офис под бюджет» → корзина за клик", source: "Amazon discovery +12%, Wayfair +25%" },
      { Icon: Camera, feature: "Photo-to-cart (Vision)", metric: "+28%", metricLabel: "cart fill rate", desc: "Фото товара/каталога → AI находит у нас", source: "Pinterest Lens +32%, Amazon StyleSnap +25%" },
      { Icon: Gem, feature: "Ozon Premium подписка", metric: "2.6x", metricLabel: "LTV", desc: "Lock-in через free delivery + кэшбек до 25%", source: "Amazon Prime 2.4x, Coupang WOW 2.8x" },
      { Icon: RotateCw, feature: "Subscribe & Save регулярки", metric: "32%", metricLabel: "repeat orders", desc: "Бытовая химия, корм, расходники — auto", source: "Amazon S&S 30%, Coupang Auto 35%" },
    ],
    totalImpact: {
      headline: "+34 млрд ₽/год incremental margin",
      calculation: "AOV +22% × frequency +32% × adoption 40% × 50M MAU",
      payback: "6-8 мес",
      cost: "~250M ₽",
    },
  },
}
