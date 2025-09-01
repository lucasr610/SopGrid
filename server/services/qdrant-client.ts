// Qdrant Vector Database Client - System Memory
// Hard-wired connection for SOPGRID's memory system

interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, any>;
}

interface SearchResult {
  id: string;
  score: number;
  metadata: {
    source: string;
    chunk: number;
    text: string;
    document_type: string;
  };
}

interface QdrantCollection {
  name: string;
  vectors_count: number;
  status: string;
}

export class QdrantClient {
  private baseUrl: string;
  private apiKey: string;
  private isConnected = false;

  constructor() {
    // Hard-wired Qdrant connection for system memory
    this.baseUrl = process.env.QDRANT_URL || 'https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333';
    this.apiKey = process.env.QDRANT_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.4wuUJcX36bgvwigD9_9_2v4nvxgEXQfqZebzfPmheXo';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'api-key': this.apiKey
    };
  }

  async initialize(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/collections`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      this.isConnected = response.ok;
      
      if (this.isConnected) {
        // Ensure memory collections exist
        await this.ensureCollections();
      }
      
      return this.isConnected;
    } catch (error) {
      console.log('Qdrant not available, using in-memory vectors');
      this.isConnected = false;
      return false;
    }
  }

  private async ensureCollections(): Promise<void> {
    const collections = ['sop_memory', 'document_memory', 'agent_memory'];
    
    for (const collection of collections) {
      try {
        await fetch(`${this.baseUrl}/collections/${collection}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({
            vectors: {
              size: 1536, // OpenAI embedding size
              distance: 'Cosine'
            }
          })
        });
      } catch (error) {
        // Collection might already exist
      }
    }
  }

  async upsertPoints(collection: string, points: QdrantPoint[]): Promise<boolean> {
    if (!this.isConnected) {
      console.log('⚠️ Qdrant not connected, attempting to connect...');
      await this.initialize();
      if (!this.isConnected) {
        console.error('❌ Failed to connect to Qdrant');
        return false;
      }
    }

    try {
      console.log(`📤 Upserting ${points.length} points to Qdrant collection: ${collection}`);
      
      // Add wait=true to ensure points are actually stored before returning
      const response = await fetch(`${this.baseUrl}/collections/${collection}/points?wait=true`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ points })
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error(`❌ Qdrant upsert failed with status ${response.status}: ${responseText}`);
        return false;
      }
      
      try {
        const result = JSON.parse(responseText);
        if (result.status === 'ok') {
          console.log(`✅ Successfully upserted ${points.length} points to Qdrant`);
          return true;
        } else {
          console.error('❌ Qdrant returned non-ok status:', result);
          return false;
        }
      } catch (parseError) {
        console.log('⚠️ Could not parse Qdrant response, but status was OK');
        return true;
      }
    } catch (error) {
      console.error('❌ Qdrant upsert network error:', error);
      return false;
    }
  }

  async search(query: string, namespace?: string): Promise<SearchResult[]> {
    console.log(`🔍 Searching for: "${query}" in namespace: ${namespace || 'default'}`);
    
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      // Generate embedding for query
      const { openaiService } = await import('./openai-service.js');
      const embedding = await openaiService.generateEmbeddings([query]);
      
      if (!embedding || embedding[0]?.length === 0) {
        console.log('❌ Failed to generate embedding for query');
        return [];
      }

      // Always use document_memory collection where all documents are stored
      const collectionName = 'document_memory';
      
      const results = await this.searchPoints(collectionName, embedding[0], 20);
      
      // Transform results to our format
      const searchResults: SearchResult[] = results.map(result => ({
        id: result.id.toString(),
        score: result.score || 0.5,
        metadata: {
          source: result.payload?.source || 'unknown',
          chunk: result.payload?.chunkIndex || 0,
          text: result.payload?.content || '',
          document_type: result.payload?.type || 'manual'
        }
      }));

      console.log(`✅ Found ${searchResults.length} vector search results`);
      return searchResults;

    } catch (error) {
      console.error('❌ Qdrant search error:', error);
      // Return empty results rather than failing
      return [];
    }
  }

  async searchPoints(collection: string, vector: number[], limit = 10): Promise<any[]> {
    if (!this.isConnected) return [];

    try {
      const response = await fetch(`${this.baseUrl}/collections/${collection}/points/search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          vector,
          limit,
          with_payload: true,
          score_threshold: 0.3
        })
      });

      if (!response.ok) return [];
      
      const result = await response.json();
      return result.result || [];
    } catch (error) {
      console.error('Qdrant search failed:', error);
      return [];
    }
  }

  getStatus(): { connected: boolean; url: string } {
    return {
      connected: this.isConnected,
      url: this.baseUrl
    };
  }

  // Add missing methods for vectorizer
  async searchVector(collection: string, vector: number[], limit = 10): Promise<any[]> {
    if (!this.isConnected) return [];

    try {
      const response = await fetch(`${this.baseUrl}/collections/${collection}/points/search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          vector,
          limit,
          with_payload: true,
          with_vector: false,
          score_threshold: 0.3
        })
      });

      if (!response.ok) return [];
      
      const result = await response.json();
      return result.result || [];
    } catch (error) {
      console.error('Qdrant vector search failed:', error);
      return [];
    }
  }

  async searchWithFilter(collection: string, filter: any, limit = 100): Promise<any[]> {
    if (!this.isConnected) return [];

    try {
      const response = await fetch(`${this.baseUrl}/collections/${collection}/points/scroll`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          filter,
          limit,
          with_payload: true,
          with_vector: false
        })
      });

      if (!response.ok) return [];
      
      const result = await response.json();
      return result.result?.points || [];
    } catch (error) {
      console.error('Qdrant filtered search failed:', error);
      return [];
    }
  }

  async deletePoints(collection: string, filter: any): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const response = await fetch(`${this.baseUrl}/collections/${collection}/points/delete`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ filter })
      });

      return response.ok;
    } catch (error) {
      console.error('Qdrant delete failed:', error);
      return false;
    }
  }

  async getCollectionInfo(collection: string): Promise<QdrantCollection | null> {
    if (!this.isConnected) return null;

    try {
      const response = await fetch(`${this.baseUrl}/collections/${collection}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) return null;
      
      const result = await response.json();
      return result.result || null;
    } catch (error) {
      console.error('Qdrant collection info failed:', error);
      return null;
    }
  }

  isQdrantConnected(): boolean {
    return this.isConnected;
  }
}

export const qdrantClient = new QdrantClient();