#!/usr/bin/env tsx
// Reset and vectorize LCI documents with proper persistence

import { MongoStorage } from '../services/mongodb-storage';
import { openaiService } from '../services/openai-service';
import { documentProcessor } from '../services/document-processor';
import crypto from 'crypto';

const QDRANT_URL = 'https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.4wuUJcX36bgvwigD9_9_2v4nvxgEXQfqZebzfPmheXo';

async function resetAndVectorizeLCI() {
  console.log('🔄 RESET AND VECTORIZE LCI DOCUMENTS\n');
  console.log('=' .repeat(60));
  
  try {
    // Initialize MongoDB
    const mongoStorage = new MongoStorage(
      process.env.MONGODB_URI || "mongodb+srv://ai-sop-dev.nezgetk.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ai-sop-dev"
    );
    
    await mongoStorage.connect();
    
    // Get initial Qdrant count
    const initialResponse = await fetch(`${QDRANT_URL}/collections/document_memory`, {
      headers: { 'api-key': API_KEY }
    });
    const initialData = await initialResponse.json();
    const initialCount = initialData.result?.points_count || 0;
    console.log(`📊 Starting with ${initialCount} points in Qdrant\n`);
    
    // Get all documents
    const documents = await mongoStorage.getAllDocuments();
    
    // Find LCI/technical documents
    const techDocs = documents.filter(doc => {
      if (!doc.content || doc.content.length < 500) return false;
      
      const contentLower = doc.content.toLowerCase();
      const titleLower = (doc.normalizedTitle || doc.originalName || '').toLowerCase();
      
      return (
        contentLower.includes('lippert') ||
        contentLower.includes('lci') ||
        contentLower.includes('slide-out') ||
        contentLower.includes('slide out') ||
        contentLower.includes('hydraulic') ||
        contentLower.includes('awning') ||
        contentLower.includes('leveling') ||
        titleLower.includes('lippert') ||
        titleLower.includes('slide') ||
        titleLower.includes('hydraulic')
      );
    });
    
    console.log(`📚 Found ${techDocs.length} technical documents`);
    
    // Reset first 20 documents
    const docsToProcess = techDocs.slice(0, 20);
    console.log(`🔄 Resetting ${docsToProcess.length} documents...\n`);
    
    for (const doc of docsToProcess) {
      await mongoStorage.updateDocument(doc.id, { vectorized: false });
    }
    
    let totalProcessed = 0;
    let totalChunks = 0;
    
    for (let i = 0; i < docsToProcess.length; i++) {
      const doc = docsToProcess[i];
      const displayName = doc.normalizedTitle || doc.originalName || doc.filename || `Doc ${doc.id}`;
      
      try {
        console.log(`[${i + 1}/${docsToProcess.length}] ${displayName.substring(0, 50)}...`);
        
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
              source: doc.sourceUrl || `https://support.lci1.com/doc/${doc.id}`,
              chunkIndex: j,
              totalChunks: chunks.length
            }
          });
        }
        
        // Upload with wait=true
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
          console.log(`   ✅ ${chunks.length} chunks stored (op: ${result.result?.operation_id})`);
          totalProcessed++;
          totalChunks += chunks.length;
        } else {
          console.error(`   ❌ Failed: ${response.status} - ${JSON.stringify(result)}`);
        }
        
        // Delay every 3 documents
        if ((i + 1) % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Final verification
    console.log('\n' + '=' .repeat(60));
    
    const finalResponse = await fetch(`${QDRANT_URL}/collections/document_memory`, {
      headers: { 'api-key': API_KEY }
    });
    const finalData = await finalResponse.json();
    const finalCount = finalData.result?.points_count || 0;
    
    console.log(`✅ Processed: ${totalProcessed} documents`);
    console.log(`📦 Total chunks: ${totalChunks}`);
    console.log(`☁️ Qdrant points: ${finalCount} (added: +${finalCount - initialCount})`);
    
    console.log('\n✅ Complete!');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

resetAndVectorizeLCI().catch(console.error);