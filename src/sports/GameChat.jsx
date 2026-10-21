import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'

const time = value => value?.toDate ? value.toDate().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '전송 중'

export function GameChat({ gameId }) {
  const [user, setUser] = useState(auth.currentUser)
  const [messages, setMessages] = useState([])
  const [viewers, setViewers] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const bottom = useRef(null)

  useEffect(() => onAuthStateChanged(auth, setUser), [])
  useEffect(() => {
    const room = collection(db, 'sportsRooms', String(gameId), 'messages')
    return onSnapshot(query(room, orderBy('createdAt', 'desc'), limit(100)), { includeMetadataChanges: true }, snapshot => {
      setMessages(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).reverse())
      setConnected(!snapshot.metadata.fromCache)
      setError(snapshot.metadata.fromCache ? '채팅 서버 연결을 기다리고 있습니다. 네트워크가 복구되면 자동으로 연결됩니다.' : '')
    }, () => {
      setConnected(false)
      setError('채팅에 연결할 수 없습니다. Firebase 연결 및 스포츠 채팅 접근 권한을 확인해 주세요.')
    })
  }, [gameId])

  useEffect(() => {
    if (!user) return
    let active = true
    let snapshot = []
    const sessionId = crypto.randomUUID()
    const presence = doc(db, 'sportsRooms', String(gameId), 'presence', sessionId)
    const updateCount = () => {
      if (active) setViewers(new Set(snapshot.filter(item => item.lastSeen?.toMillis() > Date.now() - 90_000).map(item => item.uid)).size)
    }
    const beat = () => setDoc(presence, { uid: user.uid, lastSeen: serverTimestamp() }).catch(() => { if (active) setViewers(null) })
    const unsubscribe = onSnapshot(collection(db, 'sportsRooms', String(gameId), 'presence'), result => {
      snapshot = result.docs.map(item => item.data())
      updateCount()
    }, () => { if (active) setViewers(null) })
    beat()
    const timer = setInterval(() => { beat(); updateCount() }, 30_000)
    return () => {
      active = false
      clearInterval(timer)
      unsubscribe()
      deleteDoc(presence).catch(() => {})
    }
  }, [gameId, user])

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }) }, [messages])

  const send = async event => {
    event.preventDefault()
    const body = text.trim()
    if (!user || !body || body.length > 300 || sending || !connected) return
    setSending(true)
    try {
      await addDoc(collection(db, 'sportsRooms', String(gameId), 'messages'), {
        uid: user.uid, name: (user.displayName || '야구팬').slice(0, 40), text: body, createdAt: serverTimestamp(),
      })
      setText('')
      setError('')
    } catch {
      setError('메시지를 보내지 못했습니다. 로그인 및 채팅 권한을 확인한 뒤 다시 시도해 주세요.')
    } finally { setSending(false) }
  }

  return <aside className="sports-chat" aria-label="경기 실시간 채팅">
    <div className="sports-chat-heading"><h3>함께 응원해요</h3><span>{user && viewers !== null ? `로그인 접속 ${viewers}명` : '경기별 채팅'}</span></div>
    <div className="sports-chat-notice">서로 존중하며 응원해 주세요. 개인정보는 공유하지 마세요.</div>
    <div className="sports-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="채팅 메시지">
      {!messages.length && <p className="sports-empty">{connected ? '첫 번째 응원 메시지를 남겨보세요 ⚾' : '채팅 연결 중…'}</p>}
      {messages.map(message => <div key={message.id} className={`sports-message ${message.uid === user?.uid ? 'mine' : ''}`}>
        <div><strong>{message.name}</strong><time>{time(message.createdAt)}</time></div><p>{message.text}</p>
      </div>)}
      <div ref={bottom} />
    </div>
    {error && <p className="sports-chat-error" role="alert">{error}</p>}
    {user ? <form onSubmit={send} className="sports-chat-form">
      <label htmlFor="sports-message">응원 메시지 <span>{text.length}/300</span></label>
      <div><input id="sports-message" value={text} onChange={event => setText(event.target.value)} maxLength={300} placeholder="응원 메시지를 입력하세요" autoComplete="off" /><button disabled={!text.trim() || sending || !connected} type="submit">{sending ? '전송 중' : '전송'}</button></div>
    </form> : <p className="sports-login"><Link to="/login">로그인</Link>하면 채팅과 접속자 집계에 참여할 수 있어요.</p>}
  </aside>
}
