<script setup lang="ts">
import { computed } from "vue";
import { TrendingUp, Tag, Trash2 } from "lucide-vue-next";
import { useFormatters } from "~/interface/composables/useFormatters";
import { useColors } from "~/interface/composables/useColors";
import { useIcons } from "~/interface/composables/useIcons";
import type { Transaction, Category } from "~/domain/types/models";

interface Props {
	transaction: Transaction;
	category?: Category | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	click: [transaction: Transaction];
	delete: [id: number];
}>();

const { formatAmount, formatDateShort } = useFormatters();
const { getColorClasses } = useColors();
const { getIcon } = useIcons();

const isCredit = computed(() => props.transaction.type === "credit");
const displayLabel = computed(
	() => props.transaction.merchant || props.transaction.label.substring(0, 50),
);
</script>

<template>
  <div
    @click="emit('click', transaction)"
    class="flex justify-between items-center gap-4 hover:bg-slate-800/30 px-6 py-4 transition-colors cursor-pointer group"
  >
    <div class="flex flex-1 items-center gap-4 min-w-0">
      <!-- Icône de catégorie -->
      <div
        :class="[
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors',
          category
            ? getColorClasses(category.color, 'bg-light')
            : isCredit
              ? 'bg-emerald-500/10'
              : 'bg-slate-700/50 group-hover:bg-amber-500/10',
        ]"
      >
        <component
          v-if="category"
          :is="getIcon(category.icon)"
          :class="['w-5 h-5', getColorClasses(category.color, 'text')]"
        />
        <TrendingUp v-else-if="isCredit" class="w-5 h-5 text-emerald-400" />
        <Tag v-else class="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
      </div>

      <!-- Détails -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <p class="font-medium text-white truncate">{{ displayLabel }}</p>
          <!-- Badge catégorie -->
          <span
            v-if="category"
            :class="[
              'px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
              getColorClasses(category.color, 'bg-light'),
              getColorClasses(category.color, 'text'),
            ]"
          >
            {{ category.name }}
          </span>
          <span
            v-else-if="!isCredit"
            class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-500 shrink-0 group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-colors"
          >
            Non catégorisée
          </span>
        </div>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="text-slate-500 text-xs">{{ formatDateShort(transaction.date) }}</span>
          <span
            v-if="transaction.paymentMethod"
            class="bg-slate-700/50 px-2 py-0.5 rounded-full text-slate-400 text-xs whitespace-nowrap"
          >
            {{ transaction.paymentMethod }}
          </span>
        </div>
      </div>
    </div>

    <!-- Montant et actions -->
    <div class="flex items-center gap-3 shrink-0">
      <p
        :class="[
          'font-semibold tabular-nums whitespace-nowrap',
          isCredit ? 'text-emerald-400' : 'text-rose-400',
        ]"
      >
        {{ isCredit ? '+' : '' }}{{ formatAmount(transaction.amount) }}
      </p>
      <button
        @click.stop="emit('delete', transaction.id)"
        class="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-500/10 rounded-lg transition-all text-rose-400 hover:text-rose-300"
        title="Supprimer la transaction"
      >
        <Trash2 class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
