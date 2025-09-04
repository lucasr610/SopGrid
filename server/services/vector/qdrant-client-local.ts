import { QdrantClient } from '@qdrant/js-client-rest';

// Use local Qdrant by default, fallback to cloud if configured
const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY;

export const qdrant = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey || undefined, // Only use API key if provided (for cloud)
});

export const COLLECTIONS = {
  MANUAL_CHUNKS: 'manual_chunks_v1',
  DOCUMENT_MEMORY: 'document_memory',
  SOP_MEMORY: 'sop_memory',
  AGENT_MEMORY: 'agent_memory',
};

console.log(`🔍 Qdrant client configured: ${qdrantUrl}`);

// Initialize collections
export async function initializeCollections() {
  const { getEmbeddingDimension } = await import('../embeddings');
  const dimension = await getEmbeddingDimension();
  
  for (const collectionName of Object.values(COLLECTIONS)) {
    try {
      // Check if collection exists
      await qdrant.getCollection(collectionName);
      console.log(`✅ Collection ${collectionName} already exists`);
    } catch (error) {
      // Create collection if it doesn't exist
      console.log(`📦 Creating collection ${collectionName}...`);
      await qdrant.createCollection(collectionName, {
        vectors: {
          size: dimension,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      });
      console.log(`✅ Collection ${collectionName} created`);
    }
  }
}