import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['candidate', 'interviewer'], required: true },
  status: { type: String, enum: ['joined', 'left', 'disconnected'], default: 'joined' },
  roomId: { type: String, required: true },
  // Media status fields for video calling
  audioEnabled: { type: Boolean, default: true },
  videoEnabled: { type: Boolean, default: false },
  mediaReady: { type: Boolean, default: false },
  // Timestamps
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date },
  lastActive: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default mongoose.model('Participant', ParticipantSchema); 
