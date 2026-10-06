import JSZip from 'jszip'
import * as mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { createWorker } from 'tesseract.js'
import type { SourceFileData } from '../types'
import { makeId } from '../lib/id'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

const textExtensions = new Set(['txt', 'md', 'csv', 'tsv', 'json', 'xml', 'html', 'htm', 'log', 'yaml', 'yml', 'ini', 'css', 'js', 'ts', 'tsx', 'jsx'])

function ext(name: string) {
  return name.split('.').pop()?.toLowerCase() || ''
}

async function extractPdf(file: File) {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const chunks: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    chunks.push(`--- Page ${i} ---\n${text}`)
  }
  return chunks.join('\n\n')
}

async function extractDocx(file: File) {
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}

async function extractWorkbook(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name]
    return `--- Sheet: ${name} ---\n${XLSX.utils.sheet_to_csv(sheet)}`
  }).join('\n\n')
}

async function extractPptx(file: File) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0))

  const result: string[] = []
  for (const name of slideNames) {
    const xml = await zip.file(name)!.async('string')
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    const texts = Array.from(doc.getElementsByTagName('a:t')).map((n) => n.textContent || '')
    const slideNo = name.match(/slide(\d+)/)?.[1]
    result.push(`--- Slide ${slideNo} ---\n${texts.join(' ')}`)
  }
  return result.join('\n\n')
}

async function extractImage(file: File) {
  const worker = await createWorker('eng')
  try {
    const { data } = await worker.recognize(file)
    return data.text
  } finally {
    await worker.terminate()
  }
}

async function bestEffortText(file: File) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const sample = bytes.slice(0, Math.min(bytes.length, 4096))
  let printable = 0
  for (const b of sample) if (b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126)) printable++
  if (sample.length && printable / sample.length > 0.85) return new TextDecoder().decode(buffer)
  throw new Error('This file format cannot be safely extracted in the browser. Convert it to PDF, DOCX, PPTX, XLSX, TXT, or an image first.')
}

export async function extractFile(file: File): Promise<SourceFileData> {
  const base: SourceFileData = {
    id: makeId(),
    name: file.name,
    type: file.type || ext(file.name),
    size: file.size,
    extractedText: '',
    status: 'processing',
  }
  try {
    const extension = ext(file.name)
    let text = ''
    if (extension === 'pdf') text = await extractPdf(file)
    else if (extension === 'docx') text = await extractDocx(file)
    else if (extension === 'xlsx' || extension === 'xls') text = await extractWorkbook(file)
    else if (extension === 'pptx') text = await extractPptx(file)
    else if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(extension) || file.type.startsWith('image/')) text = await extractImage(file)
    else if (textExtensions.has(extension) || file.type.startsWith('text/')) text = await file.text()
    else if (extension === 'doc' || extension === 'ppt') throw new Error('Legacy .doc/.ppt files are not reliably readable in-browser. Please save them as .docx/.pptx or PDF.')
    else text = await bestEffortText(file)

    if (!text.trim()) throw new Error('No readable text was found in this file.')
    return { ...base, extractedText: text.trim(), status: 'ready' }
  } catch (error) {
    return { ...base, status: 'failed', error: error instanceof Error ? error.message : 'Extraction failed.' }
  }
}
