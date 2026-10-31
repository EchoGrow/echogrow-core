import { Toaster as SonnerToaster, toast } from 'sonner'
import { useTheme } from '../../lib/theme/ThemeContext'

export function Toaster() {
  const { theme } = useTheme()
  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className: 'rounded-xl border border-line bg-surface-card text-fg shadow-lift',
      }}
    />
  )
}

export { toast }