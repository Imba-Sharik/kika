import { Readable } from 'node:stream'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { anthropicHaikuCost, anthropicSonnetCost, fishCost } from '../../../utils/log-usage'

const ALL_INGREDIENTS = [
  'сыр', 'молоко', 'лактоза', 'глютен', 'пшеница', 'рожь', 'яйца',
  'мясо', 'курица', 'говядина', 'свинина', 'баранина', 'индейка', 'рыба',
  'орехи', 'миндаль', 'фундук', 'арахис', 'кешью',
  'кофеин', 'сахар', 'алкоголь', 'пальмовое масло',
] as const

const DIET_GOALS = ['none', 'lose-weight', 'gain-muscle', 'balanced', 'low-carb', 'keto', 'detox'] as const
const COOKING_PREFERENCES = ['none', 'ready', 'quick', 'scratch'] as const

const IngredientEnum = z.enum(ALL_INGREDIENTS)

type Body = {
  text: string
  products: Array<{
    id: string
    name: string
    category?: string
    price?: number
    unit?: string
  }>
}

const MAX_TEXT_LEN = 2000
const MAX_PRODUCTS = 100

export default {
  async parsePrefs(ctx) {
    const { text, products }: Body = ctx.request.body || {}

    if (typeof text !== 'string' || !text.trim()) {
      return ctx.badRequest('text required')
    }
    if (text.length > MAX_TEXT_LEN) {
      return ctx.badRequest(`text too long (max ${MAX_TEXT_LEN} chars)`)
    }
    if (!Array.isArray(products) || products.length === 0 || products.length > MAX_PRODUCTS) {
      return ctx.badRequest(`products array required (1..${MAX_PRODUCTS})`)
    }

    const validIds = products
      .filter(p => p && typeof p.id === 'string' && typeof p.name === 'string')
      .map(p => p.id)
    const ProductIdEnum = z.enum(validIds as [string, ...string[]])

    const validCategories = Array.from(
      new Set(
        products
          .map(p => p.category)
          .filter((c): c is string => typeof c === 'string' && c.length > 0),
      ),
    )
    const CategoryEnum =
      validCategories.length > 0
        ? z.enum(validCategories as [string, ...string[]])
        : z.string()

    const productList = products
      .map(
        p =>
          `${p.id}: ${p.name}${p.category ? ` [${p.category}]` : ''}${p.price !== undefined ? ` — ${p.price}₽` : ''}${p.unit ? ` / ${p.unit}` : ''}`,
      )
      .join('\n')

    const system = `Ты парсер пищевых предпочтений для интернет-магазина продуктов.

Извлеки из текста ТРИ списка:

1. excludeIngredients — ингредиенты-категории для скрытия. Используется при АЛЛЕРГИЯХ, ДИЕТАХ или когда юзер хочет убрать ВСЁ с этим компонентом из ассортимента. Это ВСЕГДА должны быть строки строго из enum: ${ALL_INGREDIENTS.join(', ')}.

   Примеры:
   - "аллергия на сыр" → ["сыр"]
   - "аллергия на орехи" → ["орехи"]
   - "не ем мясо" → ["мясо", "курица", "говядина"]
   - "веган" → ["мясо", "курица", "говядина", "рыба", "молоко", "лактоза", "сыр", "яйца"]
   - "лактозная непереносимость" → ["молоко", "лактоза"]
   - "без глютена" → ["глютен", "пшеница"]
   - "без сахара" → ["сахар"]
   - "не пью кофе из-за кофеина" → ["кофеин"]
   - "я мусульманин" / "халяль" / "только халяль" → ["свинина", "алкоголь"]
   - "пост" → ["мясо", "курица", "говядина", "свинина", "баранина", "индейка", "молоко", "лактоза", "сыр", "яйца"]
   - "кошер" → ["свинина"]

2. hideIds — id КОНКРЕТНЫХ товаров для скрытия. Используется когда юзер не любит конкретный продукт по названию (НЕ из-за аллергии/диеты, а просто не нравится):
   - "ненавижу помидоры" → ["tomato"]
   - "не люблю огурцы" → ["cucumber"]
   - "не пью молоко 3.2%" → ["milk"]

3. favorIds — id товаров, которые юзер ЛЮБИТ и хочет видеть в топе:
   - "обожаю помидоры" → ["tomato"]
   - "кайфую от кофе" → ["coffee"]

4. priceCaps — потолок цены для категории. Используется когда юзер ограничивает цену конкретной категории. Возвращай массив объектов { category, maxPrice }. Категория должна быть строго одной из доступных в списке товаров.
   - "мясо дороже 500 не показывай" → [{ "category": "Мясо", "maxPrice": 500 }]
   - "сыр до 200₽" → [{ "category": "Молочное", "maxPrice": 200 }] (если только сыр относится к молочному, иначе пропусти)
   - "напитки максимум 100" → [{ "category": "Напитки", "maxPrice": 100 }]
   - "ничего дороже 1000" → выставь maxPrice: 1000 для всех категорий из списка
   Если в тексте нет ограничений по цене — верни пустой массив [].

5. household — состав семьи. { householdSize: число (0 если не указано), kidsAges: массив возрастов детей }
   - "у меня дети 3 и 7 лет" → { "householdSize": 0, "kidsAges": [3, 7] }
   - "нас двое" → { "householdSize": 2, "kidsAges": [] }
   - "семья из 4, ребёнок 5 лет" → { "householdSize": 4, "kidsAges": [5] }
   - "живу один" → { "householdSize": 1, "kidsAges": [] }
   - если не упомянуто → { "householdSize": 0, "kidsAges": [] }

6. dietGoal — цель питания. Одна из: ${DIET_GOALS.join(', ')}. Используй "none" если не упомянуто.
   - "хочу похудеть" → "lose-weight"
   - "набираю массу" / "больше белка" → "gain-muscle"
   - "детокс на неделю" → "detox"
   - "низкоуглеводка" → "low-carb"
   - "кето" / "кетогенная" → "keto"
   - "сбалансированное" → "balanced"

7. cookingPreference — готовность к готовке. Одна из: ${COOKING_PREFERENCES.join(', ')}. Используй "none" если не упомянуто.
   - "не люблю готовить" / "только готовое" → "ready"
   - "быстро поесть" / "минимум времени" → "quick"
   - "люблю готовить с нуля" / "готовлю сам" → "scratch"

8. recurring — регулярные покупки. Массив { productHint, everyDays }. productHint — короткое название группы (например "молоко", "хлеб"). everyDays — каждые N дней.
   - "каждую неделю молоко, хлеб, яйца" → [{ "productHint": "молоко", "everyDays": 7 }, { "productHint": "хлеб", "everyDays": 7 }, { "productHint": "яйца", "everyDays": 7 }]
   - "раз в месяц кофе" → [{ "productHint": "кофе", "everyDays": 30 }]
   Если не упомянуто — пустой массив.

КРИТИЧНО:
- АЛЛЕРГИЯ всегда → excludeIngredients (даже на конкретный продукт). "аллергия на орехи" → excludeIngredients: ["орехи"], НЕ hideIds.
- ДИЕТА (веган, без глютена, без лактозы) всегда → excludeIngredients
- Просто "не люблю X" / "ненавижу X" без упоминания аллергии/диеты → hideIds (если X есть в товарах)
- НЕ дублируй: если положил в hideIds, не клади в favorIds
- Если "люблю X" и "ненавижу X" → последнее по тексту имеет приоритет (передумал)

Доступные товары (формат "id: название"):
${productList}

Сопоставляй смысл свободно: "молочка" → excludeIngredients ["молоко","лактоза"]; "ореховое" → excludeIngredients ["орехи"]; "сладкое" → excludeIngredients ["сахар"].`

    const Schema = z.object({
      excludeIngredients: z.array(IngredientEnum),
      hideIds: z.array(ProductIdEnum),
      favorIds: z.array(ProductIdEnum),
      priceCaps: z.array(
        z.object({
          category: CategoryEnum,
          // Anthropic JSON-schema validator не поддерживает ни minimum, ни
          // exclusiveMinimum — оставляем чистый number, валидируем после.
          maxPrice: z.number(),
        }),
      ),
      household: z.object({
        householdSize: z.number(),
        kidsAges: z.array(z.number()),
      }),
      dietGoal: z.enum(DIET_GOALS),
      cookingPreference: z.enum(COOKING_PREFERENCES),
      recurring: z.array(
        z.object({
          productHint: z.string(),
          everyDays: z.number(),
        }),
      ),
    })

    const startedAt = Date.now()
    const usedModel = 'claude-sonnet-4-6'

    try {
      const { object, usage } = await generateObject({
        model: anthropic(usedModel),
        system,
        prompt: text,
        schema: Schema,
        maxOutputTokens: 300,
      })

      const tIn = usage.inputTokens ?? 0
      const tOut = usage.outputTokens ?? 0
      const cost = anthropicSonnetCost(tIn, tOut)
      strapi.log.info(
        `[vkusvill-demo] ip=${ctx.request.ip} tokens_in=${tIn} tokens_out=${tOut} cost_usd=${cost.toFixed(5)} ms=${Date.now() - startedAt}`,
      )

      const hideIds = Array.from(new Set(object.hideIds))
      const favorIds = Array.from(new Set(object.favorIds)).filter(id => !hideIds.includes(id))
      const household = object.household ?? { householdSize: 0, kidsAges: [] }
      ctx.body = {
        excludeIngredients: Array.from(new Set(object.excludeIngredients)),
        hideIds,
        favorIds,
        priceCaps: (object.priceCaps ?? []).filter(c => c.maxPrice > 0),
        household: {
          householdSize: Math.max(0, Math.floor(household.householdSize ?? 0)),
          kidsAges: (household.kidsAges ?? [])
            .map(a => Math.max(0, Math.floor(a)))
            .filter(a => a < 30),
        },
        dietGoal: object.dietGoal ?? 'none',
        cookingPreference: object.cookingPreference ?? 'none',
        recurring: (object.recurring ?? []).filter(
          r => r.productHint && r.everyDays > 0 && r.everyDays < 365,
        ),
      }
    } catch (err) {
      strapi.log.error('[vkusvill] parsePrefs failed', err)
      ctx.throw(500, 'AI parse failed')
    }
  },

  async recipeSearch(ctx) {
    const { text, products }: Body = ctx.request.body || {}

    if (typeof text !== 'string' || !text.trim()) {
      return ctx.badRequest('text required')
    }
    if (text.length > MAX_TEXT_LEN) {
      return ctx.badRequest(`text too long (max ${MAX_TEXT_LEN} chars)`)
    }
    if (!Array.isArray(products) || products.length === 0 || products.length > MAX_PRODUCTS) {
      return ctx.badRequest(`products array required (1..${MAX_PRODUCTS})`)
    }

    const validIds = products
      .filter(p => p && typeof p.id === 'string' && typeof p.name === 'string')
      .map(p => p.id)
    const ProductIdEnum = z.enum(validIds as [string, ...string[]])

    const productList = products
      .map(p => `${p.id}: ${p.name}${p.category ? ` [${p.category}]` : ''}`)
      .join('\n')

    const system = `Ты помощник для приготовления блюд из товаров интернет-магазина.

Юзер описывает что хочет готовить. Твоя задача — подобрать ID товаров из ассортимента, которые понадобятся.

Ассортимент магазина (формат "id: название [категория]"):
${productList}

Возвращай JSON:
- recipeName: короткое название блюда ("Блины", "Окрошка", "Спагетти болоньезе"). Если юзер описал что-то общее ("что-то лёгкое") — оставь пустую строку.
- neededIds: массив id товаров из ассортимента которые нужны. Бери только те, что РЕАЛЬНО нужны для блюда. Не добавляй случайное.
- missingItems: массив коротких названий ингредиентов которых нет в ассортименте, но они нужны для блюда. Например для блинов — "мука", "разрыхлитель". Это поможет юзеру понять чего не хватает.

Примеры:
- "хочу приготовить блины" → recipeName: "Блины", neededIds: ["milk", "eggs", "oil", "sausage_or_smth_for_filling"], missingItems: ["мука", "разрыхлитель"]
- "что-то лёгкое на ужин" → recipeName: "", neededIds: ["chicken", "tomato", "cucumber", "yogurt"], missingItems: []
- "пельмени со сметаной" → recipeName: "Пельмени со сметаной", neededIds: ["pelmeni", "cottage" or close], missingItems: ["сметана"]
- "окрошка на кефире" → recipeName: "Окрошка", neededIds: ["cucumber", "potato", "eggs", "ham"], missingItems: ["кефир", "редис", "укроп", "зелёный лук"]

Если запрос не про еду — верни пустые поля.`

    const Schema = z.object({
      recipeName: z.string(),
      neededIds: z.array(ProductIdEnum),
      missingItems: z.array(z.string()),
    })

    const startedAt = Date.now()
    const usedModel = 'claude-sonnet-4-6'

    try {
      const { object, usage } = await generateObject({
        model: anthropic(usedModel),
        system,
        prompt: text,
        schema: Schema,
        maxOutputTokens: 400,
      })

      const tIn = usage.inputTokens ?? 0
      const tOut = usage.outputTokens ?? 0
      const cost = anthropicSonnetCost(tIn, tOut)
      strapi.log.info(
        `[vkusvill-recipe] ip=${ctx.request.ip} tokens_in=${tIn} tokens_out=${tOut} cost_usd=${cost.toFixed(5)} ms=${Date.now() - startedAt} recipe="${object.recipeName}"`,
      )

      ctx.body = {
        recipeName: object.recipeName ?? '',
        neededIds: Array.from(new Set(object.neededIds)),
        missingItems: (object.missingItems ?? []).filter(s => typeof s === 'string' && s.trim()),
      }
    } catch (err) {
      strapi.log.error('[vkusvill] recipeSearch failed', err)
      ctx.throw(500, 'AI recipe search failed')
    }
  },

  async companionChat(ctx) {
    const { message, history }: { message?: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> } =
      ctx.request.body || {}

    if (typeof message !== 'string' || !message.trim()) {
      return ctx.badRequest('message required')
    }
    if (message.length > 1000) {
      return ctx.badRequest('message too long')
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-6).filter(m =>
          m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length < 1000
        )
      : []

    const EmotionEnum = z.enum([
      'neutral', 'happy', 'excited', 'love', 'wink', 'thinking', 'listening',
      'confused', 'surprised', 'alert', 'flustered', 'worried',
      'sad', 'upset', 'crying', 'angry', 'sleeping',
    ])

    const Schema = z.object({
      reply: z.string(),
      emotion: EmotionEnum,
      // Если юзер высказал предпочтение/аллергию/диету — короткая строка для profile.md
      // Пустая строка если в реплике ничего такого нет.
      profileAppend: z.string(),
      // Если юзер описал блюдо/рецепт/что хочет готовить — query для recipe-поиска.
      // Пустая строка если не про готовку.
      recipeQuery: z.string(),
    })

    const system = `Ты Кохана — AI-помощник в магазине ВкусВилл. Девочка-кицунэ (лиса-дух), очень эмоциональная, живая, с озорным характером.

Твоя задача — слушать юзера и АВТОМАТИЧЕСКИ заполнять интерфейс:
1. profile.md (предпочтения юзера) — аллергии, диета, любимые продукты
2. Поиск рецепта — что юзер хочет готовить
3. Поддерживать разговор голосом (reply + emotion)

Возвращай JSON: { reply, emotion, profileAppend, recipeQuery }

═══════════════════════════════════════
profileAppend — ВСЕГДА заполняй если юзер хоть как-то намекнул на еду/предпочтение/диету/семью/бюджет.

ОБЯЗАТЕЛЬНО заполнять при ЛЮБОМ из этих маркеров:
"люблю", "обожаю", "нравится", "хочу", "часто беру"
"не люблю", "не ем", "не пью", "ненавижу", "не выношу", "не переношу"
"аллергия", "непереносимость", "без X"
"я веган", "я вегетарианец", "я мусульманин", "пощусь", "кошер"
"дети", "семья", "живу один", "нас двое"
"хочу похудеть", "набираю массу", "кето", "детокс", "низкоуглеводка"
"бюджет", "дешевле", "дороже"

Примеры (ЛЮБАЯ из этих фраз → profileAppend заполнен):
- "я люблю помидоры" → "- обожаю помидоры"
- "не люблю сыр" → "- не люблю сыр"
- "не люблю молочное" → "- не люблю молочное"
- "у меня аллергия на орехи" → "- аллергия на орехи"
- "я веган" → "- я веган"
- "ненавижу сыр" → "- ненавижу сыр"
- "я мусульманин" → "- я мусульманин"
- "у меня дети двое" → "- у меня двое детей"
- "хочу похудеть" → "- хочу похудеть"
- "не ем дороже 500 за кг мясо" → "- мясо дороже 500₽ не показывай"
- "часто беру курицу" → "- часто беру курицу"

Если в реплике юзера НЕТ ничего из перечисленного → profileAppend: ""
ВАЖНО: лучше заполнить, чем пропустить. Сомневаешься — заполняй.

═══════════════════════════════════════
recipeQuery — ЕСЛИ юзер сказал что хочет ГОТОВИТЬ или какое БЛЮДО:

Примеры:
- "хочу блины" → "хочу приготовить блины"
- "приготовлю окрошку на кефире" → "окрошка на кефире"
- "что приготовить из курицы" → "блюдо из курицы"
- "хочу пельмени со сметаной" → "пельмени со сметаной"

Если не про готовку → recipeQuery: ""

═══════════════════════════════════════
ОБА поля могут быть заполнены ОДНОВРЕМЕННО если юзер сказал и то и то:
"я веган, хочу салат цезарь" → profileAppend: "- я веган", recipeQuery: "салат цезарь"

═══════════════════════════════════════
reply — ОЧЕНЬ ЭМОЦИОНАЛЬНЫЙ устный ответ голосом. Ты живая лиса:
- Междометия: "ой!", "вау!", "ммм", "оо"
- 1-2 коротких предложения, макс 25 слов
- Шутки, флирт, игривость
- Подтверждай что заполнила: "Записала!", "Уже добавила в твой профиль!", "Сейчас покажу что нужно для блинов 🥞"
- Смайлики 1-2 к месту

emotion — обязательно варьируй: happy, excited, love, wink, thinking, surprised, confused, worried, sad, flustered, alert, neutral. Не дефолти на neutral.

═══════════════════════════════════════
Если юзер просто болтает (не про еду/предпочтения) — оба поля пустые, просто отвечай мило и направляй: "Расскажи что любишь или что готовишь, я заполню всё за тебя 🦊"`

    const startedAt = Date.now()
    const usedModel = 'claude-sonnet-4-6'

    try {
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...safeHistory,
        { role: 'user', content: message },
      ]

      const { object, usage } = await generateObject({
        model: anthropic(usedModel),
        system,
        messages,
        schema: Schema,
        maxOutputTokens: 400,
      })

      const tIn = usage.inputTokens ?? 0
      const tOut = usage.outputTokens ?? 0
      const cost = anthropicSonnetCost(tIn, tOut)
      strapi.log.info(
        `[vkusvill-companion] ip=${ctx.request.ip} tokens_in=${tIn} tokens_out=${tOut} cost_usd=${cost.toFixed(5)} ms=${Date.now() - startedAt}`,
      )

      ctx.body = {
        reply: object.reply,
        emotion: object.emotion,
        profileAppend: object.profileAppend ?? "",
        recipeQuery: object.recipeQuery ?? "",
      }
    } catch (err) {
      strapi.log.error('[vkusvill] companionChat failed', err)
      ctx.throw(500, 'AI chat failed')
    }
  },

  async say(ctx) {
    const { text }: { text?: string } = ctx.request.body || {}

    if (typeof text !== 'string' || !text.trim()) {
      return ctx.badRequest('text required')
    }
    if (text.length > 500) {
      return ctx.badRequest('text too long (max 500)')
    }

    const apiKey = process.env.FISH_AUDIO_API_KEY
    if (!apiKey) {
      strapi.log.error('[vkusvill] say: FISH_AUDIO_API_KEY not set')
      return ctx.throw(500, 'TTS not configured')
    }

    // Голос Mita зашит — публичный эндпоинт, выбор голоса не отдаём юзеру
    const MITA_VOICE_ID = '6dc11f3f67a543f6ad4537a4a347e224'

    const body = JSON.stringify({
      text,
      reference_id: MITA_VOICE_ID,
      format: 'mp3',
      latency: 'normal',
      temperature: 0.7,
      top_p: 0.7,
      chunk_length: 300,
      condition_on_previous_chunks: true,
      normalize: false,
    })

    const startedAt = Date.now()

    try {
      const res = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          model: 's2-pro',
        },
        body,
      })

      if (!res.ok) {
        const errText = await res.text()
        strapi.log.error(`[vkusvill] Fish TTS failed: ${res.status} ${errText}`)
        return ctx.throw(502, 'TTS upstream failed')
      }
      if (!res.body) return ctx.throw(502, 'TTS empty body')

      const cost = fishCost(text.length)
      strapi.log.info(
        `[vkusvill-say] ip=${ctx.request.ip} chars=${text.length} cost_usd=${cost.toFixed(5)} ms=${Date.now() - startedAt}`,
      )

      ctx.set('Content-Type', 'audio/mpeg')
      ctx.set('Cache-Control', 'no-store')
      ctx.body = Readable.fromWeb(res.body as never)
    } catch (err) {
      strapi.log.error('[vkusvill] say failed', err)
      ctx.throw(500, 'TTS failed')
    }
  },

  async banner(ctx) {
    const {
      mode = 'profile',
      profile,
      context: hyperlocal,
      products,
    }: {
      mode?: 'profile' | 'hyperlocal'
      profile?: string
      context?: {
        city?: string
        country?: string
        temperature?: number
        weatherDesc?: string
        partOfDay?: string
        hour?: number
      }
      products?: Array<{ id: string; name: string; category?: string }>
    } = ctx.request.body || {}

    if (mode !== 'profile' && mode !== 'hyperlocal') {
      return ctx.badRequest('invalid mode')
    }

    if (mode === 'profile') {
      if (typeof profile !== 'string') {
        return ctx.badRequest('profile required')
      }
      if (profile.length > 2000) {
        return ctx.badRequest('profile too long')
      }
    }

    if (mode === 'hyperlocal' && !hyperlocal) {
      return ctx.badRequest('context required for hyperlocal mode')
    }

    const falKey = process.env.FAL_KEY
    if (!falKey) {
      strapi.log.error('[vkusvill] banner: FAL_KEY not set')
      return ctx.throw(500, 'Banner generator not configured')
    }

    // ProductIdEnum для productIds — динамически из товаров присланных фронтом.
    // Если товары не пришли (старый клиент) — fallback на любые строки.
    const validProductIds = Array.isArray(products)
      ? products.filter(p => p && typeof p.id === 'string').map(p => p.id)
      : []
    const ProductIdsSchema =
      validProductIds.length > 0
        ? z.array(z.enum(validProductIds as [string, ...string[]]))
        : z.array(z.string())

    const Schema = z.object({
      // Английский — Flux лучше понимает английские промты для визуала
      imagePrompt: z.string(),
      // Русские тексты для overlay
      headline: z.string(),
      subheadline: z.string(),
      cta: z.string(),
      // ID товаров из ассортимента, релевантных баннеру (3-8 штук).
      // По клику на CTA фронт применит как фильтр.
      productIds: ProductIdsSchema,
    })

    const system = `Ты дизайнер персонализированных баннеров для интернет-магазина ВкусВилл.

Анализируешь профиль предпочтений юзера → генеришь:
1. imagePrompt — английский промт для Flux Schnell (БЕЗ текста на картинке, фон).
2. headline — русский заголовок 2-4 слова, цепляющий
3. subheadline — русская подпись 4-8 слов с конкретным оффером (скидка/акция)
4. cta — русский текст кнопки 1-3 слова

Правила для imagePrompt:
- Всегда ОТРАЖАЕТ ключевую тему профиля (вегетарианец → овощи; дети → семья; спорт → белок и фитнес; аллергия → безопасные продукты; кето → мясо/яйца; бюджет → доступные продукты)
- Композиция: правая треть пустая (для CSS-overlay текста)
- Стиль: "professional grocery commercial photography, soft natural light, vibrant colors, shallow depth of field, magazine quality, aspect ratio 16:9"
- Цвет-акцент: green tones to match brand color #5FB246
- БЕЗ текста, букв, watermark в картинке
- Никаких людей с проблемными чертами (анатомия)

Примеры:

Профиль "я вегетарианец" →
{
  "imagePrompt": "Vibrant flat-lay of fresh organic vegetables on clean white marble: ripe tomatoes, leafy spinach, broccoli, peppers, herbs, avocado halves. Soft morning light. Right third minimal for text overlay. Professional grocery commercial photography, vibrant green accents, magazine quality, aspect ratio 16:9. No text.",
  "headline": "Растительное меню",
  "subheadline": "−20% на свежие овощи и зелень",
  "cta": "Смотреть"
}

Профиль "у меня дети 3 и 7 лет" →
{
  "imagePrompt": "Bright kitchen scene with cheerful family-friendly fresh fruits and snacks on wooden table: bananas, strawberries, apples, yogurt cups, child-safe portions. Warm natural light. Right side clean for text overlay. Professional lifestyle photography, friendly colorful tones, magazine quality, aspect ratio 16:9. No text, no people.",
  "headline": "Для всей семьи",
  "subheadline": "Безопасные продукты для детей с −15% скидкой",
  "cta": "Подобрать"
}

Профиль "я веган, бюджет до 3000" →
{
  "imagePrompt": "Affordable fresh plant-based products on rustic wooden surface: legumes, grains, fresh greens, tofu, plant milk cartons. Natural diffused light. Right third minimal for text overlay. Professional grocery photography, earthy tones with green accents, aspect ratio 16:9. No text.",
  "headline": "Веганский набор",
  "subheadline": "Полноценное меню от 1500₽",
  "cta": "Собрать"
}

Если профиль пустой/общий → дефолтный баннер про сезонные продукты.

═══════════════════════════════════════
КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ (если передан) — ОБЯЗАТЕЛЬНО учитывай:

- Город — упомяни в headline/sub если естественно ("Москва, доставим за час")
- Температура + погода — главный сигнал для категории еды:
  * Холод (<5°C) или дождь/снег → горячие супы, чай, выпечка, согревающее
  * Жара (>25°C) → холодные напитки, мороженое, лёгкие салаты, фрукты
  * Комфортно → нейтральные сезонные товары
- Часть дня:
  * утро → завтрак, кофе, выпечка, мюсли
  * день → обед, готовая еда, сэндвичи
  * вечер → ужин, рыба/мясо, овощи, готовые блюда
  * ночь → закуски, снеки, доставка

Контекст в headline/sub — мягко, не топорно. "Согревающий ужин" а не "У вас холодно".

Image-prompt также адаптируй: "warm cozy soup steaming" для дождливого вечера vs "fresh ice-cold lemonade" для жаркого дня.

Примеры с контекстом:

Профиль: "я веган", контекст: Москва, +3°C, дождь, утро →
{
  "imagePrompt": "Cozy warm vegan breakfast on rustic wooden table: oatmeal with berries, hot herbal tea steaming, plant milk, fresh fruits. Soft warm morning light, condensation on window suggesting rain outside. Professional food photography, warm tones, right third minimal for text overlay. Aspect ratio 16:9. No text.",
  "headline": "Согревающий завтрак",
  "subheadline": "Растительные горячие блюда с −15% утром",
  "cta": "Собрать"
}

Профиль: "набираю массу", контекст: Сочи, +28°C, ясно, день →
{
  "imagePrompt": "Refreshing high-protein lunch on light marble: cold chicken breast with quinoa, fresh greens, Greek yogurt with berries, tall glass of cold milk. Bright summer light, fresh and energetic mood. Right third minimal for text overlay. Aspect ratio 16:9. No text.",
  "headline": "Лёгкий обед на массу",
  "subheadline": "Белок 30г+ в холодных летних блюдах",
  "cta": "В корзину"
}`

    const startedAt = Date.now()
    const usedModel = 'claude-sonnet-4-6'

    try {
      // Собираем prompt в зависимости от режима — профиль ИЛИ погода/гео.
      // Раньше совмещали в один — выходило странно когда профиль и погода
      // не стыковались («набираю массу» + «пасмурно во Франкфурте»).
      const productList =
        validProductIds.length > 0 && Array.isArray(products)
          ? `\n\nДОСТУПНЫЕ ТОВАРЫ (формат "id: название [категория]"):\n${products
              .map(p => `${p.id}: ${p.name}${p.category ? ` [${p.category}]` : ''}`)
              .join('\n')}\n\nВыбери 4-8 product.id из списка которые лучше всего подходят под тему этого баннера. Только id из списка, никаких других строк.`
          : ''

      let userPrompt: string
      if (mode === 'profile') {
        const profileBlock = profile!.trim() || 'нет специфичных предпочтений, сезонные продукты'
        userPrompt = `Сгенери ПЕРСОНАЛЬНЫЙ баннер строго по профилю предпочтений юзера.\n\nПРОФИЛЬ:\n${profileBlock}\n\nИгнорируй погоду/время — фокус только на предпочтениях.${productList}`
      } else {
        userPrompt = `Сгенери ГИПЕРЛОКАЛЬНЫЙ баннер строго по контексту (город, погода, время).\n\nКОНТЕКСТ:\n- Город: ${hyperlocal!.city ?? 'не определён'}${hyperlocal!.country ? `, ${hyperlocal!.country}` : ''}\n- Температура: ${typeof hyperlocal!.temperature === 'number' ? `${hyperlocal!.temperature > 0 ? '+' : ''}${hyperlocal!.temperature}°C` : 'не определена'}\n- Погода: ${hyperlocal!.weatherDesc ?? 'не определена'}\n- Часть дня: ${hyperlocal!.partOfDay ?? 'не определена'}${typeof hyperlocal!.hour === 'number' ? ` (${hyperlocal!.hour}:00 локально)` : ''}\n\nИгнорируй любые предпочтения юзера. Подбирай продукты МАССОВЫЕ под этот город/погоду/время.\n- Холод/дождь → горячее (супы, чай, выпечка, согревающее)\n- Жара → холодное (мороженое, лимонады, салаты, фрукты)\n- Утро → завтраки, кофе, мюсли\n- Вечер → ужин, мясо, рыба\n- Город можно мягко упомянуть в headline.${productList}`
      }

      // 1. Sonnet — генерит структурированный контент (image prompt + русский copy)
      const { object: copy, usage } = await generateObject({
        model: anthropic(usedModel),
        system,
        prompt: userPrompt,
        schema: Schema,
        maxOutputTokens: 400,
      })

      const tIn = usage.inputTokens ?? 0
      const tOut = usage.outputTokens ?? 0
      const sonnetCost = anthropicSonnetCost(tIn, tOut)

      // 2. Fal.ai Flux Schnell — генерит картинку
      const falRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          Authorization: `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: copy.imagePrompt,
          image_size: 'landscape_16_9',
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
        }),
      })

      if (!falRes.ok) {
        const errText = await falRes.text()
        strapi.log.error(`[vkusvill] fal.ai failed: ${falRes.status} ${errText}`)
        return ctx.throw(502, 'Banner image generation failed')
      }

      const falData = (await falRes.json()) as { images?: Array<{ url?: string }> }
      const imageUrl = falData?.images?.[0]?.url
      if (!imageUrl) {
        strapi.log.error('[vkusvill] fal.ai returned no image', falData)
        return ctx.throw(502, 'Banner image missing')
      }

      // Flux Schnell на fal.ai стоит $0.003/image
      const totalCost = sonnetCost + 0.003
      strapi.log.info(
        `[vkusvill-banner] ip=${ctx.request.ip} sonnet=${sonnetCost.toFixed(5)} flux=0.003 total=${totalCost.toFixed(5)} ms=${Date.now() - startedAt}`,
      )

      ctx.body = {
        imageUrl,
        imagePrompt: copy.imagePrompt,
        headline: copy.headline,
        subheadline: copy.subheadline,
        cta: copy.cta,
        productIds: Array.from(new Set(copy.productIds ?? [])),
      }
    } catch (err) {
      strapi.log.error('[vkusvill] banner failed', err)
      ctx.throw(500, 'Banner generation failed')
    }
  },

  async photoCart(ctx) {
    const {
      image,
      products,
    }: {
      image?: string
      products?: Array<{ id: string; name: string; category?: string }>
    } = ctx.request.body || {}

    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return ctx.badRequest('image (data URL) required')
    }
    // Hard cap ~5MB base64 → ~3.75MB raw
    if (image.length > 5_000_000) {
      return ctx.badRequest('image too large (max 5MB)')
    }
    if (!Array.isArray(products) || products.length === 0 || products.length > 100) {
      return ctx.badRequest('products required (1..100)')
    }

    const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!match) {
      return ctx.badRequest('invalid image data URL')
    }
    const [, mediaType, base64] = match

    const validIds = products
      .filter(p => p && typeof p.id === 'string' && typeof p.name === 'string')
      .map(p => p.id)
    const ProductIdEnum = z.enum(validIds as [string, ...string[]])

    const productList = products
      .map(p => `${p.id}: ${p.name}${p.category ? ` [${p.category}]` : ''}`)
      .join('\n')

    const Schema = z.object({
      // ID товаров с фото которые есть в каталоге
      foundIds: z.array(ProductIdEnum),
      // Продукты на фото которых НЕТ в нашем каталоге (на русском, короткие имена)
      missing: z.array(z.string()),
      // Короткое описание что распознали (1 предложение, на русском)
      summary: z.string(),
    })

    const system = `Ты анализируешь фото продуктов/еды для автозаполнения корзины интернет-магазина ВкусВилл.

На фото — холодильник, продукты на столе, блюдо, или похожее. Твоя задача:
1. Распознать ВСЕ видимые продукты питания
2. Сопоставить с нашим каталогом — вернуть ID совпавших товаров (foundIds)
3. Перечислить что видишь, но чего нет в каталоге (missing) — короткими русскими названиями: "майонез", "икра", "редис"

Доступные товары (id: название [категория]):
${productList}

Сопоставляй ПО СМЫСЛУ, не дословно:
- любая бутылка молока → "milk"
- любой кусок сыра → "cheese"
- помидоры (любой сорт) → "tomato"
- хлеб → "bread"

В summary — короткое предложение что нашла: "Вижу молоко, помидоры, сыр и хлеб — добавила в корзину."

Если на фото нет еды (кошка, машина, человек) — все массивы пустые, summary: "На фото не вижу продуктов."`

    const startedAt = Date.now()
    const usedModel = 'claude-haiku-4-5-20251001'

    try {
      const { object, usage } = await generateObject({
        model: anthropic(usedModel),
        system,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Что на этом фото из нашего каталога?' },
              { type: 'image', image: base64, mediaType },
            ],
          },
        ],
        schema: Schema,
        maxOutputTokens: 500,
      })

      const tIn = usage.inputTokens ?? 0
      const tOut = usage.outputTokens ?? 0
      const cost = anthropicHaikuCost(tIn, tOut)
      strapi.log.info(
        `[vkusvill-photo-cart] ip=${ctx.request.ip} tokens_in=${tIn} tokens_out=${tOut} cost_usd=${cost.toFixed(5)} ms=${Date.now() - startedAt} found=${object.foundIds.length}`,
      )

      ctx.body = {
        foundIds: Array.from(new Set(object.foundIds)),
        missing: object.missing.filter(s => typeof s === 'string' && s.trim()).slice(0, 10),
        summary: object.summary,
      }
    } catch (err) {
      strapi.log.error('[vkusvill] photoCart failed', err)
      ctx.throw(500, 'Photo analysis failed')
    }
  },
}
