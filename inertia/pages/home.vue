<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
</script>

<template>
  <Head title="ForecastPro" />

  <div class="flex justify-center items-center bg-background p-8 min-h-screen">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-2xl">ForecastPro</CardTitle>
        <CardDescription>
          Gérez vos finances personnelles avec intelligence
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <p class="text-muted-foreground">
          Suivez vos dépenses, anticipez vos budgets et maîtrisez vos crédits.
        </p>
        <div class="flex gap-2">
          <Button>Commencer</Button>
          <Button variant="outline">En savoir plus</Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
