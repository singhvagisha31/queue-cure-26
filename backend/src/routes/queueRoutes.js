import express from 'express';
import {
  addPatient,
  getAllPatients,
  callNext,
  getCurrentServing,
  saveSettings,
  getSettings
} from '../controllers/queueController.js';
import {
  validatePatient,
  validateSettings
} from '../middlewares/validate.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Patient Queue routes
router.post('/patients', validatePatient, addPatient);
router.get('/patients', getAllPatients);
router.post('/call-next', protect, callNext);
router.get('/current-token', getCurrentServing);

// Clinic Settings routes
router.post('/settings', protect, validateSettings, saveSettings);
router.get('/settings', getSettings);

export default router;
