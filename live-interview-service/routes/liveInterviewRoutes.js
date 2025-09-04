import express from 'express';
import liveInterviewController from '../controllers/liveInterviewController.js';
import geminiHelper from '../utils/geminiHelper.js';

const router = express.Router();

// Create a new live interview session
router.post('/create', liveInterviewController.createInterview);

// Get interview details
router.get('/:interviewId', liveInterviewController.getInterview);

// Join interview session
router.post('/:interviewId/join', liveInterviewController.joinInterview);

// Leave interview session
router.post('/:interviewId/leave', liveInterviewController.leaveInterview);

// Add a question to the interview
router.post('/:interviewId/questions', liveInterviewController.addQuestion);

// Record candidate response
router.post('/:interviewId/responses', liveInterviewController.recordResponse);

// Generate AI questions
router.get('/:interviewId/generate-questions', liveInterviewController.generateQuestions);

// Get AI assistance for stealth console
router.post('/:interviewId/ai-assistance', liveInterviewController.getAIAssistance);

// Get Gemini AI help for technical questions
router.post('/gemini-help', async (req, res) => {
  try {
    const { question, context } = req.body;
    
    if (!question) {
      return res.status(400).json({ 
        success: false, 
        error: 'Question is required' 
      });
    }

    const response = await geminiHelper.provideTechnicalHelp(question, context);
    
    res.json({
      success: true,
      response: response
    });
  } catch (error) {
    console.error('Gemini help error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI help'
    });
  }
});

// End interview and generate final analysis
router.post('/:interviewId/end', liveInterviewController.endInterview);

// Get user's interview history
router.get('/history/:userId', liveInterviewController.getInterviewHistory);

export default router; 