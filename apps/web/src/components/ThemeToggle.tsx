import { useTheme } from '../lib/theme/ThemeContext'
import { cn } from '../lib/cn'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative inline-flex h-9 w-16 items-center rounded-full border border-line bg-chip',
        'transition-colors duration-300 hover:border-accent-500',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
    >
      <span
        className={cn(
          'absolute inset-y-1 left-1 flex h-7 w-7 items-center justify-center rounded-full bg-surface-card shadow-sm',
          'transition-transform duration-300 ease-out',
          isDark && 'translate-x-7',
        )}
      >
        {isDark ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-accent-400">
            <path d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8.001 8.001 0 1 0 10.586 10.586Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-amber-500">
            <path d="M10 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm4 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-.464 4.95.707.707a1 1 0 0 0 1.414-1.414l-.707-.707a1 1 0 0 0-1.414 1.414Zm2.12-10.607a1 1 0 0 1 0 1.414l-.706.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM17 11a1 1 0 1 1 0-2h1a1 1 0 1 1 0 2h-1Zm-7 4a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1ZM5.05 6.464A1 1 0 1 1 6.464 5.05l-.707.707A1 1 0 0 1 4.343 4.343l.707-.707Zm-1.414 8.486a1 1 0 0 1 1.414-1.414l.707.707a1 1 0 0 1-1.414 1.414l-.707-.707ZM4 11a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm1.05-6.536.707.707A1 1 0 0 1 4.343 6.586l-.707-.707a1 1 0 0 1 1.414-1.415Z" />
          </svg>
        )}
      </span>
    </button>
  )
}