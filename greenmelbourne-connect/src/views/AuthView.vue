<script setup>
import { reactive, ref } from 'vue'
import { focusInvalid } from '../data/accessibility'
import { RouterLink } from 'vue-router'
import { currentUser, loginUser, logoutUser, registerUser, roleLabels, authBusy, authLoading, authError } from '../data/auth'

const activePanel = ref('login')
const authMessage = ref('')
const authMessageType = ref('success')

const loginForm = reactive({
  email: '',
  password: '',
})

const registerForm = reactive({
  fullName: '',
  email: '',
  password: '',
})

const loginErrors = reactive({
  email: '',
  password: '',
})

const registerErrors = reactive({
  fullName: '',
  email: '',
  password: '',
})

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const setAuthMessage = (message, type = 'success') => {
  authMessage.value = message
  authMessageType.value = type
}

const validateLoginForm = () => {
  loginErrors.email = emailPattern.test(loginForm.email.trim())
    ? ''
    : 'Enter a valid email address.'
  loginErrors.password = loginForm.password ? '' : 'Enter your password.'

  return !loginErrors.email && !loginErrors.password
}

const validateRegisterForm = () => {
  registerErrors.fullName =
    registerForm.fullName.trim().length >= 2 ? '' : 'Enter your full name.'
  registerErrors.email = emailPattern.test(registerForm.email.trim())
    ? ''
    : 'Enter a valid email address.'
  registerErrors.password =
    registerForm.password.length >= 6 ? '' : 'Password must be at least 6 characters.'

  return !registerErrors.fullName && !registerErrors.email && !registerErrors.password
}

const resetLoginForm = () => {
  loginForm.email = ''
  loginForm.password = ''
}

const resetRegisterForm = () => {
  registerForm.fullName = ''
  registerForm.email = ''
  registerForm.password = ''
}

const handleLogin = async (event) => {
  authMessage.value = ''

  if (!validateLoginForm()) {
    await focusInvalid(event.currentTarget)
    return
  }

  const result = await loginUser(loginForm)
  setAuthMessage(result.message, result.success ? 'success' : 'danger')

  if (result.success) {
    resetLoginForm()
  }
}

const handleRegister = async (event) => {
  authMessage.value = ''

  if (!validateRegisterForm()) {
    await focusInvalid(event.currentTarget)
    return
  }

  const result = await registerUser(registerForm)
  setAuthMessage(result.message, result.success ? 'success' : 'danger')

  if (result.success) {
    resetRegisterForm()
    activePanel.value = 'login'
  }
}

const handleLogout = async () => {
  const result = await logoutUser()
  setAuthMessage(result.message, result.success ? 'success' : 'danger')
}
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
        <p v-if="authLoading" role="status">Loading your account…</p>
        <div v-if="authError" class="alert alert-danger" role="alert">{{ authError }} <button type="button" class="btn btn-link" :disabled="authBusy" @click="handleLogout">Sign out and retry</button></div>
        <div v-if="authMessage" class="alert" :class="`alert-${authMessageType}`" role="status">
          {{ authMessage }}
        </div>

        <div v-if="currentUser" class="auth-panel logged-in-panel">
          <p class="panel-label">Signed in</p>
          <h2>{{ currentUser.fullName }}</h2>
          <p>{{ currentUser.email }}</p>
          <span class="role-badge">{{ roleLabels[currentUser.role] }}</span>

          <div class="d-flex flex-column flex-sm-row gap-3 mt-4">
            <RouterLink
              v-if="currentUser.role === 'organiser'"
              class="btn btn-success btn-lg"
              to="/organiser"
            >
              Open organiser dashboard
            </RouterLink>
            <RouterLink v-else class="btn btn-success btn-lg" to="/join">
              Find an activity
            </RouterLink>
            <button class="btn btn-outline-success btn-lg" type="button" @click="handleLogout">
              Logout
            </button>
          </div>
        </div>

        <template v-else-if="!authLoading">
          <div class="auth-switch" role="group" aria-label="Account access options">
            <button
              class="auth-switch-button"
              :class="{ active: activePanel === 'login' }"
              :aria-pressed="activePanel === 'login'"
              type="button"
              @click="activePanel = 'login'"
            >
              Login
            </button>
            <button
              class="auth-switch-button"
              :class="{ active: activePanel === 'register' }"
              :aria-pressed="activePanel === 'register'"
              type="button"
              @click="activePanel = 'register'"
            >
              Register
            </button>
          </div>

          <form v-if="activePanel === 'login'" class="auth-panel" novalidate @submit.prevent="handleLogin">
            <h2>Login</h2>

            <div class="mb-3">
              <label class="form-label" for="login-email">Email</label>
              <input
                id="login-email"
                required
                :aria-invalid="Boolean(loginErrors.email)"
                :aria-describedby="loginErrors.email ? 'login-email-error' : undefined"
                v-model="loginForm.email"
                class="form-control"
                :class="{ 'is-invalid': loginErrors.email }"
                type="email"
                autocomplete="email"
                @input="loginErrors.email = ''"
              >
              <div v-if="loginErrors.email" id="login-email-error" class="invalid-feedback">
                {{ loginErrors.email }}
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label" for="login-password">Password</label>
              <input
                id="login-password"
                required
                :aria-invalid="Boolean(loginErrors.password)"
                :aria-describedby="loginErrors.password ? 'login-password-error' : undefined"
                v-model="loginForm.password"
                class="form-control"
                :class="{ 'is-invalid': loginErrors.password }"
                type="password"
                autocomplete="current-password"
                @input="loginErrors.password = ''"
              >
              <div v-if="loginErrors.password" id="login-password-error" class="invalid-feedback">
                {{ loginErrors.password }}
              </div>
            </div>

            <button class="btn btn-success btn-lg w-100" type="submit" :disabled="authBusy || authLoading">{{ authBusy ? 'Signing in…' : 'Login' }}</button>
          </form>

          <form v-else class="auth-panel" novalidate @submit.prevent="handleRegister">
            <h2>Register</h2>

            <div class="mb-3">
              <label class="form-label" for="register-name">Full name</label>
              <input
                id="register-name"
                required
                :aria-invalid="Boolean(registerErrors.fullName)"
                :aria-describedby="registerErrors.fullName ? 'register-name-error' : undefined"
                v-model="registerForm.fullName"
                maxlength="100"
                class="form-control"
                :class="{ 'is-invalid': registerErrors.fullName }"
                type="text"
                autocomplete="name"
                @input="registerErrors.fullName = ''"
              >
              <div v-if="registerErrors.fullName" id="register-name-error" class="invalid-feedback">
                {{ registerErrors.fullName }}
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label" for="register-email">Email</label>
              <input
                id="register-email"
                required
                :aria-invalid="Boolean(registerErrors.email)"
                :aria-describedby="registerErrors.email ? 'register-email-error' : undefined"
                v-model="registerForm.email"
                class="form-control"
                :class="{ 'is-invalid': registerErrors.email }"
                type="email"
                autocomplete="email"
                @input="registerErrors.email = ''"
              >
              <div v-if="registerErrors.email" id="register-email-error" class="invalid-feedback">
                {{ registerErrors.email }}
              </div>
            </div>

            <p class="form-hint">New accounts join as community members. Organiser access is assigned by the site administrator.</p>

            <div class="mb-4">
              <label class="form-label" for="register-password">Password</label>
              <input
                id="register-password"
                required
                :aria-invalid="Boolean(registerErrors.password)"
                :aria-describedby="registerErrors.password ? 'register-password-error' : undefined"
                v-model="registerForm.password"
                class="form-control"
                :class="{ 'is-invalid': registerErrors.password }"
                type="password"
                autocomplete="new-password"
                @input="registerErrors.password = ''"
              >
              <div v-if="registerErrors.password" id="register-password-error" class="invalid-feedback">
                {{ registerErrors.password }}
              </div>
            </div>

            <button class="btn btn-success btn-lg w-100" type="submit" :disabled="authBusy || authLoading">{{ authBusy ? 'Creating account…' : 'Create account' }}</button>
          </form>
        </template>
      </div>
    </div>
  </section>
</template>
