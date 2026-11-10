<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const config = useRuntimeConfig()
const me = useMe()
const next = computed(() => (typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/'))

const email = ref('')
const state = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')

const sendLink = async () => {
  state.value = 'sending'
  const { error } = await authClient.signIn.magicLink({ email: email.value.trim(), callbackURL: next.value })
  state.value = error ? 'error' : 'sent'
}

/** Passwort gibt es nur für den Test-Admin (siehe Shop-Repo docs/zugaenge.md); sonst Magic-Link */
const signInWithPassword = async (mail: string, password: string) => !(await authClient.signIn.email({ email: mail, password })).error
const afterLogin = async () => {
  me.value = null
  await navigateTo(next.value)
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <h1 class="text-headline">Card<span class="text-accent">Treasure</span></h1>
      <p class="mt-1 text-label text-fg-subtle">Interner Bereich</p>

      <form v-if="state !== 'sent'" class="mt-10" @submit.prevent="sendLink">
        <UiField label="E-Mail">
          <UiInput v-model="email" type="email" placeholder="name@cardtreasure.eu" />
        </UiField>
        <UiButton type="submit" class="mt-4 w-full" :disabled="state === 'sending' || !email.includes('@')">Anmeldelink senden</UiButton>
        <UiNotice v-if="state === 'error'" tone="danger" class="mt-3">Das hat nicht geklappt. Nur Admins können sich anmelden.</UiNotice>
      </form>
      <p v-else class="mt-10 text-small leading-relaxed text-fg-muted">
        Falls <strong class="text-fg">{{ email }}</strong> ein Admin-Konto hat, ist ein Anmeldelink unterwegs.
        Lokal steht er in der Server-Konsole.
      </p>

      <PasswordLoginForm v-if="config.public.demoLogin" class="mt-8 border-t border-line pt-5" :sign-in="signInWithPassword" @done="afterLogin" />
    </div>
  </div>
</template>
