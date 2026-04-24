// @/app/api/auth/[...nextauth]/route.ts
// Next.js App Router — обработчик Auth.js v5
// Слой: app (routing), FSD-архитектура

import { handlers } from '@/auth';

export const { GET, POST } = handlers;
