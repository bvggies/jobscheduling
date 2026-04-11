const { verifyTokenString } = require('./middleware/auth');

let ioInstance = null;

function getChatIO() {
  return ioInstance;
}

function attachChatSocket(httpServer, corsOrigins) {
  let Server;
  try {
    ({ Server } = require('socket.io'));
  } catch (e) {
    console.warn('socket.io is not installed; HTTP API still runs, live chat WebSocket is disabled.', e.message);
    return null;
  }

  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const user = verifyTokenString(token);
    if (!user) {
      return next(new Error('Unauthorized'));
    }
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const uid = socket.user.id;
    socket.join(`user:${uid}`);

    socket.on('join_thread', (threadId, cb) => {
      const tid = parseInt(threadId, 10);
      if (Number.isNaN(tid)) {
        if (typeof cb === 'function') cb({ ok: false });
        return;
      }
      socket.join(`thread:${tid}`);
      if (typeof cb === 'function') cb({ ok: true });
    });

    socket.on('leave_thread', (threadId) => {
      const tid = parseInt(threadId, 10);
      if (!Number.isNaN(tid)) socket.leave(`thread:${tid}`);
    });
  });

  ioInstance = io;
  return io;
}

module.exports = { attachChatSocket, getChatIO };
