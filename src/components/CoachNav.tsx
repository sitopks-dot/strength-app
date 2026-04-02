'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/coach/dashboard', label: 'ダッシュボード' },
  { href: '/coach/players', label: '選手管理' },
  { href: '/coach/exercises', label: '測定項目' },
  { href: '/coach/benchmarks', label: 'ベンチマーク' },
]

export default function CoachNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b flex text-sm overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-3 whitespace-nowrap transition ${
              isActive
                ? 'border-b-2 border-primary text-primary font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
