<script setup lang="ts">
const me = useMe()
</script>

<template>
  <div v-if="!me">
    <slot />
  </div>
  <div v-else class="min-h-screen md:grid md:grid-cols-[220px_1fr]">
    <LayoutAppSidebar />
    <main class="min-w-0 px-4 py-8 md:px-10">
      <slot />
    </main>
  </div>
</template>
