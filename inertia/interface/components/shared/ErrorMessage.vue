<script setup lang="ts">
import { AlertCircle, X } from "lucide-vue-next";

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
  <div class="flex items-start gap-3 bg-rose-500/10 p-4 border border-rose-500/20 rounded-lg">
    <AlertCircle class="flex-shrink-0 mt-0.5 w-5 h-5 text-rose-400" />
    <p class="flex-1 text-rose-300 text-sm">{{ message }}</p>
    <button
      v-if="dismissible"
      @click="emit('dismiss')"
      class="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
    >
      <X class="w-4 h-4" />
    </button>
  </div>
</template>
