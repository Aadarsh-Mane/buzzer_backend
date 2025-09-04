import express from 'express';
import {
  startMockInterview,
  getNextQuestion,
  submitAnswer,
  submitInterview,
  getInterviewResults
} from '../controllers/mockInterviewController.js';

const router = express.Router();

// 1. Start a new mock interview
router.post('/start', startMockInterview);

// 2. Get next question for a session
router.get('/:id/next-question', getNextQuestion);

// 3. Submit answer for a question
router.post('/:id/answer', submitAnswer);

// 4. Submit the whole interview for evaluation
router.post('/:id/submit', submitInterview);

// 5. Get result and feedback
router.get('/:id/results', getInterviewResults);

export default router;