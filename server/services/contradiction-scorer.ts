import type { SOPDoc, SOPStep, ContradictionScore } from '../src/types/core';

// SOPGRID Contradiction Scoring System
// CS = α*StepDiff + β*SpecDiff + γ*RiskDiff + δ*NLIContradictionRate
// Defaults: α=0.35, β=0.35, γ=0.15, δ=0.15. Threshold CS_T=0.35

export class ContradictionScorer {
  private readonly weights = {
    stepDiff: 0.35,
    specDiff: 0.35,
    riskDiff: 0.15,
    nliContradiction: 0.15
  };
  
  private readonly threshold = 0.35;
  
  async scoreContradictions(docs: SOPDoc[]): Promise<number> {
    if (docs.length < 2) return 0;
    
    let totalScore = 0;
    let comparisons = 0;
    
    // Compare all pairs of documents
    for (let i = 0; i < docs.length - 1; i++) {
      for (let j = i + 1; j < docs.length; j++) {
        const score = this.computeScore(docs[i], docs[j]);
        totalScore += score.total;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalScore / comparisons : 0;
  }

  computeScore(doc1: SOPDoc, doc2: SOPDoc): ContradictionScore {
    const stepDiff = this.computeStepDifference(doc1.steps, doc2.steps);
    const specDiff = this.computeSpecDifference(doc1.steps, doc2.steps);
    const riskDiff = this.computeRiskDifference(doc1.steps, doc2.steps);
    const nliRate = this.computeNLIContradictionRate(doc1, doc2);

    const total = 
      this.weights.stepDiff * stepDiff +
      this.weights.specDiff * specDiff +
      this.weights.riskDiff * riskDiff +
      this.weights.nliContradiction * nliRate;

    return {
      stepDiff,
      specDiff,
      riskDiff,
      nliContradictionRate: nliRate,
      total,
      threshold: this.threshold,
      passed: total <= this.threshold
    };
  }

  private computeStepDifference(steps1: SOPStep[], steps2: SOPStep[]): number {
    if (!steps1.length || !steps2.length) return 1.0;
    
    const maxLen = Math.max(steps1.length, steps2.length);
    const minLen = Math.min(steps1.length, steps2.length);
    
    // Length difference penalty
    const lengthDiff = (maxLen - minLen) / maxLen;
    
    // Content difference for matching steps
    let contentDiff = 0;
    for (let i = 0; i < minLen; i++) {
      const similarity = this.computeStepSimilarity(steps1[i], steps2[i]);
      contentDiff += (1 - similarity);
    }
    
    const avgContentDiff = contentDiff / minLen;
    
    // Weighted combination
    return lengthDiff * 0.3 + avgContentDiff * 0.7;
  }

  private computeStepSimilarity(step1: SOPStep, step2: SOPStep): number {
    let similarity = 0;
    let weights = 0;
    
    // Text similarity (most important)
    if (step1.text && step2.text) {
      similarity += this.textSimilarity(step1.text, step2.text) * 0.4;
      weights += 0.4;
    }
    
    // Tools similarity
    similarity += this.arraySimilarity(step1.tools, step2.tools) * 0.2;
    weights += 0.2;
    
    // PPE similarity
    similarity += this.arraySimilarity(step1.ppe, step2.ppe) * 0.15;
    weights += 0.15;
    
    // Risks similarity
    similarity += this.arraySimilarity(step1.risks, step2.risks) * 0.15;
    weights += 0.15;
    
    // Verification similarity
    similarity += this.arraySimilarity(step1.verify, step2.verify) * 0.1;
    weights += 0.1;
    
    return weights > 0 ? similarity / weights : 0;
  }

  private computeSpecDifference(steps1: SOPStep[], steps2: SOPStep[]): number {
    if (!steps1.length || !steps2.length) return 1.0;
    
    let totalDiff = 0;
    let comparisons = 0;
    
    const minLen = Math.min(steps1.length, steps2.length);
    
    for (let i = 0; i < minLen; i++) {
      const specs1 = steps1[i].specs || {};
      const specs2 = steps2[i].specs || {};
      
      const allKeys = new Set([...Object.keys(specs1), ...Object.keys(specs2)]);
      
      if (allKeys.size === 0) continue;
      
      let matches = 0;
      for (const key of Array.from(allKeys)) {
        if (specs1[key] && specs2[key] && specs1[key] === specs2[key]) {
          matches++;
        }
      }
      
      totalDiff += 1 - (matches / allKeys.size);
      comparisons++;
    }
    
    return comparisons > 0 ? totalDiff / comparisons : 0;
  }

  private computeRiskDifference(steps1: SOPStep[], steps2: SOPStep[]): number {
    const risks1 = new Set(steps1.flatMap(s => s.risks || []));
    const risks2 = new Set(steps2.flatMap(s => s.risks || []));
    
    if (risks1.size === 0 && risks2.size === 0) return 0;
    if (risks1.size === 0 || risks2.size === 0) return 1;
    
    const intersection = new Set(Array.from(risks1).filter(r => risks2.has(r)));
    const union = new Set([...Array.from(risks1), ...Array.from(risks2)]);
    
    // Jaccard distance
    return 1 - (intersection.size / union.size);
  }

  private computeNLIContradictionRate(doc1: SOPDoc, doc2: SOPDoc): number {
    // Simplified NLI simulation - in production, use actual NLI model
    let contradictions = 0;
    let comparisons = 0;
    
    const minLen = Math.min(doc1.steps.length, doc2.steps.length);
    
    for (let i = 0; i < minLen; i++) {
      const step1 = doc1.steps[i];
      const step2 = doc2.steps[i];
      
      // Check for contradictory instructions
      if (this.detectContradiction(step1.text, step2.text)) {
        contradictions++;
      }
      comparisons++;
      
      // Check for contradictory safety measures
      if (this.detectSafetyContradiction(step1, step2)) {
        contradictions++;
      }
      comparisons++;
    }
    
    return comparisons > 0 ? contradictions / comparisons : 0;
  }

  private detectContradiction(text1: string, text2: string): boolean {
    // Simplified contradiction detection
    const negationWords = ['not', 'never', 'no', 'don\'t', 'avoid', 'prevent', 'stop'];
    const oppositeActions = {
      'connect': 'disconnect',
      'open': 'close',
      'start': 'stop',
      'enable': 'disable',
      'install': 'remove',
      'increase': 'decrease',
      'tighten': 'loosen'
    };
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    // Check for direct negation
    for (const word of negationWords) {
      if ((words1.includes(word) && !words2.includes(word)) ||
          (!words1.includes(word) && words2.includes(word))) {
        return true;
      }
    }
    
    // Check for opposite actions
    for (const [action, opposite] of Object.entries(oppositeActions)) {
      if ((words1.includes(action) && words2.includes(opposite)) ||
          (words1.includes(opposite) && words2.includes(action))) {
        return true;
      }
    }
    
    return false;
  }

  private detectSafetyContradiction(step1: SOPStep, step2: SOPStep): boolean {
    // Check if PPE requirements contradict
    const ppe1 = new Set(step1.ppe || []);
    const ppe2 = new Set(step2.ppe || []);
    
    // If one requires PPE and other explicitly says not needed
    if (ppe1.size > 0 && ppe2.size === 0 && step2.text.toLowerCase().includes('no ppe')) {
      return true;
    }
    
    // Check LOTO contradictions
    const loto1 = step1.loto || [];
    const loto2 = step2.loto || [];
    
    if (loto1.length > 0 && loto2.length === 0 && step2.text.toLowerCase().includes('no lockout')) {
      return true;
    }
    
    return false;
  }

  private textSimilarity(text1: string, text2: string): number {
    // Simple token-based similarity
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
    
    if (tokens1.size === 0 && tokens2.size === 0) return 1;
    if (tokens1.size === 0 || tokens2.size === 0) return 0;
    
    const intersection = new Set(Array.from(tokens1).filter(t => tokens2.has(t)));
    const union = new Set([...Array.from(tokens1), ...Array.from(tokens2)]);
    
    // Jaccard similarity
    return intersection.size / union.size;
  }

  private arraySimilarity(arr1: string[], arr2: string[]): number {
    if (!arr1?.length && !arr2?.length) return 1;
    if (!arr1?.length || !arr2?.length) return 0;
    
    const set1 = new Set(arr1.map(s => s.toLowerCase()));
    const set2 = new Set(arr2.map(s => s.toLowerCase()));
    
    const intersection = new Set(Array.from(set1).filter(s => set2.has(s)));
    const union = new Set([...Array.from(set1), ...Array.from(set2)]);
    
    return intersection.size / union.size;
  }

  shouldTriggerFTS(score: ContradictionScore): boolean {
    return !score.passed;
  }

  generateFTSPrompt(score: ContradictionScore, doc1: SOPDoc, doc2: SOPDoc): string {
    const issues = [];
    
    if (score.stepDiff > 0.4) {
      issues.push(`Step sequence and content differ significantly (${(score.stepDiff * 100).toFixed(1)}% difference)`);
    }
    
    if (score.specDiff > 0.4) {
      issues.push(`Technical specifications are inconsistent (${(score.specDiff * 100).toFixed(1)}% difference)`);
    }
    
    if (score.riskDiff > 0.3) {
      issues.push(`Risk assessments are misaligned (${(score.riskDiff * 100).toFixed(1)}% difference)`);
    }
    
    if (score.nliContradictionRate > 0.2) {
      issues.push(`Direct contradictions detected in ${(score.nliContradictionRate * 100).toFixed(1)}% of claims`);
    }
    
    return `CONTRADICTION ALERT: Score ${score.total.toFixed(3)} exceeds threshold ${score.threshold}.
    
Issues detected:
${issues.map(i => `- ${i}`).join('\n')}

Please reconcile the following specific differences:
1. Ensure step sequences are aligned and consistent
2. Verify all technical specifications match exactly
3. Align risk assessments and safety measures
4. Resolve any contradictory instructions

Target: Achieve contradiction score below ${score.threshold}`;
  }
}

export const contradictionScorer = new ContradictionScorer();