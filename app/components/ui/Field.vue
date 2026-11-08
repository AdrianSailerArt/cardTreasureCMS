<script setup lang="ts">
/** Beschriftetes Formularfeld: Label, Inhalt (Input/Select/Textarea) und optionaler Hinweis. */
defineProps<{ label: string, hint?: string }>()
</script>

<template>
  <label class="block">
    <span class="mb-1 block text-xs uppercase tracking-wider text-fg-subtle">{{ label }}</span>
    <slot />
    <span v-if="hint" class="mt-1 block text-xs text-fg-subtle">{{ hint }}</span>
  </label>
</template>
