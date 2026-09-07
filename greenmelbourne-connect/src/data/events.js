export const events = [
  {
    id: 1,
    title: 'Clayton Community Tree Planting Day',
    suburb: 'Clayton',
    date: 'Saturday 29 August 2026',
    type: 'Tree planting',
    places: 18,
    description: 'A beginner-friendly planting session with tools and guidance provided.',
  },
  {
    id: 2,
    title: 'Box Hill Habitat Care Morning',
    suburb: 'Box Hill',
    date: 'Sunday 30 August 2026',
    type: 'Habitat restoration',
    places: 12,
    description: 'Help restore local habitat through mulching, weeding, and native planting.',
  },
  {
    id: 3,
    title: 'Yarra Native Garden Workshop',
    suburb: 'Yarra',
    date: 'Saturday 5 September 2026',
    type: 'Biodiversity education',
    places: 20,
    description: 'Learn simple ways to support native plants, insects, and birds at home.',
  },
]

export const registrationsStorageKey = 'greenmelbourne-connect-registrations'

export const loadStoredRegistrations = () => {
  try {
    if (typeof localStorage === 'undefined') {
      return []
    }

    const savedRegistrations = localStorage.getItem(registrationsStorageKey)

    if (!savedRegistrations) {
      return []
    }

    const parsedRegistrations = JSON.parse(savedRegistrations)
    return Array.isArray(parsedRegistrations) ? parsedRegistrations : []
  } catch {
    return []
  }
}

export const saveStoredRegistrations = (registrations) => {
  try {
    if (typeof localStorage === 'undefined') {
      return
    }

    localStorage.setItem(registrationsStorageKey, JSON.stringify(registrations))
  } catch {
    return
  }
}
