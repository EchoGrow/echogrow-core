
import { NavLink } from 'react-router-dom'

interface DashboardNavigationProps {
  interviewId: string
}

export function DashboardNavigation({
  interviewId,
}: DashboardNavigationProps) {
  const tabs = [
    {
      label: 'Overview',
      path: `/dashboard/${interviewId}/overview`,
    },
    {
      label: 'Evaluation',
      path: `/dashboard/${interviewId}/evaluation`,
    },
  ]

  return (
    <nav
      aria-label="Dashboard navigation"
      className="border-b border-line bg-surface-card"
    >
      <div className="mx-auto flex max-w-5xl gap-6 px-6">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.path}
            className={({ isActive }) =>
              `border-b-2 py-4 text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-accent-600 text-accent-700'
                  : 'border-transparent text-fg-muted hover:text-fg-strong'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
