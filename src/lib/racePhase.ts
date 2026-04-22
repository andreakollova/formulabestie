// Computes the current watch party phase from race_start timestamp.
// Watch party opens 1h before race, closes 1h after race ends (~2h race).
// DB status field can override this (admin control), but time-based is default.

export type Phase = 'upcoming' | 'pre-race' | 'live' | 'post-race' | 'finished'

const PRE_RACE_OPEN_MS  = 60 * 60 * 1000       // 1h before race_start
const RACE_DURATION_MS  = 2 * 60 * 60 * 1000   // ~2h race
const POST_RACE_OPEN_MS = 60 * 60 * 1000        // 1h after race ends

// Time simulation (admin only) — offset stored in localStorage
export function getSimOffset(): number {
  try { return parseInt(localStorage.getItem('fw_sim_offset_ms') ?? '0', 10) || 0 } catch { return 0 }
}
export function setSimOffset(ms: number): void {
  try { localStorage.setItem('fw_sim_offset_ms', String(ms)) } catch {}
}
export function clearSimOffset(): void {
  try { localStorage.removeItem('fw_sim_offset_ms') } catch {}
}
export function getNow(): number {
  return Date.now() + getSimOffset()
}

export function computePhase(raceStartIso: string): Phase {
  const now = getNow()
  const start = new Date(raceStartIso).getTime()
  const raceEnd = start + RACE_DURATION_MS

  if (now < start - PRE_RACE_OPEN_MS) return 'upcoming'
  if (now < start)                     return 'pre-race'
  if (now < raceEnd)                   return 'live'
  if (now < raceEnd + POST_RACE_OPEN_MS) return 'post-race'
  return 'finished'
}

export function phaseLabel(phase: Phase): string {
  const labels: Record<Phase, string> = {
    'upcoming':   'UPCOMING',
    'pre-race':   'PRE-RACE',
    'live':       'LIVE',
    'post-race':  'POST-RACE',
    'finished':   'FINISHED',
  }
  return labels[phase]
}

export function isWatchPartyOpen(phase: Phase): boolean {
  return phase === 'pre-race' || phase === 'live' || phase === 'post-race'
}

// Returns ms until watch party opens (0 if already open/past)
export function msUntilOpen(raceStartIso: string): number {
  const start = new Date(raceStartIso).getTime()
  const opens = start - PRE_RACE_OPEN_MS
  return Math.max(0, opens - getNow())
}
