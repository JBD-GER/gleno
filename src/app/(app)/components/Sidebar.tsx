'use client'

import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import {
  // Management / Core
  HomeIcon,
  UsersIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
  ArrowRightOnRectangleIcon,
  Squares2X2Icon,
  BuildingStorefrontIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  BanknotesIcon,
  FolderOpenIcon,
  DocumentPlusIcon,
  ClipboardDocumentCheckIcon,
  DocumentCurrencyEuroIcon,
  AdjustmentsVerticalIcon,
  CreditCardIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  BookOpenIcon,
  GlobeAltIcon,
  // Markt
  MapIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'

type Badge = { text: string; tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' }

type NavItem = {
  href: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  children?: NavItem[]
  badge?: Badge
}

type SidebarProps = { userEmail: string }

type MyPartner = {
  id: string
  status: string
  display_name: string | null
  company_name: string | null
  branch_id: string | null
  city: string | null
}

function cls(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(' ')
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const router = useRouter()
  const supabase = supabaseClient()
  const pathname = usePathname()

  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [role, setRole] = useState<string>('mitarbeiter')
  const [space, setSpace] = useState<'management' | 'markt'>(() =>
    pathname?.startsWith('/dashboard/markt') ? 'markt' : 'management'
  )

  const [partnersLoading, setPartnersLoading] = useState(true)
  const [myPartners, setMyPartners] = useState<MyPartner[]>([])

  // Feedback-Modal State
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  /* Rolle laden */
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: userResult } = await supabase.auth.getUser()
      const user = userResult?.user
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (mounted && profile?.role) setRole(profile.role)
    })()
    return () => {
      mounted = false
    }
  }, [supabase])

  /* Partner aus /api/partners/mine laden */
  useEffect(() => {
    let canceled = false
    ;(async () => {
      setPartnersLoading(true)
      try {
        const res = await fetch('/api/partners/mine', { cache: 'no-store' })
        const j = await res.json()
        if (!res.ok) throw new Error(j?.error || 'load_failed')
        if (!canceled) setMyPartners((j?.partners || []) as MyPartner[])
      } catch {
        if (!canceled) setMyPartners([])
      } finally {
        if (!canceled) setPartnersLoading(false)
      }
    })()
    return () => {
      canceled = true
    }
  }, [])

  const hasPartner = myPartners.length > 0
  const publicPartnerHref = hasPartner ? `/markt/partner/${myPartners[0].id}` : ''

  // helpers
  const normalize = (p: string) => {
    if (!p) return '/'
    const n = p.replace(/\/+$/, '')
    return n.length ? n : '/'
  }
  const pathNow = normalize(pathname || '/')
  const isExact = (href: string) => pathNow === normalize(href)
  const isDescendant = (href: string) => {
    const base = normalize(href)
    if (base === '/') return pathNow !== '/'
    return pathNow.startsWith(base + '/')
  }

  // Space nach URL + Rolle (Mitarbeiter dürfen keinen Markt-Switch haben)
  useEffect(() => {
    if (role === 'mitarbeiter') {
      setSpace('management')
      return
    }
    if (pathname?.startsWith('/dashboard/markt')) setSpace('markt')
    else setSpace('management')
  }, [pathname, role])

  /* ========= NAVIGATION: MANAGEMENT ========= */

  const NAV_MANAGEMENT_ADMIN: NavItem[] = [
    { href: '/dashboard', label: 'Übersicht', icon: HomeIcon },
    { href: '/dashboard/kunde', label: 'Kunden', icon: UsersIcon },

    {
      href: '/dashboard/verwaltung',
      label: 'Verwaltung',
      icon: UserCircleIcon,
      children: [
        { href: '/dashboard/mitarbeiter', label: 'Mitarbeiter', icon: UserCircleIcon },
        { href: '/dashboard/logistik/materialien', label: 'Materialien', icon: Squares2X2Icon },
        { href: '/dashboard/logistik/lieferanten', label: 'Lieferanten', icon: BuildingStorefrontIcon },
        { href: '/dashboard/logistik/fuhrpark', label: 'Fuhrpark', icon: TruckIcon },
        { href: '/dashboard/logistik/werkzeug', label: 'Werkzeug', icon: WrenchScrewdriverIcon },
      ],
    },

    { href: '/dashboard/kalender', label: 'Kalender', icon: CalendarDaysIcon },

    {
      href: '/dashboard/projekt',
      label: 'Projekte',
      icon: FolderOpenIcon,
      children: [
        { href: '/dashboard/projekt', label: 'Übersicht', icon: FolderOpenIcon },
        {
          href: '/dashboard/projekt/projektplaner',
          label: 'Projektplaner',
          icon: ClipboardDocumentListIcon,
        },
      ],
    },

    {
      href: '/dashboard/buchhaltung',
      label: 'Buchhaltung',
      icon: BanknotesIcon,
      children: [
        { href: '/dashboard/buchhaltung', label: 'Übersicht', icon: BanknotesIcon },
        { href: '/dashboard/buchhaltung/angebot', label: 'Angebot', icon: DocumentPlusIcon },
        { href: '/dashboard/buchhaltung/auftrag', label: 'Auftrag', icon: ClipboardDocumentCheckIcon },
        { href: '/dashboard/buchhaltung/rechnung', label: 'Rechnung', icon: DocumentCurrencyEuroIcon },
        { href: '/dashboard/buchhaltung/katalog', label: 'Katalog', icon: BookOpenIcon },
      ],
    },

    {
      href: '/dashboard/tools',
      label: 'Tools',
      icon: WrenchScrewdriverIcon,
      children: [
        {
          href: '/dashboard/website',
          label: 'Website',
          icon: GlobeAltIcon,
          badge: { text: 'Beta', tone: 'indigo' },
        },
        {
          href: '/dashboard/cloud',
          label: 'Dokumenten-Cloud',
          icon: ClipboardDocumentListIcon,
        },
      ],
    },

    {
      href: '/dashboard/einstellung',
      label: 'Einstellungen',
      icon: Cog6ToothIcon,
      children: [
        { href: '/dashboard/einstellung/', label: 'Allgemein', icon: AdjustmentsVerticalIcon },
        { href: '/dashboard/einstellung/abonnement', label: 'Abonnement', icon: CreditCardIcon },
        { href: '/dashboard/einstellung/konto', label: 'Konto', icon: UserCircleIcon },
      ],
    },
  ]

  const NAV_MANAGEMENT_EMPLOYEE: NavItem[] = [
    { href: '/dashboard/kalender', label: 'Mein Kalender', icon: CalendarDaysIcon },
    { href: '/dashboard/projekt?assigned=me', label: 'Meine Projekte', icon: FolderOpenIcon },
    { href: '/dashboard/personal/zeit', label: 'Zeiterfassung', icon: ClockIcon },
  ]

  const NAV_MANAGEMENT = role === 'mitarbeiter' ? NAV_MANAGEMENT_EMPLOYEE : NAV_MANAGEMENT_ADMIN

  /* ========= NAVIGATION: MARKT ========= */

  const NAV_MARKT: NavItem[] = [
    {
      href: '/dashboard/markt',
      label: 'Markt Übersicht',
      icon: BuildingStorefrontIcon,
    },
    {
      href: '/dashboard/markt/anfragen',
      label: 'Anfragen & Aufträge',
      icon: MapIcon,
      children: [
        { href: '/dashboard/markt/anfragen', label: 'Alle Anfragen', icon: MapIcon },
        { href: '/dashboard/markt/aktive-anfragen', label: 'Aktive Aufträge', icon: BoltIcon },
        { href: '/dashboard/markt/bewerbungen', label: 'Meine Bewerbungen', icon: ClipboardDocumentListIcon },
      ],
    },
    {
      href: '/dashboard/markt/chat',
      label: 'Nachrichten & Chat',
      icon: ChatBubbleLeftRightIcon,
    },
    {
      href: '/dashboard/markt/partnerprofil',
      label: 'Partnerprofil & Setup',
      icon: ShieldCheckIcon,
      children: [
        ...(hasPartner && publicPartnerHref
          ? [
              {
                href: publicPartnerHref,
                label: 'Mein Partnerprofil',
                icon: ShieldCheckIcon,
              } as NavItem,
            ]
          : []),
        ...(!partnersLoading && !hasPartner
          ? [
              {
                href: '/dashboard/markt/partner-werden',
                label: 'Partner werden',
                icon: UserPlusIcon,
                badge: { text: 'Neu', tone: 'emerald' },
              } as NavItem,
            ]
          : []),
        {
          href: '/dashboard/markt/partner-bearbeiten',
          label: 'Profil bearbeiten',
          icon: PencilSquareIcon,
        },
      ],
    },
  ]

  const NAV = space === 'markt' ? NAV_MARKT : NAV_MANAGEMENT

  /* Gruppe automatisch öffnen, wenn passend */
  useEffect(() => {
    const group = NAV.find(
      (i) =>
        i.children &&
        (isExact(i.href) ||
          isDescendant(i.href) ||
          i.children!.some((c) => isExact(c.href) || isDescendant(c.href)))
    )
    setOpenGroup(group ? group.href : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, role, space, hasPartner, partnersLoading, publicPartnerHref])

  const BadgePill = ({ text, tone = 'slate' }: Badge) => {
    const tones: Record<Required<Badge>['tone'], string> = {
      indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
      emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      amber: 'bg-amber-50 text-amber-800 ring-amber-200',
      rose: 'bg-rose-50 text-rose-700 ring-rose-200',
      slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    }
    return (
      <span
        className={cls(
          'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
          tones[tone]
        )}
      >
        {text}
      </span>
    )
  }

  const switchTo = (target: 'management' | 'markt') => {
    if (target === space) return

    if (role === 'mitarbeiter' && target === 'markt') return

    setSpace(target)
    if (target === 'markt') {
      if (!pathname?.startsWith('/dashboard/markt')) router.push('/dashboard/markt')
    } else {
      if (pathname?.startsWith('/dashboard/markt')) router.push('/dashboard')
    }
  }

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackText.trim()) return

    setFeedbackSending(true)
    setFeedbackError(null)
    setFeedbackSuccess(null)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: feedbackText,
          fromEmail: userEmail || undefined,
        }),
      })

      if (!res.ok) {
        throw new Error('failed')
      }

      setFeedbackSuccess('Danke für dein Feedback – es hat unser Team erreicht.')
      setFeedbackText('')
    } catch {
      setFeedbackError('Leider ist ein Fehler aufgetreten. Bitte versuche es später erneut.')
    } finally {
      setFeedbackSending(false)
    }
  }

  const secondaryButtonClasses =
    'inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-900 shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition hover:bg-white hover:border-slate-300'

  return (
    <>
      <div
        className="flex h-full flex-col bg-gradient-to-b from-slate-50/90 via-white/90 to-slate-50/80"
        style={{
          backgroundImage:
            'radial-gradient(900px 600px at -20% -10%, rgba(15,23,42,0.06), transparent), radial-gradient(800px 500px at 120% -40%, rgba(88,101,242,0.07), transparent)',
        }}
      >
        {/* Brand + Tabs */}
        <div className="mb-3 px-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="relative rounded-2xl bg-white/70 px-2 py-1 shadow-sm ring-1 ring-white/60 backdrop-blur-xl">
                <Image
                  src="/favi.png"
                  alt="GLENO"
                  width={26}
                  height={26}
                  className="h-6 w-6 object-contain"
                  priority
                />
              </div>
            </div>

            {/* Tabs nur anzeigen, wenn NICHT Mitarbeiter */}
            {role !== 'mitarbeiter' && (
              <div className="inline-flex rounded-2xl bg-white/10 p-1 backdrop-blur-xl ring-1 ring-white/40 shadow-[0_10px_30px_rgba(15,23,42,0.14)]">
                <button
                  type="button"
                  onClick={() => switchTo('management')}
                  className={cls(
                    'px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-2xl transition-all',
                    space === 'management'
                      ? 'bg-white/90 text-slate-900 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Management
                </button>
                <button
                  type="button"
                  onClick={() => switchTo('markt')}
                  className={cls(
                    'px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-2xl transition-all',
                    space === 'markt'
                      ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/70'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  Markt
                </button>
              </div>
            )}
          </div>

          <p className="mt-1 max-w-[220px] truncate text-[10px] text-slate-500">
            {userEmail}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const hasChildren = !!item.children?.length

              if (!hasChildren) {
                const activeExact = isExact(item.href)
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cls(
                        'group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-all border border-transparent',
                        activeExact
                          ? 'bg-white/90 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.10)] ring-1 ring-slate-200'
                          : 'bg-white/0 text-slate-700 hover:bg-white/70 hover:shadow-[0_8px_26px_rgba(15,23,42,0.06)] hover:border-white/60'
                      )}
                    >
                      <Icon
                        className={cls(
                          'h-5 w-5 flex-shrink-0 transition-colors',
                          activeExact ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-700'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.badge && <BadgePill {...item.badge} />}
                    </Link>
                  </li>
                )
              }

              const groupIsOpen = openGroup === item.href
              const groupActive =
                isExact(item.href) ||
                isDescendant(item.href) ||
                item.children!.some((c) => isExact(c.href) || isDescendant(c.href))
              const GroupIcon = item.icon

              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={() => setOpenGroup(groupIsOpen ? null : item.href)}
                    className={cls(
                      'w-full flex items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition-all border border-transparent',
                      groupActive
                        ? 'bg-white/90 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.10)] ring-1 ring-slate-200'
                        : 'bg-white/0 text-slate-700 hover:bg-white/70 hover:shadow-[0_8px_26px_rgba(15,23,42,0.06)] hover:border-white/60'
                    )}
                  >
                    <span className="inline-flex items-center gap-3">
                      <GroupIcon
                        className={cls(
                          'h-5 w-5 flex-shrink-0 transition-colors',
                          groupActive ? 'text-slate-900' : 'text-slate-400'
                        )}
                      />
                      <span>{item.label}</span>
                      {item.badge && <BadgePill {...item.badge} />}
                    </span>
                    <svg
                      className={cls(
                        'h-4 w-4 flex-shrink-0 transition-transform',
                        groupIsOpen ? 'rotate-90 text-slate-900' : 'text-slate-400'
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <div
                    className={cls(
                      'overflow-hidden pl-3',
                      groupIsOpen ? 'max-h-[900px] py-1' : 'max-h-0',
                      'transition-[max-height,padding] duration-300 ease-in-out'
                    )}
                  >
                    {item.children!.map((child) => {
                      const childExact = isExact(child.href)
                      const ChildIcon = child.icon
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cls(
                            'group mt-1 mr-2 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm border border-transparent',
                            childExact
                              ? 'bg-white/95 text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.10)] ring-1 ring-slate-200'
                              : 'text-slate-700 hover:bg-white/80 hover:shadow-[0_6px_20px_rgba(15,23,42,0.06)] hover:border-white/70'
                          )}
                        >
                          <ChildIcon
                            className={cls(
                              'h-4 w-4 flex-shrink-0',
                              childExact ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-700'
                            )}
                          />
                          <span className="truncate">{child.label}</span>
                          {child.badge && <BadgePill {...child.badge} />}
                        </Link>
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer / Anleitung + Feedback + Logout */}
        <div
          className="space-y-2 border-t border-white/70 bg-white/60 p-3 shadow-[0_-6px_18px_rgba(15,23,42,0.06)] backdrop-blur-xl"
          style={{
            // etwas mehr Luft + Safe-Area für iOS
            paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {role !== 'mitarbeiter' && (
            <button
              type="button"
              onClick={() => router.push('/dashboard/anleitung')}
              className={secondaryButtonClasses}
            >
              <BookOpenIcon className="h-5 w-5" />
              <span>Anleitung & erste Schritte</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowFeedback(true)
              setFeedbackError(null)
              setFeedbackSuccess(null)
            }}
            className={secondaryButtonClasses}
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
            <span>Feedback geben</span>
          </button>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)] transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-white"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Abmelden</span>
          </button>
        </div>
      </div>

      {/* Feedback-Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-slate-900">Feedback zu GLENO</h2>
                <p className="text-xs text-slate-500">
                  Teile uns kurz mit, was dir gefällt, was fehlt oder was wir verbessern können.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedback(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="sr-only">Schließen</span>
                ✕
              </button>
            </div>

            <form onSubmit={handleSendFeedback} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Deine Nachricht
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-900 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="Schreibe uns kurz, was dir auffällt oder was wir verbessern können …"
                />
              </div>

              {feedbackError && <p className="text-xs text-rose-600">{feedbackError}</p>}
              {feedbackSuccess && (
                <p className="text-xs text-emerald-600">{feedbackSuccess}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowFeedback(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={feedbackSending || !feedbackText.trim()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-[0_8px_24px_rgba(15,23,42,0.35)] disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  {feedbackSending ? 'Wird gesendet…' : 'Feedback senden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
