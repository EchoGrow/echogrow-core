import { useCallback, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { cn } from '../../lib/cn'

interface DropzoneProps {
  id: string
  accept?: string
  maxSizeMb?: number
  disabled?: boolean
  hint?: string
  onFile: (file: File) => void
  onError?: (message: string) => void
  className?: string
}

export function Dropzone({
  id,
  accept = '.txt,text/plain',
  maxSizeMb = 5,
  disabled,
  hint,
  onFile,
  onError,
  className,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > maxSizeMb * 1024 * 1024) {
        onError?.(`File is too large. Max ${maxSizeMb} MB.`)
        return
      }
      onFile(file)
    },
    [maxSizeMb, onFile, onError],
  )

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200',
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
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) handleFile(file)
        }}
      />
      <span
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full bg-surface-card text-accent-600 shadow-sm transition-transform',
          'group-hover:scale-110',
          isDragging && 'scale-110',
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
          <path
            d="M12 16V4m0 0L7 9m5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-sm font-semibold text-fg-strong">
        {isDragging ? 'Drop the file here' : 'Click to upload or drag & drop'}
      </span>
      <span className="text-xs text-fg-muted">{hint ?? `Up to ${maxSizeMb} MB`}</span>
    </label>
  )
}