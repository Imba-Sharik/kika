// @/shared/types/next-auth.d.ts
// Расширение типов Auth.js v5 — добавляем strapiJwt в Session, JWT и User

import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    strapiJwt: string;
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    strapiJwt?: string;
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    strapiJwt: string;
    id: string;
    role: string;
  }
}
