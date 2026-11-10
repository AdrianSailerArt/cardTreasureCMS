<script setup lang="ts">
import type { CartExpiryCustomer } from '~/types/admin'

/** Ein Kunde mit abgelaufenen Warenkörben: Häufigkeit (Ampel), Menge, Wert, Käufe, Sperren direkt aus der Liste. */
defineProps<{ customer: CartExpiryCustomer, threshold: number }>()
const emit = defineEmits<{ changed: [] }>()
</script>

<template>
  <tr>
    <td>
      <NuxtLink :to="`/customers/${customer.userId}`" class="inline-flex items-center gap-1.5 hover:text-accent">
        <CountryFlag v-if="customer.country" :code="customer.country" />{{ customer.name }}
      </NuxtLink>
      <span class="block text-meta text-fg-subtle">{{ customer.email }}</span>
    </td>
    <td><CartsExpiryTag :count="customer.expiries" :threshold="threshold" /></td>
    <td class="text-right tabular-nums">{{ num(customer.items) }}</td>
    <td class="text-right tabular-nums">{{ euro(customer.valueCents) }}</td>
    <td class="text-right tabular-nums text-fg-muted">{{ num(customer.expiriesTotal) }}</td>
    <td class="text-right tabular-nums text-fg-muted">{{ num(customer.orders) }}</td>
    <td class="text-fg-muted">{{ dateTime(customer.lastAt) }}</td>
    <td class="text-right">
      <Tag v-if="customer.blocked" tone="danger">gesperrt</Tag>
      <ModerationActionButton
        v-else
        label="Sperren"
        action="block"
        :payload="{ userId: customer.userId }"
        :placeholder="`Grund, z.B. ${customer.expiries}× Warenkorb verfallen lassen (geht per Mail an den Kunden)`"
        @done="emit('changed')"
      />
    </td>
  </tr>
</template>
