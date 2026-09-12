import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ActivitiesView from '../views/ActivitiesView.vue'
import ActivityDetailView from '../views/ActivityDetailView.vue'
import JoinView from '../views/JoinView.vue'
import AuthView from '../views/AuthView.vue'
import OrganiserView from '../views/OrganiserView.vue'
import { currentUser } from '../data/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
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
      component: OrganiserView,
    },
  ],
})

router.beforeEach((to) => {
  if (to.name === 'organiser' && currentUser.value?.role !== 'organiser') {
    return { name: 'auth' }
  }

  return true
})

export default router
