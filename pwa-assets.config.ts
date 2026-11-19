import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Génère favicon + icônes PWA + apple-touch-icon à partir de public/logo.svg
// Commande : npm run icons
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0b0b0f' } },
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0b0b0f' } },
  },
  images: ['public/logo.svg'],
})
