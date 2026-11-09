<script setup lang="ts">
import type { ImportRun } from '~/types/admin'

/** Protokoll der Import-Läufe; ein Klick auf einen Fehlerstatus zeigt die Meldung. */
defineProps<{ runs: ImportRun[] }>()

const openError = ref<string | null>(null)
const toggle = (id: string) => {
  openError.value = openError.value === id ? null : id
}
const duration = (r: ImportRun) => {
  if (!r.finishedAt) return '…'
  const s = Math.round((new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) / 1000)
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`
}
</script>

<template>
  <UiTable :min-width="640">
      <template #head>
          <th>Start</th><th>Spiel</th><th>Status</th>
          <th>Argumente</th><th>Auslöser</th><th class="text-right">Dauer</th>
        </template>
        <template v-for="r in runs" :key="r.id">
          <tr>
            <td class="tabular-nums">{{ dateTime(r.startedAt) }}</td>
            <td>{{ GAME_LABEL[r.game] }}</td>
            <td>
              <button v-if="r.error" class="underline decoration-dotted" @click="toggle(r.id)"><StatusTag :status="r.status" /></button>
              <StatusTag v-else :status="r.status" />
            </td>
            <td class="font-mono text-meta text-fg-muted">{{ r.args ?? 'voll' }}</td>
            <td class="text-fg-muted">{{ r.trigger === 'schedule' ? 'nachts' : 'manuell' }}</td>
            <td class="text-right tabular-nums">{{ duration(r) }}</td>
          </tr>
          <tr v-if="openError === r.id">
            <td colspan="6"><pre class="mb-2 max-h-60 overflow-auto rounded-lg bg-danger-soft p-3 text-meta text-danger">{{ r.error }}</pre></td>
          </tr>
        </template>
        <tr v-if="!runs.length"><td colspan="6" class="py-4 text-fg-muted">Noch keine Läufe protokolliert.</td></tr>
      </UiTable>
</template>
