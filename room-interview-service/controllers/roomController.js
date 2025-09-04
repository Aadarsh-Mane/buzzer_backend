import Room from '../models/Room.js';
import Participant from '../models/Participant.js';
import { nanoid } from 'nanoid';

// POST /room/create
export const createRoom = async (req, res) => {
  try {
    const {
      title,
      jobPosition,
      interviewType,
      interviewMode,
      timeLimit,
      maxParticipants,
      scheduledTime,
      customQuestions,
      interviewerId,
      interviewerName
    } = req.body;
    if (!interviewType) {
      return res.status(400).json({ error: 'Interview type is required' });
    }
    const roomId = nanoid(8);
    const room = await Room.create({
      title,
      jobPosition,
      interviewType,
      interviewMode,
      timeLimit,
      maxParticipants,
      scheduledTime,
      customQuestions,
      roomId
    });
    // Add interviewer as first participant
    const participant = await Participant.create({
      userId: interviewerId,
      name: interviewerName,
      role: 'interviewer',
      status: 'joined',
      roomId
    });
    room.participants.push(participant._id);
    await room.save();
    res.status(201).json({ roomId, interviewType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /room/join
export const joinRoom = async (req, res) => {
  try {
    const { roomId, userId, name } = req.body;
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    // Check if already joined
    let participant = await Participant.findOne({ roomId, userId });
    if (!participant) {
      participant = await Participant.create({
        userId,
        name,
        role: 'candidate',
        status: 'joined',
        roomId
      });
      room.participants.push(participant._id);
      await room.save();
    } else {
      participant.status = 'joined';
      await participant.save();
    }
    res.status(200).json({ status: 'joined', roomId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /room/info/:roomId
export const getRoomInfo = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId }).lean();
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.status(200).json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 