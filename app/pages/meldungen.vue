<script setup lang="ts">
import type { ReportView } from '~/types/admin'

/** Meldungen von Kunden: prüfen, sperren, Angebot entfernen, abschließen. */
const status = ref<'open' | 'handled'>('open')
const { data: reports, refresh, error } = await useFetch<ReportView[]>('/api/reports', { query: computed(() => ({ status: status.value })), default: () => [] })
const tabs = [{ value: 'open' as const, label: 'Offen' }, { value: 'handled' as const, label: 'Erledigt' }]
useSeoMeta({ title: 'Meldungen – CardTreasure CMS' })
</script>

<template>
  <div>
    <PageHeader title="Meldungen" description="Von Kunden gemeldete Profile, Angebote und Nachrichten. Die gemeldete Person erfährt nicht, wer gemeldet hat; die meldende Person bekommt nach dem Abschluss Bescheid.">
      <UiSegmented v-model="status" :options="tabs" />
    </PageHeader>
    <UiNotice v-if="error" tone="danger" class="mt-4">Shop nicht erreichbar: {{ error.statusMessage }}</UiNotice>
    <Panel class="mt-6">
      <div class="divide-y divide-line">
        <ReportRow v-for="r in reports" :key="r.id" :report="r" @changed="refresh" />
      </div>
      <p v-if="!reports.length" class="text-sm text-fg-muted">{{ status === 'open' ? 'Keine offenen Meldungen.' : 'Noch nichts erledigt.' }}</p>
    </Panel>
  </div>
</template>
