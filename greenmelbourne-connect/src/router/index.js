import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ActivitiesView from '../views/ActivitiesView.vue'
import ActivityDetailView from '../views/ActivityDetailView.vue'
import JoinView from '../views/JoinView.vue'
import AuthView from '../views/AuthView.vue'
import { authReady, currentUser } from '../data/auth'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path !== from.path) return { top: 0 }
  },
  routes: [
    {
      path: '/map',
      name: 'activity-map',
      component: () => import('../views/MapView.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/activities',
      name: 'activities',
      component: ActivitiesView,
    },
    {
      path: '/activities/:id',
      name: 'activity-detail',
      component: ActivityDetailView,
    },
    {
      path: '/join',
      name: 'join',
      component: JoinView,
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView,
    },
    {
      path: '/organiser',
      name: 'organiser',
      component: () => import('../views/OrganiserView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.name === 'organiser') await authReady
  if (to.name === 'organiser' && currentUser.value?.role !== 'organiser') {
    return { name: 'auth' }
  }

  return true
})

export default router
