import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema({
  questionId: { type: Number, required: true },
  answerText: String,
  timestamp: Date
}, { _id: false });

const MockInterviewSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  position: { type: String, required: true },
  level: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  questionCount: { type: Number, default: 10 },
  questions: [{
    text: String,
    keywords: [String],
    idealAnswer: String
  }],
  answers: [AnswerSchema],
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  overallScore: Number,
  overallFeedback: String,
  questionFeedback: [{
    score: Number,
    feedback: String
  }],
  status: { 
    type: String, 
    enum: ['created', 'in_progress', 'completed', 'evaluated'], 
    default: 'created' 
  }
});

export default mongoose.model('MockInterview', MockInterviewSchema);