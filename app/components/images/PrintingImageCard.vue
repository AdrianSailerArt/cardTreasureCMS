<script setup lang="ts">
import type { PrintingImageRow } from '~~/server/api/printings/index.get'

/**
 * Ein Druck mit Bild, wie es der Shop zeigt, daneben das Original aus der Quelle.
 * Ersetzen (Datei + Grund) oder zurück zum Original.
 */
const props = defineProps<{ printing: PrintingImageRow }>()
const emit = defineEmits<{ changed: [] }>()
const shopUrl = useRuntimeConfig().public.shopUrl

const reason = ref(props.printing.overrideReason ?? '')
const busy = ref(false)
const error = ref<string | null>(null)
const input = ref<HTMLInputElement>()
// Neue ID nach dem Austausch umgeht den Browser-Cache des Shop-Bildes
const version = ref(props.printing.overrideMediaId ?? 'source')
const shopImage = computed(() => `${shopUrl}/img/${props.printing.id}?v=${version.value}`)

const upload = async (files: FileList | null) => {
  const file = files?.[0]
  if (!file) return
  busy.value = true
  error.value = null
  try {
    const body = new FormData()
    body.append('file', file)
    if (reason.value.trim()) body.append('reason', reason.value.trim())
    const res = await $fetch<{ mediaId: string }>(`/api/printings/${props.printing.id}/image`, { method: 'POST', body })
    version.value = res.mediaId
    emit('changed')
  }
  catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Hochladen fehlgeschlagen'
  }
  finally {
    busy.value = false
    if (input.value) input.value.value = ''
  }
}

const reset = async () => {
  busy.value = true
  await $fetch(`/api/printings/${props.printing.id}/image`, { method: 'DELETE' })
  version.value = `source-${Date.now()}`
  busy.value = false
  emit('changed')
}
</script>

<template>
  <div class="rounded-xl border border-line bg-surface p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="truncate font-medium">{{ printing.cardNameDe ?? printing.cardName }}</p>
        <p class="truncate text-xs text-fg-subtle">
          {{ GAME_LABEL[printing.game] }} · {{ printing.setName }} ({{ printing.setCode.toUpperCase() }}) · #{{ printing.collectorNumber }}
        </p>
      </div>
      <Tag v-if="printing.overrideMediaId" tone="warning">ersetzt</Tag>
      <Tag v-else tone="success">Original</Tag>
    </div>

    <div class="mt-3 grid grid-cols-2 gap-3">
      <figure>
        <img :src="shopImage" :alt="printing.cardName" loading="lazy" class="aspect-[63/88] w-full rounded-md bg-surface-muted object-cover">
        <figcaption class="mt-1 text-center text-[11px] text-fg-subtle">im Shop</figcaption>
      </figure>
      <figure>
        <img v-if="printing.sourceImageUrl" :src="printing.sourceImageUrl" alt="" loading="lazy" class="aspect-[63/88] w-full rounded-md bg-surface-muted object-cover opacity-80">
        <div v-else class="grid aspect-[63/88] place-items-center rounded-md bg-surface-muted text-xs text-fg-subtle">kein Bild</div>
        <figcaption class="mt-1 text-center text-[11px] text-fg-subtle">Quelle (API)</figcaption>
      </figure>
    </div>

    <p v-if="printing.overrideMediaId && printing.overrideBy" class="mt-2 text-xs text-fg-subtle">
      Ersetzt von {{ printing.overrideBy }}<template v-if="printing.overrideReason">: „{{ printing.overrideReason }}“</template>
    </p>

    <div class="mt-3 space-y-2">
      <UiInput v-model="reason" placeholder="Grund, z.B. falsche Sprache, Rückseite, falscher Druck" />
      <div class="flex flex-wrap gap-2">
        <label class="inline-flex min-h-10 cursor-pointer items-center rounded-md px-4 text-xs font-semibold uppercase tracking-[0.08em] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent bg-primary text-on-primary" :class="{ 'pointer-events-none opacity-50': busy }">
          {{ busy ? 'Lädt …' : printing.overrideMediaId ? 'Erneut ersetzen' : 'Bild ersetzen' }}
          <input ref="input" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="upload(($event.target as HTMLInputElement).files)">
        </label>
        <UiButton v-if="printing.overrideMediaId" variant="ghost" :disabled="busy" @click="reset">Original wiederherstellen</UiButton>
      </div>
      <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
    </div>
  </div>
</template>
