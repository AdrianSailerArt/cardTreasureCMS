<script setup lang="ts">
/** Button oder Link in Pillenform. `primary` für die Hauptaktion, `ghost` für alles andere. */
withDefaults(defineProps<{
  variant?: 'primary' | 'ghost'
  to?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}>(), { variant: 'primary', type: 'button', disabled: false })

const classes = {
  primary: 'bg-primary text-on-primary hover:opacity-90',
  ghost: 'border border-line-strong hover:border-accent',
}
</script>

<template>
  <NuxtLink v-if="to" :to="to" class="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm transition" :class="classes[variant]">
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm transition disabled:opacity-50"
    :class="classes[variant]"
  >
    <slot />
  </button>
</template>
