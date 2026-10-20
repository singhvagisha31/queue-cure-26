import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import queueService from '../src/services/queueService.js';
import Patient from '../src/models/Patient.js';
import Counter from '../src/models/Counter.js';
import ClinicSettings from '../src/models/ClinicSettings.js';

const runVerification = async () => {
  console.log('--- STARTING BACKEND SERVICE VERIFICATION ---');
  
  // 1. Connect to Database
  await connectDB();

  try {
    // 2. Reset databases for clean verification
    console.log('Resetting database collections...');
    await Patient.deleteMany({});
    await Counter.deleteMany({});
    await ClinicSettings.deleteMany({});

    // 3. Test Clinic Settings Service
    console.log('\n--- Testing Clinic Settings Service ---');
    let settings = await queueService.getSettings();
    console.log('Default settings fetched:', settings.averageConsultationTime === 15 ? 'PASS (15 mins)' : 'FAIL');

    settings = await queueService.upsertSettings(25);
    console.log('Updated settings (upsert):', settings.averageConsultationTime === 25 ? 'PASS (25 mins)' : 'FAIL');

    // 4. Test Patient Registration (Auto token generation starting at 101)
    console.log('\n--- Testing Patient Token Auto-generation ---');
    const p1 = await queueService.createPatient('Ravi');
    console.log(`Created Patient: ${p1.patientName}, Token: ${p1.tokenNumber}`);
    console.log('Token is 101:', p1.tokenNumber === 101 ? 'PASS' : 'FAIL');

    const p2 = await queueService.createPatient('Sarah');
    console.log(`Created Patient: ${p2.patientName}, Token: ${p2.tokenNumber}`);
    console.log('Token is 102:', p2.tokenNumber === 102 ? 'PASS' : 'FAIL');

    const p3 = await queueService.createPatient('Ali');
    console.log(`Created Patient: ${p3.patientName}, Token: ${p3.tokenNumber}`);
    console.log('Token is 103:', p3.tokenNumber === 103 ? 'PASS' : 'FAIL');

    // 5. Test Get All Patients
    console.log('\n--- Testing Fetch All Patients ---');
    const allPatients = await queueService.getAllPatients();
    console.log('Total patients retrieved:', allPatients.length);
    console.log('Correct sorting order:', allPatients[0].tokenNumber === 101 && allPatients[2].tokenNumber === 103 ? 'PASS' : 'FAIL');

    // 6. Test Current Serving Patient (should be null initially)
    console.log('\n--- Testing Currently Serving Patient (Initial) ---');
    let serving = await queueService.getCurrentServingPatient();
    console.log('Currently serving:', serving === null ? 'PASS (None)' : 'FAIL');

    // 7. Transition Queue (Call Next)
    console.log('\n--- Testing Queue Transition (Call Next) ---');
    const called1 = await queueService.transitionQueue();
    console.log(`Transition result: Called Token #${called1.tokenNumber} (${called1.patientName})`);
    console.log('Called patient is Ravi (101):', called1.patientName === 'Ravi' ? 'PASS' : 'FAIL');
    console.log('Ravi status is serving:', called1.status === 'serving' ? 'PASS' : 'FAIL');

    // Verify current serving matches Ravi
    serving = await queueService.getCurrentServingPatient();
    console.log('Currently serving matches Ravi:', serving.patientName === 'Ravi' ? 'PASS' : 'FAIL');

    // Call next patient again
    const called2 = await queueService.transitionQueue();
    console.log(`Transition result: Called Token #${called2.tokenNumber} (${called2.patientName})`);
    console.log('Called patient is Sarah (102):', called2.patientName === 'Sarah' ? 'PASS' : 'FAIL');

    // Check Ravi status (should be completed)
    const raviCheck = await Patient.findOne({ patientName: 'Ravi' });
    console.log('Ravi transitioned to completed:', raviCheck.status === 'completed' ? 'PASS' : 'FAIL');

    // Test Duplicate Patient Registration Block
    console.log('\n--- Testing Duplicate Patient Block ---');
    try {
      await queueService.createPatient('Ali');
      console.log('Duplicate Ali registration: FAIL (Should have blocked)');
    } catch (err) {
      console.log('Duplicate Ali registration:', err.message.includes('already in the waiting queue') ? 'PASS (Blocked successfully)' : 'FAIL');
    }

    console.log('\n--- ALL SERVICE VERIFICATIONS COMPLETE ---');
  } catch (error) {
    console.error('Verification failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
};

runVerification();
