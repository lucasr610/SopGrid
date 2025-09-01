import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { LedgerEntry } from '../src/types/core';

// SOPGRID Evidence Ledger (WORM - Write Once Read Many)
// Append-only JSONL with SHA-256 hash chain

export class EvidenceLedger {
  private readonly ledgerPath: string;
  private lastHash: string = '0000000000000000000000000000000000000000000000000000000000000000';
  private readonly signer: string;
  private entryCount: number = 0;
  private lastSealTime: Date = new Date();
  private readonly SEAL_INTERVAL_ENTRIES = parseInt(process.env.LEDGER_SEAL_INTERVAL || '100');
  private readonly SEAL_INTERVAL_HOURS = parseInt(process.env.LEDGER_SEAL_HOURS || '24');

  constructor(ledgerPath?: string) {
    this.ledgerPath = ledgerPath || path.join(process.cwd(), 'data', 'ledger.jsonl');
    this.signer = process.env.LEDGER_SIGNER || 'SOPGRID_SYSTEM';
    this.ensureLedgerExists();
    this.loadLastHash();
  }

  private ensureLedgerExists(): void {
    const dir = path.dirname(this.ledgerPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.ledgerPath)) {
      // Initialize with genesis block
      const genesis: LedgerEntry = {
        id: 'GENESIS',
        ts: new Date().toISOString(),
        sha256: this.lastHash,
        parent_sha256: '0000000000000000000000000000000000000000000000000000000000000000',
        signer: 'SYSTEM',
        type: 'SNAPSHOT',
        payload: { message: 'SOPGRID Ledger Genesis Block' }
      };
      fs.writeFileSync(this.ledgerPath, JSON.stringify(genesis) + '\n');
    }
  }

  private loadLastHash(): void {
    const content = fs.readFileSync(this.ledgerPath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l);
    if (lines.length > 0) {
      const lastEntry = JSON.parse(lines[lines.length - 1]) as LedgerEntry;
      this.lastHash = lastEntry.sha256;
    }
  }

  private computeHash(entry: Omit<LedgerEntry, 'sha256'>): string {
    const content = JSON.stringify({
      id: entry.id,
      ts: entry.ts,
      parent_sha256: entry.parent_sha256,
      signer: entry.signer,
      type: entry.type,
      payload: entry.payload
    });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async append(
    payloadOrType: any,
    payload?: unknown,
    signer?: string
  ): Promise<LedgerEntry> {
    // Handle both old and new call signatures
    let entryType: LedgerEntry['type'];
    let entryPayload: unknown;
    let entrySigner: string;

    if (typeof payloadOrType === 'string') {
      // Old signature: append(type, payload, signer)
      entryType = payloadOrType as LedgerEntry['type'];
      entryPayload = payload;
      entrySigner = signer || this.signer;
    } else {
      // New signature: append(payload) where payload has type field
      entryPayload = payloadOrType;
      entryType = payloadOrType.type || 'UNKNOWN';
      entrySigner = payloadOrType.signer || this.signer;
    }

    const entry: Omit<LedgerEntry, 'sha256'> = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      parent_sha256: this.lastHash,
      signer: entrySigner,
      type: entryType,
      payload: entryPayload
    };

    const sha256 = this.computeHash(entry);
    const completeEntry: LedgerEntry = { ...entry, sha256 };

    // Atomic append
    fs.appendFileSync(this.ledgerPath, JSON.stringify(completeEntry) + '\n');
    this.lastHash = sha256;

    return completeEntry;
  }

  async appendGatePass(
    gate: string,
    details: Record<string, any>
  ): Promise<LedgerEntry> {
    return this.append('GATE_PASS', {
      gate,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async appendGateBlock(
    gate: string,
    reason: string,
    details: Record<string, any>
  ): Promise<LedgerEntry> {
    return this.append('GATE_BLOCK', {
      gate,
      reason,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async appendSOPDraft(
    sopId: string,
    agentName: string,
    draft: unknown
  ): Promise<LedgerEntry> {
    return this.append('SOP_DRAFT', {
      sopId,
      agentName,
      draft,
      timestamp: new Date().toISOString()
    });
  }

  async appendSOPFinal(
    sopId: string,
    finalSOP: unknown,
    contradictionScore: number
  ): Promise<LedgerEntry> {
    return this.append('SOP_FINAL', {
      sopId,
      finalSOP,
      contradictionScore,
      timestamp: new Date().toISOString()
    });
  }

  async appendRepair(
    component: string,
    patch: string,
    result: 'SUCCESS' | 'FAILURE'
  ): Promise<LedgerEntry> {
    return this.append('REPAIR', {
      component,
      patch,
      result,
      timestamp: new Date().toISOString()
    });
  }

  async appendSnapshot(
    snapshotId: string,
    metadata: Record<string, any>
  ): Promise<LedgerEntry> {
    return this.append('SNAPSHOT', {
      snapshotId,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  async verifyIntegrity(): Promise<{
    valid: boolean;
    errors: string[];
    entryCount: number;
  }> {
    const content = fs.readFileSync(this.ledgerPath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l);
    const errors: string[] = [];
    let lastHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]) as LedgerEntry;
        
        // Verify parent hash
        if (entry.parent_sha256 !== lastHash) {
          errors.push(`Entry ${i} (${entry.id}): Parent hash mismatch`);
        }

        // Verify entry hash
        const computedHash = this.computeHash({
          id: entry.id,
          ts: entry.ts,
          parent_sha256: entry.parent_sha256,
          signer: entry.signer,
          type: entry.type,
          payload: entry.payload
        });

        if (computedHash !== entry.sha256) {
          errors.push(`Entry ${i} (${entry.id}): Hash verification failed`);
        }

        lastHash = entry.sha256;
      } catch (e) {
        errors.push(`Entry ${i}: Parse error - ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      entryCount: lines.length
    };
  }

  async getEntries(
    filter?: { type?: LedgerEntry['type']; startDate?: Date; endDate?: Date }
  ): Promise<LedgerEntry[]> {
    const content = fs.readFileSync(this.ledgerPath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l);
    const entries: LedgerEntry[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as LedgerEntry;
        
        if (filter) {
          if (filter.type && entry.type !== filter.type) continue;
          
          const entryDate = new Date(entry.ts);
          if (filter.startDate && entryDate < filter.startDate) continue;
          if (filter.endDate && entryDate > filter.endDate) continue;
        }
        
        entries.push(entry);
      } catch (e) {
        console.error('Failed to parse ledger entry:', e);
      }
    }

    return entries;
  }

  async getLastEntry(): Promise<LedgerEntry | null> {
    const content = fs.readFileSync(this.ledgerPath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l);
    
    if (lines.length === 0) return null;
    
    try {
      return JSON.parse(lines[lines.length - 1]) as LedgerEntry;
    } catch (e) {
      console.error('Failed to parse last ledger entry:', e);
      return null;
    }
  }

  async exportToJSON(): Promise<string> {
    const entries = await this.getEntries();
    return JSON.stringify(entries, null, 2);
  }

  async getStats(): Promise<{
    totalEntries: number;
    entriesByType: Record<string, number>;
    firstEntry: Date | null;
    lastEntry: Date | null;
    integrityStatus: 'VALID' | 'INVALID';
  }> {
    const entries = await this.getEntries();
    const entriesByType: Record<string, number> = {};
    
    for (const entry of entries) {
      entriesByType[entry.type] = (entriesByType[entry.type] || 0) + 1;
    }
    
    const integrity = await this.verifyIntegrity();
    
    return {
      totalEntries: entries.length,
      entriesByType,
      firstEntry: entries.length > 0 ? new Date(entries[0].ts) : null,
      lastEntry: entries.length > 0 ? new Date(entries[entries.length - 1].ts) : null,
      integrityStatus: integrity.valid ? 'VALID' : 'INVALID'
    };
  }
  // Alias for backward compatibility with web crawler
  async recordEntry(data: {
    sopId: string;
    action: string;
    agent: string;
    evidence: any;
    metadata: any;
  }): Promise<LedgerEntry> {
    return this.append(data.action as any, {
      sopId: data.sopId,
      agent: data.agent,
      evidence: data.evidence,
      metadata: data.metadata
    }, data.agent);
  }
}

export const evidenceLedger = new EvidenceLedger();