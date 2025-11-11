// src/lib/safe-fetch.ts
export async function safeFetch(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 15000, ...rest } = init
  const ac = new AbortController()
  const id = setTimeout(() => ac.abort(), timeoutMs)

  try {
    const res = await fetch(input, { ...rest, signal: ac.signal, cache: 'no-store' })
    return res
  } finally {
    clearTimeout(id)
  }
}
