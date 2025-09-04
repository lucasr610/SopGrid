import fetch from 'node-fetch';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function embed(texts: string[]): Promise<number[][]> {
  const provider = process.env.EMBEDDINGS_PROVIDER || 'ollama';
  
  console.log(`📊 Generating embeddings using ${provider} for ${texts.length} texts`);
  
  if (provider === 'ollama') {
    try {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      const response = await fetch(`${ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: 'nomic-embed-text',
          input: texts 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }
      
      const json: any = await response.json();
      return json.embeddings;
    } catch (error) {
      console.log('⚠️ Ollama not available, falling back to OpenAI');
      // Fall back to OpenAI if Ollama fails
      if (process.env.OPENAI_API_KEY) {
        return embedWithOpenAI(texts);
      }
      throw error;
    }
  }
  
  if (provider === 'openai') {
    return embedWithOpenAI(texts);
  }
  
  if (provider === 'gemini') {
    return embedWithGemini(texts);
  }
  
  throw new Error(`Unknown embeddings provider: ${provider}`);
}

async function embedWithOpenAI(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  
  const openai = new OpenAI({ apiKey });
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  
  return response.data.map(item => item.embedding);
}

async function embedWithGemini(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'embedding-001' });
  
  const embeddings: number[][] = [];
  
  for (const text of texts) {
    const result = await model.embedContent(text);
    embeddings.push(result.embedding.values);
  }
  
  return embeddings;
}

export async function getEmbeddingDimension(): Promise<number> {
  const provider = process.env.EMBEDDINGS_PROVIDER || 'ollama';
  
  // Known dimensions for each provider
  if (provider === 'ollama') {
    // nomic-embed-text dimension
    return 768;
  }
  
  if (provider === 'openai') {
    // text-embedding-3-small dimension
    return 1536;
  }
  
  if (provider === 'gemini') {
    // embedding-001 dimension
    return 768;
  }
  
  // Default to 768
  return 768;
}