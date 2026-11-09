<script setup lang="ts">
import type { ReportView } from '~/types/admin'

/** Eine Meldung: Kategorie (Ampel), Ziel mit Kontext, gemeldete Person, Maßnahmen (sperren, Angebot entfernen, abschließen). */
const props = defineProps<{ report: ReportView }>()
const emit = defineEmits<{ changed: [] }>()
const shopUrl = useRuntimeConfig().public.shopUrl

const CATEGORY: Record<ReportView['category'], { label: string, tone: 'danger' | 'warning' | 'neutral' }> = {
  fraud: { label: 'Betrug / nicht geliefert', tone: 'danger' },
  fake: { label: 'Fälschung', tone: 'danger' },
  harassment: { label: 'Belästigung', tone: 'danger' },
  wrong_item: { label: 'falsche Karte / Zustand', tone: 'warning' },
  spam: { label: 'Spam', tone: 'warning' },
  other: { label: 'Sonstiges', tone: 'neutral' },
}
const TARGET: Record<ReportView['targetType'], string> = { user: 'Profil', listing: 'Angebot', message: 'Nachricht' }

const note = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const handle = async (status: 'resolved' | 'dismissed') => {
  busy.value = true
  error.value = null
  try {
    await $fetch(`/api/reports/${props.report.id}/handle`, { method: 'POST', body: { status, resolution: note.value.trim() || null } })
    emit('changed')
  }
  catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Fehlgeschlagen'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid gap-3 py-4 text-small lg:grid-cols-[1fr_auto]">
    <div class="min-w-0">
      <p class="flex flex-wrap items-center gap-2">
        <Tag :tone="CATEGORY[report.category].tone">{{ CATEGORY[report.category].label }}</Tag>
        <Tag>{{ TARGET[report.targetType] }}</Tag>
        <span class="text-meta text-fg-subtle">{{ dateTime(report.createdAt) }} · von {{ report.reporter ?? 'gelöschtem Konto' }}</span>
        <Tag v-if="report.status !== 'open'" :tone="report.status === 'resolved' ? 'success' : 'neutral'">
          {{ report.status === 'resolved' ? 'bearbeitet' : 'kein Verstoß' }}<template v-if="report.handledBy"> · {{ report.handledBy }}</template>
        </Tag>
      </p>
      <p class="mt-2">
        gegen <NuxtLink :to="`/customers/${report.subjectId}`" class="font-medium hover:text-accent">{{ report.subject }}</NuxtLink>
        <Tag v-if="report.openAgainstSubject > 1" tone="danger" class="ml-1">{{ report.openAgainstSubject }} offene Meldungen</Tag>
        <Tag v-if="report.subjectBlocked" tone="danger" class="ml-1">gesperrt</Tag>
      </p>
      <p v-if="report.context" class="mt-1 rounded-lg bg-surface-muted px-3 py-2 text-fg-muted">
        <a v-if="report.targetType === 'listing'" :href="`${shopUrl}/profile/${report.subjectId}`" target="_blank" class="hover:text-accent">{{ report.context }} ↗</a>
        <template v-else>„{{ report.context }}“</template>
      </p>
      <p v-if="report.text" class="mt-1">{{ report.text }}</p>
      <p v-if="report.resolution" class="mt-1 text-meta text-fg-subtle">Notiz: {{ report.resolution }}</p>
    </div>
    <div v-if="report.status === 'open'" class="flex flex-col gap-2 lg:w-72">
      <div class="flex flex-wrap gap-2">
        <ModerationActionButton v-if="!report.subjectBlocked" label="Sperren" action="block" :payload="{ userId: report.subjectId }" @done="emit('changed')" />
        <ModerationActionButton v-if="report.targetType === 'listing'" label="Angebot entfernen" action="remove-listing" :payload="{ listingId: report.targetId }" @done="emit('changed')" />
      </div>
      <UiInput v-model="note" placeholder="Notiz (optional, nur intern)" />
      <div class="flex gap-2">
        <UiButton :disabled="busy" @click="handle('resolved')">Bearbeitet</UiButton>
        <UiButton variant="ghost" :disabled="busy" @click="handle('dismissed')">Kein Verstoß</UiButton>
      </div>
      <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
    </div>
  </div>
</template>
