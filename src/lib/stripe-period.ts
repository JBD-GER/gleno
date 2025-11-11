export function tsToIso(ts?: number | null) {
  return ts ? new Date(ts * 1000).toISOString() : null
}

export function addInterval(startUnix: number, interval: 'day'|'week'|'month'|'year', count = 1) {
  const d = new Date(startUnix * 1000)
  if (interval === 'day')   d.setUTCDate(d.getUTCDate() + count)
  if (interval === 'week')  d.setUTCDate(d.getUTCDate() + 7 * count)
  if (interval === 'month') d.setUTCMonth(d.getUTCMonth() + count)
  if (interval === 'year')  d.setUTCFullYear(d.getUTCFullYear() + count)
  return Math.floor(d.getTime() / 1000)
}

/** Ermittelt Start/Ende selbst dann, wenn Stripe Felder fehlen (Trial/Edge-Cases). */
export function getSafePeriodBounds(sub: any) {
  const startUnix =
    sub?.current_period_start ??
    sub?.billing_cycle_anchor ??
    sub?.start_date ??
    null

  let endUnix =
    sub?.current_period_end ??
    sub?.trial_end ??
    null

  if (!endUnix && startUnix) {
    const rec = sub?.items?.data?.[0]?.price?.recurring
    if (rec?.interval) {
      endUnix = addInterval(startUnix, rec.interval, rec.interval_count ?? 1)
    }
  }

  // Notfalls 30 Tage
  if (!endUnix && startUnix) {
    endUnix = addInterval(startUnix, 'day', 30)
  }

  return {
    startIso: tsToIso(startUnix),
    endIso: tsToIso(endUnix),
  }
}
