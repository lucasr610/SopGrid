#!/usr/bin/env tsx

import { vectorizer } from './server/services/vectorizer';

async function test() {
  console.log('Testing specific Lippert searches...\n');
  
  const queries = [
    "Lippert 3200 lb axle bearing pack",
    "Lippert 3500 lb axle torque specifications", 
    "Lippert axle bearing repack procedure",
    "Lippert electric stabilizer jack troubleshooting"
  ];
  
  for (const query of queries) {
    console.log(`\n===== Searching: "${query}" =====`);
    const results = await vectorizer.query(query, { limit: 3 });
    console.log(`Found ${results.length} results`);
    
    if (results.length > 0) {
      results.forEach((r, i) => {
        console.log(`\n[${i+1}] Score: ${r.similarity.toFixed(3)}`);
        // Show first 300 chars to see what content we're getting
        const preview = r.content.substring(0, 300).replace(/\n/g, ' ');
        console.log(`    Content: ${preview}...`);
        console.log(`    Length: ${r.content.length} chars`);
      });
    }
  }
  
  process.exit(0);
}

test();
