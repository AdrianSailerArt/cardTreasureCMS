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
    /** SMTP für Anmeldelinks, lokal Mailpit (smtp://localhost:1025). Leer: nur Konsole. */
    smtpUrl: '',
    mailFrom: 'CardTreasure CMS <cms@cardtreasure.local>',
    /** Gleicher Objektspeicher wie der Shop (lokal SeaweedFS aus dessen docker compose) */
    media: { endpoint: 'http://localhost:8333', bucket: 'cardtreasure-media', accessKey: 'cardtreasure', secretKey: 'cardtreasure-dev', region: 'us-east-1' },
    public: {
      siteUrl: 'http://localhost:3100',
      /** Öffentlicher Shop, für Links und Kartenbilder */
      shopUrl: 'http://localhost:3000',
      /** Demo-Admin mit Passwort zulassen (lokal/Testphase). Im Echtbetrieb aus: nur Magic-Link. */
      demoLogin: false,
    },
  },
})
