#!/usr/bin/env tsx
// Direct test of Qdrant API to debug the issue

async function testQdrantDirect() {
  const baseUrl = 'https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.4wuUJcX36bgvwigD9_9_2v4nvxgEXQfqZebzfPmheXo';
  
  console.log('🧪 Testing Qdrant API directly...\n');
  
  // Create a simple test point with UUID
  const testPoint = {
    id: crypto.randomUUID(),
    vector: new Array(1536).fill(0).map(() => Math.random()),
    payload: {
      test: true,
      content: 'This is a test point',
      timestamp: new Date().toISOString()
    }
  };
  
  console.log('📤 Sending test point with ID:', testPoint.id);
  
  try {
    // Try to upsert the point
    const response = await fetch(`${baseUrl}/collections/document_memory/points`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        points: [testPoint]
      })
    });
    
    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Point uploaded successfully!\n');
      
      // Now try to retrieve it
      console.log('🔍 Retrieving the point...');
      const getResponse = await fetch(`${baseUrl}/collections/document_memory/points/${testPoint.id}`, {
        method: 'GET',
        headers: {
          'api-key': apiKey
        }
      });
      
      const getResult = await getResponse.text();
      console.log('Retrieved:', getResult);
      
      // Check collection stats
      console.log('\n📊 Checking collection stats...');
      const statsResponse = await fetch(`${baseUrl}/collections/document_memory`, {
        method: 'GET',
        headers: {
          'api-key': apiKey
        }
      });
      
      const stats = await statsResponse.json();
      console.log('Points count:', stats.result?.points_count || 0);
      
    } else {
      console.error('❌ Failed to upload point');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testQdrantDirect().catch(console.error);