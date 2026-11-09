<script setup lang="ts">
/**
 * Art des Kunden: privat oder gewerblich (gewerblich hat Pflichtangaben wie Impressum, USt-ID, Widerruf).
 * Jeder Kunde kann kaufen und verkaufen; ohne gespeichertes Profil gilt er als privat. Admins eigens markiert.
 */
const props = defineProps<{ role?: string, sellerType?: string | null }>()
const tag = computed(() => {
  if (props.role === 'admin') return { tone: 'accent' as const, label: 'Admin' }
  if (props.sellerType === 'commercial') return { tone: 'info' as const, label: 'gewerblich' }
  return { tone: 'neutral' as const, label: 'privat' }
})
</script>

<template>
  <Tag :tone="tag.tone">{{ tag.label }}</Tag>
</template>
