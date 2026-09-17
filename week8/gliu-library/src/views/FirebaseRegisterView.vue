<template>
  <section class="firebase-auth-view">
    <h1>Create an Account</h1>
    <p class="text-muted">
      Register a Firebase Authentication user with an email, password, and demo
      role.
    </p>

    <form class="auth-card" @submit.prevent="register">
      <div class="mb-3">
        <label for="register-email" class="form-label">Email</label>
        <input
          id="register-email"
          v-model="email"
          type="email"
          class="form-control"
          placeholder="gliu0043@student.monash.edu"
          autocomplete="email"
          required
        >
      </div>

      <div class="mb-3">
        <label for="register-password" class="form-label">Password</label>
        <input
          id="register-password"
          v-model="password"
          type="password"
          class="form-control"
          placeholder="Password"
          autocomplete="new-password"
          required
        >
      </div>

      <div class="mb-3">
        <label for="register-role" class="form-label">Role</label>
        <select id="register-role" v-model="selectedRole" class="form-select">
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

      <button type="submit" class="btn btn-primary">Save to Firebase</button>
      <router-link to="/FireLogin" class="btn btn-link">
        Already have an account?
      </router-link>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/init'
import { roleOptions, saveUserRole } from '../firebase/roles'

const email = ref('')
const password = ref('')
const selectedRole = ref('member')
const message = ref('')
const error = ref('')
const router = useRouter()

const register = async () => {
  message.value = ''
  error.value = ''

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value,
    )

    saveUserRole(credential.user.uid, selectedRole.value)
    console.log('Firebase Register Successful!')
    console.log(credential.user)
    console.log('Registered role:', selectedRole.value)
    message.value = 'Firebase Register Successful!'
    router.push('/FireLogin')
  } catch (registerError) {
    error.value = registerError.code
    console.log(registerError.code)
  }
}
</script>

<style scoped>
.firebase-auth-view {
  width: min(100%, 640px);
  margin: 2rem auto 0;
}

.auth-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1.5rem;
}
</style>
