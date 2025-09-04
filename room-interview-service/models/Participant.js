import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['candidate', 'interviewer'], required: true },
  status: { type: String, enum: ['joined', 'left', 'disconnected'], default: 'joined' },
  roomId: { type: String, required: true }
});

export default mongoose.model('Participant', ParticipantSchema); 