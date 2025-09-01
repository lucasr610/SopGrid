#!/usr/bin/env tsx
// Search across all Qdrant collections to find where documents are stored

import { openaiService } from '../services/openai-service';

async function searchAllCollections() {
  const baseUrl = 'https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.4wuUJcX36bgvwigD9_9_2v4nvxgEXQfqZebzfPmheXo';
  
  console.log('🔍 Searching across all Qdrant collections\n');
  console.log('=' .repeat(60));
  
  const collections = ['document_memory', 'lci_manuals', 'oracle_docs', 'sop_memory'];
  const query = 'slide-out motor replacement hydraulic';
  
  try {
    // Generate embedding for search query
    console.log(`📝 Query: "${query}"\n`);
    const embeddings = await openaiService.generateEmbeddings([query]);
    const queryVector = embeddings[0];
    
    for (const collection of collections) {
      console.log(`\n📦 Collection: ${collection}`);
      console.log('-'.repeat(40));
      
      // Get collection info first
      const infoResponse = await fetch(`${baseUrl}/collections/${collection}`, {
        headers: { 'api-key': apiKey }
      });
      
      if (infoResponse.ok) {
        const info = await infoResponse.json();
        console.log(`   Points: ${info.result?.points_count || 0}`);
        
        if (info.result?.points_count > 0) {
          // Search in this collection
          const searchResponse = await fetch(`${baseUrl}/collections/${collection}/points/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': apiKey
            },
            body: JSON.stringify({
              vector: queryVector,
              limit: 3,
              with_payload: true,
              with_vector: false
            })
          });
          
          if (searchResponse.ok) {
            const results = await searchResponse.json();
            
            if (results.result && results.result.length > 0) {
              console.log(`   ✅ Found ${results.result.length} matches:\n`);
              
              results.result.forEach((match: any, index: number) => {
                console.log(`   ${index + 1}. Score: ${(match.score * 100).toFixed(1)}%`);
                if (match.payload) {
                  console.log(`      Title: ${match.payload.title || match.payload.source || 'Unknown'}`);
                  console.log(`      Content preview: ${(match.payload.content || match.payload.text || '').substring(0, 100)}...`);
                }
              });
            } else {
              console.log(`   ❌ No relevant matches found`);
            }
          }
        } else {
          console.log(`   ⚠️ Collection is empty`);
        }
      } else {
        console.log(`   ❌ Collection not accessible`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Search complete across all collections');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

searchAllCollections().catch(console.error);