#!/usr/bin/env tsx
// Vectorize all LCI documents with the fixed wait=true approach

import { MongoStorage } from '../services/mongodb-storage';
import { openaiService } from '../services/openai-service';
import { documentProcessor } from '../services/document-processor';
import crypto from 'crypto';

const QDRANT_URL = 'https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.4wuUJcX36bgvwigD9_9_2v4nvxgEXQfqZebzfPmheXo';

async function vectorizeAllLCI() {
  console.log('🚀 VECTORIZING ALL LCI DOCUMENTS WITH FIXED APPROACH\n');
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
      if (doc.vectorized) return false; // Skip already vectorized
      
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
    
    console.log(`📚 Found ${techDocs.length} unprocessed technical documents\n`);
    
    // Process first 50 documents
    const docsToProcess = techDocs.slice(0, 50);
    console.log(`🎯 Processing ${docsToProcess.length} documents\n`);
    
    let totalProcessed = 0;
    let totalChunks = 0;
    let totalErrors = 0;
    
    for (let i = 0; i < docsToProcess.length; i++) {
      const doc = docsToProcess[i];
      const displayName = doc.normalizedTitle || doc.originalName || doc.filename || `Doc ${doc.id}`;
      
      try {
        console.log(`[${i + 1}/${docsToProcess.length}] ${displayName}`);
        
        // Process and chunk
        const processedContent = await documentProcessor.preprocessDocument(doc.content!);
        const chunks = await documentProcessor.chunkDocument(processedContent, 1000);
        console.log(`   📦 ${chunks.length} chunks`);
        
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
              totalChunks: chunks.length,
              type: 'manual'
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
          console.log(`   ✅ Vectorized (operation: ${result.result?.operation_id})`);
          totalProcessed++;
          totalChunks += chunks.length;
        } else {
          console.error(`   ❌ Failed: ${result.status}`);
          totalErrors++;
        }
        
        // Small delay every 5 documents
        if ((i + 1) % 5 === 0) {
          console.log('   ⏳ Pausing for 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        totalErrors++;
      }
    }
    
    // Final verification
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FINAL RESULTS');
    console.log('=' .repeat(60));
    
    const finalResponse = await fetch(`${QDRANT_URL}/collections/document_memory`, {
      headers: { 'api-key': API_KEY }
    });
    const finalData = await finalResponse.json();
    const finalCount = finalData.result?.points_count || 0;
    
    console.log(`✅ Documents processed: ${totalProcessed}`);
    console.log(`📦 Total chunks created: ${totalChunks}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log(`☁️ Qdrant points: ${finalCount} (added: +${finalCount - initialCount})`);
    
    // Test search
    console.log('\n🔍 TESTING SEARCH\n');
    
    const testQuery = 'slide-out motor replacement';
    const testEmbedding = await openaiService.generateEmbeddings([testQuery]);
    
    const searchResponse = await fetch(`${QDRANT_URL}/collections/document_memory/points/search`, {
      method: 'POST',
      headers: {
        'api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vector: testEmbedding[0],
        limit: 5,
        with_payload: true
      })
    });
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const results = searchData.result || [];
      
      console.log(`Query: "${testQuery}"`);
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} results:\n`);
        results.forEach((r: any, i: number) => {
          console.log(`${i+1}. [${(r.score * 100).toFixed(1)}%] ${r.payload?.title || 'Untitled'}`);
          console.log(`   ${r.payload?.content?.substring(0, 80)}...`);
        });
      } else {
        console.log('❌ No results found');
      }
    }
    
    console.log('\n✅ Vectorization complete!');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

vectorizeAllLCI().catch(console.error);