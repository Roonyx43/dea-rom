import { createRouter, createWebHistory } from 'vue-router';

// Views
import HomeDashboards from '@/components/HomeDashboard.vue';
import DashboardGeral from '@/components/Dashboard/DashboardGeral.vue';
import DashboardFin from '@/components/Dashboard/DashboardFinanceiro.vue';
import DashboardPedidosFin from '@/components/Dashboard/DashboardComercial.vue';

const routes = [
  { path: '/', name: 'home', component: HomeDashboards },
  { path: '/dashboards/geral', name: 'dashboard-geral', component: DashboardGeral },
  { path: '/dashboards/fin', name: 'dashboard-fin', component: DashboardFin },
  { path: '/dashboards/pedidos-fin', name: 'dashboard-pedidos-fin', component: DashboardPedidosFin },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
