import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

/**
 * Generates the installable-app icon set from the bundled SORT mark.
 * Outputs land in public/pwa/ with fixed names consumed by the dynamic
 * manifest and index.html. Tenant icons are generated separately by the API.
 */
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: {
      sizes: [192, 512],
      favicons: [],
      resizeOptions: { fit: 'contain', background: 'transparent' },
    },
    maskable: {
      sizes: [192, 512],
      resizeOptions: { fit: 'contain', background: '#F9F3F0' },
    },
    apple: {
      sizes: [180],
      resizeOptions: { fit: 'contain', background: '#F9F3F0' },
    },
    assetName: (type, size) => {
      if (type === 'transparent') return `pwa/icon-${size.width}.png`
      if (type === 'maskable') return `pwa/icon-maskable-${size.width}.png`
      return `pwa/apple-touch-icon.png`
    },
  },
  images: ['public/sort-logo.svg'],
})
