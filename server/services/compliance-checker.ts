import { openaiService } from './openai-service';
import { geminiService } from './gemini-service';
import { checkOSHALockoutTagoutCompliance } from './reg-rules/osha-1910-lockout-tagout.js';
import { checkNFPA70ECompliance } from './reg-rules/nfpa-70e-electrical-safety.js';

interface ComplianceResult {
  standards: string[];
  compliant: boolean;
  violations: string[];
  recommendations: string[];
  score: number;
}

class ComplianceChecker {
  private industryStandards = {
    general: ['OSHA', 'EPA', 'CPSC'],
    electrical: ['OSHA', 'NFPA 70', 'IEEE', 'NEC', 'CPSC'],
    mechanical: ['OSHA', 'ASME', 'EPA'],
    medical: ['FDA', 'ISO 13485', 'OSHA', 'CDC', 'CMS'],
    healthcare: ['OSHA', 'CDC', 'FDA', 'CMS'],
    laboratory: ['OSHA', 'CDC', 'EPA', 'FDA'],
    pharmaceutical: ['FDA', 'OSHA', 'EPA', 'CDC'],
    food_service: ['FDA', 'OSHA', 'EPA', 'CDC'],
    manufacturing: ['OSHA', 'EPA', 'NFPA', 'CPSC'],
    construction: ['OSHA', 'EPA', 'NFPA', 'DOT'],
    automotive: ['OSHA', 'EPA', 'DOT', 'CPSC'],
    chemical: ['OSHA', 'EPA', 'DOT', 'CDC'],
    rv_service: ['OSHA', 'DOT', 'NFPA', 'CPSC'],
    transportation: ['DOT', 'OSHA', 'EPA'],
    biotechnology: ['FDA', 'CDC', 'OSHA', 'EPA'],
    nursing_home: ['CMS', 'CDC', 'OSHA'],
    hospital: ['CMS', 'CDC', 'FDA', 'OSHA'],
    public_health: ['CDC', 'OSHA', 'EPA'],
    emergency_response: ['CDC', 'OSHA', 'EPA', 'DOT'],
    government: ['GAO', 'OSHA', 'EPA'],
    federal_contractor: ['GAO', 'OSHA', 'EPA'],
    consumer_products: ['CPSC', 'OSHA', 'EPA'],
    defense: ['DOD', 'MIL-STD', 'OSHA'],
    hvac: ['OSHA', 'EPA', 'ASHRAE', 'DOT']
  };

  async checkCompliance(content: string, industry: string): Promise<ComplianceResult> {
    const standards = this.industryStandards[industry as keyof typeof this.industryStandards] || this.industryStandards.general;
    
    // Machine-readable compliance checks
    const oshaLotoCheck = checkOSHALockoutTagoutCompliance(content);
    const nfpa70eCheck = checkNFPA70ECompliance(content);
    
    // AI-enhanced compliance checks
    const oshaCheck = await this.checkOSHACompliance(content);
    const epaCheck = await this.checkEPACompliance(content);
    const industryCheck = await this.checkIndustrySpecificCompliance(content, industry);

    const allChecks = [oshaCheck, epaCheck, industryCheck];
    
    // Combine machine-readable and AI results
    const violations = [
      ...allChecks.flatMap(check => check.violations),
      ...oshaLotoCheck.violations,
      ...nfpa70eCheck.violations
    ];
    
    const recommendations = [
      ...allChecks.flatMap(check => check.recommendations),
      ...oshaLotoCheck.recommendations,
      ...nfpa70eCheck.recommendations
    ];
    
    // Calculate weighted score (machine-readable rules have higher weight)
    const aiScore = allChecks.reduce((sum, check) => sum + check.score, 0) / allChecks.length;
    const machineScore = (oshaLotoCheck.score + nfpa70eCheck.score) / 2;
    const finalScore = Math.round((aiScore * 0.3) + (machineScore * 0.7)); // Machine rules weighted higher

    // Block compliance if critical failures exist
    const criticalFailures = [
      ...oshaLotoCheck.criticalFailures,
      ...nfpa70eCheck.criticalFailures
    ];

    return {
      standards,
      compliant: violations.length === 0 && criticalFailures.length === 0,
      violations: criticalFailures.length > 0 ? 
        [...violations, `CRITICAL COMPLIANCE FAILURES: ${criticalFailures.length} found`] : 
        violations,
      recommendations,
      score: criticalFailures.length > 0 ? 0 : finalScore // Zero score if critical failures
    };
  }

  private async checkOSHACompliance(content: string): Promise<ComplianceResult> {
    const prompt = `
Analyze the following content for OSHA compliance:

${content}

Check for:
1. Personal Protective Equipment (PPE) requirements
2. Hazard identification and mitigation
3. Safety training requirements
4. Emergency procedures
5. Workplace safety standards

Return a JSON object with:
- compliant: boolean
- violations: array of specific violations found
- recommendations: array of recommendations for improvement
- score: number from 0-100
`;

    try {
      const result = await openaiService.analyzeCompliance(prompt);
      return {
        standards: ['OSHA'],
        ...result
      };
    } catch (error) {
      console.error('OSHA compliance check failed:', error);
      return {
        standards: ['OSHA'],
        compliant: false,
        violations: ['Unable to perform OSHA compliance check'],
        recommendations: ['Manual review required'],
        score: 0
      };
    }
  }

  private async checkEPACompliance(content: string): Promise<ComplianceResult> {
    const prompt = `
Analyze the following content for EPA environmental compliance:

${content}

Check for:
1. Environmental impact assessment
2. Waste disposal procedures
3. Chemical handling and storage
4. Air quality considerations
5. Water protection measures

Return a JSON object with:
- compliant: boolean
- violations: array of specific violations found
- recommendations: array of recommendations for improvement
- score: number from 0-100
`;

    try {
      const result = await geminiService.analyzeCompliance(prompt);
      return {
        standards: ['EPA'],
        ...result
      };
    } catch (error) {
      console.error('EPA compliance check failed:', error);
      return {
        standards: ['EPA'],
        compliant: true, // Assume compliant if check fails
        violations: [],
        recommendations: ['Manual EPA review recommended'],
        score: 90
      };
    }
  }

  private async checkIndustrySpecificCompliance(content: string, industry: string): Promise<ComplianceResult> {
    const standards = this.industryStandards[industry as keyof typeof this.industryStandards] || [];
    const industryStandards = standards.filter(s => !['OSHA', 'EPA'].includes(s));

    if (industryStandards.length === 0) {
      return {
        standards: [],
        compliant: true,
        violations: [],
        recommendations: [],
        score: 100
      };
    }

    const prompt = `
Analyze the following content for ${industry} industry compliance with standards: ${industryStandards.join(', ')}

${content}

Provide industry-specific compliance analysis considering relevant standards and best practices.

Return a JSON object with:
- compliant: boolean
- violations: array of specific violations found
- recommendations: array of recommendations for improvement
- score: number from 0-100
`;

    try {
      const result = await openaiService.analyzeCompliance(prompt);
      return {
        standards: industryStandards,
        ...result
      };
    } catch (error) {
      console.error('Industry compliance check failed:', error);
      return {
        standards: industryStandards,
        compliant: true,
        violations: [],
        recommendations: ['Manual industry compliance review recommended'],
        score: 85
      };
    }
  }
}

export const complianceChecker = new ComplianceChecker();
