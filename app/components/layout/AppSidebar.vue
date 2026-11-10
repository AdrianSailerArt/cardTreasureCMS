<script setup lang="ts">
/**
 * Navigation des CMS, nach Aufgabe gruppiert (Überblick, Kunden, Verkauf, Inhalte), mit angemeldetem Admin und Abmelden.
 * Ab Tablet steht sie als Seitenleiste; auf dem Handy klappt ein Menü-Knopf sie auf (aria-expanded), Esc und ein
 * Seitenwechsel klappen sie wieder zu.
 */
const route = useRoute()
const me = useMe()
const shopUrl = useRuntimeConfig().public.shopUrl

const groups = [
  { title: 'Überblick', items: [
    { to: '/', label: 'Auswertungen' },
    { to: '/finance', label: 'Finanzen' },
  ] },
  { title: 'Kunden', items: [
    { to: '/customers', label: 'Kunden' },
    { to: '/trust', label: 'Vertrauen' },
    { to: '/reports', label: 'Meldungen' },
    { to: '/abandoned-carts', label: 'Warenkörbe' },
  ] },
  { title: 'Verkauf', items: [
    { to: '/shop', label: 'Eigener Shop' },
    { to: '/ads', label: 'Werbung' },
    { to: '/commission', label: 'Provision' },
  ] },
  { title: 'Inhalte', items: [
    { to: '/blog', label: 'Blog' },
    { to: '/sealed', label: 'Sealed' },
    { to: '/card-images', label: 'Kartenbilder' },
    { to: '/imports', label: 'Imports' },
  ] },
]
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const current = computed(() => groups.flatMap(g => g.items).find(item => isActive(item.to))?.label ?? 'Menü')

const open = ref(false)
const toggle = ref<HTMLButtonElement>()
const navId = useId()
watch(() => route.fullPath, () => {
  open.value = false
})
const closeWithFocus = () => {
  if (!open.value) return
  open.value = false
  toggle.value?.focus()
}

const logout = async () => {
  await authClient.signOut()
  me.value = null
  await navigateTo('/login')
}
</script>

<template>
  <aside class="border-b border-line px-4 py-3 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:py-4" @keydown.esc="closeWithFocus">
    <div class="flex items-center justify-between gap-3">
      <NuxtLink to="/" class="text-logo flex min-h-11 items-center">
        Card<span class="text-accent">Treasure</span>
        <span class="ml-1 align-middle text-label text-fg-subtle">CMS</span>
      </NuxtLink>
      <button
        ref="toggle"
        type="button"
        class="text-label flex min-h-11 items-center gap-2 rounded-md bg-surface-muted px-3 hover:text-accent md:hidden"
        :aria-expanded="open"
        :aria-controls="navId"
        @click="open = !open"
      >
        <span class="sr-only">Menü, aktuelle Seite:</span>{{ current }}
        <span aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
      </button>
    </div>
    <nav :id="navId" aria-label="Hauptnavigation" class="mt-3 flex-col gap-5 md:mt-6 md:flex" :class="open ? 'flex' : 'hidden'">
      <div v-for="group in groups" :key="group.title" role="group" :aria-labelledby="`${navId}-${group.title}`">
        <p :id="`${navId}-${group.title}`" class="text-eyebrow px-3 text-fg-subtle">{{ group.title }}</p>
        <ul class="mt-1">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="text-label flex min-h-10 items-center rounded-md border-l-2 px-3 focus-visible:outline-offset-[-2px]"
              :class="isActive(item.to) ? 'border-accent bg-surface-muted text-accent' : 'border-transparent text-fg-muted hover:text-accent'"
              :aria-current="isActive(item.to) ? 'page' : undefined"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>
      <a :href="shopUrl" target="_blank" rel="noopener" class="text-label flex min-h-10 items-center px-3 text-fg-subtle hover:text-accent">Shop öffnen&nbsp;<span aria-hidden="true">↗</span><span class="sr-only">(neues Fenster)</span></a>
      <div v-if="me" class="border-t border-line px-3 pt-4 text-meta text-fg-subtle md:hidden">
        <p class="truncate">{{ me.name }}</p>
        <button type="button" class="text-label mt-1 min-h-11 hover:text-accent" @click="logout">Abmelden</button>
      </div>
    </nav>
    <div v-if="me" class="mt-auto hidden px-3 pt-8 text-meta text-fg-subtle md:block">
      <p class="truncate">{{ me.name }}</p>
      <p class="truncate">{{ me.email }}</p>
      <button type="button" class="text-label mt-2 min-h-10 hover:text-accent" @click="logout">Abmelden</button>
    </div>
  </aside>
</template>
