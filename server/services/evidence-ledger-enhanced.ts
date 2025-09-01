import crypto from 'crypto';
import { storage } from '../storage';

interface EvidenceBlock {
  id: string;
  timestamp: Date;
  data: any;
  hash: string;
  previousHash: string;
  signature: string;
  validator: string;
  type: 'sop_generation' | 'compliance_check' | 'human_approval' | 'agent_action';
}

interface BlockchainMetadata {
  blockHeight: number;
  totalBlocks: number;
  lastValidation: Date;
  integrityStatus: 'valid' | 'compromised';
}

export class EnhancedEvidenceLedger {
  private chain: EvidenceBlock[] = [];
  private pendingBlocks: EvidenceBlock[] = [];
  private readonly secretKey: string;

  constructor() {
    // Use environment variable for signing key
    this.secretKey = process.env.EVIDENCE_SIGNING_KEY || 'fallback-dev-key';
    this.initializeGenesis();
  }

  private initializeGenesis(): void {
    const genesisBlock: EvidenceBlock = {
      id: 'genesis-block',
      timestamp: new Date(),
      data: { 
        message: 'SOPGRID Evidence Ledger Genesis Block',
        version: '2.0.0',
        created: new Date().toISOString()
      },
      hash: '',
      previousHash: '0',
      signature: '',
      validator: 'system',
      type: 'agent_action'
    };

    genesisBlock.hash = this.calculateHash(genesisBlock);
    genesisBlock.signature = this.signBlock(genesisBlock);
    this.chain.push(genesisBlock);
    
    console.log('🔗 Enhanced Evidence Ledger initialized with blockchain integrity');
  }

  private calculateHash(block: Omit<EvidenceBlock, 'hash' | 'signature'>): string {
    const data = `${block.id}${block.timestamp}${JSON.stringify(block.data)}${block.previousHash}${block.validator}${block.type}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private signBlock(block: EvidenceBlock): string {
    const signature = crypto.createHmac('sha256', this.secretKey)
      .update(block.hash)
      .digest('hex');
    return signature;
  }

  public async addEvidence(
    data: any, 
    type: EvidenceBlock['type'], 
    validator: string = 'system'
  ): Promise<string> {
    const previousBlock = this.chain[this.chain.length - 1];
    
    const newBlock: EvidenceBlock = {
      id: `block-${Date.now()}-${require('crypto').randomUUID().substr(0, 8)}`,
      timestamp: new Date(),
      data,
      hash: '',
      previousHash: previousBlock.hash,
      signature: '',
      validator,
      type
    };

    newBlock.hash = this.calculateHash(newBlock);
    newBlock.signature = this.signBlock(newBlock);

    // Add to pending for validation
    this.pendingBlocks.push(newBlock);
    
    // Auto-validate if system generated
    if (validator === 'system') {
      await this.validateAndCommit(newBlock.id);
    }

    console.log(`📝 Evidence added to ledger: ${newBlock.id} (${type})`);
    return newBlock.id;
  }

  public async validateAndCommit(blockId: string): Promise<boolean> {
    const blockIndex = this.pendingBlocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) {
      throw new Error(`Block ${blockId} not found in pending queue`);
    }

    const block = this.pendingBlocks[blockIndex];
    
    // Verify hash integrity
    const recalculatedHash = this.calculateHash({
      id: block.id,
      timestamp: block.timestamp,
      data: block.data,
      previousHash: block.previousHash,
      validator: block.validator,
      type: block.type
    });

    if (recalculatedHash !== block.hash) {
      console.error(`❌ Hash mismatch for block ${blockId}`);
      return false;
    }

    // Verify signature
    const expectedSignature = this.signBlock(block);
    if (expectedSignature !== block.signature) {
      console.error(`❌ Signature verification failed for block ${blockId}`);
      return false;
    }

    // Commit to chain
    this.chain.push(block);
    this.pendingBlocks.splice(blockIndex, 1);
    
    // Persist to database
    await this.persistBlock(block);
    
    console.log(`✅ Block ${blockId} validated and committed to ledger`);
    return true;
  }

  private async persistBlock(block: EvidenceBlock): Promise<void> {
    try {
      // Store in database with blockchain metadata
      await storage.createDocument({
        filename: `evidence-block-${block.id}.json`,
        originalName: `Evidence Block ${block.id}`,
        mimeType: 'application/json',
        size: JSON.stringify(block).length,
        content: JSON.stringify(block, null, 2),
        industry: 'evidence_ledger',
        metadata: {
          blockHeight: this.chain.length - 1,
          blockType: block.type,
          validator: block.validator,
          chainHash: block.hash,
          immutable: true
        }
      });
    } catch (error) {
      console.error(`❌ Failed to persist block ${block.id}:`, error);
    }
  }

  public verifyChainIntegrity(): BlockchainMetadata {
    let isValid = true;
    
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      // Verify hash
      const recalculatedHash = this.calculateHash({
        id: currentBlock.id,
        timestamp: currentBlock.timestamp,
        data: currentBlock.data,
        previousHash: currentBlock.previousHash,
        validator: currentBlock.validator,
        type: currentBlock.type
      });
      
      if (currentBlock.hash !== recalculatedHash) {
        console.error(`❌ Invalid hash at block ${i}: ${currentBlock.id}`);
        isValid = false;
      }
      
      // Verify chain linkage
      if (currentBlock.previousHash !== previousBlock.hash) {
        console.error(`❌ Broken chain at block ${i}: ${currentBlock.id}`);
        isValid = false;
      }
    }

    const metadata: BlockchainMetadata = {
      blockHeight: this.chain.length - 1,
      totalBlocks: this.chain.length,
      lastValidation: new Date(),
      integrityStatus: isValid ? 'valid' : 'compromised'
    };

    console.log(`🔍 Chain integrity check: ${metadata.integrityStatus} (${metadata.totalBlocks} blocks)`);
    return metadata;
  }

  public getEvidenceByType(type: EvidenceBlock['type']): EvidenceBlock[] {
    return this.chain.filter(block => block.type === type);
  }

  public getEvidenceByValidator(validator: string): EvidenceBlock[] {
    return this.chain.filter(block => block.validator === validator);
  }

  public searchEvidence(query: string): EvidenceBlock[] {
    return this.chain.filter(block => 
      JSON.stringify(block.data).toLowerCase().includes(query.toLowerCase()) ||
      block.id.toLowerCase().includes(query.toLowerCase())
    );
  }

  public exportChain(): { 
    metadata: BlockchainMetadata, 
    blocks: EvidenceBlock[], 
    verification: string 
  } {
    const metadata = this.verifyChainIntegrity();
    const chainHash = crypto.createHash('sha256')
      .update(JSON.stringify(this.chain))
      .digest('hex');
    
    return {
      metadata,
      blocks: this.chain,
      verification: chainHash
    };
  }
}

export const enhancedEvidenceLedger = new EnhancedEvidenceLedger();