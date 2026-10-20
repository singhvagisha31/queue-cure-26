import express from 'express';
import {
  registerReceptionist,
  loginReceptionist,
  getMe
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerReceptionist);
router.post('/login', loginReceptionist);
router.get('/me', protect, getMe);

export default router;
