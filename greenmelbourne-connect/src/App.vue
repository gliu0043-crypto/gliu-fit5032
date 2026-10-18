<script setup>
import { nextTick, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { currentUser, logoutUser } from './data/auth'

const route = useRoute()
const router = useRouter()
const logoutError = ref('')
const isNavOpen = ref(false)
const mainContent = ref(null)
const navToggle = ref(null)
const pageTitles = { home: 'Home', activities: 'Activities', 'activity-detail': 'Activity details', join: 'Join an activity', auth: 'Member access', organiser: 'Organiser', 'activity-map': 'Activity map' }

function skipToContent() { mainContent.value?.focus() }
function closeNavigation() {
  if (!isNavOpen.value) return
  isNavOpen.value = false
  navToggle.value?.focus()
}

watch(() => route.name, () => {
  document.title = `${pageTitles[route.name] || 'Home'} | GreenMelbourne Connect`
}, { immediate: true })

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Activities', to: '/activities' },
  { label: 'Activity map', to: '/map' },
  { label: 'Join Event', to: '/join' },
]

const handleLogout = async () => {
  const result = await logoutUser()
  logoutError.value = result.success ? '' : result.message
  if (result.success && route.name === 'organiser') await router.replace('/auth')
}

watch(
  () => route.path,
  async (_, previous) => {
    isNavOpen.value = false
    if (previous !== undefined) {
      await nextTick()
      const heading = mainContent.value?.querySelector('h1')
      if (heading) { heading.tabIndex = -1; heading.focus() }
      else mainContent.value?.focus()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content" @click.prevent="skipToContent">Skip to main content</a>
    <header class="site-header">
      <nav class="navbar navbar-expand-xl" aria-label="Main navigation" @keydown.esc="closeNavigation">
        <div class="container">
          <RouterLink class="navbar-brand brand-link" to="/">GreenMelbourne Connect</RouterLink>

          <button
            ref="navToggle"
            class="navbar-toggler"
            type="button"
            aria-controls="main-navigation"
            :aria-expanded="isNavOpen"
            aria-label="Toggle navigation"
            @click="isNavOpen = !isNavOpen"
          >
            <span class="navbar-toggler-icon"></span>
          </button>

          <div id="main-navigation" class="collapse navbar-collapse" :class="{ show: isNavOpen }">
            <div class="navbar-nav ms-md-auto">
              <RouterLink
                v-for="link in navLinks"
                :key="link.to"
                class="nav-link"
                active-class="active"
                :to="link.to"
              >
                {{ link.label }}
              </RouterLink>

              <RouterLink
                v-if="!currentUser"
                class="nav-link"
                active-class="active"
                to="/auth"
              >
                Member Access
              </RouterLink>

              <template v-else>
                <RouterLink
                  v-if="currentUser.role === 'organiser'"
                  class="nav-link"
                  active-class="active"
                  to="/organiser"
                >
                  Organiser
                </RouterLink>

                <div class="nav-user-area">
                  <span class="nav-user-name">{{ currentUser.fullName }}</span>
                  <button class="btn btn-outline-success btn-sm" type="button" @click="handleLogout">
                    Logout
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <main id="main-content" ref="mainContent" tabindex="-1">
      <div v-if="logoutError" class="container alert alert-danger" role="alert">{{ logoutError }}</div>
      <RouterView />
    </main>

    <footer class="site-footer">
      <div class="container py-4">
        <p>GreenMelbourne Connect - Local climate action through urban greening.</p>
      </div>
    </footer>
  </div>
</template>
