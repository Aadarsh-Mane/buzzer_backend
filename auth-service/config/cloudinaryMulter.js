import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'resumes',
    resource_type: 'raw', // for PDF and other non-image files
    format: async (req, file) => 'pdf', // force pdf extension
    public_id: (req, file) => `${req.user._id}_${Date.now()}`,
  },
});

export default storage;
