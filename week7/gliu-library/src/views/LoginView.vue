<template>
  <section class="auth-view">
    <h1>Member Login</h1>
    <p v-if="route.query.redirect" class="alert alert-warning">
      Please log in before opening the members area.
    </p>

    <form class="login-form" @submit.prevent="handleSubmit">
      <div class="mb-3">
        <label for="login-username" class="form-label">Username</label>
        <input
          id="login-username"
          v-model="username"
          type="text"
          class="form-control"
          autocomplete="username"
        >
      </div>
      <div class="mb-3">
        <label for="login-password" class="form-label">Password</label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          class="form-control"
          autocomplete="current-password"
        >
      </div>
      <p v-if="error" class="text-danger">{{ error }}</p>
      <button type="submit" class="btn btn-primary">Login</button>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../auth'

const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const error = ref('')

const handleSubmit = () => {
  if (login(username.value, password.value)) {
    router.push(route.query.redirect || '/about')
    return
  }

  error.value = 'The username or password is incorrect.'
  router.push('/access-denied')
}
</script>

<style scoped>
.auth-view {
  width: min(100%, 520px);
  margin: 2rem auto 0;
}

.login-form {
  margin-top: 1rem;
}
</style>
