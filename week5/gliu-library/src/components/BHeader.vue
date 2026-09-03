<template>
  <div class="container">
    <header class="d-flex justify-content-center py-3 border-bottom">
      <ul class="nav nav-pills align-items-center">
        <li class="nav-item">
          <router-link to="/" class="nav-link" active-class="active">
            Home (Week 5)
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/about" class="nav-link" active-class="active">
            About
          </router-link>
        </li>
        <li v-if="!isAuthenticated" class="nav-item">
          <router-link to="/login" class="nav-link" active-class="active">
            Login
          </router-link>
        </li>
        <li v-else class="nav-item">
          <button type="button" class="nav-link logout-button" @click="handleLogout">
            Logout
          </button>
        </li>
      </ul>
    </header>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { isAuthenticated, logout } from '../auth'

const router = useRouter()

const handleLogout = () => {
  logout()
  router.push('/login')
}
</script>

<style scoped>
.logout-button {
  border: 0;
  background: transparent;
  color: var(--bs-nav-link-color);
}

.logout-button:hover {
  color: var(--bs-nav-link-hover-color);
}
</style>
