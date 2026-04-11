import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChatSocket } from '../context/ChatSocketContext';
import { chatAPI, usersAPI } from '../services/api';
import './ChatPage.css';

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatPage() {
  const { user } = useAuth();
  const { socket, connected } = useChatSocket();
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [bootError, setBootError] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [peerPick, setPeerPick] = useState('');
  const [openPeerBusy, setOpenPeerBusy] = useState(false);
  const bottomRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  const loadThreads = useCallback(async () => {
    try {
      const { data } = await chatAPI.listThreads();
      setThreads(Array.isArray(data) ? data : []);
    } catch {
      setThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    if (isAdmin) {
      loadThreads();
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setBootError(null);
      setLoadingThreads(true);
      try {
        const { data } = await chatAPI.openShopThread();
        if (cancelled) return;
        if (data?.thread_id) setSelectedThreadId(data.thread_id);
        await loadThreads();
      } catch (e) {
        if (!cancelled) {
          setBootError(e.response?.data?.error || e.message || 'Could not open chat');
        }
      } finally {
        if (!cancelled) setLoadingThreads(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, loadThreads]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const [w, c] = await Promise.all([usersAPI.getWorkers(), usersAPI.getCustomers()]);
        if (cancelled) return;
        setContacts([
          ...(w.data || []).map((row) => ({ ...row, role: 'worker' })),
          ...(c.data || []).map((row) => ({ ...row, role: 'customer' })),
        ]);
      } catch {
        if (!cancelled) setContacts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!socket) return undefined;
    const onInbox = () => {
      loadThreads();
    };
    socket.on('chat:inbox', onInbox);
    return () => socket.off('chat:inbox', onInbox);
  }, [socket, loadThreads]);

  useEffect(() => {
    if (!socket || !selectedThreadId) return undefined;
    socket.emit('join_thread', selectedThreadId);
    return () => {
      socket.emit('leave_thread', selectedThreadId);
    };
  }, [socket, selectedThreadId]);

  useEffect(() => {
    if (!socket || !selectedThreadId) return undefined;
    const onMsg = (payload) => {
      const msg = payload?.message;
      if (!msg || msg.thread_id !== selectedThreadId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      loadThreads();
    };
    socket.on('chat:message', onMsg);
    return () => socket.off('chat:message', onMsg);
  }, [socket, selectedThreadId, loadThreads]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoadingMessages(true);
      try {
        const { data } = await chatAPI.getMessages(selectedThreadId);
        if (!cancelled) setMessages(Array.isArray(data) ? data : []);
        chatAPI.markRead(selectedThreadId).catch(() => {});
        loadThreads();
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedThreadId, loadThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedThreadId]);

  const activeThread = useMemo(
    () => threads.find((t) => t.thread_id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const contactOptions = useMemo(() => {
    const q = peerPick.trim().toLowerCase();
    if (!q) return contacts.slice(0, 80);
    return contacts
      .filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(q))
      .slice(0, 80);
  }, [contacts, peerPick]);

  const openWithPeer = async () => {
    const raw = peerPick.trim();
    let id = parseInt(raw, 10);
    if (Number.isNaN(id)) {
      const hit = contacts.find(
        (c) =>
          (c.email && c.email.toLowerCase() === raw.toLowerCase()) ||
          (c.name && c.name.toLowerCase() === raw.toLowerCase())
      );
      if (hit) id = hit.id;
    }
    if (Number.isNaN(id)) return;
    setOpenPeerBusy(true);
    try {
      const { data } = await chatAPI.openThread(id);
      await loadThreads();
      if (data?.thread_id) setSelectedThreadId(data.thread_id);
      setPeerPick('');
    } catch (e) {
      setBootError(e.response?.data?.error || e.message || 'Could not open chat');
    } finally {
      setOpenPeerBusy(false);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !selectedThreadId || sending) return;
    setSending(true);
    setDraft('');
    try {
      const { data } = await chatAPI.sendMessage(selectedThreadId, text);
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      loadThreads();
    } catch (e) {
      setDraft(text);
      setBootError(e.response?.data?.error || e.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <div>
          <h1 className="chat-page-title">Live chat</h1>
          <p className="chat-page-sub">
            {isAdmin ? 'Message your team and customers in real time.' : 'Message the shop — replies sync instantly.'}
          </p>
        </div>
        <div className={`chat-live-pill ${connected ? 'chat-live-pill--on' : ''}`}>
          <span className="chat-live-dot" aria-hidden />
          {connected ? 'Live' : 'Connecting…'}
        </div>
      </div>

      {bootError ? (
        <div className="chat-banner chat-banner--error" role="alert">
          {bootError}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setBootError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="chat-shell">
        <aside className="chat-sidebar">
          {isAdmin ? (
            <div className="chat-new-thread">
              <label className="chat-label" htmlFor="chat-peer">
                Start or open a chat
              </label>
              <input
                id="chat-peer"
                className="chat-input"
                list="chat-contact-list"
                placeholder="User id, name, or email…"
                value={peerPick}
                onChange={(e) => setPeerPick(e.target.value)}
              />
              <datalist id="chat-contact-list">
                {contacts.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} ({c.role}) — {c.email}
                  </option>
                ))}
              </datalist>
              <div className="chat-hint">Pick from the list or type a numeric user id, then open.</div>
              <select
                className="chat-select"
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) setPeerPick(v);
                }}
                aria-label="Choose a contact"
              >
                <option value="">Browse contacts…</option>
                {contactOptions.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} · {c.role}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-primary chat-open-btn"
                disabled={openPeerBusy || !peerPick.trim()}
                onClick={openWithPeer}
              >
                {openPeerBusy ? 'Opening…' : 'Open conversation'}
              </button>
            </div>
          ) : null}

          <div className="chat-sidebar-head">Conversations</div>
          {loadingThreads ? (
            <div className="chat-muted">Loading…</div>
          ) : threads.length === 0 ? (
            <div className="chat-muted">{isAdmin ? 'No threads yet.' : 'No messages yet.'}</div>
          ) : (
            <ul className="chat-thread-list">
              {threads.map((t) => {
                const unread = (t.unread_count || 0) > 0;
                const active = t.thread_id === selectedThreadId;
                return (
                  <li key={t.thread_id}>
                    <button
                      type="button"
                      className={`chat-thread-item ${active ? 'chat-thread-item--active' : ''}`}
                      onClick={() => setSelectedThreadId(t.thread_id)}
                    >
                      <div className="chat-thread-top">
                        <span className="chat-peer-name">{t.peer_name || `User #${t.peer_id}`}</span>
                        {unread ? <span className="chat-unread-badge">{t.unread_count > 9 ? '9+' : t.unread_count}</span> : null}
                      </div>
                      <div className="chat-thread-preview">{t.last_message_body || 'No messages yet'}</div>
                      <div className="chat-thread-meta">
                        <span className="chat-role-pill">{t.peer_role}</span>
                        <span>{formatTime(t.last_message_at || t.updated_at)}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="chat-main" aria-label="Messages">
          {!selectedThreadId ? (
            <div className="chat-empty">
              <p className="chat-empty-title">{isAdmin ? 'Select a conversation' : 'Preparing your chat…'}</p>
              <p className="chat-muted">Premium live messaging with read receipts and instant delivery.</p>
            </div>
          ) : (
            <>
              <header className="chat-pane-header">
                <div>
                  <h2 className="chat-pane-title">
                    {activeThread?.peer_name || `Conversation #${selectedThreadId}`}
                  </h2>
                  <p className="chat-pane-sub">
                    {activeThread?.peer_role ? `${activeThread.peer_role} · ` : ''}
                    Thread #{selectedThreadId}
                  </p>
                </div>
              </header>

              <div className="chat-messages">
                {loadingMessages ? (
                  <div className="chat-muted chat-messages-loading">Loading messages…</div>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === user.id;
                    return (
                      <div key={m.id} className={`chat-row ${mine ? 'chat-row--mine' : 'chat-row--other'}`}>
                        <div className={`chat-bubble ${mine ? 'chat-bubble--mine' : 'chat-bubble--other'}`}>
                          {!mine ? (
                            <div className="chat-bubble-meta">
                              {m.sender_name}
                              {m.sender_role ? <span className="chat-role-pill chat-role-pill--sm">{m.sender_role}</span> : null}
                            </div>
                          ) : null}
                          <div className="chat-bubble-body">{m.body}</div>
                          <div className="chat-bubble-time">{formatTime(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <footer className="chat-composer">
                <textarea
                  className="chat-textarea"
                  rows={2}
                  placeholder="Write a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button type="button" className="btn btn-primary chat-send" disabled={sending || !draft.trim()} onClick={send}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
