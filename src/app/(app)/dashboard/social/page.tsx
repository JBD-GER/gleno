// src/app/(app)/dashboard/social/page.tsx
'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import {
  CalendarDaysIcon,
  ListBulletIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

type ViewMode = 'calendar' | 'list' | 'autolists' | 'deleted'
type Provider = 'facebook' | 'instagram' | 'linkedin'
type Status = 'planned' | 'posted' | 'disconnected' | 'failed'

type SocialPostTarget = {
  id: string
  provider: Provider
  status: Status
  scheduled_at: string | null
  published_at: string | null
}

type SocialPost = {
  id: string
  caption: string | null
  hashtags: string[] | null
  media_path?: string | null
  created_at: string
  deleted_at: string | null
  social_post_targets: SocialPostTarget[]
}

type SocialAccount = {
  id: string
  provider: Provider
  account_type: string
  display_name: string
}

const HOURS = Array.from({ length: 19 }, (_, i) => 5 + i) // 5–23
const DAYS = [
  { key: 'sun', label: 'Sonntag' },
  { key: 'mon', label: 'Montag' },
  { key: 'tue', label: 'Dienstag' },
  { key: 'wed', label: 'Mittwoch' },
  { key: 'thu', label: 'Donnerstag' },
  { key: 'fri', label: 'Freitag' },
  { key: 'sat', label: 'Samstag' },
]

function generateHeatmap() {
  const data: Record<string, number> = {}
  for (const day of DAYS) {
    for (const hour of HOURS) {
      const key = `${day.key}-${hour}`
      const base =
        hour >= 10 && hour <= 13
          ? 60 + Math.floor(Math.random() * 40)
          : 5 + Math.floor(Math.random() * 35)
      data[key] = base
    }
  }
  return data
}

/** einfache Erkennung ob es sich um ein Video handelt (Dateiendung) */
function isVideoPath(path?: string | null) {
  if (!path) return false
  return /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(path)
}

/** Erstes Schedule-Datum eines Posts (über alle Targets) */
function getFirstSchedule(post: SocialPost): Date | null {
  if (!post.social_post_targets?.length) return null
  const dates = post.social_post_targets
    .map((t) => (t.scheduled_at ? new Date(t.scheduled_at) : null))
    .filter((d): d is Date => !!d)

  if (!dates.length) return null
  dates.sort((a, b) => a.getTime() - b.getTime())
  return dates[0]
}

/* ----------------- Haupt-Komponente ----------------- */

export default function SocialPlannerPage() {
  const [view, setView] = useState<ViewMode>('calendar')
  const [weekOffset, setWeekOffset] = useState(0)
  const [search, setSearch] = useState('')

  const [posts, setPosts] = useState<SocialPost[]>([])
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)

  // Editor
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null)

  const [caption, setCaption] = useState('')
  const [hashtagsInput, setHashtagsInput] = useState('')
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)

  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [existingMediaPath, setExistingMediaPath] = useState<string | null>(
    null,
  )
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null)
  const [mediaIsVideo, setMediaIsVideo] = useState(false)

  // Map: media_path -> signed URL
  const [mediaUrlMap, setMediaUrlMap] = useState<Record<string, string>>({})

  const [uploadingMedia, setUploadingMedia] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [selectedNetworks, setSelectedNetworks] = useState<Provider[]>([])
  const [previewNetwork, setPreviewNetwork] =
    useState<Provider | null>(null)

  const captionLimit = 2200
  const captionLength = caption.length

  const hashtagList = useMemo(
    () =>
      hashtagsInput
        .split(/[\s,\n]+/)
        .map((h) => h.trim().replace(/^#/, ''))
        .filter(Boolean),
    [hashtagsInput],
  )
  const hashtagLimit = 30

  const availableProviders: Provider[] = useMemo(() => {
    const set = new Set<Provider>()
    accounts.forEach((a) => {
      if (
        a.provider === 'facebook' ||
        a.provider === 'instagram' ||
        a.provider === 'linkedin'
      ) {
        set.add(a.provider)
      }
    })
    return Array.from(set)
  }, [accounts])

  const hasAnyConnection = availableProviders.length > 0

  /* ----------------- Signed URLs für Media auflösen ----------------- */

  async function resolveMediaUrls(posts: SocialPost[]): Promise<void> {
    const supa = supabaseClient()

    const uniquePaths = new Set<string>()
    posts.forEach((p) => {
      if (p.media_path) uniquePaths.add(p.media_path)
    })

    if (uniquePaths.size === 0) {
      setMediaUrlMap({})
      return
    }

    const entries: [string, string][] = []

    await Promise.all(
      Array.from(uniquePaths).map(async (path) => {
        try {
          const { data, error } = await supa.storage
            .from('socialmedia')
            .createSignedUrl(path, 60 * 60) // 1h gültig

          if (!error && data?.signedUrl) {
            entries.push([path, data.signedUrl])
          } else {
            console.warn('[socialmedia] signedUrl error', path, error)
          }
        } catch (e) {
          console.error('[socialmedia] signedUrl exception', path, e)
        }
      }),
    )

    setMediaUrlMap(Object.fromEntries(entries))
  }

  /* ----------------- Daten laden ----------------- */

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [accRes, postsRes] = await Promise.all([
          fetch('/api/social/accounts'),
          fetch('/api/social/posts'),
        ])

        const accJson = await accRes.json()
        const postsJson = await postsRes.json()

        if (accJson.accounts) setAccounts(accJson.accounts)
        if (postsJson.posts) {
          setPosts(postsJson.posts)
          await resolveMediaUrls(postsJson.posts)
        }

        if (accJson.accounts) {
          const providers: Provider[] = Array.from(
            new Set(
              accJson.accounts
                .map((a: any) => a.provider)
                .filter((p: string) =>
                  ['facebook', 'instagram', 'linkedin'].includes(p),
                ),
            ),
          )
          setSelectedNetworks(providers)
          setPreviewNetwork(providers[0] ?? null)
        }
      } catch (e) {
        console.error('Social planner load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /* ----------------- abgeleitete Werte ----------------- */

  const { weekLabel, weekStart } = useMemo(() => {
    const base = new Date()
    const start = new Date(base)
    start.setDate(start.getDate() + weekOffset * 7)

    // Montag als Wochenstart
    const day = start.getDay() === 0 ? 7 : start.getDay() // Mo=1…So=7
    start.setDate(start.getDate() - (day - 1))
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(end.getDate() + 6)

    const fmt = (d: Date) =>
      d.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })

    return {
      weekLabel: `${fmt(start)} – ${fmt(end)}`,
      weekStart: start,
    }
  }, [weekOffset])

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (!search) return true
      const text = `${p.caption ?? ''} ${(p.hashtags ?? []).join(' ')}`
      return text.toLowerCase().includes(search.toLowerCase())
    })
  }, [posts, search])

  /* ----------------- Handlers ----------------- */

  const toggleNetwork = (n: Provider) => {
    if (!availableProviders.includes(n)) return
    setSelectedNetworks((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    )
    if (!previewNetwork && availableProviders.includes(n)) {
      setPreviewNetwork(n)
    }
  }

  const openEditorForNew = () => {
    setEditingPost(null)
    setCaption('')
    setHashtagsInput('')
    setScheduledAt(null)
    setMediaFile(null)
    setExistingMediaPath(null)
    setMediaPreviewUrl(null)
    setMediaIsVideo(false)
    setIsEditorOpen(true)
  }

  const openEditorForEdit = (post: SocialPost) => {
    setEditingPost(post)
    setCaption(post.caption ?? '')
    setHashtagsInput((post.hashtags ?? []).map((h) => `#${h}`).join(' '))

    const sched = getFirstSchedule(post)
    if (sched) {
      const pad = (n: number) => n.toString().padStart(2, '0')
      const v = `${sched.getFullYear()}-${pad(
        sched.getMonth() + 1,
      )}-${pad(sched.getDate())}T${pad(
        sched.getHours(),
      )}:${pad(sched.getMinutes())}`
      setScheduledAt(v)
    } else {
      setScheduledAt(null)
    }

    setMediaFile(null)
    const path = post.media_path ?? null
    setExistingMediaPath(path)

    if (path) {
      const url = mediaUrlMap[path] ?? null
      setMediaPreviewUrl(url)
      setMediaIsVideo(isVideoPath(path))
    } else {
      setMediaPreviewUrl(null)
      setMediaIsVideo(false)
    }

    setIsEditorOpen(true)
  }

  const closeEditor = () => {
    setIsEditorOpen(false)
    setEditingPost(null)
    setCaption('')
    setHashtagsInput('')
    setScheduledAt(null)
    setMediaFile(null)
    setExistingMediaPath(null)
    setMediaPreviewUrl(null)
    setMediaIsVideo(false)
  }

  const handleMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
    setMediaPreviewUrl(URL.createObjectURL(file))
    setMediaIsVideo(file.type.startsWith('video/'))
  }

  async function uploadMediaIfNeeded(): Promise<string | null> {
    if (!mediaFile) return existingMediaPath // nichts geändert

    try {
      setUploadingMedia(true)

      const supa = supabaseClient()

      const {
        data: { user },
        error: userError,
      } = await supa.auth.getUser()

      if (userError || !user) {
        console.error('No user in uploadMediaIfNeeded', userError)
        alert('Kein eingeloggter Benutzer gefunden.')
        return null
      }

      const ext =
        mediaFile.name.split('.').pop()?.toLowerCase() ?? 'bin'

      const path = `${user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`

      const res = await supa.storage
        .from('socialmedia')
        .upload(path, mediaFile, {
          cacheControl: '3600',
          upsert: true,
        })

      console.log('Upload response', res)

      const { data, error } = res

      if (error || !data) {
        console.error('Upload error message:', error?.message)
        console.error('Upload error full:', error)
        alert(
          `Fehler beim Upload des Mediums${
            error?.message ? `: ${error.message}` : ''
          }`,
        )
        return null
      }

      return data.path
    } catch (e) {
      console.error('Upload exception', e)
      alert('Fehler beim Upload des Mediums (Exception)')
      return null
    } finally {
      setUploadingMedia(false)
    }
  }

  const savePost = async () => {
    if (!hasAnyConnection) return

    const activeProviders = selectedNetworks.filter((p) =>
      availableProviders.includes(p),
    )
    if (activeProviders.length === 0) {
      alert('Bitte mindestens einen verbundenen Kanal auswählen.')
      return
    }

    const isEdit = !!editingPost

    let mediaPath: string | null = existingMediaPath
    if (mediaFile) {
      mediaPath = await uploadMediaIfNeeded()
      if (!mediaPath) return // Upload fehlgeschlagen → abbrechen
    }

    try {
      const payload = {
        caption,
        hashtags: hashtagList,
        scheduledAt,
        providers: activeProviders,
        mediaPath,
      }

      const url = isEdit
        ? `/api/social/posts/${editingPost!.id}`
        : '/api/social/posts'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        console.error(json)
        alert(json.error ?? 'Fehler beim Speichern')
        return
      }

      const postsRes = await fetch('/api/social/posts')
      const postsJson = await postsRes.json()
      if (postsJson.posts) {
        setPosts(postsJson.posts)
        await resolveMediaUrls(postsJson.posts)
      }

      closeEditor()
    } catch (e) {
      console.error(e)
      alert('Unbekannter Fehler beim Speichern')
    }
  }

  const handleDeletePost = async (post: SocialPost) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Diesen Beitrag wirklich löschen?')
    ) {
      return
    }

    try {
      const res = await fetch(`/api/social/posts/${post.id}`, {
        method: 'DELETE',
      })

      let errorMsg: string | null = null
      if (!res.ok) {
        try {
          const json = await res.json()
          errorMsg = json.error ?? null
        } catch {
          /* ignore */
        }
      }

      if (!res.ok) {
        alert(errorMsg ?? 'Fehler beim Löschen')
        return
      }

      const postsRes = await fetch('/api/social/posts')
      const postsJson = await postsRes.json()
      if (postsJson.posts) {
        setPosts(postsJson.posts)
        await resolveMediaUrls(postsJson.posts)
      }

      if (editingPost?.id === post.id) {
        closeEditor()
      }
    } catch (e) {
      console.error(e)
      alert('Unbekannter Fehler beim Löschen')
    }
  }

  const captionOver = captionLength > captionLimit
  const hashtagsOver = hashtagList.length > hashtagLimit

  /* ----------------- Render ----------------- */

  return (
    <div className="relative w-full overflow-hidden pb-6">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_55%)] opacity-80" />
        <div className="absolute right-[-80px] bottom-[-40px] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,_rgba(45,212,191,0.35),_transparent_60%)]" />
      </div>

      <div className="mx-auto w-full px-4 pt-6">
        {/* Kopf */}
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-[10px] shadow-sm">
              1
            </span>
            Social Media Kalender
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Beiträge planen &amp; veröffentlichen
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Plane Posts für Facebook, Instagram &amp; LinkedIn direkt
                aus GLENO – mit Kalender, Heatmap und Vorschau.
              </p>
            </div>

            <button
              type="button"
              onClick={openEditorForNew}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
            >
              <PlusIcon className="h-4 w-4" />
              Beitrag erstellen
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/80 p-1 text-xs shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur">
              <TabButton
                icon={CalendarDaysIcon}
                label="Kalender"
                active={view === 'calendar'}
                onClick={() => setView('calendar')}
              />
              <TabButton
                icon={ListBulletIcon}
                label="Liste"
                active={view === 'list'}
                onClick={() => setView('list')}
              />
              <TabButton
                icon={ListBulletIcon}
                label="Autolists"
                active={view === 'autolists'}
                onClick={() => setView('autolists')}
              />
              <TabButton
                icon={TrashIcon}
                label="Gelöschte Posts"
                active={view === 'deleted'}
                onClick={() => setView('deleted')}
              />
            </div>
          </div>
        </div>

        {/* Filterleiste */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-3xl border border-white/70 bg-white/85 px-4 py-3 text-xs text-slate-600 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-2xl border border-slate-100/80 bg-slate-50/60 px-3 py-1.5 shadow-inner shadow-white/40">
            <span className="text-[11px] font-medium text-slate-400">
              Suche
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Beiträge durchsuchen…"
              className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-100/80 bg-white/80 px-3 py-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o - 1)}
              className="rounded-full p-1 hover:bg-slate-100"
            >
              <ChevronLeftIcon className="h-4 w-4 text-slate-500" />
            </button>
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
              <CalendarDaysIcon className="h-4 w-4" />
              <span>{weekLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o + 1)}
              className="rounded-full p-1 hover:bg-slate-100"
            >
              <ChevronRightIcon className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-500">
            <span className="rounded-full border border-slate-100/80 bg-white/70 px-2.5 py-1 shadow-sm">
              Beste Zeiten
            </span>
            <span className="rounded-full border border-slate-100/80 bg-white/70 px-2.5 py-1 shadow-sm">
              {new Date().toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              – Europe/Berlin
            </span>
          </div>
        </div>

        {/* Hinweis bei keiner Verbindung */}
        {!hasAnyConnection && !loading && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm">
            <span className="font-semibold">Hinweis:</span> Um Beiträge
            zu planen, verbinde zuerst mindestens einen
            Social-Media-Kanal in den{' '}
            <span className="font-medium">Social Media Einstellungen</span>.
          </div>
        )}

        {/* Hauptpanel */}
        <div className="mt-4 rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.18)] backdrop-blur">
          {view === 'calendar' && (
            <CalendarView
              posts={filteredPosts}
              weekStart={weekStart}
              onEdit={openEditorForEdit}
              onDelete={handleDeletePost}
            />
          )}
          {view === 'list' && (
            <ListView
              posts={filteredPosts}
              hasAnyConnection={hasAnyConnection}
              onEdit={openEditorForEdit}
              onDelete={handleDeletePost}
              mediaUrlMap={mediaUrlMap}
            />
          )}
          {view === 'autolists' && (
            <div className="text-sm text-slate-500">
              Autolists werden später gebaut – hier kannst du
              wiederkehrende Content-Serien definieren (z.&nbsp;B.
              „Montags-Tipp“).
            </div>
          )}
          {view === 'deleted' && (
            <div className="text-sm text-slate-500">
              Gelöschte Beiträge werden hier erscheinen, sobald wir
              Soft-Delete implementiert haben.
            </div>
          )}
        </div>
      </div>

      {/* EDITOR MODAL */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4">
          <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_24px_100px_rgba(15,23,42,0.7)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-sm">
                  ✨
                </span>
                {editingPost ? 'Beitrag bearbeiten' : 'Neuer Beitrag'}
              </div>
              <div className="flex items-center gap-2">
                {editingPost && (
                  <button
                    type="button"
                    onClick={() => handleDeletePost(editingPost)}
                    className="rounded-full p-1.5 text-rose-500 hover:bg-rose-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-full p-1.5 hover:bg-slate-100"
                >
                  <XMarkIcon className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
              {/* Editor links */}
              <div className="flex flex-1 flex-col gap-3 overflow-hidden">
                {/* Netzwerk-Auswahl */}
                <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-900/90 px-3 py-2 text-[11px] text-white shadow-lg shadow-slate-900/40">
                  <NetworkToggle
                    label="Facebook"
                    provider="facebook"
                    active={selectedNetworks.includes('facebook')}
                    enabled={availableProviders.includes('facebook')}
                    onClick={() => toggleNetwork('facebook')}
                  />
                  <NetworkToggle
                    label="Instagram"
                    provider="instagram"
                    active={selectedNetworks.includes('instagram')}
                    enabled={availableProviders.includes('instagram')}
                    onClick={() => toggleNetwork('instagram')}
                  />
                  <NetworkToggle
                    label="LinkedIn"
                    provider="linkedin"
                    active={selectedNetworks.includes('linkedin')}
                    enabled={availableProviders.includes('linkedin')}
                    onClick={() => toggleNetwork('linkedin')}
                  />
                </div>

                {!hasAnyConnection && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-900">
                    Du hast noch keine Konten verbunden. Beiträge können
                    erst geplant werden, wenn mindestens ein Kanal
                    verknüpft ist.
                  </div>
                )}

                {/* Caption */}
                <div className="flex flex-1 flex-col rounded-2xl border border-slate-100 bg-slate-50/80 p-3 shadow-inner shadow-white/40">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-medium uppercase tracking-[0.18em]">
                      Beitragstext
                    </span>
                    <span
                      className={clsx(
                        'tabular-nums',
                        captionOver
                          ? 'text-rose-500'
                          : 'text-slate-400',
                      )}
                    >
                      {captionLength}/{captionLimit}
                    </span>
                  </div>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Schreibe deinen Beitragstext…"
                    className="h-40 flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                  {captionOver && (
                    <p className="mt-1 text-[11px] text-rose-500">
                      Limit von {captionLimit} Zeichen überschritten.
                    </p>
                  )}
                </div>

                {/* Hashtags */}
                <div className="flex flex-col rounded-2xl border border-slate-100 bg-white/80 p-3 shadow-sm">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-medium uppercase tracking-[0.18em]">
                      Hashtags
                    </span>
                    <span
                      className={clsx(
                        'tabular-nums',
                        hashtagsOver
                          ? 'text-rose-500'
                          : 'text-slate-400',
                      )}
                    >
                      {hashtagList.length}/{hashtagLimit}
                    </span>
                  </div>
                  <textarea
                    value={hashtagsInput}
                    onChange={(e) =>
                      setHashtagsInput(e.target.value)
                    }
                    placeholder="#gleno #unternehmenssoftware …"
                    className="h-20 resize-none bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                  {hashtagsOver && (
                    <p className="mt-1 text-[11px] text-rose-500">
                      Maximal {hashtagLimit} Hashtags erlaubt.
                    </p>
                  )}
                </div>

                {/* Einstellungen & Zeit & Medium */}
                <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white/80 p-3 text-[11px] text-slate-600 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium uppercase tracking-[0.18em]">
                      Globale Einstellungen
                    </span>
                    <span className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5">
                      Auto-Publish EIN
                    </span>
                    <span className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5">
                      UTM-Tracking
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="datetime-local"
                      value={scheduledAt ?? ''}
                      onChange={(e) =>
                        setScheduledAt(e.target.value || null)
                      }
                      className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Medium wählen
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleMediaChange}
                    />
                    <button
                      type="button"
                      onClick={savePost}
                      disabled={!hasAnyConnection || uploadingMedia}
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium shadow-sm',
                        hasAnyConnection && !uploadingMedia
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'cursor-not-allowed bg-slate-300 text-slate-500',
                      )}
                    >
                      {uploadingMedia
                        ? 'Lädt…'
                        : editingPost
                        ? 'Aktualisieren'
                        : 'Planen'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Vorschau rechts */}
              <div className="flex w-full max-w-sm flex-col gap-3">
                <PreviewSwitcher
                  selected={previewNetwork}
                  available={availableProviders}
                  onSelect={setPreviewNetwork}
                  caption={caption}
                  hashtags={hashtagList}
                  mediaPreviewUrl={mediaPreviewUrl}
                  mediaIsVideo={mediaIsVideo}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
              Vorschau ist nur eine Annäherung – die tatsächliche
              Darstellung im Netzwerk kann leicht abweichen.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------ Subcomponents ------------------------ */

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof CalendarDaysIcon
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition',
        active
          ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
          : 'text-slate-500 hover:bg-slate-100',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

/* -------------------- CalendarView mit echten Posts -------------------- */

function CalendarView({
  posts,
  weekStart,
  onEdit,
  onDelete,
}: {
  posts: SocialPost[]
  weekStart: Date
  onEdit: (post: SocialPost) => void
  onDelete: (post: SocialPost) => void
}) {
  const [heatmapData, setHeatmapData] =
    useState<Record<string, number>>({})

  useEffect(() => {
    setHeatmapData(generateHeatmap())
  }, [])

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    return d
  }, [weekStart])

  // Posts in Slots mappen: key = `${dayKey}-${hour}`
  const slotPosts = useMemo(() => {
    const map: Record<string, SocialPost[]> = {}

    for (const post of posts) {
      const sched = getFirstSchedule(post)
      if (!sched) continue

      if (sched < weekStart || sched >= weekEnd) continue

      const jsDay = sched.getDay() // 0=So…6=Sa
      const dayIndex = jsDay === 0 ? 6 : jsDay - 1 // Mo=0…So=6
      const hour = sched.getHours()

      if (hour < HOURS[0] || hour > HOURS[HOURS.length - 1]) continue

      const dayKey = DAYS[dayIndex].key
      const key = `${dayKey}-${hour}`

      if (!map[key]) map[key] = []
      map[key].push(post)
    }

    return map
  }, [posts, weekStart, weekEnd])

  return (
    <div className="flex h-[560px] flex-col rounded-2xl border border-slate-100 bg-slate-50/70 text-[11px] text-slate-500 shadow-inner shadow-white/60">
      <div className="sticky top-0 z-10 grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-slate-100 bg-white/80 px-3 py-2 backdrop-blur">
        <div />
        {DAYS.map((d, idx) => (
          <div
            key={d.key}
            className="text-center text-xs font-medium text-slate-600"
          >
            {d.label}{' '}
            <span className="text-[10px] text-slate-400">
              {23 + idx}
            </span>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-slate-100/80"
          >
            <div className="sticky left-0 z-10 bg-slate-50/90 px-2 py-2 text-[10px] text-slate-400 backdrop-blur">
              {formatHour(hour)}
            </div>
            {DAYS.map((d) => {
              const key = `${d.key}-${hour}`
              const value = heatmapData[key] ?? 0
              const opacity = value
                ? 0.06 + (value / 100) * 0.42
                : 0

              const postsInSlot = slotPosts[key] ?? []

              return (
                <div
                  key={d.key}
                  className="relative flex h-16 flex-col items-stretch justify-start border-l border-slate-100/70 text-[10px]"
                  style={{
                    background:
                      value > 0
                        ? `radial-gradient(circle at center, rgba(56,189,248,${opacity}) 0, rgba(56,189,248,${
                            opacity / 3
                          }) 40%, transparent 70%)`
                        : undefined,
                  }}
                >
                  {postsInSlot.length === 0 && value > 0 && (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      <span>{value}%</span>
                    </div>
                  )}

                  {postsInSlot.slice(0, 2).map((p) => (
                    <div
                      key={p.id}
                      className="group mt-0.5 flex items-center gap-1 rounded-md bg-slate-900/90 px-1 py-0.5 text-[9px] text-white shadow-sm"
                    >
                      <button
                        type="button"
                        className="flex-1 truncate text-left"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(p)
                        }}
                      >
                        {(p.caption ?? 'Ohne Titel').slice(0, 28)}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(p)
                        }}
                        className="opacity-60 hover:opacity-100"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {postsInSlot.length > 2 && (
                    <div className="mt-0.5 px-1 text-[9px] text-slate-600">
                      +{postsInSlot.length - 2} weitere
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* --------------------------- ListView --------------------------- */

function ListView({
  posts,
  hasAnyConnection,
  onEdit,
  onDelete,
  mediaUrlMap,
}: {
  posts: SocialPost[]
  hasAnyConnection: boolean
  onEdit: (post: SocialPost) => void
  onDelete: (post: SocialPost) => void
  mediaUrlMap: Record<string, string>
}) {
  if (!hasAnyConnection) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
        Um Beiträge zu planen, verbinde zuerst mindestens einen Kanal.
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
        In diesem Zeitraum sind noch keine Beiträge geplant oder
        veröffentlicht.
      </div>
    )
  }

  return (
    <div className="space-y-2 text-sm text-slate-700">
      {posts.map((post) => {
        const path = post.media_path ?? null
        const mediaUrl = path ? mediaUrlMap[path] ?? null : null
        const isVideo = isVideoPath(path)
        const created = new Date(post.created_at)

        return (
          <div
            key={post.id}
            onClick={() => onEdit(post)}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 bg-white/90 px-3 py-3 shadow-sm transition hover:bg-slate-50/80"
          >
            {/* Media */}
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              {mediaUrl ? (
                isVideo ? (
                  <video
                    src={mediaUrl}
                    className="h-full w-full object-cover"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                  Kein Medium
                </div>
              )}
            </div>

            {/* Text */}
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="font-medium">
                  {created.toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span>·</span>
                <span>
                  {created.toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-800 line-clamp-1">
                {(post.caption || '').slice(0, 80) || 'Ohne Titel'}
              </div>
              <div className="line-clamp-2 text-[12px] text-slate-500">
                {post.caption}
              </div>
            </div>

            {/* Provider-Icons */}
            <div className="flex w-24 items-center justify-center gap-2 text-lg">
              {post.social_post_targets.some(
                (t) => t.provider === 'facebook',
              ) && (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0866FF] text-[11px] font-semibold text-white">
                  f
                </span>
              )}
              {post.social_post_targets.some(
                (t) => t.provider === 'instagram',
              ) && (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-[11px] font-semibold text-white">
                  ig
                </span>
              )}
              {post.social_post_targets.some(
                (t) => t.provider === 'linkedin',
              ) && (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0A66C2] text-[11px] font-semibold text-white">
                  in
                </span>
              )}
            </div>

            {/* Status + Aktionen */}
            <div className="flex w-40 flex-col items-end gap-1 text-[11px]">
              <div className="flex flex-wrap justify-end gap-1">
                {post.social_post_targets.map((t) => (
                  <StatusBadge key={t.id} target={t} />
                ))}
              </div>
              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(post)
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-50"
                >
                  <PencilSquareIcon className="h-3 w-3" />
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(post)
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700 hover:bg-rose-100"
                >
                  <TrashIcon className="h-3 w-3" />
                  Löschen
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ----------------- weitere Subcomponents ----------------- */

function StatusBadge({ target }: { target: SocialPostTarget }) {
  const label =
    target.status === 'planned'
      ? 'Geplant'
      : target.status === 'posted'
      ? 'Gepostet'
      : target.status === 'disconnected'
      ? 'Getrennt'
      : 'Fehler'

  const color =
    target.status === 'planned'
      ? 'bg-sky-50 text-sky-800 border-sky-200'
      : target.status === 'posted'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : target.status === 'disconnected'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-rose-50 text-rose-800 border-rose-200'

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
        color,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  )
}

function NetworkToggle({
  label,
  provider,
  active,
  enabled,
  onClick,
}: {
  label: string
  provider: Provider
  active: boolean
  enabled: boolean
  onClick: () => void
}) {
  const baseColor =
    provider === 'facebook'
      ? 'bg-[#0866FF]'
      : provider === 'instagram'
      ? 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]'
      : 'bg-[#0A66C2]'

  return (
    <button
      type="button"
      onClick={enabled ? onClick : undefined}
      className={clsx(
        'inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-medium transition',
        !enabled && 'cursor-not-allowed opacity-40',
        enabled && active
          ? 'bg-white text-slate-900'
          : enabled
          ? 'bg-slate-800/40 text-slate-200 hover:bg-slate-800'
          : 'bg-slate-800/20 text-slate-400',
      )}
    >
      <span className={clsx('h-3 w-3 rounded-full', baseColor)} />
      {label}
    </button>
  )
}

function PreviewSwitcher({
  selected,
  available,
  onSelect,
  caption,
  hashtags,
  mediaPreviewUrl,
  mediaIsVideo,
}: {
  selected: Provider | null
  available: Provider[]
  onSelect: (p: Provider) => void
  caption: string
  hashtags: string[]
  mediaPreviewUrl: string | null
  mediaIsVideo: boolean
}) {
  const effective = selected ?? available[0] ?? 'facebook'
  const shortCaption =
    caption || 'So könnte dein Beitrag in der Vorschau aussehen…'

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Kanal-Icons oben */}
      <div className="flex items-center gap-2">
        {(['facebook', 'instagram', 'linkedin'] as Provider[]).map(
          (p) => {
            const isActive = effective === p
            const isEnabled = available.includes(p)
            const bg =
              p === 'facebook'
                ? 'bg-[#0866FF]'
                : p === 'instagram'
                ? 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]'
                : 'bg-[#0A66C2]'
            const label =
              p === 'facebook' ? 'f' : p === 'instagram' ? 'ig' : 'in'
            return (
              <button
                key={p}
                type="button"
                disabled={!isEnabled}
                onClick={() => isEnabled && onSelect(p)}
                className={clsx(
                  'inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-white shadow-sm',
                  bg,
                  isActive ? 'ring-2 ring-slate-900/80' : '',
                  !isEnabled && 'cursor-not-allowed opacity-40',
                )}
              >
                {label}
              </button>
            )
          },
        )}
      </div>

      {/* Preview-Karte */}
      {effective === 'facebook' && (
        <FacebookPreview
          caption={shortCaption}
          hashtags={hashtags}
          mediaPreviewUrl={mediaPreviewUrl}
          mediaIsVideo={mediaIsVideo}
        />
      )}
      {effective === 'instagram' && (
        <InstagramPreview
          caption={shortCaption}
          hashtags={hashtags}
          mediaPreviewUrl={mediaPreviewUrl}
          mediaIsVideo={mediaIsVideo}
        />
      )}
      {effective === 'linkedin' && (
        <LinkedInPreview
          caption={shortCaption}
          hashtags={hashtags}
          mediaPreviewUrl={mediaPreviewUrl}
          mediaIsVideo={mediaIsVideo}
        />
      )}
    </div>
  )
}

/* --- Netzwerk-spezifische Previews ---------------------------------- */

function MediaPreviewBox({
  url,
  isVideo,
}: {
  url: string | null
  isVideo: boolean
}) {
  if (!url) {
    return (
      <div className="mb-2 aspect-[4/3] w-full rounded-xl bg-slate-200/70" />
    )
  }
  if (isVideo) {
    return (
      <video
        className="mb-2 w-full rounded-xl bg-black object-cover"
        src={url}
        autoPlay
        muted
        loop
        playsInline
      />
    )
  }
  return (
    <img
      src={url}
      alt="Preview"
      className="mb-2 w-full rounded-xl object-cover"
    />
  )
}

function FacebookPreview({
  caption,
  hashtags,
  mediaPreviewUrl,
  mediaIsVideo,
}: {
  caption: string
  hashtags: string[]
  mediaPreviewUrl: string | null
  mediaIsVideo: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] text-slate-600 shadow-inner shadow-white/70">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium uppercase tracking-[0.18em]">
          Facebook Vorschau
        </span>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white/90 p-3 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-200" />
          <div>
            <div className="text-xs font-semibold text-slate-800">
              Gleno
            </div>
            <div className="text-[10px] text-slate-400">
              25&nbsp;Min · <span>🌐</span>
            </div>
          </div>
        </div>
        <MediaPreviewBox
          url={mediaPreviewUrl}
          isVideo={mediaIsVideo}
        />
        <div className="text-[11px] text-slate-800">{caption}</div>
        {hashtags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500">
            {hashtags.slice(0, 8).map((h, idx) => (
              <span key={`${h}-${idx}`}>#{h}</span>
            ))}
            {hashtags.length > 8 && (
              <span>+{hashtags.length - 8} weitere</span>
            )}
          </div>
        )}
        <div className="mt-3 flex justify-between gap-2">
          <div className="flex-1 rounded-full bg-slate-50 px-2 py-1.5 text-center text-[10px] text-slate-500">
            Gefällt mir
          </div>
          <div className="flex-1 rounded-full bg-slate-50 px-2 py-1.5 text-center text-[10px] text-slate-500">
            Kommentieren
          </div>
          <div className="flex-1 rounded-full bg-slate-50 px-2 py-1.5 text-center text-[10px] text-slate-500">
            Teilen
          </div>
        </div>
      </div>
    </div>
  )
}

function InstagramPreview({
  caption,
  hashtags,
  mediaPreviewUrl,
  mediaIsVideo,
}: {
  caption: string
  hashtags: string[]
  mediaPreviewUrl: string | null
  mediaIsVideo: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] text-slate-600 shadow-inner shadow-white/70">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium uppercase tracking-[0.18em]">
          Instagram Vorschau
        </span>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white/90 p-3 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-200" />
          <div className="text-xs font-semibold text-slate-800">
            gleno.de
          </div>
        </div>
        <MediaPreviewBox
          url={mediaPreviewUrl}
          isVideo={mediaIsVideo}
        />
        <div className="flex items-center gap-3 text-lg text-slate-700">
          <span>♡</span>
          <span>💬</span>
          <span>✈️</span>
          <span className="ml-auto">🔖</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-800">
          <span className="font-semibold">gleno.de&nbsp;</span>
          {caption}
        </div>
        {hashtags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500">
            {hashtags.slice(0, 8).map((h, idx) => (
              <span key={`${h}-${idx}`}>#{h}</span>
            ))}
            {hashtags.length > 8 && (
              <span>+{hashtags.length - 8} weitere</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LinkedInPreview({
  caption,
  hashtags,
  mediaPreviewUrl,
  mediaIsVideo,
}: {
  caption: string
  hashtags: string[]
  mediaPreviewUrl: string | null
  mediaIsVideo: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] text-slate-600 shadow-inner shadow-white/70">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium uppercase tracking-[0.18em]">
          LinkedIn Vorschau
        </span>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white/90 p-3 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-200" />
          <div>
            <div className="text-xs font-semibold text-slate-800">
              GLENO
            </div>
            <div className="text-[10px] text-slate-400">
              3.&nbsp;Dezember · <span>🌐</span>
            </div>
          </div>
        </div>
        <MediaPreviewBox
          url={mediaPreviewUrl}
          isVideo={mediaIsVideo}
        />
        <div className="text-[11px] text-slate-800">{caption}</div>
        {hashtags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500">
            {hashtags.slice(0, 8).map((h, idx) => (
              <span key={`${h}-${idx}`}>#{h}</span>
            ))}
            {hashtags.length > 8 && (
              <span>+{hashtags.length - 8} weitere</span>
            )}
          </div>
        )}
        <div className="mt-3 flex justify-between gap-2">
          <div className="flex-1 rounded-full bg-slate-50 px-2 py-1.5 text-center text-[10px] text-slate-500">
            Gefällt mir
          </div>
          <div className="flex-1 rounded-full bg-slate-50 px-2 py-1.5 text-center text-[10px] text-slate-500">
            Kommentieren
          </div>
          <div className="flex-1 rounded-full bg-slate-50 px-2 py-1.5 text-center text-[10px] text-slate-500">
            Teilen
          </div>
        </div>
      </div>
    </div>
  )
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? 'pm' : 'am'
  const h = ((hour + 11) % 12) + 1
  return `${h}:00${suffix}`
}
