import { factories } from '@strapi/strapi'

// Стандартный CRUD-контроллер от Strapi — даёт админке UI list/create/edit/delete.
// Публично роуты не выставляем (Public role не получит доступ автоматически).
// Для собственных нужд можно расширить, но сейчас не требуется.
export default factories.createCoreController('api::usage.usage')
