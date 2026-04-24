import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  documentation: {
    enabled: true,
    config: {
      openapi: '3.0.0',
      info: {
        version: '1.0.0',
        title: 'My App API',
        description: 'API documentation',
      },
      'x-strapi-config': {
        plugins: ['users-permissions'],
      },
    },
  },
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        baseUrl: env('CF_PUBLIC_URL'),
        s3Options: {
          credentials: {
            accessKeyId: env('CF_ACCESS_KEY_ID'),
            secretAccessKey: env('CF_SECRET_ACCESS_KEY'),
          },
          region: 'auto',
          endpoint: `https://${env('CF_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
          forcePathStyle: true,
          params: {
            Bucket: env('CF_BUCKET'),
          },
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});

export default config;
