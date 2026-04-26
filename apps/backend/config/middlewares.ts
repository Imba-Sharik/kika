import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            env('CF_PUBLIC_URL', '').replace(/^https?:\/\//, ''),
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            env('CF_PUBLIC_URL', '').replace(/^https?:\/\//, ''),
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: env('CORS_ORIGINS', 'http://localhost:3000').split(','),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      // STT принимает webm/opus аудио (~до 1-2 МБ), vision — base64 PNG (до ~10 МБ).
      // Дефолт 200kb рубит запросы.
      jsonLimit: '20mb',
      formLimit: '20mb',
      textLimit: '20mb',
      formidable: {
        maxFileSize: 25 * 1024 * 1024, // 25 МБ хватит для голосового turn любой длины
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
