<script setup lang="ts">
import { Head } from "@inertiajs/vue3";
import { ref, computed, onMounted } from "vue";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
	Upload,
	FileSpreadsheet,
	CheckCircle2,
	AlertCircle,
	TrendingUp,
	TrendingDown,
	Loader2,
	Search,
	X,
	Tag,
	Sparkles,
	ShoppingBag,
	Utensils,
	Car,
	Home,
	Zap,
	Smartphone,
	Heart,
	Gamepad2,
	GraduationCap,
	MoreHorizontal,
	Check,
	Trash2,
	Plus,
} from "lucide-vue-next";
import FloatingDock from "~/components/FloatingDock.vue";
import {
	useCategoryRules,
	type Category,
} from "~/composables/useCategoryRules";

interface Transaction {
	id: number;
	date: string;
	label: string;
	amount: number;
	type: "debit" | "credit";
	merchant: string | null;
	paymentMethod: string | null;
}

interface ImportResult {
	success: boolean;
	message: string;
	data?: {
		rowsImported: number;
		rowsSkipped: number;
		parsingErrors: string[];
	};
}

const {
	categories,
	rules,
	initialize,
	addRule,
	removeRule,
	getCategoryForTransaction,
	getRuleForTransaction,
	getMatchingRules,
	extractKeywords,
} = useCategoryRules();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isUploading = ref(false);
const uploadResult = ref<ImportResult | null>(null);
const transactions = ref<Transaction[]>([]);
const balance = ref<number>(0);
const searchQuery = ref("");
const filterType = ref<"all" | "credit" | "debit">("all");
const filterCategory = ref<string>("all");

// Modal state
const isModalOpen = ref(false);
const selectedTransaction = ref<Transaction | null>(null);
const extractedKeywords = ref<string[]>([]);
const selectedKeywords = ref<string[]>([]); // Maintenant un tableau pour sélection multiple
const customKeyword = ref("");

// Modal de création de transaction
const showCreateModal = ref(false);
const isCreating = ref(false);
const newTransaction = ref({
	date: new Date().toISOString().split("T")[0],
	label: "",
	amount: "",
	type: "debit" as "debit" | "credit",
	merchant: "",
	category: "",
	paymentMethod: "",
});

const iconComponents: Record<string, any> = {
	utensils: Utensils,
	car: Car,
	shopping: ShoppingBag,
	home: Home,
	zap: Zap,
	smartphone: Smartphone,
	heart: Heart,
	gamepad: Gamepad2,
	graduation: GraduationCap,
	more: MoreHorizontal,
	"trending-up": TrendingUp,
};

const getCsrfToken = (): string => {
	const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
	return match ? decodeURIComponent(match[1]) : "";
};

const formatAmount = (amount: number) => {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(amount);
};

const formatDate = (dateStr: string) => {
	return new Date(dateStr).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
};

const getColorClasses = (
	color: string,
	type: "bg" | "text" | "border" | "bg-light",
) => {
	const colors: Record<string, Record<string, string>> = {
		emerald: {
			bg: "bg-emerald-500",
			text: "text-emerald-400",
			border: "border-emerald-500/30",
			"bg-light": "bg-emerald-500/10",
		},
		green: {
			bg: "bg-green-500",
			text: "text-green-400",
			border: "border-green-500/30",
			"bg-light": "bg-green-500/10",
		},
		cyan: {
			bg: "bg-cyan-500",
			text: "text-cyan-400",
			border: "border-cyan-500/30",
			"bg-light": "bg-cyan-500/10",
		},
		blue: {
			bg: "bg-blue-500",
			text: "text-blue-400",
			border: "border-blue-500/30",
			"bg-light": "bg-blue-500/10",
		},
		violet: {
			bg: "bg-violet-500",
			text: "text-violet-400",
			border: "border-violet-500/30",
			"bg-light": "bg-violet-500/10",
		},
		pink: {
			bg: "bg-pink-500",
			text: "text-pink-400",
			border: "border-pink-500/30",
			"bg-light": "bg-pink-500/10",
		},
		amber: {
			bg: "bg-amber-500",
			text: "text-amber-400",
			border: "border-amber-500/30",
			"bg-light": "bg-amber-500/10",
		},
		rose: {
			bg: "bg-rose-500",
			text: "text-rose-400",
			border: "border-rose-500/30",
			"bg-light": "bg-rose-500/10",
		},
		orange: {
			bg: "bg-orange-500",
			text: "text-orange-400",
			border: "border-orange-500/30",
			"bg-light": "bg-orange-500/10",
		},
		slate: {
			bg: "bg-slate-500",
			text: "text-slate-400",
			border: "border-slate-500/30",
			"bg-light": "bg-slate-500/10",
		},
	};
	return colors[color]?.[type] || colors.slate[type];
};

const totalDebits = computed(() => {
	return transactions.value
		.filter((t) => t.type === "debit")
		.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
});

const totalCredits = computed(() => {
	return transactions.value
		.filter((t) => t.type === "credit")
		.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
});

const uncategorizedCount = computed(() => {
	return transactions.value.filter(
		(t) => t.type === "debit" && !getCategoryForTransaction(t.label),
	).length;
});

const filteredTransactions = computed(() => {
	return transactions.value.filter((t) => {
		const matchesSearch =
			searchQuery.value === "" ||
			t.label.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
			(t.merchant &&
				t.merchant.toLowerCase().includes(searchQuery.value.toLowerCase()));

		const matchesType =
			filterType.value === "all" || t.type === filterType.value;

		let matchesCategory = true;
		if (filterCategory.value !== "all") {
			if (filterCategory.value === "uncategorized") {
				matchesCategory = !getCategoryForTransaction(t.label);
			} else {
				const cat = getCategoryForTransaction(t.label);
				matchesCategory = cat?.id === filterCategory.value;
			}
		}

		return matchesSearch && matchesType && matchesCategory;
	});
});

// Obtenir les règles qui s'appliquent à cette transaction
const getExistingRulesForTransaction = (label: string) => {
	return getMatchingRules(label);
};

const handleDragOver = (e: DragEvent) => {
	e.preventDefault();
	isDragging.value = true;
};

const handleDragLeave = () => {
	isDragging.value = false;
};

const handleDrop = (e: DragEvent) => {
	e.preventDefault();
	isDragging.value = false;
	const files = e.dataTransfer?.files;
	if (files && files.length > 0) {
		uploadFile(files[0]);
	}
};

const handleFileSelect = (e: Event) => {
	const target = e.target as HTMLInputElement;
	const files = target.files;
	if (files && files.length > 0) {
		uploadFile(files[0]);
	}
};

const uploadFile = async (file: File) => {
	if (!file.name.endsWith(".csv")) {
		uploadResult.value = {
			success: false,
			message: "Veuillez sélectionner un fichier CSV",
		};
		return;
	}

	isUploading.value = true;
	uploadResult.value = null;

	const formData = new FormData();
	formData.append("csv", file);

	try {
		const response = await fetch("/api/import", {
			method: "POST",
			body: formData,
			headers: {
				"X-XSRF-TOKEN": getCsrfToken(),
			},
		});

		const result = await response.json();

		if (response.ok && result.success) {
			// Le nouveau format API encapsule dans data.data
			const importData = result.data || result;
			uploadResult.value = {
				success: true,
				message:
					result.message || `${importData.rowsImported} transactions importées`,
				data: importData,
			};
			await loadTransactions();
		} else {
			uploadResult.value = {
				success: false,
				message:
					result.error?.message || result.error || "Erreur lors de l'import",
			};
		}
	} catch (error) {
		uploadResult.value = {
			success: false,
			message: "Erreur de connexion au serveur",
		};
	} finally {
		isUploading.value = false;
		if (fileInput.value) {
			fileInput.value.value = "";
		}
	}
};

const loadTransactions = async () => {
	if (typeof window === "undefined") return;

	try {
		const response = await fetch("/api/transactions");
		const data = await response.json();
		// Le nouveau format API encapsule dans data.data
		const result = data.data || data;
		transactions.value = result.transactions || [];
		balance.value = result.account?.balance || 0;
	} catch (error) {
		console.error("Erreur lors du chargement des transactions:", error);
	}
};

// Ouvrir le modal de catégorisation
const openCategorizeModal = (transaction: Transaction) => {
	selectedTransaction.value = transaction;
	extractedKeywords.value = extractKeywords(transaction.label);
	selectedKeywords.value = [];
	customKeyword.value = "";
	isModalOpen.value = true;
};

const closeModal = () => {
	isModalOpen.value = false;
	selectedTransaction.value = null;
	extractedKeywords.value = [];
	selectedKeywords.value = [];
	customKeyword.value = "";
};

// Toggle sélection d'un mot-clé (ajout/retrait)
const toggleKeyword = (keyword: string) => {
	const index = selectedKeywords.value.indexOf(keyword);
	if (index === -1) {
		selectedKeywords.value.push(keyword);
	} else {
		selectedKeywords.value.splice(index, 1);
	}
};

// Vérifier si un mot-clé est sélectionné
const isKeywordSelected = (keyword: string) => {
	return selectedKeywords.value.includes(keyword);
};

// Ajouter un mot-clé personnalisé à la sélection
const addCustomKeyword = () => {
	const keyword = customKeyword.value.trim().toLowerCase();
	if (keyword && !selectedKeywords.value.includes(keyword)) {
		selectedKeywords.value.push(keyword);
		customKeyword.value = "";
	}
};

// Retirer un mot-clé de la sélection
const removeSelectedKeyword = (keyword: string) => {
	const index = selectedKeywords.value.indexOf(keyword);
	if (index !== -1) {
		selectedKeywords.value.splice(index, 1);
	}
};

// Assigner une catégorie aux mots-clés sélectionnés
const assignCategory = (category: Category) => {
	if (selectedKeywords.value.length === 0) return;

	addRule(selectedKeywords.value, category.id);
	closeModal();
};

// Supprimer une règle existante
const removeExistingRule = (ruleId: string) => {
	removeRule(ruleId);
};

const createTransaction = async () => {
	if (!newTransaction.value.label || !newTransaction.value.amount) {
		alert("Veuillez remplir tous les champs obligatoires");
		return;
	}

	const amount = parseFloat(newTransaction.value.amount);
	if (Number.isNaN(amount) || amount <= 0) {
		alert("Le montant doit être un nombre positif");
		return;
	}

	isCreating.value = true;

	try {
		const response = await fetch("/api/transactions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-XSRF-TOKEN": getCsrfToken(),
			},
			body: JSON.stringify({
				date: newTransaction.value.date,
				label: newTransaction.value.label,
				amount: amount,
				type: newTransaction.value.type,
				merchant: newTransaction.value.merchant || null,
				category: newTransaction.value.category || null,
				paymentMethod: newTransaction.value.paymentMethod || null,
			}),
		});

		const data = await response.json();

		if (!response.ok || !data.success) {
			throw new Error(
				data.error?.message || data.error || "Erreur lors de la création",
			);
		}

		// Réinitialiser le formulaire
		newTransaction.value = {
			date: new Date().toISOString().split("T")[0],
			label: "",
			amount: "",
			type: "debit",
			merchant: "",
			category: "",
			paymentMethod: "",
		};

		// Fermer le modal
		showCreateModal.value = false;

		// Recharger les transactions
		await loadTransactions();
	} catch (error) {
		console.error("Erreur:", error);
		alert(
			error instanceof Error
				? error.message
				: "Erreur lors de la création de la transaction",
		);
	} finally {
		isCreating.value = false;
	}
};

const openCreateModal = () => {
	showCreateModal.value = true;
};

const closeCreateModal = () => {
	showCreateModal.value = false;
};

const deleteTransaction = async (transactionId: number, event: Event) => {
	// Empêcher l'ouverture du modal de catégorisation
	event.stopPropagation();

	if (!confirm("Êtes-vous sûr de vouloir supprimer cette transaction ?")) {
		return;
	}

	try {
		const response = await fetch(`/api/transactions/${transactionId}`, {
			method: "DELETE",
			headers: {
				"X-XSRF-TOKEN": getCsrfToken(),
			},
		});

		const data = await response.json();

		if (!response.ok || !data.success) {
			throw new Error(
				data.error?.message || data.error || "Erreur lors de la suppression",
			);
		}

		// Recharger les transactions
		await loadTransactions();
	} catch (error) {
		console.error("Erreur:", error);
		alert(
			error instanceof Error
				? error.message
				: "Erreur lors de la suppression de la transaction",
		);
	}
};

onMounted(() => {
	initialize();
	loadTransactions();
});
</script>

<template>
  <Head title="ForecastPro - Transactions" />

  <div class="bg-slate-950 min-h-screen">
    <!-- Header -->
    <header class="bg-slate-900/30 backdrop-blur-sm border-slate-800/50 border-b">
      <div class="mx-auto px-6 py-4 max-w-7xl">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex justify-center items-center rounded-xl w-10 h-10" style="background: linear-gradient(135deg, #34d399 0%, #06b6d4 100%);">
              <span class="font-bold text-slate-950 text-lg">F</span>
            </div>
            <div>
              <h1 class="font-semibold text-white text-xl tracking-tight">Transactions</h1>
              <p class="text-slate-500 text-xs">Gérez et catégorisez vos opérations bancaires</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <!-- Uncategorized badge -->
            <div v-if="uncategorizedCount > 0" class="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
              <Tag class="w-4 h-4 text-amber-400" />
              <span class="text-amber-400 text-sm font-medium">{{ uncategorizedCount }} non catégorisée{{ uncategorizedCount > 1 ? 's' : '' }}</span>
            </div>
            
            <!-- Bouton nouvelle transaction -->
            <button
              @click="openCreateModal"
              class="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus class="w-4 h-4" />
              Nouvelle transaction
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="space-y-6 mx-auto py-8 pr-6 pl-20 max-w-7xl">
      <!-- Stats Cards -->
      <div class="gap-4 grid grid-cols-1 md:grid-cols-3" v-if="transactions.length > 0">
        <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
          <CardContent class="pt-6">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-slate-400 text-sm">Solde actuel</p>
                <p class="mt-1 font-bold text-white text-2xl">{{ formatAmount(balance) }}</p>
              </div>
              <div class="flex justify-center items-center bg-emerald-500/10 rounded-full w-12 h-12">
                <TrendingUp class="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
          <CardContent class="pt-6">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-slate-400 text-sm">Total crédits</p>
                <p class="mt-1 font-bold text-emerald-400 text-2xl">+{{ formatAmount(totalCredits) }}</p>
              </div>
              <div class="flex justify-center items-center bg-emerald-500/10 rounded-full w-12 h-12">
                <TrendingUp class="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
          <CardContent class="pt-6">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-slate-400 text-sm">Total débits</p>
                <p class="mt-1 font-bold text-rose-400 text-2xl">-{{ formatAmount(totalDebits) }}</p>
              </div>
              <div class="flex justify-center items-center bg-rose-500/10 rounded-full w-12 h-12">
                <TrendingDown class="w-6 h-6 text-rose-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Import Section -->
      <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50 overflow-hidden">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-white">
            <FileSpreadsheet class="w-5 h-5 text-cyan-400" />
            Importer vos transactions
          </CardTitle>
          <CardDescription class="text-slate-400">
            Glissez-déposez votre relevé CSV ou cliquez pour sélectionner un fichier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
            @click="fileInput?.click()"
            :class="[
              'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300',
              isDragging
                ? 'border-cyan-400 bg-cyan-400/5'
                : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/30',
            ]"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".csv"
              class="hidden"
              @change="handleFileSelect"
            />

            <div v-if="isUploading" class="flex flex-col items-center gap-3">
              <Loader2 class="w-10 h-10 text-cyan-400 animate-spin" />
              <p class="text-slate-300">Traitement en cours...</p>
            </div>

            <div v-else class="flex items-center gap-6">
              <div class="flex justify-center items-center bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-xl w-14 h-14 shrink-0">
                <Upload class="w-7 h-7 text-cyan-400" />
              </div>
              <div class="text-left">
                <p class="font-medium text-slate-300">Déposez votre fichier CSV ici</p>
                <p class="mt-0.5 text-slate-500 text-sm">ou cliquez pour parcourir</p>
                <p class="mt-1 text-slate-600 text-xs">Format supporté : CSV Crédit Agricole (Date;Libellé;Débit;Crédit)</p>
              </div>
            </div>
          </div>

          <div v-if="uploadResult" class="mt-4">
            <div
              :class="[
                'rounded-lg p-4 flex items-start gap-3',
                uploadResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20',
              ]"
            >
              <CheckCircle2 v-if="uploadResult.success" class="flex-shrink-0 mt-0.5 w-5 h-5 text-emerald-400" />
              <AlertCircle v-else class="flex-shrink-0 mt-0.5 w-5 h-5 text-rose-400" />
              <div>
                <p :class="uploadResult.success ? 'text-emerald-300' : 'text-rose-300'">
                  {{ uploadResult.message }}
                </p>
                <div v-if="uploadResult.data" class="mt-2 text-slate-400 text-sm">
                  <p>{{ uploadResult.data.rowsImported }} transactions importées</p>
                  <p v-if="uploadResult.data.rowsSkipped > 0">
                    {{ uploadResult.data.rowsSkipped }} doublons ignorés
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Search and Filters -->
      <div v-if="transactions.length > 0" class="flex flex-wrap items-center gap-4">
        <div class="relative flex-1 min-w-[200px]">
          <div class="absolute left-3 inset-y-0 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-slate-500" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher une transaction..."
            class="w-full h-10 bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
          />
        </div>
        
        <!-- Type filters -->
        <div class="flex items-center gap-2">
          <button
            @click="filterType = 'all'"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filterType === 'all' 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white'
            ]"
          >
            Tout
          </button>
          <button
            @click="filterType = 'credit'"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filterType === 'credit' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white'
            ]"
          >
            Crédits
          </button>
          <button
            @click="filterType = 'debit'"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filterType === 'debit' 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white'
            ]"
          >
            Débits
          </button>
        </div>

        <!-- Category filter -->
        <select
          v-model="filterCategory"
          class="h-10 bg-slate-800/50 border border-slate-700 rounded-lg px-3 text-slate-300 text-sm focus:outline-none focus:border-cyan-500/50"
        >
          <option value="all">Toutes catégories</option>
          <option value="uncategorized">Non catégorisées</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- Transactions List -->
      <Card v-if="transactions.length > 0" class="bg-slate-900/50 backdrop-blur border-slate-800/50 overflow-hidden">
        <CardHeader class="border-b border-slate-800/50">
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="text-white">Liste des transactions</CardTitle>
              <CardDescription class="text-slate-400">
                {{ filteredTransactions.length }} transaction{{ filteredTransactions.length > 1 ? 's' : '' }} 
                <span v-if="filteredTransactions.length !== transactions.length">
                  sur {{ transactions.length }}
                </span>
                • Cliquez sur une transaction pour la catégoriser
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <div class="divide-y divide-slate-800/50">
            <div
              v-for="transaction in filteredTransactions"
              :key="transaction.id"
              @click="openCategorizeModal(transaction)"
              class="flex justify-between items-center gap-4 hover:bg-slate-800/30 px-6 py-4 transition-colors cursor-pointer group"
            >
              <div class="flex flex-1 items-center gap-4 min-w-0">
                <!-- Category icon or default -->
                <div
                  :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors',
                    getCategoryForTransaction(transaction.label)
                      ? getColorClasses(getCategoryForTransaction(transaction.label)!.color, 'bg-light')
                      : transaction.type === 'credit' 
                        ? 'bg-emerald-500/10' 
                        : 'bg-slate-700/50 group-hover:bg-amber-500/10',
                  ]"
                >
                  <component 
                    v-if="getCategoryForTransaction(transaction.label)"
                    :is="iconComponents[getCategoryForTransaction(transaction.label)!.icon] || MoreHorizontal"
                    :class="['w-5 h-5', getColorClasses(getCategoryForTransaction(transaction.label)!.color, 'text')]"
                  />
                  <TrendingUp v-else-if="transaction.type === 'credit'" class="w-5 h-5 text-emerald-400" />
                  <Tag v-else class="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </div>
                
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-white truncate">
                      {{ transaction.merchant || transaction.label.substring(0, 50) }}
                    </p>
                    <!-- Category badge -->
                    <span 
                      v-if="getCategoryForTransaction(transaction.label)"
                      :class="[
                        'px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
                        getColorClasses(getCategoryForTransaction(transaction.label)!.color, 'bg-light'),
                        getColorClasses(getCategoryForTransaction(transaction.label)!.color, 'text')
                      ]"
                    >
                      {{ getCategoryForTransaction(transaction.label)!.name }}
                    </span>
                    <span 
                      v-else-if="transaction.type === 'debit'"
                      class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-500 shrink-0 group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-colors"
                    >
                      Non catégorisée
                    </span>
                  </div>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-slate-500 text-xs">{{ formatDate(transaction.date) }}</span>
                    <span v-if="transaction.paymentMethod" class="bg-slate-700/50 px-2 py-0.5 rounded-full text-slate-400 text-xs whitespace-nowrap">
                      {{ transaction.paymentMethod }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-3 shrink-0">
                <p
                  :class="[
                    'font-semibold tabular-nums whitespace-nowrap',
                    transaction.type === 'credit' ? 'text-emerald-400' : 'text-rose-400',
                  ]"
                >
                  {{ transaction.type === 'credit' ? '+' : '' }}{{ formatAmount(transaction.amount) }}
                </p>
                <button
                  @click="deleteTransaction(transaction.id, $event)"
                  class="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-500/10 rounded-lg transition-all text-rose-400 hover:text-rose-300"
                  title="Supprimer la transaction"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div v-if="filteredTransactions.length === 0" class="py-12 text-center">
            <Search class="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p class="text-slate-400">Aucune transaction trouvée</p>
            <p class="text-slate-600 text-sm mt-1">Essayez de modifier vos critères de recherche</p>
          </div>
        </CardContent>
      </Card>

      <!-- Empty State -->
      <Card v-else class="bg-slate-900/50 backdrop-blur border-slate-800/50">
        <CardContent class="py-16">
          <div class="text-center">
            <div class="flex justify-center items-center bg-slate-800/50 mx-auto mb-4 rounded-2xl w-20 h-20">
              <FileSpreadsheet class="w-10 h-10 text-slate-600" />
            </div>
            <h3 class="font-medium text-slate-300 text-lg">Aucune transaction</h3>
            <p class="mt-1 text-slate-500">Importez votre premier relevé CSV pour commencer</p>
          </div>
        </CardContent>
      </Card>
    </main>

    <!-- Categorization Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div 
          v-if="isModalOpen && selectedTransaction" 
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div 
            class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            @click="closeModal"
          />
          
          <div class="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="flex items-start justify-between mb-6">
              <div>
                <h2 class="text-white text-lg font-semibold flex items-center gap-2">
                  <Sparkles class="w-5 h-5 text-cyan-400" />
                  Catégoriser cette transaction
                </h2>
                <p class="text-slate-400 text-sm mt-1">
                  Sélectionnez un ou plusieurs mots-clés, puis une catégorie
                </p>
              </div>
              <button 
                @click="closeModal"
                class="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <!-- Transaction Info -->
            <div class="bg-slate-800/50 rounded-xl p-4 mb-6">
              <p class="text-white font-medium mb-1">{{ selectedTransaction.merchant || selectedTransaction.label }}</p>
              <div class="flex items-center gap-3 text-sm">
                <span class="text-slate-400">{{ formatDate(selectedTransaction.date) }}</span>
                <span :class="selectedTransaction.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'">
                  {{ selectedTransaction.type === 'credit' ? '+' : '' }}{{ formatAmount(selectedTransaction.amount) }}
                </span>
              </div>
              <p class="text-slate-500 text-xs mt-2 font-mono break-all">{{ selectedTransaction.label }}</p>
            </div>

            <!-- Existing Rules -->
            <div v-if="getExistingRulesForTransaction(selectedTransaction.label).length > 0" class="mb-6">
              <p class="text-slate-400 text-sm mb-2">Règles existantes :</p>
              <div class="space-y-2">
                <div 
                  v-for="rule in getExistingRulesForTransaction(selectedTransaction.label)" 
                  :key="rule.id"
                  class="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2"
                >
                  <div class="flex items-center gap-2 flex-wrap">
                    <span 
                      v-for="(kw, idx) in rule.keywords" 
                      :key="kw"
                      class="text-cyan-400 text-sm font-medium"
                    >
                      {{ kw }}<span v-if="idx < rule.keywords.length - 1" class="text-slate-600 mx-1">+</span>
                    </span>
                    <span class="text-slate-500 text-sm mx-2">→</span>
                    <span class="text-slate-300 text-sm">{{ categories.find(c => c.id === rule.categoryId)?.name }}</span>
                  </div>
                  <button 
                    @click="removeExistingRule(rule.id)"
                    class="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Selected Keywords Display -->
            <div v-if="selectedKeywords.length > 0" class="mb-4">
              <p class="text-slate-400 text-sm mb-2">Mots-clés sélectionnés :</p>
              <div class="flex flex-wrap gap-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                <div 
                  v-for="keyword in selectedKeywords" 
                  :key="keyword"
                  class="flex items-center gap-1 bg-cyan-500/20 text-cyan-400 rounded-md px-2 py-1"
                >
                  <span class="text-sm font-medium">{{ keyword }}</span>
                  <button 
                    @click="removeSelectedKeyword(keyword)"
                    class="p-0.5 rounded hover:bg-cyan-500/30 transition-colors"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </div>
                <span v-if="selectedKeywords.length > 1" class="text-slate-500 text-xs self-center ml-2">
                  (toutes ces conditions doivent être présentes)
                </span>
              </div>
            </div>

            <!-- Keywords Selection -->
            <div class="mb-6">
              <p class="text-slate-400 text-sm mb-3">
                Mots-clés détectés 
                <span class="text-slate-500">(cliquez pour ajouter/retirer)</span> :
              </p>
              <div class="flex flex-wrap gap-2 mb-4">
                <button
                  v-for="keyword in extractedKeywords"
                  :key="keyword"
                  @click="toggleKeyword(keyword)"
                  :class="[
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    isKeywordSelected(keyword)
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 ring-1 ring-cyan-500/50'
                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
                  ]"
                >
                  <span v-if="isKeywordSelected(keyword)" class="mr-1">✓</span>
                  {{ keyword }}
                </button>
              </div>
              
              <!-- Custom keyword -->
              <div class="flex gap-2">
                <input
                  v-model="customKeyword"
                  type="text"
                  placeholder="Ajouter un mot-clé personnalisé..."
                  class="flex-1 h-10 bg-slate-800/50 border border-slate-700 rounded-lg px-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
                  @keyup.enter="addCustomKeyword"
                />
                <Button 
                  @click="addCustomKeyword"
                  :disabled="!customKeyword.trim()"
                  class="bg-slate-700 hover:bg-slate-600 text-white px-4"
                >
                  Ajouter
                </Button>
              </div>
            </div>

            <!-- Category Selection -->
            <div v-if="selectedKeywords.length > 0">
              <p class="text-slate-400 text-sm mb-3">
                Assigner 
                <span class="text-cyan-400 font-medium">
                  {{ selectedKeywords.join(' + ') }}
                </span> 
                à :
              </p>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="category in categories"
                  :key="category.id"
                  @click="assignCategory(category)"
                  :class="[
                    'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105',
                    'border-slate-700 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
                  ]"
                >
                  <div :class="['w-8 h-8 rounded-lg flex items-center justify-center', getColorClasses(category.color, 'bg-light')]">
                    <component :is="iconComponents[category.icon] || MoreHorizontal" :class="['w-4 h-4', getColorClasses(category.color, 'text')]" />
                  </div>
                  <span class="text-slate-300 text-xs font-medium">{{ category.name }}</span>
                </button>
              </div>
            </div>

            <!-- Help text -->
            <div v-else class="bg-slate-800/30 rounded-xl p-4 text-center">
              <Tag class="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p class="text-slate-500 text-sm">
                Sélectionnez un ou plusieurs mots-clés pour les associer à une catégorie
              </p>
              <p class="text-slate-600 text-xs mt-1">
                Utilisez plusieurs mots-clés pour être plus précis (ex: "carrefour" + "paris")
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal de création de transaction -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="closeCreateModal"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div class="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 class="font-semibold text-white text-lg">Nouvelle transaction</h2>
          <button
            @click="closeCreateModal"
            class="text-slate-400 hover:text-white transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="createTransaction" class="p-6 space-y-4">
          <!-- Type de transaction -->
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Type <span class="text-rose-500">*</span>
            </label>
            <div class="flex gap-2">
              <button
                type="button"
                @click="newTransaction.type = 'debit'"
                :class="[
                  'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                  newTransaction.type === 'debit'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-800/80',
                ]"
              >
                Dépense
              </button>
              <button
                type="button"
                @click="newTransaction.type = 'credit'"
                :class="[
                  'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                  newTransaction.type === 'credit'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-800/80',
                ]"
              >
                Revenu
              </button>
            </div>
          </div>

          <!-- Date -->
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Date <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="newTransaction.date"
              type="date"
              required
              class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <!-- Libellé -->
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Libellé <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="newTransaction.label"
              type="text"
              required
              placeholder="Ex: Achat chez Amazon"
              class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <!-- Montant -->
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Montant (€) <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="newTransaction.amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <!-- Commerçant -->
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Commerçant
            </label>
            <input
              v-model="newTransaction.merchant"
              type="text"
              placeholder="Ex: Amazon, Carrefour..."
              class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <!-- Catégorie -->
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Catégorie
            </label>
            <input
              v-model="newTransaction.category"
              type="text"
              placeholder="Ex: Alimentation, Transport..."
              class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <!-- Moyen de paiement -->
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Moyen de paiement
            </label>
            <input
              v-model="newTransaction.paymentMethod"
              type="text"
              placeholder="Ex: Carte, Virement, Prélèvement..."
              class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="closeCreateModal"
              class="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-800/80 text-slate-300 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              :disabled="isCreating"
              class="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {{ isCreating ? "Création..." : "Créer" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <FloatingDock />
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
