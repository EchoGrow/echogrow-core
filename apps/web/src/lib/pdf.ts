/**
 * PDF text extraction, loaded on demand.
 *
 * `pdfjs-dist` is ~700 kB of JavaScript plus a ~1.2 MB worker. Importing it at
 * the top of this module put both in the main bundle, so every visitor paid for
 * it even when they only pasted text. The dynamic import below keeps it in its
 * own chunk: it is fetched the first time someone actually drops a PDF.
 */

type PdfJsModule = typeof import('pdfjs-dist')

let pdfjsPromise: Promise<PdfJsModule> | null = null

function loadPdfJs(): Promise<PdfJsModule> {
  pdfjsPromise ??= import('pdfjs-dist').then((pdfjs) => {
    // Resolved by Vite to the emitted worker asset, so the worker is cached by
    // the browser but only downloaded when PDF parsing starts.
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
    // Releases the worker; the module itself stays cached for the next upload.
    await loadingTask.destroy()
  }

  return fullText.trim()
}
