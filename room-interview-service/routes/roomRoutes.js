import express from 'express';
import { createRoom, joinRoom, getRoomInfo } from '../controllers/roomController.js';

const router = express.Router();

router.post('/create', createRoom);
router.post('/join', joinRoom);
router.get('/info/:roomId', getRoomInfo);

export default router; 