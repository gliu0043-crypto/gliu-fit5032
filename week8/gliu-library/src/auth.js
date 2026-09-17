import { ref } from 'vue'

export const isAuthenticated = ref(false)

const credentials = {
  username: 'student',
  password: 'Password123!',
}

export const login = (username, password) => {
  const valid =
    username === credentials.username && password === credentials.password

  isAuthenticated.value = valid
  return valid
}

export const logout = () => {
  isAuthenticated.value = false
}
