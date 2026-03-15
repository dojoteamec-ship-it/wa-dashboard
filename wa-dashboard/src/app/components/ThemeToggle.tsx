'use client'

import { useTheme } from './ThemeProvider'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const options: { key: 'dark' | 'light' | 'auto'; icon: React.ReactNode; label: string }[] = [
    { key: 'dark',  icon: <Moon size={13} />,    label: 'Oscuro' },
    { key: 'light', icon: <Sun size={13} />,     label: 'Claro' },
    { key: 'auto',  icon: <Monitor size={13} />, label: 'Auto' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-default)',
        borderRadius: '8px',
        padding: '3px',
        gap: '2px',
      }}
    >
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => setTheme(opt.key)}
          title={opt.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            background: theme === opt.key ? 'var(--bg-card-3)' : 'transparent',
            color: theme === opt.key ? 'var(--accent)' : 'var(--text-muted)',
            transition: 'all 120ms ease-out',
          }}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  )
}
