import { ref } from 'vue'

const usersStorageKey = 'greenmelbourne-connect-users'
const currentUserStorageKey = 'greenmelbourne-connect-current-user'

const readJson = (key, fallbackValue) => {
  try {
    const savedValue = localStorage.getItem(key)

    if (!savedValue) {
      return fallbackValue
    }

    return JSON.parse(savedValue)
  } catch {
    return fallbackValue
  }
}

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    return
  }
}

export const users = ref(readJson(usersStorageKey, []))
export const currentUser = ref(readJson(currentUserStorageKey, null))

export const registerUser = ({ fullName, email, password }) => {
  const cleanName = fullName.trim()
  const cleanEmail = email.trim().toLowerCase()

  const userExists = users.value.some((user) => user.email === cleanEmail)

  if (userExists) {
    return {
      success: false,
      message: 'An account with this email already exists.',
    }
  }

  const newUser = {
    id: Date.now(),
    fullName: cleanName,
    email: cleanEmail,
    password,
  }

  users.value.push(newUser)
  writeJson(usersStorageKey, users.value)

  currentUser.value = {
    id: newUser.id,
    fullName: newUser.fullName,
    email: newUser.email,
  }
  writeJson(currentUserStorageKey, currentUser.value)

  return {
    success: true,
    message: `Welcome, ${newUser.fullName}. Your account has been created.`,
  }
}

export const loginUser = ({ email, password }) => {
  const cleanEmail = email.trim().toLowerCase()
  const matchedUser = users.value.find(
    (user) => user.email === cleanEmail && user.password === password,
  )

  if (!matchedUser) {
    return {
      success: false,
      message: 'Email or password is incorrect.',
    }
  }

  currentUser.value = {
    id: matchedUser.id,
    fullName: matchedUser.fullName,
    email: matchedUser.email,
  }
  writeJson(currentUserStorageKey, currentUser.value)

  return {
    success: true,
    message: `Welcome back, ${matchedUser.fullName}.`,
  }
}

export const logoutUser = () => {
  currentUser.value = null
  localStorage.removeItem(currentUserStorageKey)
}
