export const roleOptions = [
  {
    label: 'Student Member',
    value: 'member',
    description: 'Can browse library pages and use normal member features.',
  },
  {
    label: 'Librarian',
    value: 'librarian',
    description: 'Can review member activity and help manage library resources.',
  },
  {
    label: 'Administrator',
    value: 'admin',
    description: 'Can access the highest-level management tools in this demo.',
  },
]

export const roleLabels = roleOptions.reduce((labels, role) => {
  labels[role.value] = role.label
  return labels
}, {})

export const saveUserRole = (uid, role) => {
  localStorage.setItem(`week7-role-${uid}`, role)
}

export const getSavedUserRole = (uid) => {
  return localStorage.getItem(`week7-role-${uid}`) || 'member'
}
