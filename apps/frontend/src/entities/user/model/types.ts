// @/entities/user/model/types.ts
// FSD: entities/user — типы бизнес-сущности пользователя

export interface User {
  id: string;
  username: string;
  email: string;
  strapiJwt?: string;
  role?: string;
}
