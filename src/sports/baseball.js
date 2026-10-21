const API = 'https://statsapi.mlb.com/api/v1/schedule'

function dateOffset(now, days) {
  const date = new Date(now)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function sortGames(games) {
  const unique = [...new Map(games.map(game => [game.gamePk, game])).values()]
  const rank = game => game.status.abstractGameState === 'Live' ? 0 : game.status.abstractGameState === 'Preview' ? 1 : 2
  return unique.sort((a, b) => rank(a) - rank(b) || (
    rank(a) === 2 ? Date.parse(b.gameDate) - Date.parse(a.gameDate) : Date.parse(a.gameDate) - Date.parse(b.gameDate)
  )).slice(0, 12)
}

export async function fetchGames(signal, now = new Date()) {
  const load = async days => {
    const params = new URLSearchParams({ sportId: '1', startDate: dateOffset(now, -days), endDate: dateOffset(now, 7), hydrate: 'team,linescore' })
    const response = await fetch(`${API}?${params}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]) })
    if (!response.ok) throw new Error(`경기 정보를 불러오지 못했습니다. (${response.status})`)
    const data = await response.json()
    return (data.dates ?? []).flatMap(date => date.games ?? [])
  }
  let games = await load(7)
  // 비시즌에는 지난 시즌의 실제 경기로 목록을 채우되, 종료 상태를 유지한다.
  if (new Set(games.map(game => game.gamePk)).size < 5) games = await load(370)
  return sortGames(games)
}

export function gameStatus(game) {
  if (game.status.abstractGameState === 'Live') {
    const line = game.linescore
    return line?.currentInningOrdinal ? `${line.currentInningOrdinal} ${line.isTopInning ? '초' : '말'}` : game.status.detailedState
  }
  return game.status.detailedState
}

export function streamVideo(gameId, config = import.meta.env.VITE_BASEBALL_STREAMS) {
  try {
    const id = JSON.parse(config || '{}')[String(gameId)]
    return typeof id === 'string' && /^[\w-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}
