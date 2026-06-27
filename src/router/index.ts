import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('@/components/HomeView.vue') },
    { path: '/map', component: () => import('@/components/MapViewer.vue') },
    { path: '/characters', component: () => import('@/components/MapViewer.vue') },
    { path: '/scenarios', component: () => import('@/components/ScenariosView.vue') },
  ],
})
export default router