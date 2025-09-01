// Automatic vectorization service for crawler documents
import { MongoStorage } from './mongodb-storage';
import { openaiService } from './openai-service';
import { documentProcessor } from './document-processor';
import crypto from 'crypto';

const QDRANT_URL = 'https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.4wuUJcX36bgvwigD9_9_2v4nvxgEXQfqZebzfPmheXo';
const BATCH_SIZE = 5;
const CHECK_INTERVAL = 10000; // Check every 10 seconds for new crawler docs

class AutoVectorizerService {
  private mongoStorage: MongoStorage;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.mongoStorage = new MongoStorage(
      process.env.MONGODB_URI || "mongodb+srv://ai-sop-dev.nezgetk.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ai-sop-dev"
    );
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Auto-vectorizer service is already running');
      return;
    }

    console.log('🤖 Starting auto-vectorization service for crawler documents...');
    await this.mongoStorage.connect();
    this.isRunning = true;

    // Initial run
    await this.vectorizeNewDocuments();

    // Set up interval
    this.intervalId = setInterval(async () => {
      await this.vectorizeNewDocuments();
    }, CHECK_INTERVAL);
  }

  async stop() {
    if (!this.isRunning) return;

    console.log('🛑 Stopping auto-vectorization service...');
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private async vectorizeNewDocuments() {
    try {
      // Get all non-vectorized documents
      const documents = await this.mongoStorage.getAllDocuments();
      const nonVectorized = documents.filter(doc => 
        !doc.vectorized && 
        doc.content && 
        doc.content.length > 500
      );

      if (nonVectorized.length === 0) {
        return;
      }

      console.log(`🚀 Auto-vectorizing ${nonVectorized.length} new crawler documents...`);

      let totalProcessed = 0;
      let totalChunks = 0;

      for (let i = 0; i < Math.min(nonVectorized.length, 50); i += BATCH_SIZE) {
        const batch = nonVectorized.slice(i, i + BATCH_SIZE);

        for (const doc of batch) {
          const displayName = doc.normalizedTitle || doc.originalName || doc.filename || `Doc ${doc.id}`;

          try {
            // Process and chunk
            const processedContent = await documentProcessor.preprocessDocument(doc.content!);
            const chunks = await documentProcessor.chunkDocument(processedContent, 1000);

            // Generate embeddings
            const embeddings = await openaiService.generateEmbeddings(chunks);

            // Create points
            const points = [];
            for (let j = 0; j < chunks.length; j++) {
              points.push({
                id: crypto.randomUUID(),
                vector: embeddings[j],
                payload: {
                  content: chunks[j],
                  documentId: doc.id,
                  title: displayName,
                  source: doc.sourceUrl || doc.url || 'crawler',
                  chunkIndex: j,
                  totalChunks: chunks.length,
                  type: doc.docType || 'manual',
                  createdAt: doc.createdAt || new Date().toISOString()
                }
              });
            }

            // Upload to Qdrant with wait=true
            const response = await fetch(`${QDRANT_URL}/collections/document_memory/points?wait=true`, {
              method: 'PUT',
              headers: {
                'api-key': API_KEY,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ points })
            });

            const result = await response.json();

            if (response.ok && result.status === 'ok') {
              await this.mongoStorage.updateDocument(doc.id, { vectorized: true });
              totalProcessed++;
              totalChunks += chunks.length;
            }

          } catch (error: any) {
            console.error(`❌ Failed to vectorize: ${displayName.substring(0, 30)}... - ${error.message}`);
          }
        }

        // Small delay between batches
        if (i + BATCH_SIZE < Math.min(nonVectorized.length, 50)) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      if (totalProcessed > 0) {
        console.log(`✅ Auto-vectorized ${totalProcessed} documents (${totalChunks} chunks)`);
      }

    } catch (error) {
      console.error('❌ Error in auto-vectorization:', error);
    }
  }
}

// Create singleton instance
export const autoVectorizerService = new AutoVectorizerService();