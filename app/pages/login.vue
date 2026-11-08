<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const email = ref('')
const state = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')

const submit = async () => {
  state.value = 'sending'
  const next = typeof route.query.next === 'string' ? route.query.next : '/'
  const { error } = await authClient.signIn.magicLink({ email: email.value.trim(), callbackURL: next })
  state.value = error ? 'error' : 'sent'
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <form class="w-full max-w-sm" @submit.prevent="submit">
      <h1 class="text-4xl">Card<span class="text-accent">Treasure</span></h1>
      <p class="mt-1 text-sm uppercase tracking-widest text-fg-subtle">Interner Bereich</p>

      <template v-if="state !== 'sent'">
        <UiField label="E-Mail" class="mt-10">
          <UiInput v-model="email" type="email" placeholder="name@cardtreasure.eu" />
        </UiField>
        <UiButton type="submit" class="mt-4 w-full" :disabled="state === 'sending' || !email.includes('@')">Anmeldelink senden</UiButton>
        <UiNotice v-if="state === 'error'" tone="danger" class="mt-3">Das hat nicht geklappt. Nur Admins können sich anmelden.</UiNotice>
      </template>
      <p v-else class="mt-10 text-sm leading-relaxed text-fg-muted">
        Falls <strong class="text-fg">{{ email }}</strong> ein Admin-Konto hat, ist ein Anmeldelink unterwegs.
        Lokal steht er in der Server-Konsole.
      </p>
    </form>
  </div>
</template>
