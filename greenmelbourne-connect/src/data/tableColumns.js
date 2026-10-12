// Existing activities store a readable date. Convert it before sorting rather
// than ordering dates by weekday or month name.
const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
export function activityDateValue(row) {
  const text = String(row.date || '')
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const readable = text.match(/(?:^|\s)(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i)
  const month = readable ? months.indexOf(readable[2].toLowerCase()) : -1
  return month < 0 ? null : Date.UTC(Number(readable[3]), month, Number(readable[1]))
}
const dateFormat = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Australia/Melbourne' })
const createdAtValue = (row) => typeof row.createdAt?.seconds === 'number' ? row.createdAt.seconds : null
export const activityColumns = [
  { key: 'title', label: 'Activity' },
  { key: 'suburb', label: 'Suburb' },
  { key: 'date', label: 'Date', sortValue: activityDateValue },
  { key: 'type', label: 'Type' },
  { key: 'places', label: 'Places', sortValue: (row) => row.places == null ? null : Number(row.places) },
]
export const registrationColumns = [
  { key: 'fullName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'eventTitle', label: 'Activity', value: (row) => `${row.eventTitle || ''} ${row.reason || ''}`, sortValue: (row) => row.eventTitle },
  { key: 'suburb', label: 'Suburb' },
  { key: 'status', label: 'Status', value: (row) => row.status || 'Waiting' },
  { key: 'createdAt', label: 'Registered', value: (row) => createdAtValue(row) == null ? 'Pending' : dateFormat.format(new Date(createdAtValue(row) * 1000)), sortValue: createdAtValue },
  { key: 'actions', label: 'Actions', sortable: false, searchable: false },
]
