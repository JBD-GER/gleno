// src/lib/telephony/twilio-device.ts
'use client'

type TwilioDevice = any

declare global {
  // eslint-disable-next-line no-var
  var __GLENO_TWILIO_DEVICE__: TwilioDevice | null | undefined
  // eslint-disable-next-line no-var
  var __GLENO_TWILIO_DEVICE_PROMISE__: Promise<TwilioDevice> | null | undefined
}

async function ensureMicPermission() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (e) {
    // Mic blocked -> Twilio kann sofort disconnecten
    throw new Error(
      'Mikrofon-Zugriff verweigert. Bitte Browser-Mikrofon erlauben und erneut versuchen.'
    )
  }
}

async function fetchTwilioToken() {
  const res = await fetch('/api/telephony/token', { method: 'GET', cache: 'no-store' })
  const j = await res.json().catch(() => ({} as any))
  if (!res.ok) throw new Error(j?.error || 'Twilio Token konnte nicht geladen werden.')
  if (!j?.token) throw new Error('Token fehlt in /api/telephony/token Response.')
  return j.token as string
}

export async function getTwilioDevice(): Promise<TwilioDevice> {
  if (typeof window === 'undefined') throw new Error('Device nur im Browser verfügbar.')

  if (globalThis.__GLENO_TWILIO_DEVICE__) return globalThis.__GLENO_TWILIO_DEVICE__!

  if (globalThis.__GLENO_TWILIO_DEVICE_PROMISE__) {
    return globalThis.__GLENO_TWILIO_DEVICE_PROMISE__!
  }

  globalThis.__GLENO_TWILIO_DEVICE_PROMISE__ = (async () => {
    await ensureMicPermission()

    const token = await fetchTwilioToken()
    const mod = await import('@twilio/voice-sdk')
    const Device = (mod as any).Device

    const d = new Device(token, {
      // Wichtig: debug damit du was siehst
      logLevel: 'debug',
      codecPreferences: ['opus', 'pcmu'],
      // optional:
      // closeProtection: true,
    })

    // === DEVICE EVENTS ===
    d.on('registered', () => console.log('[twilio] device registered'))
    d.on('unregistered', () => console.log('[twilio] device unregistered'))
    d.on('error', (err: any) => console.error('[twilio] device error', err))

    // Token auto-refresh
    d.on('tokenWillExpire', async () => {
      try {
        console.log('[twilio] tokenWillExpire -> refreshing token')
        const newToken = await fetchTwilioToken()
        d.updateToken(newToken)
      } catch (e) {
        console.error('[twilio] token refresh failed', e)
      }
    })

    // register
    try {
      await d.register()
    } catch (e) {
      console.warn('[twilio] register failed (continuing)', e)
    }

    globalThis.__GLENO_TWILIO_DEVICE__ = d
    return d
  })()

  try {
    const d = await globalThis.__GLENO_TWILIO_DEVICE_PROMISE__
    return d
  } finally {
    globalThis.__GLENO_TWILIO_DEVICE_PROMISE__ = null
  }
}

export function destroyTwilioDevice() {
  try {
    globalThis.__GLENO_TWILIO_DEVICE__?.destroy?.()
  } catch {}
  globalThis.__GLENO_TWILIO_DEVICE__ = null
  globalThis.__GLENO_TWILIO_DEVICE_PROMISE__ = null
}
