import { ref } from 'vue'

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

export const registerUser = ({ fullName, email, password, role }) => {
  const cleanName = fullName.trim()
  const cleanEmail = email.trim().toLowerCase()
  const cleanRole = normaliseRole(role)

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
