<template>
  <div class="library-form-page">
    <div class="form-shell">
      <h1 class="text-center mb-1">W5. Library Registration Form</h1>
      <p class="text-center text-muted mb-4">
        Let's build some more advanced features into our form.
      </p>

      <form @submit.prevent="submitForm" novalidate>
        <div class="row mb-3">
          <div class="col-12 col-md-6 mb-3 mb-md-0">
            <label for="username" class="form-label">Username</label>
            <input
              type="text"
              class="form-control"
              :class="{ 'is-invalid': errors.username }"
              id="username"
              @blur="() => validateName(true)"
              @input="() => validateName(false)"
              v-model="formData.username"
            >
            <div v-if="errors.username" class="text-danger small mt-1">
              {{ errors.username }}
            </div>
          </div>

          <div class="col-12 col-md-6">
            <label for="gender" class="form-label">Gender</label>
            <select
              class="form-select"
              :class="{ 'is-invalid': errors.gender }"
              id="gender"
              @blur="() => validateGender(true)"
              @change="() => validateGender(false)"
              v-model="formData.gender"
            >
              <option value="" disabled>Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <div v-if="errors.gender" class="text-danger small mt-1">
              {{ errors.gender }}
            </div>
          </div>
        </div>

        <div class="row mb-3">
          <div class="col-12 col-md-6 mb-3 mb-md-0">
            <label for="password" class="form-label">Password</label>
            <input
              type="password"
              class="form-control"
              :class="{ 'is-invalid': errors.password }"
              id="password"
              @blur="() => validatePassword(true)"
              @input="handlePasswordInput"
              v-model="formData.password"
            >
            <div v-if="errors.password" class="text-danger small mt-1">
              {{ errors.password }}
            </div>
          </div>

          <div class="col-12 col-md-6">
            <label for="confirm-password" class="form-label">Confirm password</label>
            <input
              type="password"
              class="form-control"
              :class="{ 'is-invalid': errors.confirmPassword }"
              id="confirm-password"
              @blur="() => validateConfirmPassword(true)"
              v-model="formData.confirmPassword"
            >
            <div v-if="errors.confirmPassword" class="text-danger small mt-1">
              {{ errors.confirmPassword }}
            </div>
          </div>
        </div>

        <div class="mb-3">
          <div class="form-check">
            <input
              type="checkbox"
              class="form-check-input"
              :class="{ 'is-invalid': errors.resident }"
              id="isAustralian"
              @change="() => validateResident(true)"
              v-model="formData.isAustralian"
            >
            <label class="form-check-label" for="isAustralian">
              Australian Resident?
            </label>
          </div>
          <div v-if="errors.resident" class="text-danger small mt-1">
            {{ errors.resident }}
          </div>
        </div>

        <div class="mb-3">
          <label for="reason" class="form-label">Reason for joining</label>
          <textarea
            class="form-control"
            :class="{ 'is-invalid': errors.reason }"
            id="reason"
            rows="3"
            @blur="() => validateReason(true)"
            @input="() => validateReason(false)"
            v-model="formData.reason"
          ></textarea>
          <div v-if="errors.reason" class="text-danger small mt-1">
            {{ errors.reason }}
          </div>
          <div v-if="success.reason" class="text-success small mt-1">
            {{ success.reason }}
          </div>
        </div>

        <div class="mb-3">
          <label for="suburb" class="form-label">Suburb</label>
          <input
            type="text"
            class="form-control"
            id="suburb"
            v-model="formData.suburb"
          >
        </div>

        <div class="text-center">
          <button type="submit" class="btn btn-primary me-2">Submit</button>
          <button type="button" class="btn btn-secondary" @click="clearForm">
            Clear
          </button>
        </div>
      </form>
    </div>

    <section class="mt-5">
      <h2 class="h5 mb-3">This is a PrimeVue DataTable.</h2>
      <DataTable
        :value="submittedUsers"
        stripedRows
        showGridlines
        tableStyle="min-width: 50rem"
      >
        <Column field="username" header="Username"></Column>
        <Column field="password" header="Password"></Column>
        <Column header="Australian Resident">
          <template #body="slotProps">
            {{ slotProps.data.isAustralian ? 'Yes' : 'No' }}
          </template>
        </Column>
        <Column field="gender" header="Gender"></Column>
        <Column field="reason" header="Reason"></Column>
        <Column field="suburb" header="Suburb"></Column>
      </DataTable>
    </section>

    <section v-if="submittedUsers.length" class="user-card-grid mt-4">
      <div
        v-for="user in submittedUsers"
        :key="`${user.username}-${user.reason}`"
        class="card user-card"
      >
        <div class="card-header bg-primary text-white">User Information</div>
        <ul class="list-group list-group-flush">
          <li class="list-group-item">Username: {{ user.username }}</li>
          <li class="list-group-item">Password: {{ user.password }}</li>
          <li class="list-group-item">
            Australian Resident: {{ user.isAustralian ? 'Yes' : 'No' }}
          </li>
          <li class="list-group-item">Gender: {{ user.gender }}</li>
          <li class="list-group-item">Reason: {{ user.reason }}</li>
          <li class="list-group-item">Suburb: {{ user.suburb }}</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

defineOptions({
  name: 'LibraryRegistrationForm',
})

const formData = ref({
  username: '',
  password: '',
  confirmPassword: '',
  isAustralian: false,
  gender: '',
  reason: '',
  suburb: 'Clayton',
})

const submittedUsers = ref([])

const errors = ref({
  username: null,
  password: null,
  confirmPassword: null,
  resident: null,
  gender: null,
  reason: null,
})

const success = ref({
  reason: null,
})

const validateName = (blur) => {
  if (formData.value.username.length < 3) {
    if (blur) errors.value.username = 'Name must be at least 3 characters'
  } else {
    errors.value.username = null
  }
}

const validatePassword = (blur) => {
  const password = formData.value.password
  const minLength = 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  if (password.length < minLength) {
    if (blur) errors.value.password = `Password must be at least ${minLength} characters long.`
  } else if (!hasUppercase) {
    if (blur) errors.value.password = 'Password must contain at least one uppercase letter.'
  } else if (!hasLowercase) {
    if (blur) errors.value.password = 'Password must contain at least one lowercase letter.'
  } else if (!hasNumber) {
    if (blur) errors.value.password = 'Password must contain at least one number.'
  } else if (!hasSpecialChar) {
    if (blur) errors.value.password = 'Password must contain at least one special character.'
  } else {
    errors.value.password = null
  }
}

const validateConfirmPassword = (blur) => {
  if (formData.value.password !== formData.value.confirmPassword) {
    if (blur) errors.value.confirmPassword = 'Passwords do not match.'
  } else {
    errors.value.confirmPassword = null
  }
}

const handlePasswordInput = () => {
  validatePassword(false)
  if (formData.value.confirmPassword) validateConfirmPassword(false)
}

const validateResident = (blur) => {
  if (!formData.value.isAustralian) {
    if (blur) errors.value.resident = 'Please confirm Australian residency.'
  } else {
    errors.value.resident = null
  }
}

const validateGender = (blur) => {
  if (!formData.value.gender) {
    if (blur) errors.value.gender = 'Please select a gender.'
  } else {
    errors.value.gender = null
  }
}

const validateReason = (blur) => {
  const reason = formData.value.reason.trim()
  const includesFriend = reason.toLowerCase().includes('friend')

  success.value.reason = includesFriend ? 'Great to have a friend' : null

  if (reason.length < 10) {
    if (blur) errors.value.reason = 'Reason must be at least 10 characters.'
  } else {
    errors.value.reason = null
  }
}

const submitForm = () => {
  validateName(true)
  validatePassword(true)
  validateConfirmPassword(true)
  validateResident(true)
  validateGender(true)
  validateReason(true)

  if (
    errors.value.username ||
    errors.value.password ||
    errors.value.confirmPassword ||
    errors.value.resident ||
    errors.value.gender ||
    errors.value.reason
  ) {
    return
  }

  submittedUsers.value.push({
    username: formData.value.username,
    password: formData.value.password,
    isAustralian: formData.value.isAustralian,
    gender: formData.value.gender,
    reason: formData.value.reason,
    suburb: formData.value.suburb,
  })
  clearForm()
}

const clearForm = () => {
  formData.value = {
    username: '',
    password: '',
    confirmPassword: '',
    isAustralian: false,
    gender: '',
    reason: '',
    suburb: 'Clayton',
  }

  errors.value = {
    username: null,
    password: null,
    confirmPassword: null,
    resident: null,
    gender: null,
    reason: null,
  }

  success.value = {
    reason: null,
  }
}
</script>

<style scoped>
.library-form-page {
  width: min(100%, 1040px);
  margin: 0 auto;
}

.form-shell {
  width: min(100%, 760px);
  margin: 0 auto;
}

.user-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.user-card {
  border-radius: 6px;
}
</style>
