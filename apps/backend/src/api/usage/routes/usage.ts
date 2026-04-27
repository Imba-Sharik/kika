import { factories } from '@strapi/strapi'

// Стандартные REST-роуты (find/findOne/create/update/delete) — нужны Strapi
// admin'у для CRUD-UI. Публичный доступ — только если откроешь в Settings →
// Roles. По умолчанию закрыто, что нам и нужно.
export default factories.createCoreRouter('api::usage.usage')
