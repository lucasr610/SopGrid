#!/usr/bin/env tsx
// Reset vectorized flag and vectorize all remaining documents

import { MongoStorage } from '../services/mongodb-storage';
import { openaiService } from '../services/openai-service';
import { documentProcessor } from '../services/document-processor';
import crypto from 'crypto';

const QDRANT_URL = 'https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.4wuUJcX36bgvwigD9_9_2v4nvxgEXQfqZebzfPmheXo';
const BATCH_SIZE = 5;

async function resetAndVectorizeAll() {
  console.log('🚀 VECTORIZING ALL REMAINING DOCUMENTS\n');
  console.log('=' .repeat(60));
  
  try {
    // Initialize MongoDB
    const mongoStorage = new MongoStorage(
      process.env.MONGODB_URI || "mongodb+srv://ai-sop-dev.nezgetk.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ai-sop-dev"
    );
    
    await mongoStorage.connect();
    
    // Get all documents
    const documents = await mongoStorage.getAllDocuments();
    console.log(`📚 Total documents: ${documents.length}`);
    
    // Filter for substantial technical content
    const techDocs = documents.filter(doc => {
      if (!doc.content || doc.content.length < 500) return false;
      
      const contentLower = doc.content.toLowerCase();
      
      // Include all RV/technical content
      return (
        contentLower.includes('lippert') ||
        contentLower.includes('lci') ||
        contentLower.includes('slide') ||
        contentLower.includes('hydraulic') ||
        contentLower.includes('awning') ||
        contentLower.includes('leveling') ||
        contentLower.includes('refrigerat') ||
        contentLower.includes('dometic') ||
        contentLower.includes('rv') ||
        contentLower.includes('trailer') ||
        contentLower.includes('motor') ||
        contentLower.includes('pump') ||
        contentLower.includes('electrical') ||
        contentLower.includes('plumbing') ||
        contentLower.includes('technician') ||
        contentLower.includes('manual') ||
        contentLower.includes('installation') ||
        contentLower.includes('troubleshoot') ||
        contentLower.includes('repair') ||
        contentLower.includes('maintenance') ||
        contentLower.includes('service') ||
        contentLower.includes('technical') ||
        contentLower.includes('spec') ||
        contentLower.includes('procedure')
      );
    });
    
    console.log(`🎯 Found ${techDocs.length} technical documents`);
    
    // Reset vectorized flag for these documents
    console.log('🔄 Resetting vectorized flags...');
    for (const doc of techDocs) {
      await mongoStorage.updateDocument(doc.id, { vectorized: false });
    }
    
    // Get initial Qdrant count
    const initialResponse = await fetch(`${QDRANT_URL}/collections/document_memory`, {
      headers: { 'api-key': API_KEY }
    });
    const initialData = await initialResponse.json();
    const initialCount = initialData.result?.points_count || 0;
    console.log(`📊 Starting with ${initialCount} points in Qdrant\n`);
    
    // Process documents
    let totalProcessed = 0;
    let totalChunks = 0;
    let totalErrors = 0;
    
    // Process up to 100 documents
    const docsToProcess = techDocs.slice(0, 100);
    const totalBatches = Math.ceil(docsToProcess.length / BATCH_SIZE);
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const start = batchNum * BATCH_SIZE;
      const batch = docsToProcess.slice(start, start + BATCH_SIZE);
      
      if (batch.length === 0) break;
      
      console.log(`\nBATCH ${batchNum + 1}/${totalBatches}:`);
      
      for (const doc of batch) {
        const displayName = doc.normalizedTitle || doc.originalName || doc.filename || `Doc ${doc.id}`;
        
        try {
          console.log(`  ${displayName.substring(0, 60)}...`);
          
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
            console.log(`    ✅ ${chunks.length} chunks`);
            totalProcessed++;
            totalChunks += chunks.length;
          } else {
            console.error(`    ❌ Failed`);
            totalErrors++;
          }
          
        } catch (error: any) {
          console.error(`    ❌ Error: ${error.message}`);
          totalErrors++;
        }
      }
      
      // Small delay between batches
      if (batchNum < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    // Final results
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FINAL RESULTS');
    console.log('=' .repeat(60));
    
    const finalResponse = await fetch(`${QDRANT_URL}/collections/document_memory`, {
      headers: { 'api-key': API_KEY }
    });
    const finalData = await finalResponse.json();
    const finalCount = finalData.result?.points_count || 0;
    
    console.log(`✅ Processed: ${totalProcessed} documents`);
    console.log(`📦 Total chunks: ${totalChunks}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log(`☁️ Qdrant points: ${finalCount} (added: +${finalCount - initialCount})`);
    
    console.log('\n✅ Vectorization complete!');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

resetAndVectorizeAll().catch(console.error);