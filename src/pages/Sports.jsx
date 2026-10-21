import { useState } from 'react'
import { GameChat } from '../sports/GameChat'
import { gameStatus, streamVideo } from '../sports/baseball'
import { useBaseballGames } from '../sports/useBaseballGames'
import './Sports.css'

const startTime = game => new Date(game.gameDate).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })

export function Sports() {
  const { games, loading, error, updatedAt, refresh } = useBaseballGames()
  const [selectedId, setSelectedId] = useState(null)
  const selected = games.find(game => game.gamePk === selectedId) || games[0]
  const video = selected && streamVideo(selected.gamePk)
  const liveCount = games.filter(game => game.status.abstractGameState === 'Live').length

  return <main className="sports-page">
    <div className="sports-container">
      <section className="sports-intro">
        <div><p className="sports-eyebrow">SPORTS LOUNGE / BASEBALL</p><h1>야구는, 함께 봐야 제맛.</h1><p>실시간 스코어부터 경기별 응원 채팅까지, 한곳에서 즐기세요.</p></div>
        <div className="sports-live-summary"><span className="sports-dot" />{liveCount}경기 진행 중<span>MLB</span></div>
      </section>

      <div className="sports-section-heading"><h2>야구 경기 <span>{games.length}</span></h2><div>{updatedAt && <span>{updatedAt.toLocaleTimeString('ko-KR')} 갱신 · 30초 간격</span>}<button type="button" onClick={refresh}>새로고침 ↻</button></div></div>
      <p className="sports-schedule-note">진행 중 → 예정 → 최근 종료 순으로 표시합니다. 경기 수가 적은 날에는 지난 시즌 경기도 포함됩니다. 시작 시간은 한국 시간입니다.</p>
      {error && <div role="alert" className="sports-error">{error}{games.length > 0 && ' 마지막으로 받은 정보를 표시하고 있습니다.'}<button type="button" onClick={refresh}>다시 시도</button></div>}
      {loading && <div role="status" className="sports-loading">경기 일정을 불러오고 있습니다…</div>}
      {!loading && !error && !games.length && <p className="sports-empty">조회된 경기가 없습니다.</p>}
      <section className="sports-game-list" aria-label="야구 경기 목록">
        {games.map(game => <button type="button" key={game.gamePk} className={`sports-game ${selected?.gamePk === game.gamePk ? 'selected' : ''}`} onClick={() => setSelectedId(game.gamePk)} aria-pressed={selected?.gamePk === game.gamePk}>
          <div className="sports-game-top"><span className={game.status.abstractGameState === 'Live' ? 'sports-badge live' : 'sports-badge'}>{game.status.abstractGameState === 'Live' ? '● LIVE' : game.status.abstractGameState === 'Final' ? '경기 종료' : '경기 예정'}</span><span>{gameStatus(game)}</span></div>
          {['away', 'home'].map(side => <div key={side} className="sports-team"><span>{game.teams[side].team.name}</span><strong>{game.teams[side].score ?? '–'}</strong></div>)}
          <div className="sports-game-bottom"><time dateTime={game.gameDate}>{startTime(game)}</time><span>{selected?.gamePk === game.gamePk ? '선택됨 ✓' : '경기 보기 →'}</span></div>
        </button>)}
      </section>

      {selected && <section className="sports-watch" aria-label="선택한 경기 시청 및 채팅">
        <div className="sports-broadcast">
          <div className="sports-broadcast-heading"><span className="sports-eyebrow">MATCH CENTER</span><h2>{selected.teams.away.team.name} <span>vs</span> {selected.teams.home.team.name}</h2><p>{startTime(selected)} · {selected.venue?.name} · {gameStatus(selected)}</p></div>
          <div className="sports-player">
            {video ? <iframe key={`${selected.gamePk}-${video}`} src={`https://www.youtube-nocookie.com/embed/${video}`} title="공식 야구 경기 중계" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <div className="sports-player-placeholder"><span className="sports-baseball" aria-hidden="true">⚾</span><h3>공식 중계에서 함께 시청하세요</h3><p>이 경기의 재생 영상이 아직 연결되지 않았습니다.<br />공식 경기 페이지를 열어 중계를 확인하고 이곳에서 함께 응원해 보세요.</p><a href={`https://www.mlb.com/gameday/${selected.gamePk}`} target="_blank" rel="noopener noreferrer">MLB 공식 경기 페이지 ↗</a><small>중계 시청은 지역 및 구독 조건에 따라 제한될 수 있습니다.</small></div>}
          </div>
          <div className="sports-scoreboard"><div><span>AWAY</span><strong>{selected.teams.away.team.name}</strong></div><p>{selected.teams.away.score ?? '–'} <span>:</span> {selected.teams.home.score ?? '–'}</p><div><span>HOME</span><strong>{selected.teams.home.team.name}</strong></div></div>
          <p className="sports-data-source">경기 데이터: MLB Stats API · 영상 제공 여부와 경기 진행 상태는 별개입니다. 지연 시 새로고침해 주세요.</p>
        </div>
        <GameChat key={selected.gamePk} gameId={selected.gamePk} />
      </section>}
    </div>
  </main>
}
