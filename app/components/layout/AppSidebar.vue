<script setup lang="ts">
/** Navigation des CMS mit angemeldetem Admin und Abmelden. */
const route = useRoute()
const me = useMe()
const shopUrl = useRuntimeConfig().public.shopUrl

const nav = [
  { to: '/', label: 'Auswertungen' },
  { to: '/finance', label: 'Finanzen' },
  { to: '/commission', label: 'Provision' },
  { to: '/trust', label: 'Vertrauen' },
  { to: '/reports', label: 'Meldungen' },
  { to: '/customers', label: 'Kunden' },
  { to: '/shop', label: 'Eigener Shop' },
  { to: '/ads', label: 'Werbung' },
  { to: '/imports', label: 'Imports' },
  { to: '/blog', label: 'Blog' },
  { to: '/sealed', label: 'Sealed' },
  { to: '/card-images', label: 'Kartenbilder' },
]
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))

const logout = async () => {
  await authClient.signOut()
  me.value = null
  await navigateTo('/login')
}
</script>

<template>
  <aside class="border-b border-line px-4 py-4 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r">
    <div class="flex items-center justify-between md:block">
      <NuxtLink to="/" class="text-logo">
        Card<span class="text-accent">Treasure</span>
        <span class="ml-1 align-middle text-label text-fg-subtle">CMS</span>
      </NuxtLink>
      <button type="button" class="text-label min-h-8 text-fg-subtle hover:text-accent md:hidden" @click="logout">Abmelden</button>
    </div>
    <nav aria-label="Hauptnavigation" class="mt-4 flex gap-4 overflow-x-auto md:mt-8 md:flex-col md:gap-1">
      <NuxtLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="text-label whitespace-nowrap border-b-2 py-1.5 focus-visible:outline-offset-[-2px] md:rounded-md md:border-b-0 md:border-l-2 md:px-3 md:py-2"
        :class="isActive(item.to) ? 'border-accent text-accent md:bg-surface-muted' : 'border-transparent text-fg-muted hover:text-accent'"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        {{ item.label }}
      </NuxtLink>
      <a :href="shopUrl" target="_blank" rel="noopener" class="text-label whitespace-nowrap py-1.5 text-fg-subtle hover:text-accent md:px-3 md:py-2">Shop öffnen <span aria-hidden="true">↗</span><span class="sr-only">(neues Fenster)</span></a>
    </nav>
    <div v-if="me" class="mt-auto hidden pt-8 text-meta text-fg-subtle md:block">
      <p class="truncate">{{ me.name }}</p>
      <p class="truncate">{{ me.email }}</p>
      <button type="button" class="text-label mt-2 min-h-8 hover:text-accent" @click="logout">Abmelden</button>
    </div>
  </aside>
</template>
