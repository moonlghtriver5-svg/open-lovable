"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeLogo() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return light theme logo by default to avoid hydration mismatch
    return (
      <div className="flex items-center h-8">
        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          A:E3 &lt;Proto&gt;
        </span>
      </div>
    )
  }

  const logoClasses = theme === "dark" 
    ? "text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent"
    : "text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent"

  return (
    <div className="flex items-center h-8">
      <span className={logoClasses}>
        A:E3 &lt;Proto&gt;
      </span>
    </div>
  )
}
