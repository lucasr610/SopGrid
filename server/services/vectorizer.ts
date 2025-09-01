import { openaiService } from './openai-service';
import { documentProcessor } from './document-processor';
import { storage } from '../storage';
import { qdrantClient } from './qdrant-client';
import crypto from 'crypto';

interface VectorChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  documentId: string;
}

interface QueryResult {
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

class Vectorizer {
  private initialized = false;

  async initialize(): Promise<void> {
    if (!this.initialized) {
      const connected = await qdrantClient.initialize();
      if (connected) {
        console.log('✅ Vectorizer connected to Qdrant cloud');
      } else {
        console.log('⚠️ Qdrant not available - vectors will not persist');
      }
      this.initialized = true;
    }
  }

  async embedDocument(
    documentId: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.initialize();
    
    // Process and chunk the document
    const processedContent = await documentProcessor.preprocessDocument(content);
    const chunks = await documentProcessor.chunkDocument(processedContent, 1000);
    
    // Generate embeddings for each chunk
    const embeddings = await openaiService.generateEmbeddings(chunks);
    
    // Store chunks in Qdrant cloud
    const points = [];
    for (let i = 0; i < chunks.length; i++) {
      // Generate a UUID for the chunk ID
      const chunkId = crypto.randomUUID();
      points.push({
        id: chunkId,
        vector: embeddings[i],
        payload: {
          content: chunks[i],
          documentId,
          chunkIndex: i,
          totalChunks: chunks.length,
          chunkKey: `${documentId}-chunk-${i}`, // Store original key in payload
          ...metadata
        }
      });
    }
    
    // Upsert to Qdrant cloud
    const success = await qdrantClient.upsertPoints('document_memory', points);
    
    if (success) {
      console.log(`✅ Stored ${chunks.length} chunks in Qdrant for document ${documentId}`);
      
      // Update document status
      const document = await storage.getDocument(documentId);
      if (document) {
        await storage.updateDocument(documentId, { vectorized: true });
      }
    } else {
      console.error(`❌ Failed to store vectors in Qdrant for document ${documentId}`);
    }
  }

  async query(searchQuery: string, options: { limit?: number } = {}): Promise<QueryResult[]> {
    await this.initialize();
    const limit = options.limit || 20;
    
    console.log(`🔍 Vectorizer searching for: "${searchQuery}"`);
    
    // Generate embedding for search query
    const queryEmbeddings = await openaiService.generateEmbeddings([searchQuery]);
    const queryEmbedding = queryEmbeddings[0];
    
    // Search in Qdrant
    const searchResults = await qdrantClient.searchVector(
      'document_memory',
      queryEmbedding,
      limit
    );
    
    // Map results to expected format
    return searchResults.map(result => ({
      content: result.payload?.content || '',
      metadata: {
        documentId: result.payload?.documentId,
        source: result.payload?.source,
        title: result.payload?.title,
        chunkIndex: result.payload?.chunkIndex,
        ...result.payload
      },
      similarity: result.score || 0
    }));
  }

  async getDocumentChunks(documentId: string): Promise<VectorChunk[]> {
    await this.initialize();
    
    // Search for all chunks of a document
    const filter = {
      must: [
        {
          key: 'documentId',
          match: { value: documentId }
        }
      ]
    };
    
    const results = await qdrantClient.searchWithFilter('document_memory', filter, 100);
    
    return results.map(result => ({
      id: result.id,
      content: result.payload?.content || '',
      embedding: [], // Not returning full embeddings to save bandwidth
      metadata: result.payload || {},
      documentId
    }));
  }

  async deleteDocumentChunks(documentId: string): Promise<void> {
    await this.initialize();
    
    // Delete all chunks for a document
    const filter = {
      must: [
        {
          key: 'documentId',
          match: { value: documentId }
        }
      ]
    };
    
    await qdrantClient.deletePoints('document_memory', filter);
    console.log(`Deleted chunks for document ${documentId} from Qdrant`);
  }

  async getStats(): Promise<{ totalChunks: number; totalDocuments: number; qdrantConnected: boolean }> {
    await this.initialize();
    
    const stats = await qdrantClient.getCollectionInfo('document_memory');
    
    return {
      totalChunks: (stats as any)?.points_count || 0, // Use points_count instead of vectors_count
      totalDocuments: 0, // Would need to query unique documentIds
      qdrantConnected: qdrantClient.isQdrantConnected()
    };
  }
}

export const vectorizer = new Vectorizer();