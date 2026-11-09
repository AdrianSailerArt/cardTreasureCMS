<script setup lang="ts">
/** Kunden suchen; nach Art (privat/gewerblich) und gesperrt filterbar. Jeder Kunde kann kaufen und verkaufen. */
interface UserRow { id: string, name: string, email: string, role: string, displayName: string | null, sellerType: 'private' | 'commercial', companyName: string | null, country: string | null, createdAt: string, blocked: boolean, isDemo: boolean, purchases: number, sales: number, balanceCents: number }
const q = ref('')
const query = useDebounced(() => q.value.trim(), 300)
const onlyBlocked = ref(false)
const kind = ref<'' | 'private' | 'commercial'>('')
const KINDS = [{ value: '' as const, label: 'alle' }, { value: 'private' as const, label: 'privat' }, { value: 'commercial' as const, label: 'gewerblich' }]
const { data: users } = await useFetch<UserRow[]>('/api/users', { query: computed(() => ({ q: query.value || undefined, blocked: onlyBlocked.value ? '1' : undefined, kind: kind.value || undefined })), default: () => [] })
useSeoMeta({ title: 'Kunden – CardTreasure CMS' })
</script>

<template>
  <div>
    <PageHeader title="Kunden" description="Jeder Kunde kann kaufen und verkaufen. Entscheidend ist, ob privat oder gewerblich. Details ansehen, sperren und entsperren." />
    <div class="mt-6 flex flex-wrap items-center gap-3">
      <div class="w-80"><UiInput v-model="q" placeholder="Name, E-Mail oder Anzeigename …" /></div>
      <UiSegmented v-model="kind" :options="KINDS" />
      <label class="flex items-center gap-2 text-sm"><input v-model="onlyBlocked" type="checkbox" class="accent-accent"> nur gesperrte</label>
    </div>
    <Panel class="mt-4">
      <UiTable :min-width="860">
        <template #head><th>Name</th><th>E-Mail</th><th>Art</th><th>Status</th><th class="text-right">Käufe</th><th class="text-right">Verkäufe</th><th class="text-right">Guthaben</th><th class="text-right">seit</th></template>
        <tr v-for="u in users" :key="u.id">
          <td>
            <span class="flex items-center gap-2">
              <CountryFlag v-if="u.country" :code="u.country" />
              <NuxtLink :to="`/customers/${u.id}`" class="hover:text-accent">{{ u.name }}</NuxtLink>
              <span v-if="u.companyName || (u.displayName && u.displayName !== u.name)" class="text-xs text-fg-subtle">{{ u.companyName ?? u.displayName }}</span>
            </span>
          </td>
          <td class="text-fg-muted">{{ u.email }}</td>
          <td><CustomerKindTag :role="u.role" :seller-type="u.sellerType" /></td>
          <td><Tag v-if="u.blocked" tone="danger">gesperrt</Tag><Tag v-else tone="success">aktiv</Tag><Tag v-if="u.isDemo" tone="info" class="ml-1">Demo</Tag></td>
          <td class="text-right tabular-nums">{{ u.purchases }}</td>
          <td class="text-right tabular-nums">{{ u.sales }}</td>
          <td class="text-right tabular-nums">{{ euro(u.balanceCents) }}</td>
          <td class="text-right tabular-nums text-fg-muted">{{ dateTime(u.createdAt).slice(0, 8) }}</td>
        </tr>
        <tr v-if="!users.length"><td colspan="8" class="py-6 text-fg-muted">Keine Kunden gefunden.</td></tr>
      </UiTable>
    </Panel>
  </div>
</template>
