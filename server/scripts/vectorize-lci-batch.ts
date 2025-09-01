#!/usr/bin/env tsx
// Batch vectorization of LCI technical documents

import { MongoStorage } from '../services/mongodb-storage';
import { openaiService } from '../services/openai-service';
import { documentProcessor } from '../services/document-processor';
import crypto from 'crypto';

const QDRANT_URL = 'https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.4wuUJcX36bgvwigD9_9_2v4nvxgEXQfqZebzfPmheXo';
const BATCH_SIZE = 5;

async function vectorizeBatch() {
  console.log('🚀 BATCH VECTORIZATION OF LCI TECHNICAL DOCUMENTS\n');
  console.log('=' .repeat(60));
  
  try {
    // Initialize services
    const mongoStorage = new MongoStorage(
      process.env.MONGODB_URI || "mongodb+srv://ai-sop-dev.nezgetk.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ai-sop-dev"
    );
    
    await mongoStorage.connect();
    // OpenAI service doesn't need initialization
    
    // Get all documents
    const documents = await mongoStorage.getAllDocuments();
    
    // Find LCI/technical documents - we'll reset them first
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
        contentLower.includes('stabilization') ||
        titleLower.includes('lippert') ||
        titleLower.includes('slide') ||
        titleLower.includes('hydraulic') ||
        titleLower.includes('awning')
      );
    });
    
    console.log(`📚 Found ${techDocs.length} technical documents`);
    
    // Reset vectorized flag for first 30 documents
    const docsToReset = techDocs.slice(0, 30);
    console.log(`🔄 Resetting ${docsToReset.length} documents...`);
    for (const doc of docsToReset) {
      await mongoStorage.updateDocument(doc.id, { vectorized: false });
    }
    
    // Now filter for unprocessed documents
    const unprocessedDocs = docsToReset.filter(doc => !doc.vectorized);
    
    // Process in batches
    const totalBatches = Math.ceil(docsToReset.length / BATCH_SIZE);
    let totalProcessed = 0;
    let totalChunks = 0;
    
    for (let batchNum = 0; batchNum < Math.min(totalBatches, 10); batchNum++) {
      const start = batchNum * BATCH_SIZE;
      const batch = docsToReset.slice(start, start + BATCH_SIZE);
      
      if (batch.length === 0) break;
      
      console.log(`\n📦 BATCH ${batchNum + 1}/${Math.min(totalBatches, 10)}: Processing ${batch.length} documents`);
      console.log('-' .repeat(60));
      
      for (const doc of batch) {
        const displayName = doc.normalizedTitle || doc.originalName || doc.filename || `Doc ${doc.id}`;
        
        try {
          console.log(`\n📄 ${displayName}`);
          console.log(`   Size: ${doc.content?.length || 0} chars`);
          
          // Process and chunk the document
          const processedContent = await documentProcessor.preprocessDocument(doc.content!);
          const chunks = await documentProcessor.chunkDocument(processedContent, 1000);
          console.log(`   Chunks: ${chunks.length}`);
          
          // Generate embeddings
          console.log(`   Generating embeddings...`);
          const embeddings = await openaiService.generateEmbeddings(chunks);
          
          // Create points for Qdrant
          const points = [];
          for (let i = 0; i < chunks.length; i++) {
            points.push({
              id: crypto.randomUUID(),
              vector: embeddings[i],
              payload: {
                content: chunks[i],
                documentId: doc.id,
                title: displayName,
                source: doc.sourceUrl || `https://support.lci1.com/doc/${doc.id}`,
                chunkIndex: i,
                totalChunks: chunks.length,
                type: 'manual',
                crawledAt: doc.createdAt || new Date().toISOString()
              }
            });
          }
          
          // Insert to Qdrant with wait=true to ensure persistence
          console.log(`   Uploading to Qdrant (waiting for completion)...`);
          const response = await fetch(`${QDRANT_URL}/collections/document_memory/points?wait=true`, {
            method: 'PUT',
            headers: {
              'api-key': API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ points })
          });
          
          if (response.ok) {
            // Mark as vectorized in MongoDB
            await mongoStorage.updateDocument(doc.id, { vectorized: true });
            console.log(`   ✅ Successfully vectorized`);
            totalProcessed++;
            totalChunks += chunks.length;
          } else {
            console.error(`   ❌ Failed to upload: ${response.status}`);
          }
          
        } catch (error: any) {
          console.error(`   ❌ Error: ${error.message}`);
        }
      }
      
      // Delay between batches
      if (batchNum < totalBatches - 1) {
        console.log(`\n⏳ Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Verify final status
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FINAL RESULTS');
    console.log('=' .repeat(60));
    console.log(`✅ Documents processed: ${totalProcessed}`);
    console.log(`📦 Total chunks created: ${totalChunks}`);
    
    // Check Qdrant status
    const collectionResponse = await fetch(`${QDRANT_URL}/collections/document_memory`, {
      headers: {
        'api-key': API_KEY
      }
    });
    
    if (collectionResponse.ok) {
      const data = await collectionResponse.json();
      console.log(`☁️ Qdrant cloud points: ${data.result?.points_count || 0}`);
    }
    
    // Test search
    console.log('\n🔍 TESTING SEARCH FUNCTIONALITY\n');
    
    const testQueries = [
      'slide-out motor replacement',
      'hydraulic pump troubleshooting',
      'awning installation',
      'leveling system calibration'
    ];
    
    // Generate embedding for first test query
    const testEmbedding = await openaiService.generateEmbeddings([testQueries[0]]);
    
    const searchResponse = await fetch(`${QDRANT_URL}/collections/document_memory/points/search`, {
      method: 'POST',
      headers: {
        'api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vector: testEmbedding[0],
        limit: 3,
        with_payload: true
      })
    });
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const results = searchData.result || [];
      
      console.log(`Query: "${testQueries[0]}"`);
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} results:\n`);
        results.forEach((r: any, i: number) => {
          console.log(`${i+1}. [${(r.score * 100).toFixed(1)}%] ${r.payload?.title || 'Untitled'}`);
          console.log(`   ${r.payload?.content?.substring(0, 100)}...`);
        });
      } else {
        console.log('❌ No results found');
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Batch vectorization complete!');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

vectorizeBatch().catch(console.error);