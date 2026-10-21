import { useCallback, useEffect, useState } from 'react'
import { fetchGames } from './baseball'

export function useBaseballGames() {
  const [state, setState] = useState({ games: [], loading: true, error: '', updatedAt: null })
  const [retry, setRetry] = useState(0)
  const refresh = useCallback(() => setRetry(value => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    let stopped = false
    let timer
    const load = async () => {
      try {
        const games = await fetchGames(controller.signal)
        if (!stopped) setState({ games, loading: false, error: '', updatedAt: new Date() })
      } catch (error) {
        if (!stopped && error.name !== 'AbortError') {
          setState(previous => ({ ...previous, loading: false, error: '경기 정보 연결에 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요.' }))
        }
      } finally {
        if (!stopped) timer = setTimeout(load, 30_000)
      }
    }
    load()
    return () => { stopped = true; clearTimeout(timer); controller.abort() }
  }, [retry])
  return { ...state, refresh }
}
