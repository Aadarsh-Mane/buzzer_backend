import LiveInterview from '../models/LiveInterview.js';
import aiHelper from '../utils/aiHelper.js';
import { v4 as uuidv4 } from 'uuid';

class LiveInterviewController {
  // Create a new live interview session
  async createInterview(req, res) {
    try {
      const {
        title,
        jobPosition,
        company,
        interviewType,
        language,
        jobDescription,
        meetingLink,
        scheduledTime,
        candidate,
        interviewer,
        createdBy
      } = req.body;

      // Validate required fields
      if (!title || !jobPosition || !company || !candidate || !interviewer) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Generate unique interview ID
      const interviewId = `live_${uuidv4().replace(/-/g, '')}`;

      // Create new interview session
      const interview = new LiveInterview({
        interviewId,
        title,
        jobPosition,
        company,
        interviewType: interviewType || 'mixed',
        language: language || 'English',
        jobDescription,
        meetingLink,
        scheduledTime: new Date(scheduledTime),
        candidate: {
          userId: candidate.userId,
          name: candidate.name,
          email: candidate.email,
          resume: candidate.resume
        },
        interviewer: {
          userId: interviewer.userId,
          name: interviewer.name,
          email: interviewer.email
        },
        createdBy
      });

      await interview.save();

      res.status(201).json({
        success: true,
        message: 'Live interview session created successfully',
        data: {
          interviewId: interview.interviewId,
          title: interview.title,
          status: interview.status,
          scheduledTime: interview.scheduledTime
        }
      });
    } catch (error) {
      console.error('Error creating interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create interview session',
        error: error.message
      });
    }
  }

  // Get interview details
  async getInterview(req, res) {
    try {
      const { interviewId } = req.params;

      const interview = await LiveInterview.findOne({ interviewId });

      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      res.status(200).json({
        success: true,
        data: interview
      });
    } catch (error) {
      console.error('Error getting interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get interview details',
        error: error.message
      });
    }
  }

  // Join interview session
  async joinInterview(req, res) {
    try {
      const { interviewId } = req.params;
      const { userId, name, email, role } = req.body;

      const interview = await LiveInterview.findOne({ interviewId });

      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Update participant join time
      if (role === 'candidate' && interview.candidate.userId === userId) {
        interview.candidate.joinedAt = new Date();
      } else if (role === 'interviewer' && interview.interviewer.userId === userId) {
        interview.interviewer.joinedAt = new Date();
      }

      // Start interview if both participants have joined
      if (interview.candidate.joinedAt && interview.interviewer.joinedAt && interview.status === 'scheduled') {
        interview.status = 'active';
        interview.startedAt = new Date();
      }

      await interview.save();

      res.status(200).json({
        success: true,
        message: 'Successfully joined interview',
        data: {
          interviewId: interview.interviewId,
          status: interview.status,
          role
        }
      });
    } catch (error) {
      console.error('Error joining interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to join interview',
        error: error.message
      });
    }
  }

  // Leave interview session
  async leaveInterview(req, res) {
    try {
      const { interviewId } = req.params;
      const { userId, role } = req.body;

      const interview = await LiveInterview.findOne({ interviewId });

      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Update participant leave time
      if (role === 'candidate' && interview.candidate.userId === userId) {
        interview.candidate.leftAt = new Date();
      } else if (role === 'interviewer' && interview.interviewer.userId === userId) {
        interview.interviewer.leftAt = new Date();
      }

      // End interview if both participants have left
      if (interview.candidate.leftAt && interview.interviewer.leftAt) {
        interview.status = 'completed';
        interview.endedAt = new Date();
        interview.duration = Math.round((interview.endedAt - interview.startedAt) / 1000 / 60);
      }

      await interview.save();

      res.status(200).json({
        success: true,
        message: 'Successfully left interview',
        data: {
          interviewId: interview.interviewId,
          status: interview.status
        }
      });
    } catch (error) {
      console.error('Error leaving interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to leave interview',
        error: error.message
      });
    }
  }

  // Add a question to the interview
  async addQuestion(req, res) {
    try {
      const { interviewId } = req.params;
      const { question, category, difficulty, askedBy } = req.body;

      const interview = await LiveInterview.findOne({ interviewId });

      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      const questionData = {
        questionId: uuidv4(),
        question,
        category: category || 'general',
        difficulty: difficulty || 'medium',
        askedBy,
        askedAt: new Date()
      };

      await interview.addQuestion(questionData);

      res.status(200).json({
        success: true,
        message: 'Question added successfully',
        data: questionData
      });
    } catch (error) {
      console.error('Error adding question:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add question',
        error: error.message
      });
    }
  }

  // Record candidate response
  async recordResponse(req, res) {
    try {
      const { interviewId } = req.params;
      const { questionId, response, responseTime } = req.body;

      const interview = await LiveInterview.findOne({ interviewId });

      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Find the question and update with response
      const question = interview.questions.find(q => q.questionId === questionId);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      question.candidateResponse = response;
      question.responseTime = responseTime;

      // Get AI assistance if enabled
      if (interview.aiAssistance.enabled) {
        const aiAssistance = await aiHelper.provideAssistance(
          question.question,
          response,
          interview.jobDescription
        );

        question.aiSuggestion = aiAssistance.suggestion;
        question.score = aiAssistance.score;

        // Add to AI responses tracking
        interview.aiAssistance.responses.push({
          question: question.question,
          candidateAnswer: response,
          aiSuggestion: aiAssistance.suggestion,
          timestamp: new Date(),
          confidence: aiAssistance.confidence
        });
      }

      await interview.updatePerformance();
      await interview.save();

      res.status(200).json({
        success: true,
        message: 'Response recorded successfully',
        data: {
          questionId,
          aiSuggestion: question.aiSuggestion,
          score: question.score
        }
      });
    } catch (error) {
      console.error('Error recording response:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record response',
        error: error.message
      });
    }
  }

  // Generate AI questions
  async generateQuestions(req, res) {
    try {
      const { interviewId } = req.params;
      const { count = 10 } = req.query;

      const interview = await LiveInterview.findOne({ interviewId });

      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      const questions = await aiHelper.generateQuestions(
        interview.jobDescription,
        interview.candidate.resume,
        interview.interviewType,
        parseInt(count)
      );

      res.status(200).json({
        success: true,
        message: 'Questions generated successfully',
        data: questions
      });
    } catch (error) {
      console.error('Error generating questions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate questions',
        error: error.message
      });
    }
  }

  // Get AI assistance for stealth console
  async getAIAssistance(req, res) {
    try {
      const { interviewId } = req.params;
      const { question, candidateAnswer } = req.body;

      const interview = await LiveInterview.findOne({ interviewId });

      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      const assistance = await aiHelper.provideAssistance(
        question,
        candidateAnswer,
        interview.jobDescription
      );

      res.status(200).json({
        success: true,
        message: 'AI assistance generated',
        data: assistance
      });
    } catch (error) {
      console.error('Error getting AI assistance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get AI assistance',
        error: error.message
      });
    }
  }

  // End interview and generate final analysis
  async endInterview(req, res) {
    try {
      const { interviewId } = req.params;
      const { interviewerNotes, candidateFeedback } = req.body;

      const interview = await LiveInterview.findOne({ interviewId });

      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Update interview status
      interview.status = 'completed';
      interview.endedAt = new Date();
      interview.duration = Math.round((interview.endedAt - interview.startedAt) / 1000 / 60);
      interview.interviewerNotes = interviewerNotes;
      interview.candidateFeedback = candidateFeedback;

      // Generate final performance analysis
      const questions = interview.questions.map(q => q.question);
      const responses = interview.questions.map(q => q.candidateResponse);

      const performanceAnalysis = await aiHelper.analyzePerformance(
        questions,
        responses,
        interview.jobDescription
      );

      // Update performance metrics
      interview.performance = {
        ...interview.performance,
        strengths: performanceAnalysis.strengths,
        weaknesses: performanceAnalysis.weaknesses,
        overallRating: performanceAnalysis.score
      };

      interview.finalVerdict = performanceAnalysis.recommendation;

      await interview.save();

      res.status(200).json({
        success: true,
        message: 'Interview ended successfully',
        data: {
          interviewId: interview.interviewId,
          duration: interview.duration,
          performance: interview.performance,
          finalVerdict: interview.finalVerdict
        }
      });
    } catch (error) {
      console.error('Error ending interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to end interview',
        error: error.message
      });
    }
  }

  // Get user's interview history
  async getInterviewHistory(req, res) {
    try {
      const { userId } = req.params;
      const { role, status, limit = 10, page = 1 } = req.query;

      const query = {
        $or: [
          { 'candidate.userId': userId },
          { 'interviewer.userId': userId }
        ]
      };

      if (role) {
        if (role === 'candidate') {
          query.$or = [{ 'candidate.userId': userId }];
        } else if (role === 'interviewer') {
          query.$or = [{ 'interviewer.userId': userId }];
        }
      }

      if (status) {
        query.status = status;
      }

      const interviews = await LiveInterview.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .select('-aiAssistance.responses');

      const total = await LiveInterview.countDocuments(query);

      res.status(200).json({
        success: true,
        data: {
          interviews,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error getting interview history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get interview history',
        error: error.message
      });
    }
  }
}

export default new LiveInterviewController(); 