import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchGames, gameStatus, sortGames, streamVideo } from './baseball.js'

const game = (id, state, date = '2026-06-01T12:00:00Z') => ({ gamePk: id, gameDate: date, status: { abstractGameState: state, detailedState: state } })

test('live games precede upcoming and completed games, duplicates are removed', () => {
  const final = game(1, 'Final')
  const games = [final, game(2, 'Preview'), game(3, 'Live'), game(4, 'Final', '2026-06-02T12:00:00Z'), final]
  assert.deepEqual(sortGames(games).map(item => item.gamePk), [3, 2, 4, 1])
  assert.equal(sortGames(Array.from({ length: 20 }, (_, i) => game(i, 'Live'))).length, 12)
})

test('shows inning and preserves non-live state without inventing live scores', () => {
  assert.equal(gameStatus({ ...game(1, 'Live'), linescore: { currentInningOrdinal: '7th', isTopInning: true } }), '7th 초')
  assert.equal(gameStatus(game(1, 'Final')), 'Final')
})

test('only explicit YouTube video IDs are accepted as embeds', () => {
  assert.equal(streamVideo(1, '{"1":"abcdefghijk"}'), 'abcdefghijk')
  assert.equal(streamVideo(2, '{"1":"abcdefghijk"}'), null)
  for (const value of ['bad json', '{"1":"javascript:alert(1)"}', '{"1":"https://example.com"}', '{"1":123}']) {
    assert.equal(streamVideo(1, value), null)
  }
})

test('expands schedule lookup when fewer than five real games are returned', async context => {
  const requested = []
  context.mock.method(globalThis, 'fetch', async url => {
    requested.push(String(url))
    const games = requested.length === 1 ? [game(1, 'Live')] : Array.from({ length: 7 }, (_, i) => game(i, 'Final'))
    return { ok: true, json: async () => ({ dates: [{ games }] }) }
  })
  const games = await fetchGames(new AbortController().signal, new Date('2026-06-08T00:00:00Z'))
  assert.equal(games.length, 7)
  assert.equal(requested.length, 2)
  assert.match(requested[0], /startDate=2026-06-01/)
  assert.match(requested[1], /startDate=2025-06-03/)
})

test('API failures stay failures, rather than returning invented games', async context => {
  context.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 503 }))
  await assert.rejects(fetchGames(new AbortController().signal), /503/)
})
