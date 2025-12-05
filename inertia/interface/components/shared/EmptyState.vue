<script setup lang="ts">
import { type LucideIcon } from "lucide-vue-next";

interface Props {
	icon: LucideIcon;
	title: string;
	description?: string;
}

defineProps<Props>();
</script>

<template>
  <div class="py-12 text-center">
    <div class="flex justify-center items-center bg-slate-800/50 mx-auto mb-4 rounded-2xl w-20 h-20">
      <component :is="icon" class="w-10 h-10 text-slate-600" />
    </div>
    <h3 class="font-medium text-slate-300 text-lg">{{ title }}</h3>
    <p v-if="description" class="mt-1 text-slate-500">{{ description }}</p>
    <div class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
