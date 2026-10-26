import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'

type Theme = 'light' | 'dark'

const themeStorageKey = 'balance.theme'
const themeBootstrapScript = `(() => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  let savedTheme = null

  try {
    savedTheme = localStorage.getItem(${JSON.stringify(themeStorageKey)})
  } catch {}

  const isDark = savedTheme === 'dark' || (savedTheme !== 'light' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
})()`

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  function toggleTheme() {
    const nextTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    setTheme(nextTheme)

    try {
      window.localStorage.setItem(themeStorageKey, nextTheme)
    } catch {}
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={
        theme === null
          ? "Cambiar tema"
          : theme === "dark"
            ? "Activar tema claro"
            : "Activar tema oscuro"
      }
      aria-pressed={theme === null ? undefined : theme === 'dark'}
      onClick={toggleTheme}
    >
      <Sun aria-hidden="true" className="dark:hidden" />
      <Moon aria-hidden="true" className="hidden dark:block" />
    </Button>
  )
}
