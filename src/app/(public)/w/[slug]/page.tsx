// src/app/(public)/w/[slug]/page.tsx
import { supabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { headers } from 'next/headers'
import type { WebsiteContent } from '@/types/website'
import PublicMobileHeader from './../../components/PublicMobileHeader'
import SubmissionCelebration from '../components/SubmissionCelebration'
import LegalStrip from '../components/LegalStrip'

export const revalidate = 60

type ParamsP = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: ParamsP) {
  const { slug } = await params
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('websites')
    .select('title, description, favicon_url, status')
    .eq('slug', slug)
    .single()

  if (!data || data.status !== 'published') return {}
  return {
    title: data.title || 'Website',
    description: data.description || '',
    icons: data.favicon_url ? [{ rel: 'icon', url: data.favicon_url }] : undefined,
  }
}

export default async function WebsitePublicPage({ params }: ParamsP) {
  const { slug } = await params
  const supabase = await supabaseServer()
  const { data, error } = await supabase
    .from('websites')
    .select('title, description, primary_color, secondary_color, logo_url, content, imprint_html, privacy_html, status')
    .eq('slug', slug)
    .single()

  if (error || !data) notFound()
  if (data.status === 'disabled') {
    return (
      <main className="min-h-screen grid place-items-center p-8">
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-2xl font-semibold">Diese Website ist derzeit deaktiviert.</h1>
          <p className="text-slate-600">Der Inhaber hat die Veröffentlichung vorübergehend ausgeschaltet.</p>
        </div>
      </main>
    )
  }
  if (data.status !== 'published') notFound()

  const c = (data.content || {}) as WebsiteContent
  const primary = data.primary_color || '#0a1b40'
  const secondary = data.secondary_color || '#f59e0b'

  // Absolute Base-URL für Menülinks
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const host  = h.get('x-forwarded-host') ?? h.get('host') ?? ''
  const origin = host ? `${proto}://${host}` : ''
  const base = origin ? `${origin}/w/${slug}` : `/w/${slug}`

  const menu = [
    { id: 'leistungen', label: 'Leistungen', enabled: c.enabled?.services ?? true },
    { id: 'warum',      label: 'Warum wir',  enabled: c.enabled?.benefits ?? true },
    { id: 'referenzen', label: 'Referenzen', enabled: c.enabled?.gallery ?? false },
    { id: 'faq',        label: 'FAQ',        enabled: c.enabled?.faq ?? true },
    { id: 'kontakt',    label: 'Kontakt',    enabled: true },
  ].filter(m => m.enabled).map(({ id, label }) => ({ id, label }))

  // @ts-ignore optionale Felder
  const benefitsIntro = (c as any)?.benefits?.intro || ''
  // @ts-ignore
  const contactIntro = (c as any)?.contact?.intro || ''
  const currentYear = new Date().getFullYear()
  const ownerName = data.title || c.hero?.h1 || 'Ihr Unternehmen'

  return (
    <>
      <main
        style={
          {
            ['--brand' as any]: primary,
            ['--accent' as any]: secondary,
            ['--glass' as any]: 'rgba(255,255,255,0.50)',
            ['--glassDeep' as any]: 'rgba(255,255,255,0.70)',
            ['--ink' as any]: '#0b1220',
          } as React.CSSProperties
        }
        className="
          min-h-screen
          bg-[radial-gradient(ellipse_at_top,_rgba(10,27,64,0.06),transparent_60%)]
          [--shadow:0_8px_24px_rgba(0,0,0,0.08)]
        "
      >
        {/* HEADER */}
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/55 border-b border-white/60">
          <div className="hidden md:grid grid-cols-[auto_1fr_auto] items-center gap-6 mx-auto max-w-6xl px-4 py-4">
            {/* Logo oder Titel */}
            <div className="min-w-0">
              {data.logo_url ? (
                <Image
                  src={data.logo_url}
                  alt="Logo"
                  width={256}
                  height={128}
                  className="h-8 md:h-9 lg:h-10 w-auto object-contain"
                  sizes="(min-width:1024px) 160px, (min-width:768px) 140px, 120px"
                  priority
                />
              ) : (
                <span className="font-semibold text-base md:text-lg truncate text-slate-900">
                  {data.title || 'Fliesenleger Meisterbetrieb'}
                </span>
              )}
            </div>

            {/* Menü zentriert */}
            <nav className="justify-self-center">
              <ul className="flex items-center gap-2 text-sm md:text-[15px]">
                {menu.map(item => (
                  <li key={item.id}>
                    <a
                      href={`${base}#${item.id}`}
                      className="
                        px-3 py-2 rounded-lg
                        bg-white/40 hover:bg-white/70
                        border border-white/60
                        backdrop-blur-md
                        transition
                        shadow-sm hover:shadow
                        text-slate-800
                      "
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* CTA rechts */}
            <div className="justify-self-end">
              <a
                href={`${base}#kontakt`}
                className="
                  inline-flex items-center gap-2
                  px-4 py-2 rounded-xl
                  border border-white/70
                  bg-white/65 hover:bg-white/85
                  backdrop-blur-lg
                  shadow-sm hover:shadow
                  transition
                  text-slate-900
                "
              >
                <span>Kontakt</span>
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: `${secondary}` }}
                />
              </a>
            </div>
          </div>

          {/* Mobile */}
          <PublicMobileHeader
            base={base}
            logoUrl={data.logo_url}
            title={data.title}
            menu={menu}
          />
        </header>

        {/* HERO */}
        <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          {(c.enabled?.hero ?? true) && (
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-5">
                <h1
                  className="text-3xl md:text-5xl font-semibold tracking-tight"
                  style={{ color: 'var(--brand)' }} /* Nur H1 in Primärfarbe */
                >
                  {c.hero?.h1 || 'Fliesen • Bäder • Sanierung'}
                </h1>
                <p className="text-lg text-slate-700">
                  {c.hero?.sub || 'Saubere Arbeit. Faire Preise. Termintreu.'}
                </p>
                <div className="flex gap-3">
                  <a
                    href={`${base}#kontakt`}
                    className="
                      inline-flex items-center gap-2
                      px-5 py-3 rounded-2xl
                      bg-white/65 hover:bg-white/85
                      border border-white/60
                      backdrop-blur-xl
                      shadow-sm hover:shadow
                      transition
                      text-slate-900
                    "
                  >
                    {c.hero?.cta_label || 'Angebot anfragen'}
                  </a>
                </div>
              </div>
              <div
                className="
                  rounded-2xl border border-white/60
                  bg-white/50 backdrop-blur-xl p-2
                  shadow-[var(--shadow)]
                "
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.10)' }}
              >
                {c.hero?.image ? (
                  <Image
                    src={c.hero.image}
                    alt="Hero"
                    width={1200}
                    height={800}
                    className="rounded-xl object-cover w-full h-[220px] md:h-[360px]"
                  />
                ) : (
                  <div
                    className="rounded-xl h-[220px] md:h-[360px] w-full"
                    style={{ backgroundImage: `linear-gradient(135deg, ${primary}22, ${secondary}22)` }}
                  />
                )}
              </div>
            </div>
          )}
        </section>

        {/* SERVICES */}
        {(c.enabled?.services ?? true) && (
          <section id="leistungen" className="mx-auto max-w-6xl px-4 py-10 md:py-12">
            <div className="flex items-end justify-between gap-4 mb-6">
              <h2
                className="text-xl md:text-2xl font-semibold"
                style={{ color: 'var(--brand)' }} /* Nur H2 in Primärfarbe */
              >
                {c.services?.title || 'Leistungen'}
              </h2>
            </div>

            {/* Bis 6 direkt zeigen */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(c.services?.items || []).slice(0, 6).map((it, i) => (
                <div
                  key={i}
                  className="
                    rounded-2xl p-5
                    bg-[var(--glass)]
                    border border-white/60
                    backdrop-blur-xl
                    shadow-sm hover:shadow
                    transition
                  "
                  style={{ outline: `1px solid ${primary}22` }}
                >
                  <div className="font-medium text-slate-900">{it.title}</div>
                  <div className="text-sm text-slate-700 mt-1">{it.text}</div>
                </div>
              ))}
            </div>

            {/* Mehr als 6? -> Toggle ohne Client-JS */}
            {((c.services?.items || []).length > 6) && (
              <details className="mt-4 group">
                <summary
                  className="
                    list-none cursor-pointer w-max
                    inline-flex items-center gap-2
                    px-4 py-2 rounded-xl
                    bg-white/60 hover:bg-white/80
                    border border-white/60
                    backdrop-blur-lg
                    shadow-sm hover:shadow
                    transition
                    text-slate-900
                  "
                >
                  Mehr anzeigen
                  <span
                    className="h-1.5 w-1.5 rounded-full transition group-open:rotate-90"
                    style={{ background: `${secondary}` }}
                  />
                </summary>
                <div className="mt-4 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(c.services?.items || []).slice(6).map((it, i) => (
                    <div
                      key={`more-${i}`}
                      className="
                        rounded-2xl p-5
                        bg-[var(--glassDeep)]
                        border border-white/60
                        backdrop-blur-xl
                        shadow-sm hover:shadow
                        transition
                      "
                      style={{ outline: `1px solid ${secondary}22` }}
                    >
                      <div className="font-medium text-slate-900">{it.title}</div>
                      <div className="text-sm text-slate-700 mt-1">{it.text}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>
        )}

        {/* BENEFITS */}
        {(c.enabled?.benefits ?? true) && (
          <section id="warum" className="mx-auto max-w-6xl px-4 py-10 md:py-12">
            <h2
              className="text-xl md:text-2xl font-semibold mb-3"
              style={{ color: 'var(--brand)' }} /* Nur H2 in Primärfarbe */
            >
              {c.benefits?.title || 'Warum wir'}
            </h2>

            {/* Intro-Text oberhalb */}
            {benefitsIntro ? (
              <p className="text-slate-700 mb-6">{benefitsIntro}</p>
            ) : null}

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(c.benefits?.items || []).slice(0, 6).map((it, i) => (
                <div
                  key={i}
                  className="
                    rounded-2xl p-5
                    bg-[var(--glass)]
                    border border-white/60
                    backdrop-blur-xl
                    shadow-sm hover:shadow
                    transition
                  "
                  style={{ outline: `1px solid ${primary}22` }}
                >
                  <div className="font-medium text-slate-900">{it.title}</div>
                  <div className="text-sm text-slate-700 mt-1">{it.text}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* GALLERY */}
        {c.enabled?.gallery && (
          <section id="referenzen" className="mx-auto max-w-6xl px-4 py-10 md:py-12">
            <h2
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: 'var(--brand)' }} /* Nur H2 in Primärfarbe */
            >
              {c.gallery?.title || 'Referenzen'}
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(c.gallery?.items || []).map((g, i) => (
                <div
                  key={i}
                  className="
                    rounded-2xl overflow-hidden
                    border border-white/60
                    bg-white/60
                    backdrop-blur-xl
                    shadow-sm
                  "
                >
                  {g.image ? (
                    <Image src={g.image} alt={g.caption || ''} width={800} height={600} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48" style={{ backgroundImage: `linear-gradient(135deg, ${primary}22, ${secondary}22)` }} />
                  )}
                  {g.caption && <div className="p-3 text-sm text-slate-700">{g.caption}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ – alles collapsed (inkl. der ersten) */}
        {(c.enabled?.faq ?? true) && (
          <section id="faq" className="mx-auto max-w-6xl px-4 py-10 md:py-12">
            <h2
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: 'var(--brand)' }} /* Nur H2 in Primärfarbe */
            >
              {c.faq?.title || 'Fragen & Antworten'}
            </h2>
            <div className="rounded-2xl border border-white/60 bg-white/60 backdrop-blur-xl overflow-hidden">
              {(c.faq?.items || []).map((f, i) => (
                <details
                  key={i}
                  className="group px-5 py-4 border-b last:border-0 border-white/60"
                >
                  {/* KEIN 'open' → alles collapsed */}
                  <summary className="cursor-pointer font-medium flex items-center justify-between text-slate-900">
                    <span>{f.q}</span>
                    <span
                      className="ml-3 h-1.5 w-1.5 rounded-full transition group-open:rotate-90"
                      style={{ background: `${secondary}` }}
                    />
                  </summary>
                  <div className="text-slate-700 mt-2">{f.a}</div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* CONTACT – Kacheln oben, darunter Formular mit DSGVO-Checkbox */}
        <section id="kontakt" className="mx-auto max-w-6xl px-4 py-14 md:py-16 scroll-mt-24">
          {(() => {
            const privacyHref = `${base}/datenschutzerklaerung`
            return (
              <div
                className="
                  relative overflow-hidden
                  rounded-3xl border border-white/60 
                  bg-white/70 backdrop-blur-2xl 
                  p-6 md:p-8
                  shadow-lg
                "
                style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.12)' }}
              >
                {/* Schimmer-Deko */}
                <div
                  className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-25"
                  style={{ background: `radial-gradient(closest-side, ${secondary}, transparent)` }}
                />
                <div
                  className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full blur-3xl opacity-20"
                  style={{ background: `radial-gradient(closest-side, ${primary}, transparent)` }}
                />

                <h2
                  className="text-xl md:text-2xl font-semibold mb-2 relative"
                  style={{ color: 'var(--brand)' }}
                >
                  {c.contact?.title || 'Kontakt'}
                </h2>
                {Boolean((c as any)?.contact?.intro) && (
                  <p className="text-slate-700 mb-6 relative">{(c as any).contact.intro}</p>
                )}

                {/* 1) Info-Kacheln (oben) */}
                <div
                  className="rounded-2xl p-4 mb-6 bg-white/60 border border-white/60 backdrop-blur-xl"
                  style={{ outline: `1px solid ${primary}22` }}
                >
                  <div className="grid sm:grid-cols-3 gap-4 text-slate-800">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">Telefon</div>
                      {c.contact?.phone || '-'}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">E-Mail</div>
                      {c.contact?.email || '-'}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">Adresse</div>
                      {c.contact?.address || '-'}
                    </div>
                  </div>
                </div>

                {/* 2) Formular unten – mit DSGVO-Checkbox (Pflicht) */}
                {(c as any)?.contact?.form !== false && (
                  <div
                    className="rounded-2xl p-4 bg-white/70 border border-white/60 backdrop-blur-xl"
                    style={{ outline: `1px solid ${secondary}22` }}
                  >
                    <form
                      action={`/api/website/contact/submit`}
                      method="post"
                      className="grid gap-3"
                    >
                      <input type="hidden" name="slug" value={slug} />

                      <input
                        className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 ..."
                        placeholder="Ihr Name"
                        name="name"
                        required
                      />
                      <input
                        className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 ..."
                        placeholder="Ihre E-Mail"
                        name="email"
                        type="email"
                        required
                      />
                      <input
                        className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 ..."
                        placeholder="Ihre Telefonnummer (optional)"
                        name="phone"
                        type="tel"
                      />
                      <textarea
                        className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 h-28 ..."
                        placeholder="Ihre Nachricht"
                        name="message"
                        required
                      />

                      {/* DSGVO Checkbox */}
                      <label className="flex items-start gap-2 text-sm text-slate-700 select-none">
                        <input
                          type="checkbox"
                          required
                          className="
                            mt-0.5 h-4 w-4 rounded
                            border border-slate-300 bg-white/80
                            accent-[var(--brand)]
                            focus:ring-2 focus:ring-slate-300/50
                          "
                        />
                        <span>
                          Ich habe die{' '}
                          <a
                            href={privacyHref}
                            className="underline decoration-[var(--accent)] underline-offset-2 hover:opacity-80"
                            style={{ color: 'var(--brand)' }}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Datenschutzerklärung
                          </a>{' '}
                          gelesen und stimme der Verarbeitung meiner Daten zu.
                        </span>
                      </label>

                      <div className="pt-1">
                        <button
                          type="submit"
                          className="
                            inline-flex justify-center px-4 py-2 rounded-xl
                            bg-white/80 hover:bg-white/90 
                            border border-slate-200 
                            backdrop-blur-xl
                            shadow-sm hover:shadow
                            ring-1 ring-[color:var(--brand)]/20 hover:ring-[color:var(--accent)]/35
                            transition
                            font-medium text-slate-900
                          "
                        >
                          Nachricht senden
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )
          })()}
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/60 bg-white/50 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm flex flex-wrap items-center gap-3">
            <a
              href={`${base}/impressum`}  // <— NEU
              className="px-3 py-2 rounded-lg bg-white/40 hover:bg-white/70 border border-white/60 backdrop-blur-sm transition text-slate-800"
            >
              Impressum
            </a>
            <a
              href={`${base}/datenschutzerklaerung`} // <— NEU
              className="px-3 py-2 rounded-lg bg-white/40 hover:bg-white/70 border border-white/60 backdrop-blur-sm transition text-slate-800"
            >
              Datenschutzerklärung
            </a>

            <span className="ml-auto text-slate-700">
              © {currentYear} <span style={{ color: 'var(--brand)' }}>{ownerName}</span> – Alle Rechte vorbehalten
            </span>
          </div>

          {/* ENTFERNT:
              <div id="impressum">...</div>
              <div id="datenschutz">...</div>
          */}
        </footer>
      </main>

      {/* Rechtsleiste (Slug-Komponente) */}
      <LegalStrip primary={primary} secondary={secondary} />

      {/* Celebration Overlay unterhalb von </main>, aber gemeinsam im Fragment */}
      <SubmissionCelebration primary={primary} secondary={secondary} />
    </>
  )
}
