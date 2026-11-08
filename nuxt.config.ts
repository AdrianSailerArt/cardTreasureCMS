import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['flag-icons/css/flag-icons.min.css', '~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
    // Flaggen nicht ins CSS einbetten, sonst landen alle ~540 SVGs in jeder Seite
    build: { assetsInlineLimit: (file: string) => (file.includes('flag-icons') ? false : undefined) },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'de' },
      title: 'CardTreasure Admin',
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    },
  },

  runtimeConfig: {
    databaseUrl: '',
    betterAuthSecret: '',
    public: {
      siteUrl: 'http://localhost:3100',
      /** Öffentlicher Shop, für Links und Kartenbilder */
      shopUrl: 'http://localhost:3000',
      /** Demo-Admin mit Passwort zulassen (lokal/Testphase). Im Echtbetrieb aus: nur Magic-Link. */
      demoLogin: false,
    },
  },
})
