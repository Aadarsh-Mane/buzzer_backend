import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  title: { type: String, required: true },
  jobPosition: { type: String, required: true },
  interviewType: { type: String, enum: ['1-on-1', 'panel', 'group'], required: true },
  interviewMode: { type: String, enum: ['audio', 'video'], required: true },
  timeLimit: { type: Number, required: true },
  maxParticipants: { type: Number, required: true },
  scheduledTime: { type: Date, required: true },
  customQuestions: [{ type: String }],
  roomId: { type: String, required: true, unique: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Participant' }],
  status: { type: String, enum: ['scheduled', 'active', 'completed'], default: 'scheduled' }
});

export default mongoose.model('Room', RoomSchema); 