#!/usr/bin/env tsx
// Deduplicate MongoDB documents and vectorize all remaining content

import { MongoStorage } from '../services/mongodb-storage';
import { openaiService } from '../services/openai-service';
import { documentProcessor } from '../services/document-processor';
import crypto from 'crypto';

const QDRANT_URL = 'https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.4wuUJcX36bgvwigD9_9_2v4nvxgEXQfqZebzfPmheXo';
const BATCH_SIZE = 10;

async function deduplicateAndVectorize() {
  console.log('🔄 DEDUPLICATION AND VECTORIZATION PROCESS\n');
  console.log('=' .repeat(60));
  
  try {
    // Initialize MongoDB
    const mongoStorage = new MongoStorage(
      process.env.MONGODB_URI || "mongodb+srv://ai-sop-dev.nezgetk.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ai-sop-dev"
    );
    
    await mongoStorage.connect();
    
    // Get all documents
    const allDocuments = await mongoStorage.getAllDocuments();
    console.log(`📚 Total documents in MongoDB: ${allDocuments.length}`);
    
    // Find duplicates based on content hash
    const contentHashes = new Map<string, any[]>();
    const duplicates: string[] = [];
    
    console.log('\n🔍 ANALYZING FOR DUPLICATES...\n');
    
    for (const doc of allDocuments) {
      if (!doc.content) continue;
      
      // Create hash of content
      const contentHash = crypto.createHash('sha256')
        .update(doc.content)
        .digest('hex');
      
      if (contentHashes.has(contentHash)) {
        // Found duplicate
        const existing = contentHashes.get(contentHash)!;
        existing.push(doc);
        duplicates.push(doc.id);
      } else {
        contentHashes.set(contentHash, [doc]);
      }
    }
    
    console.log(`🔍 Found ${duplicates.length} duplicate documents`);
    
    // Remove duplicates
    if (duplicates.length > 0) {
      console.log('🗑️ Removing duplicates...');
      for (const docId of duplicates) {
        await mongoStorage.deleteDocument(docId);
      }
      console.log(`✅ Removed ${duplicates.length} duplicates`);
    }
    
    // Get remaining documents
    const documents = await mongoStorage.getAllDocuments();
    console.log(`\n📚 Documents after deduplication: ${documents.length}`);
    
    // Filter for technical documents that need vectorization
    const techDocs = documents.filter(doc => {
      if (!doc.content || doc.content.length < 500) return false;
      if (doc.vectorized) return false; // Skip already vectorized
      
      const contentLower = doc.content.toLowerCase();
      const titleLower = (doc.normalizedTitle || doc.originalName || '').toLowerCase();
      
      // Include all technical content
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
        titleLower.includes('technical') ||
        titleLower.includes('service') ||
        titleLower.includes('manual')
      );
    });
    
    console.log(`\n🎯 Found ${techDocs.length} documents to vectorize`);
    
    // Get initial Qdrant count
    const initialResponse = await fetch(`${QDRANT_URL}/collections/document_memory`, {
      headers: { 'api-key': API_KEY }
    });
    const initialData = await initialResponse.json();
    const initialCount = initialData.result?.points_count || 0;
    console.log(`📊 Starting with ${initialCount} points in Qdrant\n`);
    
    // Process in batches
    let totalProcessed = 0;
    let totalChunks = 0;
    let totalErrors = 0;
    const totalBatches = Math.ceil(techDocs.length / BATCH_SIZE);
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const start = batchNum * BATCH_SIZE;
      const batch = techDocs.slice(start, start + BATCH_SIZE);
      
      if (batch.length === 0) break;
      
      console.log(`\n📦 BATCH ${batchNum + 1}/${totalBatches}: Processing ${batch.length} documents`);
      console.log('-' .repeat(60));
      
      for (const doc of batch) {
        const displayName = doc.normalizedTitle || doc.originalName || doc.filename || `Doc ${doc.id}`;
        
        try {
          console.log(`\n📄 ${displayName.substring(0, 50)}...`);
          
          // Process and chunk
          const processedContent = await documentProcessor.preprocessDocument(doc.content!);
          const chunks = await documentProcessor.chunkDocument(processedContent, 1000);
          console.log(`   Chunks: ${chunks.length}`);
          
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
                type: doc.docType || 'manual',
                createdAt: doc.createdAt || new Date().toISOString()
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
            console.log(`   ✅ Vectorized`);
            totalProcessed++;
            totalChunks += chunks.length;
          } else {
            console.error(`   ❌ Failed: ${result.status?.error || 'Unknown error'}`);
            totalErrors++;
          }
          
        } catch (error: any) {
          console.error(`   ❌ Error: ${error.message}`);
          totalErrors++;
        }
      }
      
      // Delay between batches
      if (batchNum < totalBatches - 1 && totalBatches > 1) {
        console.log(`\n⏳ Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Check for duplicate vectors in Qdrant
    console.log('\n🔍 CHECKING FOR DUPLICATE VECTORS IN QDRANT...\n');
    
    // Get all points from Qdrant
    const scrollResponse = await fetch(`${QDRANT_URL}/collections/document_memory/points/scroll`, {
      method: 'POST',
      headers: {
        'api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        limit: 1000,
        with_payload: true,
        with_vector: false
      })
    });
    
    if (scrollResponse.ok) {
      const scrollData = await scrollResponse.json();
      const points = scrollData.result?.points || [];
      
      // Find duplicates based on documentId and chunkIndex
      const seen = new Set<string>();
      const duplicatePoints: string[] = [];
      
      for (const point of points) {
        const key = `${point.payload?.documentId}-${point.payload?.chunkIndex}`;
        if (seen.has(key)) {
          duplicatePoints.push(point.id);
        } else {
          seen.add(key);
        }
      }
      
      if (duplicatePoints.length > 0) {
        console.log(`Found ${duplicatePoints.length} duplicate vectors`);
        
        // Delete duplicates
        console.log('🗑️ Removing duplicate vectors...');
        const deleteResponse = await fetch(`${QDRANT_URL}/collections/document_memory/points/delete`, {
          method: 'POST',
          headers: {
            'api-key': API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            points: duplicatePoints
          })
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Removed ${duplicatePoints.length} duplicate vectors`);
        }
      } else {
        console.log('✅ No duplicate vectors found');
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
    
    const finalDocuments = await mongoStorage.getAllDocuments();
    const vectorizedDocs = finalDocuments.filter(d => d.vectorized).length;
    
    console.log(`\nMONGODB:`);
    console.log(`  Total documents: ${finalDocuments.length}`);
    console.log(`  Vectorized documents: ${vectorizedDocs}`);
    console.log(`  Removed duplicates: ${duplicates.length}`);
    
    console.log(`\nQDRANT:`);
    console.log(`  Total vectors: ${finalCount} (added: +${finalCount - initialCount})`);
    console.log(`  Documents processed: ${totalProcessed}`);
    console.log(`  Total chunks created: ${totalChunks}`);
    console.log(`  Errors: ${totalErrors}`);
    
    console.log('\n✅ Deduplication and vectorization complete!');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

deduplicateAndVectorize().catch(console.error);