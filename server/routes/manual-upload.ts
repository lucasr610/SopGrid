import express from 'express';
import multer from 'multer';
import { saveManual, listManuals, deleteManual, getManualStats } from '../services/manuals-store';
import { upsertVectors } from '../services/vector/ingest';
import { storage } from '../storage';
import pdfParse from 'pdf-parse';
import { nanoid } from 'nanoid';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Upload manual
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Save to local disk
    const savedPath = saveManual(file.originalname, file.buffer);
    
    // Save metadata to MongoDB if available
    const metadata = {
      id: nanoid(),
      filename: file.originalname,
      path: savedPath,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
    };
    
    // Store in database if using MongoDB
    if (process.env.DB_MODE === 'MONGO') {
      const mongoStorage = storage as any;
      if (mongoStorage.db) {
        await mongoStorage.db.collection('manuals').insertOne(metadata);
      }
    }

    // Parse and chunk if it's a PDF
    let chunks: any[] = [];
    if (file.mimetype === 'application/pdf') {
      try {
        const pdfData = await pdfParse(file.buffer);
        const text = pdfData.text;
        
        // Simple chunking - split into 500 character chunks with overlap
        const chunkSize = 500;
        const overlap = 100;
        
        for (let i = 0; i < text.length; i += chunkSize - overlap) {
          const chunkText = text.slice(i, i + chunkSize);
          if (chunkText.trim()) {
            chunks.push({
              id: `${metadata.id}-chunk-${chunks.length}`,
              text: chunkText,
              metadata: {
                pageNum: Math.floor(i / 3000) + 1, // Rough page estimate
                chunkIndex: chunks.length,
              }
            });
          }
        }
        
        // Vectorize and store in Qdrant
        if (chunks.length > 0) {
          await upsertVectors(chunks, metadata);
        }
      } catch (error) {
        console.error('Error parsing PDF:', error);
      }
    }

    res.json({
      success: true,
      savedPath,
      metadata,
      chunks: chunks.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// List manuals
router.get('/list', async (req, res) => {
  try {
    const files = listManuals();
    const manuals = files.map(filename => {
      const stats = getManualStats(filename);
      return {
        filename,
        size: stats?.size || 0,
        uploadedAt: stats?.mtime || null,
      };
    });
    
    res.json(manuals);
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Failed to list manuals' });
  }
});

// Delete manual
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const success = deleteManual(filename);
    
    if (success) {
      // Also remove from MongoDB if available
      if (process.env.DB_MODE === 'MONGO') {
        const mongoStorage = storage as any;
        if (mongoStorage.db) {
          await mongoStorage.db.collection('manuals').deleteOne({ filename });
        }
      }
      
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Manual not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete manual' });
  }
});

export default router;