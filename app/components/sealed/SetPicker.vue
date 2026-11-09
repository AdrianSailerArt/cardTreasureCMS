<script setup lang="ts">
/** Set eines Spiels suchen und auswählen (für Sealed-Produkte). */
const props = defineProps<{ game: string, label?: string | null }>()
const model = defineModel<string | null>({ required: true })
const emit = defineEmits<{ picked: [name: string | null] }>()

const query = ref('')
interface SetHit { id: string, code: string, name: string, releaseDate: string | null }
const results = ref<SetHit[]>([])
useDebounced(query, 250, async (q) => {
  results.value = q.trim().length < 2 ? [] : await $fetch<SetHit[]>('/api/sets/search', { query: { game: props.game, q } })
})
const pick = (s: { id: string, name: string } | null) => {
  model.value = s?.id ?? null
  emit('picked', s?.name ?? null)
  query.value = ''
  results.value = []
}
</script>

<template>
  <div class="relative">
    <div v-if="model" class="flex items-center gap-2 text-sm">
      <Tag tone="info">{{ label ?? 'Set gewählt' }}</Tag>
      <button type="button" class="text-xs text-fg-subtle hover:text-danger" @click="pick(null)">entfernen</button>
    </div>
    <UiInput v-else v-model="query" placeholder="Set suchen (Name oder Kürzel) …" />
    <ul v-if="results.length" class="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-surface text-sm shadow-lg">
      <li v-for="s in results" :key="s.id">
        <button type="button" class="block w-full px-3 py-2 text-left hover:bg-surface-muted" @click="pick(s)">
          {{ s.name }} <span class="text-xs text-fg-subtle">{{ s.code.toUpperCase() }} · {{ s.releaseDate ?? '–' }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
