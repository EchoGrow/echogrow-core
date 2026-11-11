import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { cn } from '../../lib/cn'

interface MultiDropzoneProps {
  id: string
  accept?: string
  disabled?: boolean
  hint?: string
  onFiles: (files: File[]) => void
  className?: string
}

/** Drop target for several files at once (the single-file `Dropzone` only takes one). */
export function MultiDropzone({
  id,
  accept = '.txt,.pdf,text/plain,application/pdf',
  disabled,
  hint,
  onFiles,
  className,
}: MultiDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    onFiles(Array.from(list))
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (disabled) return
    handleFiles(event.dataTransfer.files)
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200',
        'border-line-strong bg-chip/50 hover:border-accent-500 hover:bg-accent-50/40 dark:hover:bg-accent-500/10',
        isDragging && 'border-accent-500 bg-accent-50 shadow-focus dark:bg-accent-500/10',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <span
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full bg-surface-card text-accent-600 shadow-sm transition-transform',
          'group-hover:scale-110',
          isDragging && 'scale-110',
        )}
      >
        <UploadCloud className="h-7 w-7" />
      </span>
      <span className="text-sm font-semibold text-fg-strong">
        {isDragging ? 'Drop the files here' : 'Click to upload or drag & drop'}
      </span>
      <span className="max-w-md text-xs leading-relaxed text-fg-muted">
        {hint ?? 'Transcripts and resumes for every candidate, all at once'}
      </span>
    </label>
  )
}
