<script setup lang="ts">
const route = useRoute()
const me = useMe()
const config = useRuntimeConfig()

const nav = [
  { to: '/', label: 'Auswertungen' },
  { to: '/imports', label: 'Imports' },
  { to: '/blog', label: 'Blog' },
]
const active = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))

async function logout() {
  await authClient.signOut()
  me.value = null
  await navigateTo('/login')
}
</script>

<template>
  <div v-if="route.meta.layout === false || !me">
    <slot />
  </div>
  <div v-else class="min-h-screen md:grid md:grid-cols-[220px_1fr]">
    <aside class="border-b border-ink-200 px-4 py-4 md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r dark:border-ink-800">
      <div class="flex items-center justify-between md:block">
        <NuxtLink to="/" class="font-serif text-xl">
          Card<span class="text-gold-500">Treasure</span>
          <span class="ml-1 align-middle text-[10px] uppercase tracking-widest text-ink-400">Admin</span>
        </NuxtLink>
        <button class="text-xs text-ink-400 hover:text-gold-600 md:hidden" @click="logout">Abmelden</button>
      </div>
      <nav class="mt-4 flex gap-4 overflow-x-auto text-sm md:mt-8 md:flex-col md:gap-1">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="whitespace-nowrap rounded-lg md:px-3 md:py-2"
          :class="active(item.to) ? 'text-gold-600 md:bg-ink-100 dark:md:bg-ink-900' : 'text-ink-600 hover:text-gold-600 dark:text-ink-300'"
        >
          {{ item.label }}
        </NuxtLink>
        <a :href="config.public.shopUrl" target="_blank" class="whitespace-nowrap text-ink-400 hover:text-gold-600 md:px-3 md:py-2">Shop öffnen ↗</a>
      </nav>
      <div class="mt-auto hidden pt-8 text-xs text-ink-400 md:block">
        <p class="truncate">{{ me.name }}</p>
        <p class="truncate">{{ me.email }}</p>
        <button class="mt-2 hover:text-gold-600" @click="logout">Abmelden</button>
      </div>
    </aside>
    <main class="min-w-0 px-4 py-8 md:px-10">
      <slot />
    </main>
  </div>
</template>
