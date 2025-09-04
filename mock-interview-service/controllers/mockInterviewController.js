import MockInterview from '../models/MockInterview.js';
import { generateQuestionsWithFallback, evaluateInterviewWithFallback } from '../utils/openai.js';

// 1. Start a new mock interview
export const startMockInterview = async (req, res) => {
  try {
    const { userId, position, level, questionCount = 5 } = req.body;
    
    const questions = await generateQuestionsWithFallback(position, level, questionCount);
    
    const interview = await MockInterview.create({
      userId,
      position,
      level,
      questionCount,
      questions,
      status: 'in_progress'
    });

    res.status(201).json({ 
      interviewId: interview._id,
      questionCount: interview.questions.length
    });
  } catch (err) {
    console.error("Start interview error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 2. Get next question for a session
export const getNextQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const interview = await MockInterview.findById(id);
    
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    if (interview.status !== 'in_progress') {
      return res.status(400).json({ error: 'Interview is not in progress' });
    }

    const answeredCount = interview.answers.length;
    if (answeredCount >= interview.questions.length) {
      return res.status(200).json({ done: true });
    }

    const nextQuestion = interview.questions[answeredCount];
    
    res.status(200).json({ 
      question: nextQuestion, 
      currentIndex: answeredCount,
      totalQuestions: interview.questions.length 
    });
  } catch (err) {
    console.error("Get next question error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 3. Submit answer for a question
export const submitAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { answerText, questionIndex } = req.body;
    
    const interview = await MockInterview.findById(id);
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    if (interview.status !== 'in_progress') {
      return res.status(400).json({ error: 'Interview is not in progress' });
    }

    if (questionIndex >= interview.questions.length) {
      return res.status(400).json({ error: 'Invalid question index' });
    }

    // Update existing answer or add new one
    if (questionIndex < interview.answers.length) {
      interview.answers[questionIndex] = {
        questionId: questionIndex,
        answerText,
        timestamp: new Date()
      };
    } else {
      interview.answers.push({
        questionId: questionIndex,
        answerText,
        timestamp: new Date()
      });
    }

    await interview.save();
    res.status(200).json({ message: 'Answer saved' });
  } catch (err) {
    console.error("Submit answer error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 4. Submit the whole interview for evaluation
export const submitInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const interview = await MockInterview.findById(id);
    
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    if (interview.status !== 'in_progress') {
      return res.status(400).json({ error: 'Interview is not in progress' });
    }

    if (interview.answers.length < interview.questions.length) {
      return res.status(400).json({ error: 'Not all questions answered' });
    }

    interview.endTime = new Date();
    interview.status = 'completed';
    await interview.save();

    // Evaluate using Gemini (fallback to OpenAI)
    const evaluation = await evaluateInterviewWithFallback(interview);
    
    interview.overallScore = evaluation.overallScore;
    interview.overallFeedback = evaluation.overallFeedback;
    interview.questionFeedback = evaluation.questionFeedback;
    interview.status = 'evaluated';
    
    await interview.save();
    
    res.status(200).json({ 
      message: 'Interview evaluated',
      score: interview.overallScore
    });
  } catch (err) {
    console.error("Submit interview error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 5. Get result and feedback
export const getInterviewResults = async (req, res) => {
  try {
    const { id } = req.params;
    const interview = await MockInterview.findById(id);
    
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    if (interview.status !== 'evaluated') {
      return res.status(400).json({ error: 'Interview not evaluated yet' });
    }

    // Map questions with answers and feedback
    const detailedResults = interview.questions.map((q, index) => ({
      question: q.text,
      answer: interview.answers[index]?.answerText || '',
      score: interview.questionFeedback[index]?.score || 0,
      feedback: interview.questionFeedback[index]?.feedback || ''
    }));

    res.status(200).json({
      position: interview.position,
      level: interview.level,
      overallScore: interview.overallScore,
      overallFeedback: interview.overallFeedback,
      startTime: interview.startTime,
      endTime: interview.endTime,
      duration: interview.endTime ? (interview.endTime - interview.startTime) : null,
      results: detailedResults
    });
  } catch (err) {
    console.error("Get results error:", err);
    res.status(500).json({ error: err.message });
  }
};