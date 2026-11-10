<script setup lang="ts">
import { TEST_ACCOUNTS, TEST_PASSWORD } from '@cardtreasure/core/test-accounts'
definePageMeta({ layout: false })

const route = useRoute()
const config = useRuntimeConfig()
const me = useMe()
const next = computed(() => (typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/'))

const DEMO = { email: TEST_ACCOUNTS.find(a => a.role === 'admin')!.email, password: TEST_PASSWORD }

const email = ref('')
const state = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const demoError = ref(false)

const sendLink = async () => {
  state.value = 'sending'
  const { error } = await authClient.signIn.magicLink({ email: email.value.trim(), callbackURL: next.value })
  state.value = error ? 'error' : 'sent'
}

const demoLogin = async () => {
  demoError.value = false
  const { error } = await authClient.signIn.email(DEMO)
  if (error) {
    demoError.value = true
    return
  }
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

      <Panel v-if="config.public.demoLogin" title="Test-Zugang" class="mt-10">
        <p class="text-small text-fg-muted">Test-Admin (<code>bun run testdata</code>):</p>
        <p class="mt-2 font-mono text-meta text-fg-subtle">{{ DEMO.email }} · {{ DEMO.password }}</p>
        <UiButton variant="ghost" class="mt-4 w-full" @click="demoLogin">Als Test-Admin anmelden</UiButton>
        <UiNotice v-if="demoError" tone="danger" class="mt-3">Test-Admin nicht gefunden. Zuerst <code>bun run testdata</code> ausführen.</UiNotice>
      </Panel>
    </div>
  </div>
</template>
