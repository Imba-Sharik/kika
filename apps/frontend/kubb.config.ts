import { defineConfig } from '@kubb/core'
import { pluginOas } from '@kubb/plugin-oas'
import { pluginTs } from '@kubb/plugin-ts'
import { pluginClient } from '@kubb/plugin-client'

export default defineConfig({
  root: '.',
  input: {
    path: '../backend/src/extensions/documentation/documentation/1.0.0/full_documentation.json',
  },
  output: {
    path: './src/shared/api/generated',
    clean: true,
    extension: {
      '.ts': '',
    },
  },
  plugins: [
    pluginOas({ validate: true }),
    pluginTs({
      output: { path: 'types' },
    }),
    pluginClient({
      output: { path: 'clients' },
    }),
  ],
})
