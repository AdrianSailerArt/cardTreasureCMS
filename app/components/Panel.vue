<script setup lang="ts">
/** Kasten mit Rahmen und optionalem Titel, Grundbaustein aller Bereiche im CMS. */
defineProps<{ title?: string }>()
</script>

<template>
  <section class="rounded-xl border border-line bg-surface p-5">
    <div v-if="title || $slots.actions" class="mb-4 flex items-center justify-between gap-3">
      <h2 v-if="title" class="text-xl">{{ title }}</h2>
      <slot name="actions" />
    </div>
    <slot />
  </section>
</template>
