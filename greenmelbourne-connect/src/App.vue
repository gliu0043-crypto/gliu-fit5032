<script setup>
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
const isNavOpen = ref(false)

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Activities', to: '/activities' },
  { label: 'Join Event', to: '/join' },
  { label: 'Member Access', to: '/auth' },
]

watch(
  () => route.fullPath,
  () => {
    isNavOpen.value = false
  },
)
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <nav class="navbar navbar-expand-md">
        <div class="container">
          <RouterLink class="navbar-brand brand-link" to="/">GreenMelbourne Connect</RouterLink>

          <button
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
            </div>
          </div>
        </div>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>

    <footer class="site-footer">
      <div class="container py-4">
        <p>GreenMelbourne Connect - Local climate action through urban greening.</p>
      </div>
    </footer>
  </div>
</template>
