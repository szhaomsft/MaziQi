import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 3000);
const COLS = 6;
const ROWS = 8;
const rooms = new Map();
const queue = [];

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, queue: queue.length }));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('MaziQi realtime server');
});

const wss = new WebSocketServer({ server });

function send(ws, type, payload = {}) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ...payload }));
}

function broadcast(room, type, payload = {}) {
  for (const player of room.players) send(player.ws, type, payload);
}

function roomCode() {
  let code = '';
  do {
    code = `MZQ-${Math.floor(1000 + Math.random() * 9000)}`;
  } while (rooms.has(code));
  return code;
}

function makeBoard() {
  const pieces = [];
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let col = 0; col < COLS; col++) {
    const blue = { id: col + COLS, side: 'blue', col, row: 0, alive: true };
    const red = { id: col, side: 'red', col, row: 7, alive: true };
    pieces.push(blue, red);
    board[0][col] = blue.id;
    board[7][col] = red.id;
  }
  return { pieces, board };
}

function publicRoom(room) {
  return {
    roomId: room.id,
    currentTurn: room.currentTurn,
    winner: room.winner,
    moveCount: room.moveCount || 0,
    board: room.board,
    pieces: room.pieces,
    players: room.players.map(player => ({
      id: player.id,
      side: player.side,
      name: player.name,
      rating: player.rating,
      avatar: player.avatar,
    })),
  };
}

function normalizeProfile(raw = {}) {
  return {
    name: String(raw.name || 'Guest').slice(0, 16),
    rating: Number(raw.rating) || 1200,
    avatar: String(raw.avatar || '🐴').slice(0, 4),
  };
}

function createRoom(ownerWs, requestedCode = '') {
  const code = String(requestedCode || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12) || roomCode();
  if (rooms.has(code)) throw new Error('ROOM_EXISTS');
  const state = makeBoard();
  const room = {
    id: code,
    ...state,
    players: [{ ws: ownerWs, id: ownerWs.playerId, side: 'red', ...ownerWs.profile }],
    currentTurn: 'red',
    winner: null,
    moveCount: 0,
    createdAt: Date.now(),
    lastMoveAt: Date.now(),
  };
  rooms.set(code, room);
  ownerWs.roomId = code;
  return room;
}

function joinRoom(ws, code) {
  const room = rooms.get(code);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  if (room.players.length >= 2 && !room.players.some(player => player.id === ws.playerId)) throw new Error('ROOM_FULL');
  if (!room.players.some(player => player.id === ws.playerId)) {
    room.players.push({ ws, id: ws.playerId, side: 'blue', ...ws.profile });
  }
  ws.roomId = room.id;
  return room;
}

function pieceById(room, id) {
  return room.pieces.find(piece => piece.id === id && piece.alive);
}

function isHorseMoveLegal(room, piece, toCol, toRow) {
  if (!piece || toCol < 0 || toCol >= COLS || toRow < 0 || toRow >= ROWS) return false;
  const dc = toCol - piece.col;
  const dr = toRow - piece.row;
  const validShape = (Math.abs(dc) === 1 && Math.abs(dr) === 2) || (Math.abs(dc) === 2 && Math.abs(dr) === 1);
  if (!validShape) return false;
  const legCol = piece.col + (Math.abs(dc) === 2 ? Math.sign(dc) : 0);
  const legRow = piece.row + (Math.abs(dr) === 2 ? Math.sign(dr) : 0);
  if (room.board[legRow][legCol] !== null) return false;
  const targetId = room.board[toRow][toCol];
  if (targetId === null) return true;
  const target = pieceById(room, targetId);
  return target && target.side !== piece.side;
}

function applyMove(room, piece, toCol, toRow) {
  const capturedId = room.board[toRow][toCol];
  if (capturedId !== null) {
    const captured = pieceById(room, capturedId);
    if (captured) captured.alive = false;
  }
  room.board[piece.row][piece.col] = null;
  piece.col = toCol;
  piece.row = toRow;
  room.board[toRow][toCol] = piece.id;
  room.lastMoveAt = Date.now();
}

function checkWinner(room) {
  if (room.pieces.some(piece => piece.alive && piece.side === 'red' && piece.row === 0)) return 'red';
  if (room.pieces.some(piece => piece.alive && piece.side === 'blue' && piece.row === 7)) return 'blue';
  const redAlive = room.pieces.some(piece => piece.alive && piece.side === 'red');
  const blueAlive = room.pieces.some(piece => piece.alive && piece.side === 'blue');
  if (!redAlive) return 'blue';
  if (!blueAlive) return 'red';
  return null;
}

function removeFromQueue(ws) {
  const index = queue.indexOf(ws);
  if (index >= 0) queue.splice(index, 1);
}

function handleQueueJoin(ws) {
  if (queue.includes(ws)) return send(ws, 'queue.waiting');
  const opponentIndex = queue.findIndex(other => other !== ws && Math.abs(other.profile.rating - ws.profile.rating) <= 350);
  if (opponentIndex >= 0) {
    const opponent = queue.splice(opponentIndex, 1)[0];
    const room = createRoom(opponent);
    joinRoom(ws, room.id);
    broadcast(room, 'game.start', publicRoom(room));
    return;
  }
  queue.push(ws);
  send(ws, 'queue.waiting');
}

function handleMessage(ws, data) {
  let msg;
  try {
    msg = JSON.parse(data);
  } catch {
    send(ws, 'error', { message: 'BAD_JSON' });
    return;
  }

  try {
    if (msg.type === 'hello') {
      ws.profile = normalizeProfile(msg.profile);
      send(ws, 'hello.ok', { playerId: ws.playerId });
    } else if (msg.type === 'queue.join') {
      handleQueueJoin(ws);
    } else if (msg.type === 'queue.cancel') {
      removeFromQueue(ws);
      send(ws, 'queue.cancelled');
    } else if (msg.type === 'room.create') {
      const room = createRoom(ws, msg.roomId);
      send(ws, 'room.created', publicRoom(room));
    } else if (msg.type === 'room.join') {
      const room = joinRoom(ws, String(msg.roomId || '').trim().toUpperCase());
      broadcast(room, room.players.length === 2 ? 'game.start' : 'room.joined', publicRoom(room));
    } else if (msg.type === 'game.move') {
      const room = rooms.get(ws.roomId);
      const player = room?.players.find(item => item.id === ws.playerId);
      const piece = room && pieceById(room, Number(msg.pieceId));
      if (!room || !player || room.winner) throw new Error('NO_ACTIVE_GAME');
      if (player.side !== room.currentTurn || piece?.side !== player.side) throw new Error('NOT_YOUR_TURN');
      if (!isHorseMoveLegal(room, piece, Number(msg.toCol), Number(msg.toRow))) throw new Error('ILLEGAL_MOVE');
      applyMove(room, piece, Number(msg.toCol), Number(msg.toRow));
      room.moveCount += 1;
      room.winner = checkWinner(room);
      if (!room.winner) room.currentTurn = room.currentTurn === 'red' ? 'blue' : 'red';
      broadcast(room, 'game.state', publicRoom(room));
    } else if (msg.type === 'chat.send') {
      const room = rooms.get(ws.roomId);
      if (!room) throw new Error('NO_ROOM');
      broadcast(room, 'chat.message', { from: ws.playerId, text: String(msg.text || '').slice(0, 40), at: Date.now() });
    } else if (msg.type === 'game.resign') {
      const room = rooms.get(ws.roomId);
      const player = room?.players.find(item => item.id === ws.playerId);
      if (!room || !player || room.winner) throw new Error('NO_ACTIVE_GAME');
      room.winner = player.side === 'red' ? 'blue' : 'red';
      broadcast(room, 'game.state', publicRoom(room));
    }
  } catch (error) {
    send(ws, 'error', { message: error.message || 'SERVER_ERROR' });
  }
}

wss.on('connection', ws => {
  ws.playerId = randomUUID();
  ws.profile = normalizeProfile();
  ws.on('message', data => handleMessage(ws, data));
  ws.on('close', () => {
    removeFromQueue(ws);
    const room = rooms.get(ws.roomId);
    if (!room || room.winner) return;
    const player = room.players.find(item => item.id === ws.playerId);
    if (!player) return;
    room.winner = player.side === 'red' ? 'blue' : 'red';
    broadcast(room, 'game.state', publicRoom(room));
    setTimeout(() => rooms.delete(room.id), 60_000);
  });
  send(ws, 'hello', { playerId: ws.playerId });
});

setInterval(() => {
  const cutoff = Date.now() - 1000 * 60 * 60;
  for (const [id, room] of rooms) {
    if (room.winner && room.lastMoveAt < cutoff) rooms.delete(id);
  }
}, 1000 * 60 * 10).unref();

server.listen(PORT, () => {
  console.log(`MaziQi realtime server listening on ${PORT}`);
});
