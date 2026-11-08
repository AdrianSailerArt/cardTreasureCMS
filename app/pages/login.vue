<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const email = ref('')
const state = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')

async function submit() {
  state.value = 'sending'
  const next = typeof route.query.next === 'string' ? route.query.next : '/'
  const { error } = await authClient.signIn.magicLink({ email: email.value.trim(), callbackURL: next })
  state.value = error ? 'error' : 'sent'
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <form class="w-full max-w-sm" @submit.prevent="submit">
      <h1 class="text-4xl">Card<span class="text-gold-500">Treasure</span></h1>
      <p class="mt-1 text-sm uppercase tracking-widest text-ink-400">Interner Bereich</p>

      <template v-if="state !== 'sent'">
        <label class="label mt-10" for="email">E-Mail</label>
        <input id="email" v-model="email" type="email" required autofocus class="field" placeholder="name@cardtreasure.eu">
        <button class="btn mt-4 w-full" :disabled="state === 'sending'">Anmeldelink senden</button>
        <p v-if="state === 'error'" class="mt-3 text-sm text-red-600">Das hat nicht geklappt. Nur Admins können sich anmelden.</p>
      </template>
      <p v-else class="mt-10 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
        Falls <strong>{{ email }}</strong> ein Admin-Konto hat, ist ein Anmeldelink unterwegs.
        Lokal steht er in der Server-Konsole.
      </p>
    </form>
  </div>
</template>
