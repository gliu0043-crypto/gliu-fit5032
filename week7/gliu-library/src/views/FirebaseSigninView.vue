<template>
  <section class="firebase-auth-view">
    <h1>Sign in</h1>
    <p class="text-muted">
      Sign in with Firebase Authentication and choose the role you want to test.
    </p>

    <form class="auth-card" @submit.prevent="signin">
      <div class="mb-3">
        <label for="signin-email" class="form-label">Email</label>
        <input
          id="signin-email"
          v-model="email"
          type="email"
          class="form-control"
          placeholder="gliu0043@student.monash.edu"
          autocomplete="email"
          required
        >
      </div>

      <div class="mb-3">
        <label for="signin-password" class="form-label">Password</label>
        <input
          id="signin-password"
          v-model="password"
          type="password"
          class="form-control"
          placeholder="Password"
          autocomplete="current-password"
          required
        >
      </div>

      <div class="mb-3">
        <label for="signin-role" class="form-label">Sign in as</label>
        <select id="signin-role" v-model="selectedRole" class="form-select">
          <option
            v-for="role in roleOptions"
            :key="role.value"
            :value="role.value"
          >
            {{ role.label }}
          </option>
        </select>
      </div>

      <p v-if="message" class="text-success">{{ message }}</p>
      <p v-if="error" class="text-danger">{{ error }}</p>

      <button type="submit" class="btn btn-primary">
        Sign in via Firebase
      </button>
      <router-link to="/FireRegister" class="btn btn-link">
        Create an account
      </router-link>
    </form>

    <div class="role-grid mt-4">
      <article v-for="role in roleOptions" :key="role.value" class="role-card">
        <h2 class="h6">{{ role.label }}</h2>
        <p>{{ role.description }}</p>
      </article>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/init'
import { roleOptions, saveUserRole } from '../firebase/roles'

const email = ref('')
const password = ref('')
const selectedRole = ref('member')
const message = ref('')
const error = ref('')
const router = useRouter()

const signin = async () => {
  message.value = ''
  error.value = ''

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value,
    )

    saveUserRole(credential.user.uid, selectedRole.value)
    console.log('Firebase Sign in Successful!')
    console.log(auth.currentUser)
    console.log('Signed in role:', selectedRole.value)
    message.value = `Signed in as ${selectedRole.value}`
    router.push('/FireAccount')
  } catch (signinError) {
    error.value = signinError.code
    console.log(signinError.code)
  }
}
</script>

<style scoped>
.firebase-auth-view {
  width: min(100%, 760px);
  margin: 2rem auto 0;
}

.auth-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1.5rem;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.role-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
}
</style>
