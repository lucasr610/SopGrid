#!/usr/bin/env tsx
// Vectorize the recently crawled documents from MongoDB to Qdrant

import { MongoStorage } from '../services/mongodb-storage';
import { vectorizer } from '../services/vectorizer';

async function vectorizeCrawledDocs() {
  console.log('🚀 Vectorizing crawled documents from MongoDB to Qdrant\n');
  console.log('=' .repeat(60));
  
  try {
    // Initialize services
    const mongoStorage = new MongoStorage(
      process.env.MONGODB_URI || "mongodb+srv://ai-sop-dev.nezgetk.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ai-sop-dev"
    );
    
    await mongoStorage.connect();
    await vectorizer.initialize();
    
    // Get all documents from MongoDB
    const documents = await mongoStorage.getAllDocuments();
    console.log(`📚 Found ${documents.length} total documents in MongoDB\n`);
    
    // Filter for documents that have content and aren't vectorized
    const docsToVectorize = documents.filter(doc => 
      doc.content && 
      doc.content.trim().length > 500 && 
      !doc.vectorized &&
      (doc.sourceUrl?.includes('lci1.com') || doc.sourceUrl?.includes('lippert'))
    ).slice(0, 20); // Start with 20 documents
    
    console.log(`🎯 Found ${docsToVectorize.length} LCI documents to vectorize\n`);
    
    if (docsToVectorize.length === 0) {
      console.log('⚠️ No new documents to vectorize');
      
      // Show some stats about what's in MongoDB
      const lciDocs = documents.filter(doc => 
        doc.sourceUrl?.includes('lci1.com') || doc.sourceUrl?.includes('lippert')
      );
      console.log(`\n📊 MongoDB Stats:`);
      console.log(`   Total LCI documents: ${lciDocs.length}`);
      console.log(`   Already vectorized: ${lciDocs.filter(d => d.vectorized).length}`);
      console.log(`   With content: ${lciDocs.filter(d => d.content && d.content.length > 500).length}`);
      
      process.exit(0);
    }
    
    // Vectorize each document
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < docsToVectorize.length; i++) {
      const doc = docsToVectorize[i];
      const displayName = doc.normalizedTitle || doc.originalName || doc.filename;
      
      try {
        console.log(`[${i + 1}/${docsToVectorize.length}] ${displayName}`);
        console.log(`   URL: ${doc.sourceUrl}`);
        console.log(`   Content: ${doc.content?.length || 0} chars`);
        
        // Vectorize the document
        await vectorizer.embedDocument(
          doc.id,
          doc.content!,
          {
            source: doc.sourceUrl || doc.filename,
            title: doc.normalizedTitle || doc.originalName,
            type: doc.docType || doc.docClass || 'manual',
            url: doc.sourceUrl,
            mimeType: doc.mimeType
          }
        );
        
        // Mark as vectorized in MongoDB
        await mongoStorage.updateDocument(doc.id, { vectorized: true });
        
        successCount++;
        console.log(`   ✅ Vectorized successfully\n`);
        
        // Small delay to avoid rate limits
        if ((i + 1) % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error: any) {
        errorCount++;
        console.error(`   ❌ Error: ${error.message}\n`);
      }
    }
    
    // Get final stats
    const stats = await vectorizer.getStats();
    
    console.log('=' .repeat(60));
    console.log('📊 VECTORIZATION COMPLETE');
    console.log('=' .repeat(60));
    console.log(`✅ Successfully vectorized: ${successCount} documents`);
    console.log(`❌ Failed: ${errorCount} documents`);
    console.log(`📦 Total chunks in Qdrant: ${stats.totalChunks}`);
    console.log(`☁️ Qdrant connected: ${stats.qdrantConnected ? 'YES' : 'NO'}`);
    
    // Test a search
    console.log('\n🔍 Testing search with "slide-out motor"...');
    const searchResults = await vectorizer.query('slide-out motor replacement', { limit: 3 });
    
    if (searchResults.length > 0) {
      console.log(`✅ Found ${searchResults.length} results:`);
      searchResults.forEach((result, i) => {
        console.log(`   ${i + 1}. [${(result.similarity * 100).toFixed(1)}%] ${result.metadata.title || result.metadata.source}`);
      });
    } else {
      console.log('❌ No search results found');
    }
    
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

vectorizeCrawledDocs().catch(console.error);