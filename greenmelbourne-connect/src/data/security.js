export const cleanText = (value) =>
  String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const cleanLongText = (value) =>
  String(value ?? '')
    .replace(/[<>]/g, '')
    .trim()

export const cleanEmail = (value) => cleanText(value).toLowerCase()

export const safeRegistrationStatus = (status) =>
  status === 'Contacted' ? 'Contacted' : 'Waiting'
