<script setup lang="ts">
/** Grundgerüst: Sprunglink zum Inhalt (Tastatur), Navigation, Inhalt. */
const me = useMe()
</script>

<template>
  <div v-if="!me">
    <slot />
  </div>
  <div v-else class="min-h-screen md:grid md:grid-cols-[220px_1fr]">
    <a href="#inhalt" class="label-caps sr-only z-50 rounded-md bg-primary px-4 py-3 text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Zum Inhalt springen</a>
    <LayoutAppSidebar />
    <main id="inhalt" class="min-w-0 px-4 py-8 md:px-10" tabindex="-1">
      <slot />
    </main>
  </div>
</template>
