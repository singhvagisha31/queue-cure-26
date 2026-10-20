export default function socketHandler(io) {
  io.on('connection', (socket) => {
    console.log(`Real-time client connected: ${socket.id}`);

    // Standard heartbeat / health check listener
    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('disconnect', (reason) => {
      console.log(`Real-time client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });
}
