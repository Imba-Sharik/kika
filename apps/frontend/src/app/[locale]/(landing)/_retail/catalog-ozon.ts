import type { Product } from "./types"

// Маркетплейс-каталог для /ozon. Используем тот же Product-тип чтобы не плодить
// типы — поля ingredients/tags оставляем пустыми/нейтральными, они нужны grocery-логике.
// Категории: Электроника, Бытовая техника, Дом, Одежда, Обувь, Книги, Спорт, Красота,
// Дети, Авто, Зоо, Ремонт.

export const PRODUCTS_OZON: Product[] = [
  // Электроника
  { id: "iphone-15", name: "iPhone 15 128GB", emoji: "📱", price: 79990, unit: "шт", category: "Электроника", ingredients: [], tags: ["ready"] },
  { id: "airpods-pro", name: "AirPods Pro 2", emoji: "🎧", price: 24990, unit: "шт", category: "Электроника", ingredients: [], tags: ["ready"] },
  { id: "samsung-tv", name: "Samsung TV 55\" QLED", emoji: "📺", price: 64990, unit: "шт", category: "Электроника", ingredients: [], tags: ["ready"] },
  { id: "laptop-asus", name: "Ноутбук ASUS 16GB/512GB", emoji: "💻", price: 89990, unit: "шт", category: "Электроника", ingredients: [], tags: ["ready"] },
  { id: "monitor-144", name: "Монитор 27\" 144Hz", emoji: "🖥️", price: 32990, unit: "шт", category: "Электроника", ingredients: [], tags: ["ready"] },
  { id: "mouse-gaming", name: "Мышь Logitech G502 HERO", emoji: "🖱️", price: 5490, unit: "шт", category: "Электроника", ingredients: [], tags: ["ready"] },
  { id: "keyboard-mech", name: "Клавиатура механическая Keychron K2", emoji: "⌨️", price: 12990, unit: "шт", category: "Электроника", ingredients: [], tags: ["ready"] },
  { id: "xiaomi-band", name: "Xiaomi Mi Band 8", emoji: "⌚", price: 3290, unit: "шт", category: "Электроника", ingredients: [], tags: ["ready"] },
  { id: "powerbank", name: "Power Bank 20000 мАч", emoji: "🔋", price: 2490, unit: "шт", category: "Электроника", ingredients: [], tags: ["ready"] },
  { id: "ssd-1tb", name: "SSD Samsung 980 1TB", emoji: "💾", price: 8990, unit: "шт", category: "Электроника", ingredients: [], tags: ["ready"] },

  // Бытовая техника
  { id: "kettle", name: "Электрочайник Bosch 1.7л", emoji: "☕", price: 3990, unit: "шт", category: "Бытовая техника", ingredients: [], tags: ["ready"] },
  { id: "coffee-machine", name: "Кофемашина De'Longhi", emoji: "☕", price: 28990, unit: "шт", category: "Бытовая техника", ingredients: [], tags: ["ready"] },
  { id: "air-fryer", name: "Аэрогриль Tefal 5л", emoji: "🍟", price: 11990, unit: "шт", category: "Бытовая техника", ingredients: [], tags: ["ready"] },
  { id: "blender", name: "Блендер Bosch 1000Вт", emoji: "🥤", price: 6490, unit: "шт", category: "Бытовая техника", ingredients: [], tags: ["ready"] },
  { id: "vacuum-robot", name: "Робот-пылесос Xiaomi", emoji: "🤖", price: 17990, unit: "шт", category: "Бытовая техника", ingredients: [], tags: ["ready"] },

  // Дом
  { id: "desk-lamp", name: "Лампа настольная LED", emoji: "💡", price: 2490, unit: "шт", category: "Дом", ingredients: [], tags: ["ready"] },
  { id: "office-chair", name: "Кресло компьютерное", emoji: "🪑", price: 14990, unit: "шт", category: "Дом", ingredients: [], tags: ["ready"] },
  { id: "bedding-set", name: "Постельное бельё 2-сп", emoji: "🛏️", price: 3490, unit: "комплект", category: "Дом", ingredients: [], tags: ["ready"] },
  { id: "humidifier", name: "Увлажнитель воздуха", emoji: "💨", price: 4990, unit: "шт", category: "Дом", ingredients: [], tags: ["ready"] },

  // Одежда / Обувь
  { id: "running-shoes", name: "Кроссовки Nike Pegasus", emoji: "👟", price: 8990, unit: "пара", category: "Обувь", ingredients: [], tags: ["ready"] },
  { id: "tshirt-basic", name: "Футболка базовая хлопок", emoji: "👕", price: 990, unit: "шт", category: "Одежда", ingredients: [], tags: ["ready"] },
  { id: "jeans-male", name: "Джинсы Levi's 501 мужские", emoji: "👖", price: 7990, unit: "шт", category: "Одежда", ingredients: [], tags: ["ready"] },
  { id: "dress-summer", name: "Платье летнее лён", emoji: "👗", price: 3990, unit: "шт", category: "Одежда", ingredients: [], tags: ["ready"] },
  { id: "winter-coat", name: "Пальто зимнее женское", emoji: "🧥", price: 14990, unit: "шт", category: "Одежда", ingredients: [], tags: ["ready"] },
  { id: "backpack", name: "Рюкзак городской 25л", emoji: "🎒", price: 2990, unit: "шт", category: "Одежда", ingredients: [], tags: ["ready"] },

  // Спорт
  { id: "yoga-mat", name: "Коврик для йоги", emoji: "🧘", price: 1290, unit: "шт", category: "Спорт", ingredients: [], tags: ["ready"] },
  { id: "dumbbells", name: "Гантели 5кг (пара)", emoji: "🏋️", price: 2990, unit: "пара", category: "Спорт", ingredients: [], tags: ["ready"] },
  { id: "protein", name: "Протеин сывороточный 1кг", emoji: "💪", price: 3490, unit: "кг", category: "Спорт", ingredients: [], tags: ["ready"] },

  // Красота
  { id: "cream-laroche", name: "Крем La Roche-Posay", emoji: "🧴", price: 1890, unit: "шт", category: "Красота", ingredients: [], tags: ["ready"] },
  { id: "perfume-boss", name: "Парфюм Hugo Boss Bottled 100мл", emoji: "🧴", price: 7990, unit: "шт", category: "Красота", ingredients: [], tags: ["ready"] },
  { id: "shampoo-loreal", name: "Шампунь L'Oreal Elseve 400мл", emoji: "🧴", price: 349, unit: "шт", category: "Красота", ingredients: [], tags: ["ready"] },

  // Дети
  { id: "lego-starwars", name: "LEGO Star Wars Y-Wing", emoji: "🧱", price: 4990, unit: "шт", category: "Дети", ingredients: [], tags: ["ready"] },
  { id: "board-monopoly", name: "Монополия классическая", emoji: "🎲", price: 2490, unit: "шт", category: "Дети", ingredients: [], tags: ["ready"] },
  { id: "baby-stroller", name: "Коляска прогулочная", emoji: "👶", price: 18990, unit: "шт", category: "Дети", ingredients: [], tags: ["ready"] },
  { id: "kids-puzzle", name: "Пазл 1000 деталей", emoji: "🧩", price: 990, unit: "шт", category: "Дети", ingredients: [], tags: ["ready"] },

  // Книги
  { id: "book-1984", name: "«1984» Дж. Оруэлл", emoji: "📕", price: 549, unit: "шт", category: "Книги", ingredients: [], tags: ["ready"] },
  { id: "book-thiel", name: "«От нуля к единице» П. Тиль", emoji: "📘", price: 690, unit: "шт", category: "Книги", ingredients: [], tags: ["ready"] },
  { id: "book-cookbook", name: "Кулинарная книга Юлии Высоцкой", emoji: "📗", price: 990, unit: "шт", category: "Книги", ingredients: [], tags: ["ready"] },

  // Авто / Зоо / Ремонт
  { id: "car-charger", name: "Авто-зарядка USB-C 65W", emoji: "🔌", price: 1290, unit: "шт", category: "Авто", ingredients: [], tags: ["ready"] },
  { id: "car-mat", name: "Коврики автомобильные 4шт", emoji: "🚗", price: 4990, unit: "комплект", category: "Авто", ingredients: [], tags: ["ready"] },
  { id: "dog-food", name: "Корм для собак Royal Canin 15кг", emoji: "🐶", price: 8990, unit: "мешок", category: "Зоо", ingredients: [], tags: ["ready"] },
  { id: "cat-litter", name: "Наполнитель кошачий 12л", emoji: "🐱", price: 690, unit: "шт", category: "Зоо", ingredients: [], tags: ["ready"] },
  { id: "tools-set", name: "Набор инструментов 100 предметов", emoji: "🛠️", price: 6990, unit: "набор", category: "Ремонт", ingredients: [], tags: ["ready"] },
  { id: "paint-roller", name: "Валик малярный с лотком", emoji: "🎨", price: 590, unit: "шт", category: "Ремонт", ingredients: [], tags: ["ready"] },
]
