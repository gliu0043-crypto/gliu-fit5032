export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024
export const MAX_BATCH_RECIPIENTS = 10
export const ATTACHMENT_TYPES = { pdf: 'application/pdf', txt: 'text/plain', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' }

export function attachmentType(name) {
  return ATTACHMENT_TYPES[String(name).split('.').pop().toLowerCase()] || ''
}

export function validateEmailForm({ recipient, subject, message, attachment }) {
  const errors = {}
  if (!recipient) errors.recipient = 'Choose a recipient.'
  if (typeof subject !== 'string' || subject.trim().length < 3 || subject.trim().length > 120 || /[\r\n\u0000]/.test(subject)) {
    errors.subject = 'Enter a subject between 3 and 120 characters on one line.'
  }
  if (typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 5000 || message.includes('\u0000')) {
    errors.message = 'Enter a message between 10 and 5,000 characters.'
  }
  if (!attachment) errors.attachment = 'Attach a PDF, TXT, PNG or JPG file.'
  else if (!attachmentType(attachment.name) || /[\\/\r\n\u0000]/.test(attachment.name) || attachment.name.length > 120) {
    errors.attachment = 'Choose a PDF, TXT, PNG or JPG with a filename of at most 120 characters.'
  } else if (!Number.isInteger(attachment.size) || attachment.size < 1 || attachment.size > MAX_ATTACHMENT_BYTES) {
    errors.attachment = 'The attachment must be non-empty and no larger than 2 MB.'
  }
  return errors
}
