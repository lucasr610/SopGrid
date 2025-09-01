#!/usr/bin/env tsx

import { vectorizer } from './server/services/vectorizer';

async function test() {
  console.log('Testing Lippert axle search...\n');
  
  const queries = [
    "Lippert axle maintenance",
    "Lippert axle installation", 
    "Lippert suspension",
    "Lippert 3500 axle"
  ];
  
  for (const query of queries) {
    console.log(`\nSearching: "${query}"`);
    const results = await vectorizer.query(query, { limit: 5 });
    console.log(`Found ${results.length} results`);
    
    if (results.length > 0) {
      results.slice(0, 2).forEach((r, i) => {
        console.log(`  [${i+1}] Score: ${r.similarity.toFixed(3)}`);
        console.log(`      Content: ${r.content.substring(0, 100)}...`);
      });
    }
  }
  
  process.exit(0);
}

test();
