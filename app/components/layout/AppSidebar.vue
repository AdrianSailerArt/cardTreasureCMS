<script setup lang="ts">
/** Navigation des CMS mit angemeldetem Admin und Abmelden. */
const route = useRoute()
const me = useMe()
const shopUrl = useRuntimeConfig().public.shopUrl

const nav = [
  { to: '/', label: 'Auswertungen' },
  { to: '/imports', label: 'Imports' },
  { to: '/blog', label: 'Blog' },
  { to: '/sealed', label: 'Sealed' },
  { to: '/kartenbilder', label: 'Kartenbilder' },
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
      <NuxtLink to="/" class="font-serif text-xl">
        Card<span class="text-accent">Treasure</span>
        <span class="ml-1 align-middle text-[10px] uppercase tracking-widest text-fg-subtle">CMS</span>
      </NuxtLink>
      <button class="text-xs text-fg-subtle hover:text-accent md:hidden" @click="logout">Abmelden</button>
    </div>
    <nav class="mt-4 flex gap-4 overflow-x-auto text-sm md:mt-8 md:flex-col md:gap-1">
      <NuxtLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="whitespace-nowrap rounded-lg md:px-3 md:py-2"
        :class="isActive(item.to) ? 'text-accent md:bg-surface-muted' : 'text-fg-muted hover:text-accent'"
      >
        {{ item.label }}
      </NuxtLink>
      <a :href="shopUrl" target="_blank" class="whitespace-nowrap text-fg-subtle hover:text-accent md:px-3 md:py-2">Shop öffnen ↗</a>
    </nav>
    <div v-if="me" class="mt-auto hidden pt-8 text-xs text-fg-subtle md:block">
      <p class="truncate">{{ me.name }}</p>
      <p class="truncate">{{ me.email }}</p>
      <button class="mt-2 hover:text-accent" @click="logout">Abmelden</button>
    </div>
  </aside>
</template>
