import { JSDOM } from 'jsdom';
import { URL } from 'url';
import { evidenceLedger } from './evidence-ledger';
import { storage } from '../storage';
import { geminiService } from './gemini-service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';

interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  allowedDomains?: string[];
  fileTypes?: string[];
  followRedirects?: boolean;
  maxTimeMinutes?: number;
  crawlDelay?: number; // milliseconds between requests
}

interface CrawlResult {
  url: string;
  title: string;
  content: string;
  type: 'pdf' | 'html' | 'doc' | 'txt' | 'xml' | 'json' | 'csv' | 'unknown';
  metadata: {
    size?: number;
    lastModified?: string;
    contentType?: string;
    contentHash?: string;
    originalFilename?: string;
    intelligentTitleExtracted?: boolean;
    imageCount?: number;
  };
}

export class WebCrawlerService {
  private visited: Set<string> = new Set();
  private contentHashes: Set<string> = new Set(); // Track unique content
  private queue: { url: string; depth: number; parent?: string }[] = [];
  private results: CrawlResult[] = [];
  private options: Required<CrawlOptions>;
  private startTime: number = 0;
  private pageCount: number = 0;
  private progressCallback?: (progress: { documentsFound: number; embedded: number; pagesVisited: number }) => void;

  constructor(options: CrawlOptions = {}) {
    this.options = {
      maxDepth: options.maxDepth ?? 999999,    // No depth limit
      maxPages: options.maxPages ?? 999999,    // No page limit
      allowedDomains: options.allowedDomains ?? [],
      fileTypes: options.fileTypes ?? ['.pdf', '.doc', '.docx', '.txt', '.html', '.htm', '.xml', '.json', '.csv'],
      followRedirects: options.followRedirects ?? true,
      maxTimeMinutes: options.maxTimeMinutes ?? 999999,  // No time limit
      crawlDelay: options.crawlDelay ?? 300    // Respectful crawling speed
    };
  }

  // Set callback for real-time progress updates
  setProgressCallback(callback: (progress: { documentsFound: number; embedded: number; pagesVisited: number }) => void) {
    this.progressCallback = callback;
  }

  // Call progress callback with current state
  private updateProgress() {
    if (this.progressCallback) {
      this.progressCallback({
        documentsFound: this.results.length,
        embedded: 0, // Will be updated during embedding phase
        pagesVisited: this.visited.size
      });
    }
  }

  async crawlGovernmentSite(agency: string, topic: string): Promise<{
    regulations: any[];
    documents: CrawlResult[];
    embedded: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      // Use Gemini to get relevant regulations
      const regulatoryData = await geminiService.crawlGovernmentRegulations(topic, agency);
      
      // Store as evidence
      await evidenceLedger.recordEntry({
        sopId: `${agency}-${topic}-${Date.now()}`,
        action: 'SOP_DRAFT' as const,
        agent: 'web-crawler',
        evidence: regulatoryData,
        metadata: {
          agency,
          topic,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        regulations: [
          ...regulatoryData.regulations.map(r => ({ type: 'regulation', content: r, agency })),
          ...regulatoryData.guidelines.map(g => ({ type: 'guideline', content: g, agency })),
          ...regulatoryData.standards.map(s => ({ type: 'standard', content: s, agency }))
        ],
        documents: [],
        embedded: 0,
        errors
      };
    } catch (error) {
      errors.push(`Failed to crawl ${agency} regulations: ${error}`);
      return {
        regulations: [],
        documents: [],
        embedded: 0,
        errors
      };
    }
  }

  async crawlSite(startUrl: string): Promise<{
    documents: CrawlResult[];
    embedded: number;
    errors: string[];
    stats: {
      pagesVisited: number;
      duplicatesSkipped: number;
      timeElapsed: number;
      maxDepthReached: number;
    };
  }> {
    const errors: string[] = [];
    this.queue.push({ url: startUrl, depth: 0 });
    this.visited.clear();
    this.contentHashes.clear();
    this.results = [];
    this.startTime = Date.now();
    this.pageCount = 0;
    
    let maxDepthReached = 0;
    let duplicatesSkipped = 0;

    // Start crawling with no limits - can run for hours
    while (this.queue.length > 0) {
      // Optional: Check time limit only if explicitly set to a reasonable number
      if (this.options.maxTimeMinutes < 999999) {
        const elapsedMinutes = (Date.now() - this.startTime) / 60000;
        if (elapsedMinutes > this.options.maxTimeMinutes) {
          console.log(`Time limit reached (${this.options.maxTimeMinutes} minutes)`);
          break;
        }
      }
      
      // Optional: Check page limit only if explicitly set to a reasonable number  
      if (this.options.maxPages < 999999 && this.pageCount >= this.options.maxPages) {
        console.log(`Page limit reached (${this.options.maxPages} pages)`);
        break;
      }
      
      const { url, depth, parent } = this.queue.shift()!;
      
      // Skip if already visited
      if (this.visited.has(url)) {
        duplicatesSkipped++;
        continue;
      }
      
      // Skip if depth exceeded (only if explicitly set to a reasonable limit)
      if (this.options.maxDepth < 999999 && depth > this.options.maxDepth) {
        console.log(`Skipping ${url} - max depth exceeded`);
        continue;
      }
      
      maxDepthReached = Math.max(maxDepthReached, depth);
      this.visited.add(url);
      this.pageCount++;

      try {
        console.log(`[Depth ${depth}] Processing: ${url} (parent: ${parent || 'root'})`);
        await this.processUrl(url, depth);
        
        // Update progress after each page
        this.updateProgress();
        
        // Add crawl delay to be respectful
        if (this.options.crawlDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.options.crawlDelay));
        }
      } catch (error) {
        const errorMsg = `Failed to process ${url}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Embed all found documents
    let embeddedCount = 0;
    console.log(`Embedding ${this.results.length} documents...`);
    
    for (const doc of this.results) {
      try {
        await this.embedDocument(doc);
        embeddedCount++;
        // Update progress during embedding
        if (this.progressCallback) {
          this.progressCallback({
            documentsFound: this.results.length,
            embedded: embeddedCount,
            pagesVisited: this.visited.size
          });
        }
      } catch (error) {
        errors.push(`Failed to embed ${doc.url}: ${error}`);
      }
    }

    const stats = {
      pagesVisited: this.visited.size,
      duplicatesSkipped,
      timeElapsed: Date.now() - this.startTime,
      maxDepthReached
    };

    // Log to evidence ledger
    await evidenceLedger.recordEntry({
      sopId: 'web-crawl-' + Date.now(),
      action: 'SNAPSHOT' as const,
      agent: 'web-crawler',
      evidence: {
      startUrl,
      documentsFound: this.results.length,
      embedded: embeddedCount,
      errors: errors.length,
      stats,
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });

    console.log(`Crawl complete: ${this.results.length} documents, ${embeddedCount} embedded, ${errors.length} errors`);
    console.log(`Stats: ${stats.pagesVisited} pages visited, ${stats.duplicatesSkipped} duplicates, depth ${stats.maxDepthReached}, ${Math.round(stats.timeElapsed / 1000)}s`);

    return {
      documents: this.results,
      embedded: embeddedCount,
      errors,
      stats
    };
  }

  private async processUrl(url: string, depth: number): Promise<void> {
    const urlObj = new URL(url);
    
    // Check if domain is allowed
    if (this.options.allowedDomains.length > 0) {
      if (!this.options.allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
        return;
      }
    }

    // Check if it's a document
    const isDocument = this.options.fileTypes.some(ext => 
      ext !== '.html' && ext !== '.htm' && url.toLowerCase().includes(ext)
    );
    
    if (isDocument) {
      await this.downloadDocument(url);
    } else {
      await this.crawlPage(url, depth);
    }
  }

  private async crawlPage(url: string, depth: number): Promise<void> {
    // Create agent that ignores SSL certificate errors for universal compatibility
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    
    const agent = isHttps 
      ? new https.Agent({ rejectUnauthorized: false })
      : new http.Agent();
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SOPGRID-Crawler/1.0 (RV Manual Ingestion Bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      // @ts-ignore - Node.js fetch accepts agent
      agent
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Handle PDFs served as HTML responses
    if (contentType.includes('application/pdf')) {
      await this.downloadDocument(url);
      return;
    }

    const html = await response.text();
    
    // Generate content hash to detect duplicate content
    const contentHash = crypto.createHash('sha256').update(html).digest('hex');
    if (this.contentHashes.has(contentHash)) {
      console.log(`Duplicate content detected at ${url}, skipping`);
      return;
    }
    this.contentHashes.add(contentHash);
    
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    // Look for navigation patterns (dashboards, menus, etc.)
    const navigationSelectors = [
      'nav a', '.navigation a', '.menu a', '.sidebar a',
      '.breadcrumb a', '.toc a', '.table-of-contents a',
      '[class*="menu"] a', '[class*="nav"] a'
    ];
    
    const allLinks = new Set<string>();
    
    // Collect all links
    navigationSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(link => {
        const href = link.getAttribute('href');
        if (href) allLinks.add(href);
      });
    });
    
    // Also get regular links
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href) allLinks.add(href);
    });

    // Process links with priority
    const linkPriorities: { url: string; priority: number; text: string }[] = [];
    
    for (const href of Array.from(allLinks)) {
      try {
        const absoluteUrl = new URL(href, url).toString();
        
        // Skip if already visited or queued
        if (this.visited.has(absoluteUrl) || 
            this.queue.some(item => item.url === absoluteUrl)) {
          continue;
        }
        
        // Skip external links if domains are restricted
        const urlObj = new URL(absoluteUrl);
        if (this.options.allowedDomains.length > 0 && 
            !this.options.allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
          continue;
        }
        
        // Get link text for relevance scoring
        const linkElement = Array.from(document.querySelectorAll('a[href]'))
          .find(el => el.getAttribute('href') === href);
        const linkText = linkElement?.textContent?.toLowerCase() || '';
        const urlLower = absoluteUrl.toLowerCase();
        
        // UNIVERSAL priority keywords for ANY manufacturer documentation
        const highPriorityKeywords = ['manual', 'service', 'repair', 'troubleshoot', 'maintenance', 'library', 'document', 'pdf', 'instruction', 'owner', 'documentation', 'spec', 'guide', 'tutorial', 'how-to', 'procedure', 'component', 'technical', 'parts'];
        const mediumPriorityKeywords = ['installation', 'model', 'series', 'reference', 'handbook', 'training', 'knowledge', 'wiki', 'help', 'support', 'resource', 'troubleshooting', 'diagram', 'schematic', 'assembly', 'download', 'datasheet', 'catalog'];
        const lowPriorityKeywords = ['info', 'product', 'warranty', 'faq', 'about', 'contact', 'news', 'blog', 'article', 'home', 'search', 'login', 'cart', 'account'];
        
        let priority = 0;
        
        // Check for document files (highest priority)
        if (this.options.fileTypes.some(ext => absoluteUrl.includes(ext))) {
          priority = 100;
        }
        // High priority keywords
        else if (highPriorityKeywords.some(kw => linkText.includes(kw) || urlLower.includes(kw))) {
          priority = 75;
        }
        // Medium priority keywords
        else if (mediumPriorityKeywords.some(kw => linkText.includes(kw) || urlLower.includes(kw))) {
          priority = 50;
        }
        // Low priority keywords
        else if (lowPriorityKeywords.some(kw => linkText.includes(kw) || urlLower.includes(kw))) {
          priority = 25;
        }
        // Dashboard/index pages (explore these)
        else if (urlLower.includes('index') || urlLower.includes('dashboard') || 
                 urlLower.includes('library') || urlLower.includes('database')) {
          priority = 30;
        }
        
        if (priority > 0) {
          linkPriorities.push({ 
            url: absoluteUrl, 
            priority, 
            text: linkText.substring(0, 100) 
          });
        }
      } catch (error) {
        // Invalid URL, skip
      }
    }
    
    // Sort by priority and add to queue
    linkPriorities.sort((a, b) => b.priority - a.priority);
    
    for (const link of linkPriorities) {
      this.queue.push({ 
        url: link.url, 
        depth: depth + 1,
        parent: url
      });
      
      // Log high priority finds
      if (link.priority >= 75) {
        console.log(`Found high-priority: ${link.text} -> ${link.url}`);
      }
    }

    // Also extract text content if it looks like documentation
    const title = document.querySelector('title')?.textContent || 'Untitled';
    const mainContent = this.extractMainContent(document);
    
    // Extract image information for manuals with diagrams
    const images = this.extractImageInfo(document, url);
    let enhancedContent = mainContent;
    
    if (images.length > 0) {
      enhancedContent += '\n\n=== IMAGES AND DIAGRAMS ===\n';
      images.forEach((img, index) => {
        enhancedContent += `Image ${index + 1}: ${img.alt || 'Diagram'} (${img.src})\n`;
      });
      console.log(`Found ${images.length} images/diagrams in ${title}`);
    }
    
    if (this.looksLikeDocumentation(enhancedContent)) {
      // Check content uniqueness before adding
      const textHash = crypto.createHash('sha256')
        .update(enhancedContent)
        .digest('hex')
        .substring(0, 16);
      
      if (!this.results.some(r => (r.metadata as any).contentHash === textHash)) {
        this.results.push({
          url,
          title,
          content: enhancedContent,
          type: 'html',
          metadata: {
            contentType: 'text/html',
            lastModified: response.headers.get('last-modified') || undefined,
            size: enhancedContent.length,
            contentHash: textHash,
            ...(images.length > 0 && { imageCount: images.length })
          } as any
        });
        console.log(`Added documentation page: ${title} (${images.length} images)`);
      }
    }
  }

  private extractMainContent(document: Document): string {
    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());

    // Try to find main content areas
    const contentSelectors = ['main', 'article', '.content', '#content', '.documentation', '.manual'];
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    // Fallback to body content
    return document.body?.textContent?.trim() || '';
  }

  private extractImageInfo(document: Document, baseUrl: string): Array<{src: string, alt: string}> {
    const images: Array<{src: string, alt: string}> = [];
    const imgElements = document.querySelectorAll('img');
    
    imgElements.forEach(img => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt') || '';
      
      if (src) {
        try {
          // Convert relative URLs to absolute
          const absoluteSrc = new URL(src, baseUrl).toString();
          images.push({ src: absoluteSrc, alt });
        } catch (error) {
          // Skip invalid URLs
        }
      }
    });
    
    return images;
  }

  private looksLikeDocumentation(content: string): boolean {
    if (content.length < 100) return false; // Even lower threshold for more capture
    
    const docKeywords = ['procedure', 'step', 'instruction', 'guide', 'manual', 'how', 'what', 'when', 'where', 'why',
                         'warning', 'caution', 'specification', 'installation', 'maintenance', 'troubleshoot', 'component',
                         'service', 'repair', 'owner', 'technical', 'system', 'operation', 'safety', 'parts', 'diagram',
                         'tutorial', 'documentation', 'reference', 'help', 'support', 'knowledge', 'training', 'learn',
                         'torque', 'bolt', 'assembly', 'disassembly', 'replace', 'remove', 'install', 'adjust'];
    
    const keywordCount = docKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;
    
    // Very inclusive threshold to capture all useful content from ANY manufacturer
    return keywordCount >= 1 || content.length > 500 || content.toLowerCase().includes('image'); // Any keyword OR substantial content OR has images
  }

  private async downloadDocument(url: string): Promise<void> {
    // Create agent that ignores SSL certificate errors for universal compatibility
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    
    const agent = isHttps 
      ? new https.Agent({ rejectUnauthorized: false })
      : new http.Agent();
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SOPGRID-Crawler/1.0 (RV Manual Ingestion Bot)'
      },
      // @ts-ignore - Node.js fetch accepts agent
      agent
    });

    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || '';
    
    let content = '';
    let type: CrawlResult['type'] = 'txt';
    let intelligentTitle = '';

    // Parse based on content type - universal handling
    if (contentType.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
      try {
        // Enable full PDF processing with text and metadata extraction
        const { default: pdfParse } = await import('pdf-parse');
        const pdfData = await pdfParse(buffer);
        content = pdfData.text || `[PDF Document: ${url.split('/').pop()}]`;
        
        // SMART TITLE EXTRACTION - analyze content to get real title
        intelligentTitle = await this.extractIntelligentTitle(content, url);
        
        // Add PDF metadata to content for better searchability
        if (pdfData.info) {
          const metadata = [];
          if (pdfData.info.Title && pdfData.info.Title !== intelligentTitle) {
            metadata.push(`PDF Title: ${pdfData.info.Title}`);
          }
          if (pdfData.info.Author) metadata.push(`Author: ${pdfData.info.Author}`);
          if (pdfData.info.Subject) metadata.push(`Subject: ${pdfData.info.Subject}`);
          if (pdfData.info.Keywords) metadata.push(`Keywords: ${pdfData.info.Keywords}`);
          if (metadata.length > 0) {
            content = metadata.join('\n') + '\n\n' + content;
          }
        }
        
        type = 'pdf';
        console.log(`✅ Successfully parsed PDF: ${intelligentTitle} from ${url} (${content.length} characters)`);
      } catch (pdfError) {
        console.log(`⚠️ PDF parsing failed for ${url}, storing as reference: ${pdfError}`);
        content = `[PDF Document: ${url.split('/').pop()}]\nDirect PDF content extraction failed, but file is available for manual processing.`;
        intelligentTitle = path.basename(url).replace(/\.[^.]+$/, '');
        type = 'pdf';
      }
    } else if (contentType.includes('text') || url.toLowerCase().endsWith('.txt')) {
      content = buffer.toString('utf-8');
      intelligentTitle = await this.extractIntelligentTitle(content, url);
      type = 'txt';
    } else if (contentType.includes('xml') || url.toLowerCase().endsWith('.xml')) {
      content = buffer.toString('utf-8');
      intelligentTitle = await this.extractIntelligentTitle(content, url);
      type = 'xml';
    } else if (contentType.includes('json') || url.toLowerCase().endsWith('.json')) {
      content = buffer.toString('utf-8');
      intelligentTitle = path.basename(url).replace(/\.[^.]+$/, '');
      type = 'json';
    } else if (contentType.includes('csv') || url.toLowerCase().endsWith('.csv')) {
      content = buffer.toString('utf-8');
      intelligentTitle = path.basename(url).replace(/\.[^.]+$/, '');
      type = 'csv';
    } else if (contentType.includes('html') || url.toLowerCase().includes('.html') || url.toLowerCase().includes('.htm')) {
      content = buffer.toString('utf-8');
      intelligentTitle = await this.extractIntelligentTitle(content, url);
      type = 'html';
    } else {
      // Try to parse as text anyway - universal fallback
      try {
        content = buffer.toString('utf-8');
        intelligentTitle = await this.extractIntelligentTitle(content, url);
        type = 'unknown';
        console.log(`⚠️ Unknown content type ${contentType} for ${url}, treating as text`);
      } catch (error) {
        console.log(`❌ Unsupported document type: ${contentType} for ${url}`);
        return;
      }
    }

    // Use intelligent title or fallback to filename
    const finalTitle = intelligentTitle || path.basename(url).replace(/\.[^.]+$/, '');
    
    this.results.push({
      url,
      title: finalTitle,
      content,
      type,
      metadata: {
        size: buffer.length,
        contentType,
        lastModified: response.headers.get('last-modified') || undefined,
        originalFilename: path.basename(url),
        intelligentTitleExtracted: !!intelligentTitle
      }
    });
  }

  /**
   * Extract intelligent title from document content using AI analysis
   */
  private async extractIntelligentTitle(content: string, url: string): Promise<string> {
    try {
      // For very short content, just use filename
      if (content.length < 100) {
        return '';
      }

      // Take first 2000 characters for analysis
      const excerpt = content.substring(0, 2000);
      
      const prompt = `
      Analyze this document excerpt and extract the most descriptive title that indicates what RV system/component this manual covers.
      
      Document excerpt:
      "${excerpt}"
      
      URL: ${url}
      Original filename: ${path.basename(url)}
      
      Extract a clear, descriptive title that would help an RV technician find this manual. Focus on:
      - RV system/component (awning, generator, jack, slide-out, etc.)
      - Brand/manufacturer if mentioned
      - Model series if mentioned
      - Type of document (manual, service guide, troubleshooting, etc.)
      
      Return ONLY the title, nothing else. If you can't determine a good title, return an empty string.
      
      Good examples:
      "Lippert Level Up Automatic Leveling System Service Manual"
      "Dometic 9100 Series Power Awning Installation Guide"
      "Onan QG 5500 Generator Troubleshooting Manual"
      "Dexter Axle 7K Bearing Replacement Procedure"
      `;

      const model = (await import('@google/generative-ai')).GoogleGenerativeAI;
      const genAI = new model(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
      const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const result = await geminiModel.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: prompt
          }]
        }]
      });
      
      const response = result.response.text();
      const title = response.trim();
      
      // Validate the title looks reasonable
      if (title && title.length > 5 && title.length < 200 && !title.includes('I cannot') && !title.includes('Unable to')) {
        return title;
      }
      
      return '';
    } catch (error) {
      console.error('Failed to extract intelligent title:', error);
      return '';
    }
  }

  private async embedDocument(doc: CrawlResult): Promise<void> {
    // Generate unique ID for document
    const docId = crypto.createHash('sha256').update(doc.url).digest('hex').substring(0, 16);
    
    // Store document metadata
    const document = {
      id: `WEB-${docId}`,
      title: doc.title,
      content: doc.content,
      source: doc.url,
      type: `web-${doc.type}`,
      metadata: {
        ...doc.metadata,
        crawledAt: new Date().toISOString(),
        embedded: false
      }
    };

    // Store in database
    const storedDoc = await storage.createDocument({
      size: doc.content.length,
      filename: doc.url.split('/').pop() || 'document',
      originalName: doc.title,
      mimeType: doc.type === 'pdf' ? 'application/pdf' : 'text/html',
      content: doc.content,
      industry: 'general',
      sourceUrl: doc.url,  // CRITICAL: Store the source URL properly
      sourceHost: new URL(doc.url).hostname,
      docType: doc.type,
      normalizedTitle: doc.title,
      metadata: document.metadata as any
    });

    try {
      // Actually generate embeddings using the vectorizer
      const { vectorizer } = await import('./vectorizer');
      await vectorizer.embedDocument(storedDoc.id, doc.content, {
        source: doc.url,
        title: doc.title,
        type: doc.type,
        crawledAt: new Date().toISOString()
      });
      
      console.log(`✅ Embedded document with vectors: ${doc.title}`);
    } catch (error) {
      console.error(`❌ Failed to generate embeddings for ${doc.title}:`, error);
      throw error;
    }
  }

  async searchManuals(domain: string, keywords?: string[]): Promise<CrawlResult[]> {
    // Quick search for specific manual types
    const searchUrl = `https://${domain}`;
    
    this.options.allowedDomains = [domain];
    
    if (keywords && keywords.length > 0) {
      // Focus crawl on pages likely to contain these keywords
      this.options.fileTypes = ['.pdf', '.doc', '.docx'];
    }
    
    const result = await this.crawlSite(searchUrl);
    
    // Filter results by keywords if provided
    if (keywords && keywords.length > 0) {
      return result.documents.filter(doc => 
        keywords.some(keyword => 
          doc.title.toLowerCase().includes(keyword.toLowerCase()) ||
          doc.content.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }
    
    return result.documents;
  }
}

// Singleton instance
export const webCrawler = new WebCrawlerService();