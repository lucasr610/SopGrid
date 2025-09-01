#!/usr/bin/env tsx
// Automatically vectorize all documents ingested by the crawler

import { MongoStorage } from '../services/mongodb-storage';
import { openaiService } from '../services/openai-service';
import { documentProcessor } from '../services/document-processor';
import crypto from 'crypto';

const QDRANT_URL = 'https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.4wuUJcX36bgvwigD9_9_2v4nvxgEXQfqZebzfPmheXo';
const BATCH_SIZE = 10;
const CHECK_INTERVAL = 30000; // Check every 30 seconds

async function vectorizeNewDocuments() {
  const mongoStorage = new MongoStorage(
    process.env.MONGODB_URI || "mongodb+srv://ai-sop-dev.nezgetk.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ai-sop-dev"
  );
  
  await mongoStorage.connect();
  
  // Get all non-vectorized documents
  const documents = await mongoStorage.getAllDocuments();
  const nonVectorized = documents.filter(doc => 
    !doc.vectorized && 
    doc.content && 
    doc.content.length > 500
  );
  
  if (nonVectorized.length === 0) {
    return 0;
  }
  
  console.log(`\n🔄 Found ${nonVectorized.length} new documents to vectorize`);
  
  let totalProcessed = 0;
  let totalChunks = 0;
  
  for (let i = 0; i < nonVectorized.length; i += BATCH_SIZE) {
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
              source: doc.sourceUrl || doc.url || 'unknown',
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
          await mongoStorage.updateDocument(doc.id, { vectorized: true });
          console.log(`  ✅ ${displayName.substring(0, 50)}... (${chunks.length} chunks)`);
          totalProcessed++;
          totalChunks += chunks.length;
        } else {
          console.error(`  ❌ Failed: ${displayName.substring(0, 50)}...`);
        }
        
      } catch (error: any) {
        console.error(`  ❌ Error: ${displayName.substring(0, 50)}... - ${error.message}`);
      }
    }
    
    // Small delay between batches
    if (i + BATCH_SIZE < nonVectorized.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (totalProcessed > 0) {
    console.log(`\n✅ Vectorized ${totalProcessed} documents (${totalChunks} chunks)`);
  }
  
  return totalProcessed;
}

async function monitorAndVectorize() {
  console.log('🤖 AUTO-VECTORIZATION SERVICE STARTED');
  console.log('=' .repeat(60));
  console.log('Monitoring for new crawler documents...\n');
  
  while (true) {
    try {
      const count = await vectorizeNewDocuments();
      
      if (count === 0) {
        process.stdout.write(`\r⏳ Waiting... (checked at ${new Date().toLocaleTimeString()})`);
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
      
    } catch (error) {
      console.error('\n❌ Error in vectorization:', error);
      // Continue monitoring even after errors
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
  }
}

// Start monitoring
monitorAndVectorize().catch(console.error);