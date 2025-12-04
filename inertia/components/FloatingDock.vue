<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  PieChart, 
  TrendingUp, 
  Settings,
  type LucideIcon
} from 'lucide-vue-next'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/budgets', label: 'Budgets', icon: PieChart },
  { href: '/forecasts', label: 'Prévisions', icon: TrendingUp },
]

const settingsItem: NavItem = { href: '/settings', label: 'Paramètres', icon: Settings }

const page = usePage()

const isActive = (href: string) => {
  const currentPath = page.url
  if (href === '/') {
    return currentPath === '/'
  }
  return currentPath.startsWith(href)
}
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <!-- Container fixe au viewport avec hauteur 100vh pour un centrage stable -->
    <div class="fixed left-4 top-0 h-screen flex items-center z-50">
      <div 
        class="flex flex-col items-center gap-1 px-2.5 py-3 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl shadow-black/40"
      >
        <!-- Main navigation items -->
        <template v-for="item in navItems" :key="item.href">
          <Tooltip>
            <TooltipTrigger as-child>
              <Link 
                :href="item.href"
                :class="[
                  'relative p-3 rounded-xl transition-all duration-200 group',
                  isActive(item.href) 
                    ? 'bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 text-cyan-400' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                ]"
              >
                <!-- Active indicator -->
                <span 
                  v-if="isActive(item.href)"
                  class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-4 bg-cyan-400 rounded-full"
                />
                <component 
                  :is="item.icon" 
                  class="w-5 h-5 transition-transform duration-200 group-hover:scale-110" 
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent 
              side="right" 
              :side-offset="8"
              class="bg-slate-800 text-white border-slate-700 px-3 py-1.5 text-sm font-medium"
            >
              {{ item.label }}
            </TooltipContent>
          </Tooltip>
        </template>

        <!-- Separator -->
        <div class="w-8 h-px bg-slate-700/50 my-1.5" />

        <!-- Settings -->
        <Tooltip>
          <TooltipTrigger as-child>
            <Link 
              :href="settingsItem.href"
              :class="[
                'relative p-3 rounded-xl transition-all duration-200 group',
                isActive(settingsItem.href) 
                  ? 'bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 text-cyan-400' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              ]"
            >
              <span 
                v-if="isActive(settingsItem.href)"
                class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-4 bg-cyan-400 rounded-full"
              />
              <component 
                :is="settingsItem.icon" 
                class="w-5 h-5 transition-transform duration-200 group-hover:scale-110" 
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            :side-offset="8"
            class="bg-slate-800 text-white border-slate-700 px-3 py-1.5 text-sm font-medium"
          >
            {{ settingsItem.label }}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  </TooltipProvider>
</template>
