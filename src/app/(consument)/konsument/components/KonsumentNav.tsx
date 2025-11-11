'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import LogoutButton from './LogoutButton'

type NavItem = {
  label: string
  href: string
  primary?: boolean
}

const navItems: NavItem[] = [
  { label: 'Übersicht', href: '/konsument' },
  {
    label: 'Anfrage erstellen',
    href: '/konsument/anfragen/anfrage-erstellen',
    primary: true,
  },
  { label: 'Meine Anfragen', href: '/konsument/anfragen' },
  { label: 'Aktive Aufträge', href: '/konsument/aktive-anfragen' },
  { label: 'Chat', href: '/konsument/chat' },
  { label: 'Profil', href: '/konsument/profil' },
]

function isActive(pathname: string, href: string) {
  if (href === '/konsument') return pathname === '/konsument'
  return pathname.startsWith(href)
}

export default function KonsumentNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const basePill =
    'whitespace-nowrap rounded-2xl px-3 py-1.5 text-xs sm:text-sm transition shadow-sm'

  return (
    <>
      {/* Desktop NAV */}
      <nav className="hidden items-center gap-1.5 md:flex">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href)

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${basePill} ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-900 text-white/95 hover:text-white hover:-translate-y-[1px] hover:shadow-md'
                }`}
              >
                {item.label}
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${basePill} ${
                active
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'bg-white/90 text-slate-700 border border-white/70 hover:border-slate-200 hover:-translate-y-[1px] hover:shadow-md'
              }`}
            >
              {item.label}
            </Link>
          )
        })}

        {/* Logout Desktop: neutral, kein Rot */}
        <div
          className="
            ml-1 inline-flex items-center
            rounded-2xl border border-slate-200
            bg-white/90 px-3 py-1.5
            text-[10px] text-slate-600
            shadow-sm transition
            hover:-translate-y-[1px]
            hover:border-slate-300
            hover:bg-white
            hover:shadow-md
          "
        >
          <LogoutButton />
        </div>
      </nav>

      {/* Mobile Burger */}
      <div className="flex items-center md:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="
            inline-flex items-center justify-center
            rounded-full border border-white/70
            bg-white/95 p-1.5
            shadow-sm
            hover:shadow-md
            transition
          "
          aria-label="Navigation öffnen"
        >
          {open ? (
            <XMarkIcon className="h-5 w-5 text-slate-800" />
          ) : (
            <Bars3Icon className="h-5 w-5 text-slate-800" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div
          className="
            absolute inset-x-0 top-[52px] z-30
            mx-4
            rounded-3xl border border-white/80
            bg-white/98
            px-3 py-3
            shadow-[0_18px_55px_rgba(15,23,42,0.12)]
            backdrop-blur-2xl
            md:hidden
          "
        >
          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href)

              if (item.primary) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`
                      flex items-center justify-center
                      rounded-2xl px-3 py-2 text-sm font-medium
                      ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-900 text-white/95'
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`
                    flex items-center justify-between
                    rounded-2xl px-3 py-2 text-sm
                    ${
                      active
                        ? 'bg-slate-50 border border-slate-200 text-slate-900'
                        : 'bg-white border border-white/0 text-slate-700 hover:bg-slate-50 hover:border-slate-100'
                    }
                  `}
                >
                  {item.label}
                </Link>
              )
            })}

            <div
              className="
                mt-1 flex items-center justify-center
                rounded-2xl border border-slate-200
                bg-white/95 px-3 py-2
                text-sm text-slate-700
                shadow-sm
              "
            >
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
