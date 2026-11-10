<script setup lang="ts">
/** Set eines Spiels suchen und auswählen (für Sealed-Produkte). */
const props = defineProps<{ game: string, label?: string | null }>()
const model = defineModel<string | null>({ required: true })
const emit = defineEmits<{ picked: [name: string | null] }>()

const query = ref('')
type SetHit = { id: string, code: string, name: string, releaseDate: string | null }
const results = ref<SetHit[]>([])
useDebounced(query, 250, async (q) => {
  results.value = q.trim().length < 2 ? [] : await $fetch<SetHit[]>('/api/sets/search', { query: { game: props.game, q } })
})
const items = computed(() => results.value.map(s => ({ value: s.id, label: s.name, hint: `${s.code.toUpperCase()} · ${s.releaseDate ?? '–'}` })))
const pick = (s: { id: string, name: string } | null) => {
  model.value = s?.id ?? null
  emit('picked', s?.name ?? null)
  query.value = ''
  results.value = []
}
</script>

<template>
  <div>
    <div v-if="model" class="flex items-center gap-2 text-small">
      <Tag tone="info">{{ label ?? 'Set gewählt' }}</Tag>
      <UiButton size="sm" variant="ghost" @click="pick(null)">entfernen</UiButton>
    </div>
    <UiCombobox v-else v-model:query="query" :items="items" label="Set suchen" placeholder="Set suchen (Name oder Kürzel) …" @select="i => pick({ id: i.value, name: i.label })" />
  </div>
</template>
