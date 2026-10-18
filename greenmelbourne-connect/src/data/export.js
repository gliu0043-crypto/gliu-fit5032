// Export explicit display columns only: never internal IDs, tokens or action controls.
export function exportTable(rows, columns) {
  const fields = columns.filter(column => column.exportable !== false && column.key !== 'actions')
  return {
    headers: fields.map(column => column.label),
    body: rows.map(row => fields.map(column => String((column.exportValue || column.value)?.(row) ?? row[column.key] ?? ''))),
  }
}

export function csvCell(value) {
  let text = String(value ?? '')
  // Spreadsheet formula injection also applies to values preceded by whitespace.
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
export function createCsv(table) {
  return '\uFEFF' + [table.headers, ...table.body].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
export function downloadFile(blob, name) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = name
  document.body.append(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

let fontPromise
async function pdfFont() {
  if (!fontPromise) fontPromise = fetch('/fonts/NotoSansSC-Regular.ttf').then(async response => {
    if (!response.ok) throw new Error('PDF font could not load.')
    const bytes = new Uint8Array(await response.arrayBuffer())
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    return btoa(binary)
  }).catch(error => { fontPromise = null; throw error })
  return fontPromise
}

export async function createPdf(table, title, timestamp = new Date()) {
  const [{ jsPDF }, { autoTable }, font] = await Promise.all([import('jspdf'), import('jspdf-autotable'), pdfFont()])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', putOnlyUsedFonts: true })
  doc.addFileToVFS('NotoSansSC-Regular.ttf', font)
  doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal')
  doc.setFont('NotoSansSC')
  doc.setProperties({ title: `${title} - GreenMelbourne Connect`, author: 'GreenMelbourne Connect' })
  doc.setFontSize(16); doc.text(`GreenMelbourne Connect - ${title}`, 14, 18)
  doc.setFontSize(9)
  doc.text(`${table.body.length} records | Exported ${timestamp.toLocaleString('en-AU')} | Current filters and sorting applied`, 14, 25)
  autoTable(doc, {
    head: [table.headers], body: table.body, startY: 32,
    margin: { top: 16, bottom: 17, left: 14, right: 14 },
    styles: { font: 'NotoSansSC', fontStyle: 'normal', fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fontStyle: 'normal', fillColor: [23, 63, 47] },
    alternateRowStyles: { fillColor: [241, 247, 243] },
    rowPageBreak: 'avoid', showHead: 'everyPage',
  })
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page); doc.setFontSize(8)
    doc.text(`Page ${page} of ${doc.getNumberOfPages()}`, 283, 202, { align: 'right' })
  }
  return doc.output('blob')
}
