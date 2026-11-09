<script setup lang="ts">
/** Produktbild hochladen und anzeigen (Bild liegt im Objektspeicher, ausgeliefert vom Shop unter /media/<id>). */
const props = defineProps<{ sealedId: string, imageId: string | null }>()
const emit = defineEmits<{ changed: [imageId: string] }>()
const shopUrl = useRuntimeConfig().public.shopUrl
const busy = ref(false)
const error = ref<string | null>(null)

const upload = async (files: FileList | null) => {
  const file = files?.[0]
  if (!file) return
  busy.value = true
  error.value = null
  try {
    const body = new FormData()
    body.append('file', file)
    const res = await $fetch<{ imageId: string }>(`/api/sealed/${props.sealedId}/image`, { method: 'POST', body })
    emit('changed', res.imageId)
  }
  catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Hochladen fehlgeschlagen'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <div class="grid aspect-square w-48 place-items-center overflow-hidden rounded-xl border border-line bg-surface-muted">
      <img v-if="imageId" :src="`${shopUrl}/media/${imageId}`" alt="" class="h-full w-full object-contain">
      <span v-else class="text-xs text-fg-subtle">kein Bild</span>
    </div>
    <label class="mt-3 inline-flex cursor-pointer items-center rounded-full border border-line-strong px-4 py-1.5 text-sm hover:border-accent" :class="{ 'pointer-events-none opacity-50': busy }">
      {{ busy ? 'Lädt …' : imageId ? 'Bild ersetzen' : 'Bild hochladen' }}
      <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="upload(($event.target as HTMLInputElement).files)">
    </label>
    <UiNotice v-if="error" tone="danger" class="mt-2">{{ error }}</UiNotice>
  </div>
</template>
