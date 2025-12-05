import { createRouter, createWebHistory } from 'vue-router';

// Views
import HomeDashboards from '@/components/HomeDashboard.vue';
import DashboardGeral from '@/components/Dashboard/DashboardGeral.vue';
import DashboardFin from '@/components/Dashboard/DashboardFinanceiro.vue';
import DashboardPedidosFin from '@/components/Dashboard/DashboardComercial.vue';
import DashboardAguardandoPCP from '../components/Dashboard/DashboardAguardandoPCP.vue';
import DashboardFaturamento from '../components/Dashboard/DashboardFaturamento.vue';

const routes = [
  { path: '/', name: 'home', component: HomeDashboards },
  { path: '/dashboards/geral', name: 'dashboard-geral', component: DashboardGeral },
  { path: '/dashboards/fin', name: 'dashboard-fin', component: DashboardFin },
  { path: '/dashboards/pedidos-fin', name: 'dashboard-pedidos-fin', component: DashboardPedidosFin },
  { path: '/dashboards/aguardando-pcp', name: 'dashboard-aguardando-pcp', component: DashboardAguardandoPCP },
  { path: '/dashboards/faturamento', name: 'dashboard-faturamento', component: DashboardFaturamento }
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
