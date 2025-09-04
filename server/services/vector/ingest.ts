import { nanoid } from 'nanoid';
import { qdrant, COLLECTIONS } from './qdrant-client-local';
import { embed } from '../embeddings';

interface Chunk {
  id?: string;
  text: string;
  metadata?: any;
}

export async function upsertVectors(
  chunks: Chunk[],
  documentMetadata: any,
  collectionName: string = COLLECTIONS.MANUAL_CHUNKS
): Promise<void> {
  if (!chunks || chunks.length === 0) {
    console.log('⚠️ No chunks to vectorize');
    return;
  }
  
  console.log(`🔍 Vectorizing ${chunks.length} chunks to collection ${collectionName}...`);
  
  // Generate embeddings for all chunks
  const texts = chunks.map(c => c.text);
  const vectors = await embed(texts);
  
  // Prepare points for Qdrant
  const points = chunks.map((chunk, i) => ({
    id: chunk.id || nanoid(),
    vector: vectors[i],
    payload: {
      text: chunk.text,
      ...documentMetadata,
      ...chunk.metadata,
      uploadedAt: new Date().toISOString(),
    },
  }));
  
  // Upsert to Qdrant in batches of 100
  const batchSize = 100;
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    await qdrant.upsert(collectionName, {
      points: batch,
      wait: true,
    });
    console.log(`✅ Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(points.length / batchSize)}`);
  }
  
  console.log(`✅ Successfully vectorized ${chunks.length} chunks`);
}

export async function searchVectors(
  query: string,
  limit: number = 10,
  collectionName: string = COLLECTIONS.MANUAL_CHUNKS
): Promise<any[]> {
  console.log(`🔍 Searching in ${collectionName} for: ${query.substring(0, 50)}...`);
  
  // Generate embedding for query
  const [queryVector] = await embed([query]);
  
  // Search in Qdrant
  const results = await qdrant.search(collectionName, {
    vector: queryVector,
    limit,
    with_payload: true,
  });
  
  console.log(`✅ Found ${results.length} results`);
  return results;
}

export async function deleteVectors(
  ids: string[],
  collectionName: string = COLLECTIONS.MANUAL_CHUNKS
): Promise<void> {
  if (!ids || ids.length === 0) return;
  
  console.log(`🗑️ Deleting ${ids.length} vectors from ${collectionName}...`);
  
  await qdrant.delete(collectionName, {
    points: ids,
    wait: true,
  });
  
  console.log(`✅ Deleted ${ids.length} vectors`);
}