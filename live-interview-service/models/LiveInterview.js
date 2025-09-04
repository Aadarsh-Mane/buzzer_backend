import mongoose from 'mongoose';

const LiveInterviewSchema = new mongoose.Schema({
  // Basic interview info
  interviewId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  jobPosition: { 
    type: String, 
    required: true 
  },
  company: { 
    type: String, 
    required: true 
  },
  interviewType: { 
    type: String, 
    enum: ['technical', 'behavioral', 'mixed'], 
    default: 'mixed' 
  },
  language: { 
    type: String, 
    default: 'English' 
  },
  
  // Participants
  candidate: {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    resume: { type: String }, // Cloudinary URL
    joinedAt: { type: Date },
    leftAt: { type: Date }
  },
  interviewer: {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    joinedAt: { type: Date },
    leftAt: { type: Date }
  },
  
  // Interview details
  jobDescription: { type: String },
  meetingLink: { type: String },
  scheduledTime: { type: Date, required: true },
  startedAt: { type: Date },
  endedAt: { type: Date },
  duration: { type: Number }, // in minutes
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['scheduled', 'active', 'paused', 'completed', 'cancelled'], 
    default: 'scheduled' 
  },
  
  // Screen and audio capture
  screenRecording: {
    enabled: { type: Boolean, default: false },
    url: { type: String },
    duration: { type: Number }
  },
  audioRecording: {
    enabled: { type: Boolean, default: false },
    url: { type: String },
    duration: { type: Number }
  },
  
  // AI assistance for stealth console
  aiAssistance: {
    enabled: { type: Boolean, default: true },
    model: { type: String, default: 'gpt-4' },
    apiKey: { type: String },
    responses: [{
      question: { type: String, required: true },
      candidateAnswer: { type: String },
      aiSuggestion: { type: String },
      timestamp: { type: Date, default: Date.now },
      confidence: { type: Number, min: 0, max: 1 }
    }]
  },
  
  // Questions and responses tracking
  questions: [{
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    category: { type: String, enum: ['technical', 'behavioral', 'general'] },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    askedBy: { type: String, required: true }, // interviewer userId
    askedAt: { type: Date, default: Date.now },
    candidateResponse: { type: String },
    aiSuggestion: { type: String },
    responseTime: { type: Number }, // in seconds
    score: { type: Number, min: 0, max: 10 },
    feedback: { type: String }
  }],
  
  // Performance metrics
  performance: {
    totalQuestions: { type: Number, default: 0 },
    answeredQuestions: { type: Number, default: 0 },
    averageResponseTime: { type: Number },
    averageScore: { type: Number },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    overallRating: { type: Number, min: 1, max: 10 }
  },
  
  // Speech recognition logs
  speechLogs: [{
    id: { type: String, required: true },
    timestamp: { type: Date, required: true },
    action: { type: String, required: true },
    text: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    user: { type: String, required: true },
    role: { type: String, required: true }
  }],
  
  // Notes and feedback
  interviewerNotes: { type: String },
  candidateFeedback: { type: String },
  finalVerdict: { 
    type: String, 
    enum: ['pass', 'fail', 'consider', 'strong_pass'] 
  },
  
  // Technical metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true }
}, {
  timestamps: true
});

// Indexes for better query performance
LiveInterviewSchema.index({ interviewId: 1 });
LiveInterviewSchema.index({ 'candidate.userId': 1 });
LiveInterviewSchema.index({ 'interviewer.userId': 1 });
LiveInterviewSchema.index({ status: 1 });
LiveInterviewSchema.index({ scheduledTime: 1 });

// Pre-save middleware to update timestamps
LiveInterviewSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for calculating duration
LiveInterviewSchema.virtual('calculatedDuration').get(function() {
  if (this.startedAt && this.endedAt) {
    return Math.round((this.endedAt - this.startedAt) / 1000 / 60); // minutes
  }
  return null;
});

// Method to add a question
LiveInterviewSchema.methods.addQuestion = function(questionData) {
  this.questions.push(questionData);
  this.performance.totalQuestions = this.questions.length;
  return this.save();
};

// Method to update performance metrics
LiveInterviewSchema.methods.updatePerformance = function() {
  const answeredQuestions = this.questions.filter(q => q.candidateResponse);
  const responseTimes = answeredQuestions.map(q => q.responseTime).filter(t => t);
  
  this.performance.answeredQuestions = answeredQuestions.length;
  this.performance.averageResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;
  this.performance.averageScore = answeredQuestions.length > 0 
    ? answeredQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / answeredQuestions.length 
    : 0;
    
  return this.save();
};

export default mongoose.model('LiveInterview', LiveInterviewSchema); 