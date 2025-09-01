import { fundamentalLaws, type ValidationResult } from "./fundamental-laws.js";
import { hitlSystem } from "./hitl-system.js";
import { evidenceLedger } from "./evidence-ledger.js";

export interface ManualData {
  source: string;
  manufacturer: string;
  model: string;
  section: string;
  data: Record<string, number>;
  category: 'electrical' | 'thermal' | 'hydraulic' | 'mechanical' | 'thermodynamic' | 'pneumatic';
  context?: string;
}

export interface ContradictionReport {
  manualId: string;
  contradictions: Array<{
    law: string;
    manualValue: number;
    physicsValue: number;
    variance: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  flaggedForHITL: boolean;
  hitlId?: string;
  recommendation: string;
}

class ManualValidatorService {
  private readonly HITL_THRESHOLD = 0.05; // 5% variance triggers HITL

  async validateManualAgainstPhysics(manual: ManualData): Promise<ContradictionReport> {
    console.log(`🔍 Validating manual: ${manual.source} against fundamental physics laws`);

    // Step 1: Always consult the manual data first (this is our starting point)
    const manualValues = manual.data;

    // Step 2: Cross-check manual data against fundamental physics laws
    const validation = await fundamentalLaws.validateManualData({
      category: manual.category,
      manualMeasurements: manualValues,
      manualSource: manual.source,
      context: manual.context
    });

    const report: ContradictionReport = {
      manualId: `${manual.manufacturer}_${manual.model}_${Date.now()}`,
      contradictions: validation.discrepancies.map(d => ({
        law: d.law,
        manualValue: d.actual,
        physicsValue: d.expected,
        variance: d.variance,
        severity: d.severity
      })),
      flaggedForHITL: false,
      recommendation: ''
    };

    // Step 3: If contradictions exceed threshold, flag for HITL arbitration
    const significantContradictions = report.contradictions.filter(c => 
      c.variance > this.HITL_THRESHOLD
    );

    if (significantContradictions.length > 0) {
      console.log(`🚨 Manual contradicts physics laws - Flagging for HITL arbitration`);
      
      const hitlDecision = await hitlSystem.flagForHITL({
        question: `Manual vs Physics Contradiction: ${manual.source}`,
        conflictingOptions: [
          `Manual (${manual.source}): ${JSON.stringify(manualValues)}`,
          `Physics Laws: ${significantContradictions.map(c => 
            `${c.law} expects ${c.physicsValue}, manual shows ${c.manualValue}`
          ).join('; ')}`
        ],
        contradictionScore: Math.max(...significantContradictions.map(c => c.variance)),
        priority: significantContradictions.some(c => c.severity === 'critical') ? 'critical' : 'high'
      });

      report.flaggedForHITL = true;
      report.hitlId = hitlDecision.id;
      report.recommendation = this.generateRecommendation(manual, significantContradictions);

      // Log the contradiction to evidence ledger
      await evidenceLedger.append('GATE_BLOCK', {
        manualId: report.manualId,
        source: manual.source,
        contradictions: significantContradictions.length,
        hitlId: hitlDecision.id,
        reason: 'manual_physics_contradiction',
        severity: 'requires_human_arbitration'
      });
    } else {
      report.recommendation = `Manual data validated against physics laws - no significant contradictions detected.`;
    }

    return report;
  }

  private generateRecommendation(manual: ManualData, contradictions: any[]): string {
    const recommendations = [
      `MANUAL VS PHYSICS CONTRADICTION DETECTED`,
      ``,
      `Manual: ${manual.source} (${manual.manufacturer} ${manual.model})`,
      `Section: ${manual.section}`,
      ``,
      `Contradictions Found:`,
    ];

    contradictions.forEach((c, idx) => {
      recommendations.push(
        `${idx + 1}. ${c.law}:`,
        `   • Manual states: ${c.manualValue}`,
        `   • Physics expects: ${c.physicsValue}`,
        `   • Variance: ${(c.variance * 100).toFixed(1)}% (${c.severity} severity)`,
        ``
      );
    });

    recommendations.push(
      `POSSIBLE CAUSES:`,
      `• Manual contains errors or outdated information`,
      `• Component has unique behavior not covered by standard physics`,
      `• Measurement conditions differ from standard assumptions`,
      `• Units conversion error in manual`,
      `• Component operates outside ideal conditions`,
      ``,
      `HITL ARBITRATION REQUIRED:`,
      `• Senior technician should verify with actual component testing`,
      `• Cross-reference with other manufacturer documentation`,
      `• Contact manufacturer technical support if needed`,
      `• Document any confirmed exceptions for future reference`
    );

    return recommendations.join('\n');
  }

  async getContradictionHistory(): Promise<ContradictionReport[]> {
    // This would retrieve historical contradictions from storage
    // For now, return empty array - could be enhanced to track patterns
    return [];
  }

  async analyzeManufacturerTrends(manufacturer: string): Promise<{
    totalManuals: number;
    contradictionRate: number;
    commonIssues: string[];
    reliability: 'high' | 'medium' | 'low';
  }> {
    // This could track which manufacturers have more contradictions
    // Useful for knowing which manuals to be more skeptical of
    return {
      totalManuals: 0,
      contradictionRate: 0,
      commonIssues: [],
      reliability: 'medium'
    };
  }

  getCommonManualErrors(): Array<{
    category: string;
    commonErrors: string[];
    physicsLawViolated: string;
  }> {
    return [
      {
        category: 'electrical',
        commonErrors: [
          'Stating power consumption without specifying voltage',
          'Claiming efficiency > 100%',
          'Incorrect current calculations for given power/voltage',
          'Mixing AC and DC specifications without clarification'
        ],
        physicsLawViolated: 'Ohms Law, Watts Law, Conservation of Energy'
      },
      {
        category: 'thermal',
        commonErrors: [
          'Heat pump COPs that violate thermodynamics',
          'Insulation R-values that defy heat transfer physics',
          'Temperature ratings outside material limits',
          'BTU calculations that dont match electrical input'
        ],
        physicsLawViolated: 'First Law of Thermodynamics, Heat Transfer Laws'
      },
      {
        category: 'hydraulic',
        commonErrors: [
          'Flow rates that violate continuity equation',
          'Pressure ratings without area specifications',
          'Pump performance outside Bernoulli principles',
          'Head pressure calculations ignoring elevation'
        ],
        physicsLawViolated: 'Bernoulli Principle, Pascal\'s Law, Continuity Equation'
      }
    ];
  }
}

export const manualValidator = new ManualValidatorService();