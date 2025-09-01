#!/usr/bin/env tsx
// Script to vectorize all existing MongoDB documents into Qdrant cloud

import { MongoStorage } from '../services/mongodb-storage';
import { vectorizer } from '../services/vectorizer';
import { openaiService } from '../services/openai-service';

async function vectorizeExistingDocuments() {
  console.log('🚀 Starting vectorization of existing MongoDB documents...');
  
  try {
    // Initialize MongoDB storage
    const mongoStorage = new MongoStorage(
      process.env.MONGODB_URI || "mongodb+srv://ai-sop-dev.nezgetk.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ai-sop-dev"
    );
    
    await mongoStorage.connect();
    await vectorizer.initialize();
    
    // Check OpenAI API key
    const hasKey = !!process.env.OPENAI_API_KEY;
    if (!hasKey) {
      console.error('❌ OpenAI API key not configured - cannot generate embeddings');
      console.error('Set OPENAI_API_KEY environment variable');
      process.exit(1);
    }
    
    // Get all documents from MongoDB
    const documents = await mongoStorage.getAllDocuments();
    console.log(`📚 Found ${documents.length} documents in MongoDB`);
    
    if (documents.length === 0) {
      console.log('⚠️ No documents found to vectorize');
      process.exit(0);
    }
    
    // Limit to first 10 documents for testing
    const docsToProcess = documents.slice(0, 10);
    console.log(`🧪 Processing first ${docsToProcess.length} documents as a test...`);
    
    // Vectorize each document
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < docsToProcess.length; i++) {
      const doc = docsToProcess[i];
      
      try {
        const displayName = doc.normalizedTitle || doc.originalName || doc.filename || `Document ${doc.id}`;
        console.log(`\n[${i + 1}/${docsToProcess.length}] Processing: ${displayName}`);
        
        // Skip if already vectorized
        if (doc.vectorized) {
          console.log(`  ✓ Already vectorized, skipping...`);
          skippedCount++;
          continue;
        }
        
        // Skip if no content
        if (!doc.content || doc.content.trim().length < 100) {
          console.log(`  ⚠️ No substantial content, skipping...`);
          skippedCount++;
          continue;
        }
        
        // Vectorize the document
        await vectorizer.embedDocument(
          doc.id,
          doc.content,
          {
            source: doc.sourceUrl || doc.filename,
            title: doc.normalizedTitle || doc.originalName,
            type: doc.docType || doc.docClass || 'manual',
            crawledAt: doc.retrievedAt || doc.uploadedAt,
            mimeType: doc.mimeType,
            industry: doc.industry,
            region: doc.region,
            series: doc.series,
            ccd: doc.ccd,
            features: doc.features
          }
        );
        
        // Mark as vectorized in MongoDB
        await mongoStorage.updateDocument(doc.id, { vectorized: true });
        
        successCount++;
        console.log(`  ✅ Successfully vectorized and stored in Qdrant`);
        
        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        errorCount++;
        console.error(`  ❌ Error vectorizing document ${doc.id}:`, error.message || error);
      }
    }
    
    // Get final stats
    const stats = await vectorizer.getStats();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 VECTORIZATION RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Successfully vectorized: ${successCount} documents`);
    console.log(`⏭️ Skipped: ${skippedCount} documents`);
    console.log(`❌ Failed: ${errorCount} documents`);
    console.log(`📦 Total chunks in Qdrant: ${stats.totalChunks}`);
    console.log(`☁️ Qdrant cloud status: ${stats.qdrantConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
    console.log('='.repeat(60));
    
    if (docsToProcess.length < documents.length) {
      console.log(`\n💡 This was a test run. To vectorize all ${documents.length} documents,`);
      console.log('   modify the script to remove the slice(0, 10) limit.');
    }
    
    // MongoDB connection managed by pool, no explicit close needed
    
  } catch (error) {
    console.error('Fatal error during vectorization:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
vectorizeExistingDocuments().catch(console.error);