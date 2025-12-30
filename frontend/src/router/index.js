import { createRouter, createWebHistory } from 'vue-router';

// Views
import HomeDashboards from '@/components/HomeDashboard.vue';
import DashboardGeral from '@/components/Dashboard/DashboardGeral.vue';
import DashboardFin from '@/components/Dashboard/DashboardFinanceiro.vue';
import DashboardPedidosFin from '@/components/Dashboard/DashboardComercial.vue';
import DashboardAguardandoPCP from '@/components/Dashboard/DashboardAguardandoPCP.vue';
import DashboardFaturamento from '@/components/Dashboard/DashboardFaturamento.vue';
import DashboardRomaneios from '@/components/Dashboard/DashboardRomaneios.vue';

// ✅ Configs (novos)
import DashboardConfig from '@/components/Dashboard/DashboardConfig.vue';
import DashboardEntregadoresConfig from '@/components/Dashboard/Configs/DashboardEntregadoresConfig.vue';

import DashboardSocketTest from '../components/Dashboard/DashboardsVendas/DashboardVendas.vue';

// Login
import LoginView from '@/components/Login/Login.vue';

const routes = [
  // Login (público)
  { path: '/login', name: 'login', component: LoginView },

  // Redireciona raiz pra login
  { path: '/', redirect: '/login' },

  // Tela de seleção de dashboards (protegida)
  {
    path: '/dashboards',
    name: 'home-dashboards',
    component: HomeDashboards,
    meta: { requiresAuth: true },
  },

  // Dashboards específicos (protegidos)
  {
    path: '/dashboards/geral',
    name: 'dashboard-geral',
    component: DashboardGeral,
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboards/fin',
    name: 'dashboard-fin',
    component: DashboardFin,
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboards/pedidos-fin',
    name: 'dashboard-pedidos-fin',
    component: DashboardPedidosFin,
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboards/aguardando-pcp',
    name: 'dashboard-aguardando-pcp',
    component: DashboardAguardandoPCP,
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboards/faturamento',
    name: 'dashboard-faturamento',
    component: DashboardFaturamento,
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboards/romaneios',
    name: 'dashboard-romaneios',
    component: DashboardRomaneios,
    meta: { requiresAuth: true },
  },

  {
    path: '/dashboards/test',
    name: 'dashboard-test',
    component: DashboardSocketTest,
    meta: { requiresAuth: false },
  },

  // ✅ Configurações (protegidas)
  {
    path: '/dashboards/config',
    name: 'dashboard-config',
    component: DashboardConfig,
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboards/config/entregadores',
    name: 'dashboard-config-entregadores',
    component: DashboardEntregadoresConfig,
    meta: { requiresAuth: true },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 🔐 Guard de autenticação
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('auth') === 'true';

  // Se a rota precisa de auth e o cara não está logado -> manda pro login
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login' });
  }

  // Se o cara já está logado e tentar ir pro /login, manda pra tela de dashboards
  if (to.name === 'login' && isAuthenticated) {
    return next({ name: 'home-dashboards' });
  }

  return next();
});