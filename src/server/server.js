import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import makeApp from './app.js';

const app = makeApp(["user", "session", "review", "tag", "venue"]);
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('register_app_room', () => {
    let roomCode;
    do {
      roomCode = generateRoomCode();
    } while (rooms.has(roomCode));

    rooms.set(roomCode, {
      appSocket: socket.id,
      controllerSockets: new Set(),
      cursor: { x: 0, y: 0 },
      cursorVisible: false,
      focusedElementSelector: null,
      focusedElementValue: null
    });

    socket.join(roomCode);
    socket.emit('your_room_id', roomCode);
    console.log(`App registered room: ${roomCode} (socket: ${socket.id})`);
  });

  socket.on('rejoin_app_room', (roomCode) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.appSocket = socket.id;
      socket.join(roomCode);
      socket.emit('your_room_id', roomCode);
      socket.emit('initial_state', {
        cursor: room.cursor,
        focusedElementSelector: room.focusedElementSelector,
        focusedElementValue: room.focusedElementValue
      });
      console.log(`App rejoined room: ${roomCode}`);
    } else {
      socket.emit('rejoin_failed', roomCode);
    }
  });

  socket.on('controller_connect', (roomCode) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.controllerSockets.add(socket.id);
      socket.join(roomCode);
      socket.emit('controller_connected', { roomCode });
      socket.emit('initial_state', {
        cursor: room.cursor,
        cursorVisible: room.cursorVisible,
        focusedElementSelector: room.focusedElementSelector,
        focusedElementValue: room.focusedElementValue
      });
      console.log(`Controller connected to room: ${roomCode} (socket: ${socket.id})`);
    } else {
      socket.emit('controller_error', { message: 'Room not found' });
    }
  });

  socket.on('cursor_move', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      socket.to(data.roomId).emit('cursor_move', {
        deltaX: data.deltaX || 0,
        deltaY: data.deltaY || 0
      });
    }
  });

  socket.on('set_cursor_visibility', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.cursorVisible = data.isVisible;
      socket.to(data.roomId).emit('set_cursor_visibility', data.isVisible);
    }
  });

  socket.on('tap', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      socket.to(data.roomId).emit('tap', data);
    }
  });

  socket.on('key_input', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      socket.to(data.roomId).emit('key_input', data);
    }
  });

  socket.on('report_focus_change', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.focusedElementSelector = data.focusInfo.selector;
      room.focusedElementValue = data.focusInfo.value;
      socket.to(data.roomId).emit('focus_change', data.focusInfo);
    }
  });

  socket.on('report_cursor_position', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.cursor = data.pos;
    }
  });

  socket.on('disconnect', () => {
    for (const [roomCode, room] of rooms.entries()) {
      if (room.appSocket === socket.id) {
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} deleted (app disconnected)`);
        break;
      }
      if (room.controllerSockets.has(socket.id)) {
        room.controllerSockets.delete(socket.id);
        console.log(`Controller disconnected from room ${roomCode}`);
        break;
      }
    }
  });
});

ViteExpress.bind(app, httpServer);

httpServer.listen(3000, () =>
  console.log("Server is listening on port 3000..."),
);