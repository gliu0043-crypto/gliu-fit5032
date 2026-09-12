import { ref } from 'vue'
import { cleanEmail, cleanText, hashPassword } from './security'

const usersStorageKey = 'greenmelbourne-connect-users'
const currentUserStorageKey = 'greenmelbourne-connect-current-user'

export const roleLabels = {
  member: 'Community member',
  organiser: 'Organiser',
}

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
const savedCurrentUser = readJson(currentUserStorageKey, null)

const normaliseRole = (role) => (role === 'organiser' ? 'organiser' : 'member')

const buildSessionUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: normaliseRole(user.role),
})

export const currentUser = ref(savedCurrentUser ? buildSessionUser(savedCurrentUser) : null)

export const registerUser = async ({ fullName, email, password, role }) => {
  const cleanName = cleanText(fullName)
  const userEmail = cleanEmail(email)
  const cleanRole = normaliseRole(role)
  const passwordHash = await hashPassword(password)

  const userExists = users.value.some((user) => user.email === userEmail)

  if (userExists) {
    return {
      success: false,
      message: 'An account with this email already exists.',
    }
  }

  const newUser = {
    id: Date.now(),
    fullName: cleanName,
    email: userEmail,
    passwordHash,
    role: cleanRole,
  }

  users.value.push(newUser)
  writeJson(usersStorageKey, users.value)

  currentUser.value = buildSessionUser(newUser)
  writeJson(currentUserStorageKey, currentUser.value)

  return {
    success: true,
    message: `Welcome, ${newUser.fullName}. Your account has been created.`,
  }
}

export const loginUser = async ({ email, password }) => {
  const userEmail = cleanEmail(email)
  const passwordHash = await hashPassword(password)
  const matchedUser = users.value.find(
    (user) =>
      user.email === userEmail &&
      (user.passwordHash === passwordHash || user.password === password),
  )

  if (!matchedUser) {
    return {
      success: false,
      message: 'Email or password is incorrect.',
    }
  }

  if (!matchedUser.passwordHash || matchedUser.password) {
    matchedUser.passwordHash = passwordHash
    delete matchedUser.password
    writeJson(usersStorageKey, users.value)
  }

  currentUser.value = buildSessionUser(matchedUser)
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
