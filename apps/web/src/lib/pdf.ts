type PdfJsModule = typeof import('pdfjs-dist')

let pdfjsPromise: Promise<PdfJsModule> | null = null

function loadPdfJs(): Promise<PdfJsModule> {
  pdfjsPromise ??= import('pdfjs-dist').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()
    return pdfjs
  })
  return pdfjsPromise
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfJs()
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
  let fullText = ''

  try {
    const pdf = await loadingTask.promise
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const strings = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)
      fullText += strings.join(' ') + '\n'
    }
  } finally {
    await loadingTask.destroy()
  }

  return fullText.trim()
}