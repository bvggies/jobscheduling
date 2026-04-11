import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getChatSocketOrigin, isChatSocketEnabled } from '../services/api';

const ChatSocketContext = createContext(null);

export function ChatSocketProvider({ children }) {
  const { user, authReady } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketAllowed = isChatSocketEnabled();

  useEffect(() => {
    if (!authReady || !user) {
      setSocket((prev) => {
        if (prev) prev.disconnect();
        return null;
      });
      setConnected(false);
      return undefined;
    }

    const token = localStorage.getItem('jobscheduler_token');
    if (!token) {
      setConnected(false);
      return undefined;
    }

    if (!socketAllowed) {
      setSocket((prev) => {
        if (prev) prev.disconnect();
        return null;
      });
      setConnected(false);
      return undefined;
    }

    const s = io(getChatSocketOrigin(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      reconnectionDelay: 800,
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    setSocket(s);

    return () => {
      s.disconnect();
      setConnected(false);
    };
  }, [authReady, user, socketAllowed]);

  const value = useMemo(
    () => ({ socket, connected, realtimeDisabled: !socketAllowed }),
    [socket, connected, socketAllowed]
  );
  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>;
}

export function useChatSocket() {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    throw new Error('useChatSocket must be used within ChatSocketProvider');
  }
  return ctx;
}
