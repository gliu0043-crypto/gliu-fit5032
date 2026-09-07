<script setup>
import { ref } from 'vue'

const activePanel = ref('login')
</script>

<template>
  <section class="content-section page-section auth-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Member Access</p>
        <h1>Access your GreenMelbourne Connect account.</h1>
        <p>
          Members and organisers use account access to reach the tools that match
          their role in local climate action.
        </p>
      </div>

      <div class="auth-layout">
        <div class="auth-switch" role="tablist" aria-label="Account access options">
          <button
            class="auth-switch-button"
            :class="{ active: activePanel === 'login' }"
            type="button"
            @click="activePanel = 'login'"
          >
            Login
          </button>
          <button
            class="auth-switch-button"
            :class="{ active: activePanel === 'register' }"
            type="button"
            @click="activePanel = 'register'"
          >
            Register
          </button>
        </div>

        <form v-if="activePanel === 'login'" class="auth-panel" @submit.prevent>
          <h2>Login</h2>

          <div class="mb-3">
            <label class="form-label" for="login-email">Email</label>
            <input id="login-email" class="form-control" type="email" autocomplete="email">
          </div>

          <div class="mb-4">
            <label class="form-label" for="login-password">Password</label>
            <input id="login-password" class="form-control" type="password" autocomplete="current-password">
          </div>

          <button class="btn btn-success btn-lg w-100" type="submit">Login</button>
        </form>

        <form v-else class="auth-panel" @submit.prevent>
          <h2>Register</h2>

          <div class="mb-3">
            <label class="form-label" for="register-name">Full name</label>
            <input id="register-name" class="form-control" type="text" autocomplete="name">
          </div>

          <div class="mb-3">
            <label class="form-label" for="register-email">Email</label>
            <input id="register-email" class="form-control" type="email" autocomplete="email">
          </div>

          <div class="mb-4">
            <label class="form-label" for="register-password">Password</label>
            <input id="register-password" class="form-control" type="password" autocomplete="new-password">
          </div>

          <button class="btn btn-success btn-lg w-100" type="submit">Create account</button>
        </form>
      </div>
    </div>
  </section>
</template>
