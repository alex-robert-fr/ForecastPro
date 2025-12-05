<script setup lang="ts">
import type { LucideIcon } from "lucide-vue-next";
import { useFormatters } from "~/interface/composables/useFormatters";

interface Props {
	icon: LucideIcon;
	label: string;
	value: number;
	variant?: "default" | "positive" | "negative";
	compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	variant: "default",
	compact: false,
});

const { formatAmount, formatAmountCompact } = useFormatters();

const formattedValue = props.compact
	? formatAmountCompact(props.value)
	: formatAmount(props.value);

const iconBgClass = {
	default: "bg-cyan-500/10",
	positive: "bg-emerald-500/10",
	negative: "bg-rose-500/10",
};

const iconColorClass = {
	default: "text-cyan-400",
	positive: "text-emerald-400",
	negative: "text-rose-400",
};

const valueColorClass = {
	default: "text-white",
	positive: "text-emerald-400",
	negative: "text-rose-400",
};
</script>

<template>
  <div class="flex justify-between items-center">
    <div>
      <p class="text-slate-400 text-sm">{{ label }}</p>
      <p :class="['mt-1 font-bold text-2xl', valueColorClass[variant]]">
        {{ variant === 'positive' ? '+' : '' }}{{ formattedValue }}
      </p>
    </div>
    <div :class="['flex justify-center items-center rounded-full w-12 h-12', iconBgClass[variant]]">
      <component :is="icon" :class="['w-6 h-6', iconColorClass[variant]]" />
    </div>
  </div>
</template>
