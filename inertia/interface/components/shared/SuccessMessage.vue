<script setup lang="ts">
import { CheckCircle2, X } from "lucide-vue-next";

interface Props {
	message: string;
	dismissible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	dismissible: false,
});

const emit = defineEmits<{
	dismiss: [];
}>();
</script>

<template>
  <div class="flex items-start gap-3 bg-emerald-500/10 p-4 border border-emerald-500/20 rounded-lg">
    <CheckCircle2 class="flex-shrink-0 mt-0.5 w-5 h-5 text-emerald-400" />
    <p class="flex-1 text-emerald-300 text-sm">{{ message }}</p>
    <button
      v-if="dismissible"
      @click="emit('dismiss')"
      class="p-1 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
    >
      <X class="w-4 h-4" />
    </button>
  </div>
</template>
