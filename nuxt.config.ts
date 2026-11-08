import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
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
      shopUrl: 'http://localhost:3001',
    },
  },
})
