import queueService from '../services/queueService.js';
import smsService from '../services/smsService.js';

// API 1: Add patient to queue
export const addPatient = async (req, res, next) => {
  try {
    const { patientName, phoneNumber } = req.body;
    const patient = await queueService.createPatient(patientName, phoneNumber);

    // Broadcast update to real-time clients
    const io = req.app.get('io');
    if (io) {
      io.emit('queueUpdated');
    }

    res.status(201).json({
      success: true,
      tokenNumber: patient.tokenNumber
    });
  } catch (error) {
    next(error);
  }
};

// API 2: Get all patients sorted by token number
export const getAllPatients = async (req, res, next) => {
  try {
    const patients = await queueService.getAllPatients();
    res.status(200).json(patients);
  } catch (error) {
    next(error);
  }
};

// API 3: Move current serving to completed, and next waiting to serving
export const callNext = async (req, res, next) => {
  try {
    const calledPatient = await queueService.transitionQueue();

    // Broadcast update to real-time clients
    const io = req.app.get('io');
    if (io) {
      io.emit('queueUpdated');
      io.emit('currentTokenUpdated', calledPatient || null);
    }

    // Send SMS notification in background (non-blocking)
    if (calledPatient) {
      smsService.sendNotification(calledPatient.phoneNumber, calledPatient.patientName, calledPatient.tokenNumber);
    }

    res.status(200).json({
      success: true,
      calledPatient: calledPatient || null
    });
  } catch (error) {
    next(error);
  }
};

// API 4: Get currently serving patient
export const getCurrentServing = async (req, res, next) => {
  try {
    const current = await queueService.getCurrentServingPatient();
    res.status(200).json(current || null);
  } catch (error) {
    next(error);
  }
};

// API 5: Save average consultation time
export const saveSettings = async (req, res, next) => {
  try {
    const { averageConsultationTime } = req.body;
    const settings = await queueService.upsertSettings(averageConsultationTime);

    // Broadcast update to real-time clients
    const io = req.app.get('io');
    if (io) {
      io.emit('queueUpdated');
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    next(error);
  }
};

// API 6: Get average consultation time
export const getSettings = async (req, res, next) => {
  try {
    const settings = await queueService.getSettings();
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};
