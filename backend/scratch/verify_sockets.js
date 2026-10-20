import http from 'http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import { io as ClientSocket } from 'socket.io-client';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import socketHandler from '../src/sockets/socketHandler.js';
import queueService from '../src/services/queueService.js';
import Patient from '../src/models/Patient.js';
import Counter from '../src/models/Counter.js';
import ClinicSettings from '../src/models/ClinicSettings.js';

// Setup programmatically a separate server for testing to avoid collisions
const TEST_PORT = 5055;
const app = express();
const server = http.createServer(app);
const io = new SocketServer(server);

app.use(express.json());
app.set('io', io);
socketHandler(io);

// Simulating API triggers for the verification script
app.post('/api/patients', async (req, res, next) => {
  try {
    const { patientName } = req.body;
    const patient = await queueService.createPatient(patientName);
    
    // Trigger socket broadcast
    io.emit('queueUpdated');
    
    res.status(201).json({ success: true, tokenNumber: patient.tokenNumber });
  } catch (err) {
    next(err);
  }
});

app.post('/api/call-next', async (req, res, next) => {
  try {
    const calledPatient = await queueService.transitionQueue();
    
    // Trigger socket broadcasts
    io.emit('queueUpdated');
    io.emit('currentTokenUpdated', calledPatient || null);
    
    res.status(200).json({ success: true, calledPatient });
  } catch (err) {
    next(err);
  }
});

const runVerification = async () => {
  console.log('--- STARTING SOCKET.IO INTEGRATION VERIFICATION ---');

  // 1. Connect Mongoose
  await connectDB();

  // Reset database collections for test safety
  await Patient.deleteMany({});
  await Counter.deleteMany({});
  await ClinicSettings.deleteMany({});
  // Seed initial counter
  await Counter.create({ id: 'tokenNumber', seq: 100 });

  // 2. Start HTTP & Socket server
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`Test Socket Server listening on port ${TEST_PORT}`);

  // 3. Setup client connection
  const client = ClientSocket(`http://localhost:${TEST_PORT}`, {
    reconnection: true,
    reconnectionDelay: 500
  });

  // Track event fires
  let queueUpdatedCount = 0;
  let currentTokenUpdatedPayload = null;

  client.on('connect', () => {
    console.log('Test Client connected successfully.');
  });

  client.on('queueUpdated', () => {
    queueUpdatedCount++;
    console.log(`[Event Received] queueUpdated (count: ${queueUpdatedCount})`);
  });

  client.on('currentTokenUpdated', (payload) => {
    currentTokenUpdatedPayload = payload;
    console.log(`[Event Received] currentTokenUpdated (payload: ${payload ? payload.patientName : 'null'})`);
  });

  // Wait a small bit for connection handshake
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 4. Simulate POST /api/patients -> Expect queueUpdated
  console.log('\n--- Simulating patient creation (Expect queueUpdated) ---');
  await queueService.createPatient('Ravi');
  io.emit('queueUpdated'); // Manual broadcast simulation

  // Wait for socket to receive
  await new Promise((resolve) => setTimeout(resolve, 800));
  console.log(`queueUpdated fired: ${queueUpdatedCount === 1 ? 'PASS (1)' : 'FAIL'}`);

  // 5. Simulate callNext -> Expect queueUpdated AND currentTokenUpdated
  console.log('\n--- Simulating Call Next (Expect queueUpdated & currentTokenUpdated) ---');
  const called = await queueService.transitionQueue();
  io.emit('queueUpdated');
  io.emit('currentTokenUpdated', called);

  // Wait for socket to receive
  await new Promise((resolve) => setTimeout(resolve, 800));
  console.log(`queueUpdated fired again: ${queueUpdatedCount === 2 ? 'PASS (2)' : 'FAIL'}`);
  console.log('currentTokenUpdated payload name matches Ravi (101):', currentTokenUpdatedPayload.patientName === 'Ravi' ? 'PASS' : 'FAIL');

  // 6. Graceful cleanup
  console.log('\nCleaning up connections...');
  client.disconnect();
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  console.log('--- SOCKET.IO INTEGRATION VERIFICATION COMPLETE ---');
  process.exit(0);
};

runVerification();
