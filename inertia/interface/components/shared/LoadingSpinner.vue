<script setup lang="ts">
import { Loader2 } from "lucide-vue-next";

interface Props {
	size?: "sm" | "md" | "lg";
	text?: string;
}

const props = withDefaults(defineProps<Props>(), {
	size: "md",
});

const sizeClasses = {
	sm: "w-4 h-4",
	md: "w-6 h-6",
	lg: "w-10 h-10",
};
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3">
    <Loader2 :class="['animate-spin text-cyan-400', sizeClasses[size]]" />
    <p v-if="text" class="text-slate-400 text-sm">{{ text }}</p>
  </div>
</template>
