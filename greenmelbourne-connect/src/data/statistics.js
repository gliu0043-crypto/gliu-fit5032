export function activityStatistics(events, registrations, filters = {}) {
  const activities = events.filter(event => (!filters.type || event.type === filters.type)
    && (!filters.suburb || event.suburb === filters.suburb)
    && (!filters.activity || event.id === filters.activity))
  const ids = new Set(activities.map(event => event.id))
  const rows = registrations.filter(row => ids.has(row.eventId)
    && (!filters.status || (row.status || 'Waiting') === filters.status))
  const counts = new Map()
  for (const row of rows) counts.set(row.eventId, (counts.get(row.eventId) || 0) + 1)
  return {
    total: rows.length,
    waiting: rows.filter(row => row.status !== 'Contacted').length,
    contacted: rows.filter(row => row.status === 'Contacted').length,
    activities: activities.map(event => ({ id: event.id, title: event.title, count: counts.get(event.id) || 0 }))
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)),
  }
}
