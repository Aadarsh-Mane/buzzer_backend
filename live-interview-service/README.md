# Live Interview Service

A sophisticated microservice for managing real-time live interview sessions with AI-powered assistance and stealth monitoring capabilities.

## 🚀 Features

### Core Functionality
- **Real-time Interview Sessions** - Create and manage live interview rooms
- **Screen & Audio Capture** - Capture candidate's screen and audio during interviews
- **AI-Powered Assistance** - Real-time AI suggestions for candidate responses
- **Stealth Console** - Hidden monitoring interface for interviewers
- **Question Management** - Track questions, responses, and performance metrics
- **Interview Analytics** - Comprehensive performance analysis and scoring

### AI Capabilities
- **Smart Question Generation** - AI generates relevant questions based on job description
- **Response Analysis** - Real-time analysis of candidate responses
- **Performance Scoring** - Automated scoring and feedback
- **Follow-up Questions** - AI suggests follow-up questions based on responses

## 🏗️ Architecture

```
Live Interview Service (Port 6004)
├── REST API Endpoints
├── Socket.io Real-time Communication
├── MongoDB Data Storage
├── AI Integration (OpenAI/Gemini)
└── Screen/Audio Capture
```

## 📋 API Endpoints

### Interview Management
- `POST /live-interview/create` - Create new interview session
- `GET /live-interview/:interviewId` - Get interview details
- `POST /live-interview/:interviewId/join` - Join interview session
- `POST /live-interview/:interviewId/leave` - Leave interview session

### Questions & Responses
- `POST /live-interview/:interviewId/questions` - Add question to interview
- `POST /live-interview/:interviewId/responses` - Record candidate response
- `GET /live-interview/:interviewId/generate-questions` - Generate AI questions

### AI Assistance
- `POST /live-interview/:interviewId/ai-assistance` - Get AI assistance for response
- `POST /live-interview/:interviewId/end` - End interview with analysis

### History & Analytics
- `GET /live-interview/history/:userId` - Get user's interview history

## 🔌 Socket.io Events

### Client to Server
- `join-interview` - Join interview room
- `leave-interview` - Leave interview room
- `ask-question` - Ask a question
- `candidate-response` - Record candidate response
- `request-ai-assistance` - Request AI assistance
- `capture-status` - Update screen/audio capture status

### Server to Client
- `interview-joined` - Confirmation of joining interview
- `interview-update` - Interview status updates
- `participant-joined` - New participant joined
- `participant-left` - Participant left
- `question-asked` - New question asked
- `response-recorded` - Response recorded with AI analysis
- `ai-assistance` - AI assistance response
- `capture-update` - Screen/audio capture updates

## 🛠️ Setup & Installation

### Prerequisites
- Node.js >= 18.0.0
- MongoDB
- OpenAI API Key (optional)
- Gemini API Key (optional)

### Environment Variables
```env
PORT=6004
MONGO_URI=mongodb://localhost:27017/interview
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:4001
```

### Installation
```bash
cd backend/live-interview-service
npm install
npm run dev
```

## 🎯 Usage Examples

### 1. Create Interview Session
```javascript
const response = await fetch('http://localhost:6004/live-interview/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "Senior Developer Interview",
    jobPosition: "Senior Software Engineer",
    company: "Tech Corp",
    interviewType: "technical",
    language: "English",
    jobDescription: "We are looking for...",
    meetingLink: "https://zoom.us/j/...",
    scheduledTime: "2024-01-15T10:00:00Z",
    candidate: {
      userId: "candidate123",
      name: "John Doe",
      email: "john@example.com"
    },
    interviewer: {
      userId: "interviewer456",
      name: "Jane Smith",
      email: "jane@company.com"
    },
    createdBy: "candidate123"
  })
});
```

### 2. Join Interview via Socket.io
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:6004');

socket.emit('join-interview', {
  interviewId: 'live_abc123',
  userId: 'candidate123',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'candidate'
});

socket.on('interview-joined', (data) => {
  console.log('Joined interview:', data);
});
```

### 3. Ask Question
```javascript
socket.emit('ask-question', {
  interviewId: 'live_abc123',
  question: 'Tell me about your experience with React.',
  category: 'technical',
  difficulty: 'medium',
  askedBy: 'interviewer456'
});
```

### 4. Record Response
```javascript
socket.emit('candidate-response', {
  interviewId: 'live_abc123',
  questionId: 'q_xyz789',
  response: 'I have 3 years of experience with React...',
  responseTime: 5000
});
```

### 5. Request AI Assistance
```javascript
socket.emit('request-ai-assistance', {
  interviewId: 'live_abc123',
  question: 'Tell me about your experience with React.',
  candidateAnswer: 'I have some experience with React.'
});
```

## 🕵️ Stealth Console

The Stealth Console is a hidden monitoring interface that allows interviewers to:

1. **Monitor Interviews** - Real-time view of interview progress
2. **Simulate Responses** - Test AI assistance with hypothetical responses
3. **Get AI Suggestions** - Receive real-time AI-powered answer suggestions
4. **Track Performance** - Monitor question history and analytics

### Stealth Console Features
- **Real-time Monitoring** - Watch interviews as they happen
- **AI Assistance Testing** - Test AI responses with simulated candidate answers
- **Performance Analytics** - Track question scores and response quality
- **Question History** - View all questions and responses
- **Confidence Scoring** - AI confidence levels for responses

## 🔧 Configuration

### AI Models
The service supports multiple AI models:
- **OpenAI GPT-4** (default) - High-quality responses
- **Google Gemini** - Alternative AI provider
- **Fallback Questions** - Pre-defined questions when AI is unavailable

### Performance Tracking
- **Response Time** - Track how long candidates take to respond
- **AI Scoring** - Automated scoring of responses (1-10 scale)
- **Confidence Levels** - AI confidence in suggestions (0-1)
- **Key Points** - Important points that should be mentioned
- **Improvement Areas** - Suggestions for better responses

## 📊 Data Models

### LiveInterview Schema
```javascript
{
  interviewId: String,
  title: String,
  jobPosition: String,
  company: String,
  interviewType: String,
  language: String,
  candidate: {
    userId: String,
    name: String,
    email: String,
    resume: String
  },
  interviewer: {
    userId: String,
    name: String,
    email: String
  },
  questions: [{
    questionId: String,
    question: String,
    category: String,
    difficulty: String,
    candidateResponse: String,
    aiSuggestion: String,
    score: Number
  }],
  performance: {
    totalQuestions: Number,
    answeredQuestions: Number,
    averageScore: Number,
    strengths: [String],
    weaknesses: [String]
  }
}
```

## 🚨 Error Handling

The service includes comprehensive error handling:
- **Validation Errors** - Input validation with clear error messages
- **Connection Errors** - Graceful handling of Socket.io disconnections
- **AI Service Errors** - Fallback mechanisms when AI services are unavailable
- **Database Errors** - Retry logic for MongoDB connections

## 🔒 Security Features

- **Rate Limiting** - Prevent abuse with request rate limiting
- **Input Validation** - Comprehensive input sanitization
- **CORS Configuration** - Proper cross-origin resource sharing
- **Helmet Security** - Security headers and protection

## 📈 Monitoring & Logging

- **Request Logging** - Morgan HTTP request logging
- **Error Tracking** - Comprehensive error logging
- **Performance Metrics** - Response time and throughput tracking
- **Health Checks** - Service health monitoring endpoint

## 🤝 Integration

### Frontend Integration
The service is designed to work seamlessly with React frontend:
- **Socket.io Client** - Real-time communication
- **REST API** - CRUD operations
- **Screen Capture** - Browser-based screen sharing
- **Audio Capture** - Microphone access

### Chrome Extension Integration
Future plans include Chrome extension for:
- **Screen Capture** - Browser extension for screen recording
- **Audio Capture** - System audio recording
- **Real-time Monitoring** - Live feed to stealth console

## 🎯 Use Cases

1. **Technical Interviews** - Code reviews and technical discussions
2. **Behavioral Interviews** - Soft skills and experience evaluation
3. **Panel Interviews** - Multiple interviewer scenarios
4. **Remote Interviews** - Distributed team interviews
5. **AI-Assisted Interviews** - Automated question generation and scoring

## 🔮 Future Enhancements

- **Video Recording** - Full interview video recording
- **Transcription** - Speech-to-text conversion
- **Advanced Analytics** - Detailed performance insights
- **Multi-language Support** - International interview support
- **Chrome Extension** - Browser-based screen capture
- **Mobile Support** - Mobile app for interview participation

## 📞 Support

For questions and support:
- Check the API documentation
- Review the Socket.io event documentation
- Test with the provided frontend components
- Monitor server logs for debugging

---

**Note**: This service is designed for educational and professional use. Ensure compliance with privacy laws and ethical guidelines when recording interviews. 