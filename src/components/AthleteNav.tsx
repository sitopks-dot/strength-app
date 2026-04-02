'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/athlete/input', label: '測定入力' },
  { href: '/athlete/mypage', label: 'マイページ' },
]

export default function AthleteNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-2 mb-6">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 py-2 rounded-lg text-sm text-center transition ${
              isActive
                ? 'bg-white border-2 border-primary text-primary font-bold'
                : 'bg-white border border-gray-300 text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
