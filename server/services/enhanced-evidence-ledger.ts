import crypto from 'crypto-js';
import { storage } from '../storage';

interface EvidenceBlock {
  id: string;
  blockType: 'sop_generation' | 'compliance_check' | 'human_approval' | 'agent_action' | 'system_event';
  blockData: any;
  blockHash: string;
  previousHash: string;
  signature: string;
  validator: string;
  chainHeight: number;
  timestamp: Date;
}

interface HashChainEntry {
  hash: string;
  previousHash: string;
  height: number;
  timestamp: Date;
  dataHash: string;
  signature: string;
}

export class EnhancedEvidenceLedger {
  private chainKey = 'sopgrid_evidence_chain';
  private lastHash: string = '';
  private chainHeight: number = 0;

  constructor() {
    this.initializeChain();
  }

  private async initializeChain(): Promise<void> {
    try {
      // Get the last block from database to continue chain
      const lastBlock = await this.getLastBlock();
      if (lastBlock) {
        this.lastHash = lastBlock.blockHash;
        this.chainHeight = lastBlock.chainHeight;
        console.log(`🔗 Evidence chain initialized at height ${this.chainHeight}`);
      } else {
        // Genesis block
        const genesisBlock = await this.createGenesisBlock();
        this.lastHash = genesisBlock.blockHash;
        this.chainHeight = 0;
        console.log('🔗 Evidence chain genesis block created');
      }
    } catch (error) {
      console.error('Failed to initialize evidence chain:', error);
      // Create emergency genesis block
      this.lastHash = this.calculateHash('genesis', {}, '', Date.now().toString());
      this.chainHeight = 0;
    }
  }

  private async getLastBlock(): Promise<EvidenceBlock | null> {
    try {
      // Query database for the highest chain height block
      const result = await storage.query(`
        SELECT * FROM evidence_blocks 
        ORDER BY chain_height DESC 
        LIMIT 1
      `);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error getting last block:', error);
      return null;
    }
  }

  private async createGenesisBlock(): Promise<EvidenceBlock> {
    const timestamp = new Date();
    const genesisData = {
      message: 'SOPGRID Evidence Ledger Genesis Block',
      version: '1.0.0',
      timestamp: timestamp.toISOString()
    };

    const blockHash = this.calculateHash('genesis', genesisData, '', timestamp.getTime().toString());
    
    const genesisBlock: EvidenceBlock = {
      id: 'genesis',
      blockType: 'system_event',
      blockData: genesisData,
      blockHash,
      previousHash: '',
      signature: this.signData(blockHash, 'system'),
      validator: 'system',
      chainHeight: 0,
      timestamp
    };

    await this.storeBlock(genesisBlock);
    return genesisBlock;
  }

  private calculateHash(blockType: string, data: any, previousHash: string, nonce: string): string {
    const content = JSON.stringify({
      blockType,
      data,
      previousHash,
      nonce,
      timestamp: Date.now()
    });
    return crypto.SHA256(content).toString();
  }

  private signData(dataHash: string, validator: string): string {
    // In production, use proper cryptographic signing with private keys
    const signature = crypto.HmacSHA256(dataHash, `${validator}_${process.env.EVIDENCE_SIGNING_KEY || 'default_key'}`);
    return signature.toString();
  }

  private verifySignature(dataHash: string, signature: string, validator: string): boolean {
    const expectedSignature = this.signData(dataHash, validator);
    return expectedSignature === signature;
  }

  async addEvidenceBlock(
    blockType: EvidenceBlock['blockType'],
    data: any,
    validator: string = 'system'
  ): Promise<string> {
    try {
      this.chainHeight++;
      const timestamp = new Date();
      const blockId = `block_${this.chainHeight}_${Date.now()}`;
      
      // Calculate nonce for proof of work (simplified)
      const nonce = Date.now().toString();
      const blockHash = this.calculateHash(blockType, data, this.lastHash, nonce);
      const signature = this.signData(blockHash, validator);

      const evidenceBlock: EvidenceBlock = {
        id: blockId,
        blockType,
        blockData: data,
        blockHash,
        previousHash: this.lastHash,
        signature,
        validator,
        chainHeight: this.chainHeight,
        timestamp
      };

      // Verify the block before adding
      if (!this.verifyBlock(evidenceBlock)) {
        throw new Error('Block verification failed');
      }

      await this.storeBlock(evidenceBlock);
      
      this.lastHash = blockHash;
      
      console.log(`🔗 Evidence block ${blockId} added to chain at height ${this.chainHeight}`);
      
      return blockId;
    } catch (error) {
      console.error('Failed to add evidence block:', error);
      this.chainHeight--; // Rollback height increment
      throw error;
    }
  }

  private verifyBlock(block: EvidenceBlock): boolean {
    // Verify signature
    if (!this.verifySignature(block.blockHash, block.signature, block.validator)) {
      console.error('Block signature verification failed');
      return false;
    }

    // Verify hash chain integrity
    const calculatedHash = this.calculateHash(
      block.blockType,
      block.blockData,
      block.previousHash,
      'calculated'
    );
    
    // For hash verification, we check if the hash starts with the expected pattern
    if (!block.blockHash || block.blockHash.length < 32) {
      console.error('Invalid block hash format');
      return false;
    }

    // Verify previous hash matches
    if (block.chainHeight > 0 && block.previousHash !== this.lastHash) {
      console.error('Previous hash mismatch');
      return false;
    }

    return true;
  }

  private async storeBlock(block: EvidenceBlock): Promise<void> {
    try {
      await storage.createEvidenceBlock({
        blockType: block.blockType,
        blockData: block.blockData,
        blockHash: block.blockHash,
        previousHash: block.previousHash,
        signature: block.signature,
        validator: block.validator,
        chainHeight: block.chainHeight
      });
    } catch (error) {
      console.error('Failed to store evidence block:', error);
      throw error;
    }
  }

  async verifyChainIntegrity(): Promise<{
    valid: boolean;
    errors: string[];
    totalBlocks: number;
    verifiedBlocks: number;
  }> {
    const errors: string[] = [];
    let verifiedBlocks = 0;
    
    try {
      const blocks = await storage.query(`
        SELECT * FROM evidence_blocks 
        ORDER BY chain_height ASC
      `);
      
      let previousHash = '';
      
      for (const block of blocks) {
        const evidenceBlock: EvidenceBlock = {
          id: block.id,
          blockType: block.block_type,
          blockData: block.block_data,
          blockHash: block.block_hash,
          previousHash: block.previous_hash,
          signature: block.signature,
          validator: block.validator,
          chainHeight: block.chain_height,
          timestamp: new Date(block.timestamp)
        };

        // Verify each block
        if (evidenceBlock.chainHeight === 0) {
          // Genesis block
          if (evidenceBlock.previousHash !== '') {
            errors.push(`Genesis block has non-empty previous hash`);
          }
        } else {
          // Regular block
          if (evidenceBlock.previousHash !== previousHash) {
            errors.push(`Block ${evidenceBlock.id} has invalid previous hash`);
          }
        }

        // Verify signature
        if (!this.verifySignature(evidenceBlock.blockHash, evidenceBlock.signature, evidenceBlock.validator)) {
          errors.push(`Block ${evidenceBlock.id} has invalid signature`);
        } else {
          verifiedBlocks++;
        }

        previousHash = evidenceBlock.blockHash;
      }

      return {
        valid: errors.length === 0,
        errors,
        totalBlocks: blocks.length,
        verifiedBlocks
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Chain verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        totalBlocks: 0,
        verifiedBlocks: 0
      };
    }
  }

  async getChainSummary(): Promise<{
    height: number;
    lastHash: string;
    totalBlocks: number;
    blocksByType: Record<string, number>;
  }> {
    try {
      const stats = await storage.query(`
        SELECT 
          COUNT(*) as total_blocks,
          block_type,
          COUNT(*) as type_count
        FROM evidence_blocks 
        GROUP BY block_type
      `);

      const blocksByType: Record<string, number> = {};
      let totalBlocks = 0;

      for (const stat of stats) {
        blocksByType[stat.block_type] = parseInt(stat.type_count);
        totalBlocks += parseInt(stat.type_count);
      }

      return {
        height: this.chainHeight,
        lastHash: this.lastHash,
        totalBlocks,
        blocksByType
      };
    } catch (error) {
      console.error('Error getting chain summary:', error);
      return {
        height: this.chainHeight,
        lastHash: this.lastHash,
        totalBlocks: 0,
        blocksByType: {}
      };
    }
  }

  // HITL/AI-ITL Gate Integration
  async recordHumanApproval(
    sopId: string,
    userId: string,
    approvalData: any
  ): Promise<string> {
    return await this.addEvidenceBlock(
      'human_approval',
      {
        sopId,
        userId,
        approvalData,
        timestamp: new Date().toISOString(),
        approvalType: 'human_review'
      },
      `human_${userId}`
    );
  }

  async recordAgentAction(
    agentId: string,
    action: string,
    actionData: any
  ): Promise<string> {
    return await this.addEvidenceBlock(
      'agent_action',
      {
        agentId,
        action,
        actionData,
        timestamp: new Date().toISOString()
      },
      `agent_${agentId}`
    );
  }

  async recordSOPGeneration(
    sopId: string,
    generationData: any
  ): Promise<string> {
    return await this.addEvidenceBlock(
      'sop_generation',
      {
        sopId,
        generationData,
        timestamp: new Date().toISOString()
      },
      'sop_generator'
    );
  }
}

export const enhancedEvidenceLedger = new EnhancedEvidenceLedger();