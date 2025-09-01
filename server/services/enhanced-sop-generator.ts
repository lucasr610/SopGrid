// Enhanced SOP Generator with Mother/Father coordination and tech-level communication
import { aiRouter } from './ai-router';
import { TechLevelPrompts, getTechLevel } from './tech-level-prompts';

interface MotherFatherCoordination {
  deadTestingFirst: boolean;
  liveTestingRequired: boolean;
  safetyProtocols: string[];
  technicalSteps: string[];
  documentation: string[];
}

interface EnhancedSOP {
  title: string;
  sopId: string;
  techLevel: 'new' | 'senior' | 'master';
  sections: {
    purpose: string;
    scope: string;
    safety: string[];
    materials: string[];
    tools: string[];
    procedures: ProcedureSection[];
    troubleshooting: string[];
    documentation: string[];
    cleanup: string[];
  };
}

interface ProcedureSection {
  title: string;
  steps: string[];
  safetyCallouts: string[];
  measurements: string[];
  photos: string[];
}

export class EnhancedSOPGenerator {
  
  async generateTechSOP(request: string): Promise<EnhancedSOP> {
    console.log('📋 Generating tech-level SOP with Mother/Father coordination...');
    
    const techLevel = getTechLevel(request);
    console.log(`🎯 Target audience: ${techLevel.toUpperCase()} technicians`);
    
    // Step 1: Mother analyzes safety requirements and testing phases
    const motherAnalysis = await this.getMotherSafetyAnalysis(request, techLevel);
    
    // Step 2: Father provides technical sequence and coordinates with Mother
    const fatherAnalysis = await this.getFatherTechnicalAnalysis(request, techLevel, motherAnalysis);
    
    // Step 3: Generate comprehensive SOP with proper coordination
    const sop = await this.generateCoordinatedSOP(request, techLevel, motherAnalysis, fatherAnalysis);
    
    return sop;
  }
  
  private async getMotherSafetyAnalysis(request: string, techLevel: 'new' | 'senior' | 'master') {
    const prompt = `${TechLevelPrompts.mother[techLevel]}

Analyze this RV procedure request: "${request}"

CRITICAL ANALYSIS - Return detailed JSON:
{
  "hazards": ["Death/serious injury hazards"],
  "mandatory_ppe": ["Required safety gear - no exceptions"], 
  "dead_testing_required": true/false,
  "live_testing_required": true/false,
  "testing_sequence": "dead_first" | "live_only" | "mixed_sequence",
  "live_work_ppe": ["Additional PPE for energized work"],
  "documentation_cya": ["Photos/measurements for liability protection"],
  "lockout_tagout": ["Specific LOTO requirements"],
  "emergency_procedures": ["What to do if things go wrong"],
  "father_coordination": "Tell Father: specific instructions for technical steps",
  "shop_requirements": ["What shop policies must be followed"]
}

Focus on GFCI testing example - dead testing for visual, live testing for voltage verification.`;

    const response = await aiRouter.chat(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  }
  
  private async getFatherTechnicalAnalysis(request: string, techLevel: 'new' | 'senior' | 'master', motherAnalysis: any) {
    const prompt = `${TechLevelPrompts.father[techLevel]}

Technical analysis for: "${request}"

Mother's safety coordination: "${JSON.stringify(motherAnalysis)}"

TECHNICAL BREAKDOWN - Return detailed JSON:
{
  "procedure_sequence": ["Step-by-step technical order"],
  "dead_testing_steps": ["Visual inspection and de-energized checks"],
  "live_testing_steps": ["Energized verification procedures"],
  "safety_coordination": "Response to Mother's requirements",
  "tools_required": ["Specific tools with part numbers"],
  "measurements": ["What to measure and expected values"],
  "calibration_requirements": ["Tool calibration needs"],
  "troubleshooting_tree": ["Decision points and actions"],
  "quality_standards": ["How to verify work quality"],
  "documentation_technical": ["Technical photos/readings needed"],
  "cleanup_procedure": ["Professional job completion"],
  "training_notes": ["Points for ${techLevel} tech level"]
}

For GFCI example: acknowledge Mother's dead-first requirement, then provide live testing safety when needed.`;

    const response = await aiRouter.chat(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  }
  
  private async generateCoordinatedSOP(
    request: string, 
    techLevel: 'new' | 'senior' | 'master', 
    motherAnalysis: any, 
    fatherAnalysis: any
  ): Promise<EnhancedSOP> {
    
    const prompt = `${TechLevelPrompts.soap[techLevel]}

Generate complete SOP for: "${request}"
Tech Level: ${techLevel.toUpperCase()}

Mother's Safety Analysis: ${JSON.stringify(motherAnalysis)}
Father's Technical Analysis: ${JSON.stringify(fatherAnalysis)}

Generate SOP in this EXACT format:

SOP_TITLE: [Specific technical procedure title]
SOP_ID: [Format: SHOP-EQUIPMENT-PROCEDURE-###]
TECH_LEVEL: ${techLevel.toUpperCase()} TECHNICIAN PROCEDURE
DATE_CREATED: [Today's date]
VERSION: 1.0

PURPOSE_DETAILS: [Why this procedure exists and what it accomplishes]

SCOPE_DETAILS: [Who uses this, when, and equipment coverage]

SAFETY_CRITICAL_NOTES:
${motherAnalysis.hazards?.map((h: string) => `* **${h}** - MANDATORY SAFETY REQUIREMENT`).join('\n') || ''}

MANDATORY_PPE:
${motherAnalysis.mandatory_ppe?.map((ppe: string) => `* ${ppe}`).join('\n') || ''}

TOOLS_REQUIRED:
${fatherAnalysis.tools_required?.map((tool: string) => `* ${tool}`).join('\n') || ''}

MATERIALS_LIST:
* [Specific parts with numbers if applicable]

PROCEDURE_SECTION_A_TITLE: Pre-Work Safety and Setup
PROCEDURE_SECTION_A_STEPS:
1. **LOCKOUT/TAGOUT**: ${motherAnalysis.lockout_tagout?.[0] || 'De-energize and secure electrical systems'}
2. **PPE VERIFICATION**: Don required safety equipment per safety notes above
3. **TOOL CALIBRATION**: Verify test equipment calibration and CAT ratings
4. **WORK AREA PREP**: Secure area and verify emergency procedures
5. **DOCUMENTATION SETUP**: Prepare camera/tablet for required photos

PROCEDURE_SECTION_B_TITLE: ${motherAnalysis.dead_testing_required ? 'Dead Testing and Visual Inspection' : 'Initial Assessment'}
PROCEDURE_SECTION_B_STEPS:
${fatherAnalysis.dead_testing_steps?.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n') || ''}

${motherAnalysis.live_testing_required ? `
PROCEDURE_SECTION_C_TITLE: Live Testing (Energized Work)
PROCEDURE_SECTION_C_SAFETY_REMINDER: **DANGER: LIVE ELECTRICAL WORK** - Additional PPE required: ${motherAnalysis.live_work_ppe?.join(', ') || 'Arc-rated gear, insulated gloves'}
PROCEDURE_SECTION_C_STEPS:
${fatherAnalysis.live_testing_steps?.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n') || ''}
` : ''}

PROCEDURE_SECTION_D_TITLE: Quality Verification and Documentation
PROCEDURE_SECTION_D_STEPS:
1. **VERIFY MEASUREMENTS**: Confirm all readings are within specifications
2. **PHOTO DOCUMENTATION**: ${motherAnalysis.documentation_cya?.join(', ') || 'Take required photos per shop policy'}
3. **FINAL TESTING**: Re-verify system operation after all work
4. **CLEAN UP**: ${fatherAnalysis.cleanup_procedure?.[0] || 'Return tools, clean work area, dispose of materials properly'}

TROUBLESHOOTING_ISSUES:
${fatherAnalysis.troubleshooting_tree?.map((issue: string) => `* ${issue}`).join('\n') || ''}

DOCUMENTATION_REQUIRED:
${motherAnalysis.documentation_cya?.map((doc: string) => `* ${doc}`).join('\n') || ''}
${fatherAnalysis.documentation_technical?.map((doc: string) => `* ${doc}`).join('\n') || ''}

SHOP_POLICIES:
${motherAnalysis.shop_requirements?.map((req: string) => `* ${req}`).join('\n') || ''}

EMERGENCY_PROCEDURES:
${motherAnalysis.emergency_procedures?.map((proc: string) => `* ${proc}`).join('\n') || ''}

${techLevel === 'new' ? `
TRAINING_NOTES_FOR_NEW_TECHS:
${fatherAnalysis.training_notes?.map((note: string) => `* ${note}`).join('\n') || ''}
` : ''}

QUALITY_STANDARDS:
${fatherAnalysis.quality_standards?.map((std: string) => `* ${std}`).join('\n') || ''}

---
*Generated for ${techLevel.toUpperCase()} RV technicians • Mother/Father coordinated • Shop-ready procedure*`;

    const response = await aiRouter.chat(prompt);
    
    // Parse response into structured SOP
    return {
      title: this.extractTitle(response),
      sopId: this.extractSOPId(response),
      techLevel,
      sections: this.parseSOPSections(response)
    } as EnhancedSOP;
  }
  
  private extractTitle(response: string): string {
    const match = response.match(/SOP_TITLE: (.+)/);
    return match ? match[1].trim() : 'RV Maintenance Procedure';
  }
  
  private extractSOPId(response: string): string {
    const match = response.match(/SOP_ID: (.+)/);
    return match ? match[1].trim() : 'SHOP-GENERIC-001';
  }
  
  private parseSOPSections(response: string): any {
    // Basic parsing - could be enhanced with more sophisticated section extraction
    return {
      purpose: this.extractSection(response, 'PURPOSE_DETAILS'),
      scope: this.extractSection(response, 'SCOPE_DETAILS'),
      safety: this.extractListSection(response, 'SAFETY_CRITICAL_NOTES'),
      materials: this.extractListSection(response, 'MATERIALS_LIST'),
      tools: this.extractListSection(response, 'TOOLS_REQUIRED'),
      procedures: [], // Would parse procedure sections
      troubleshooting: this.extractListSection(response, 'TROUBLESHOOTING_ISSUES'),
      documentation: this.extractListSection(response, 'DOCUMENTATION_REQUIRED'),
      cleanup: []
    };
  }
  
  private extractSection(response: string, sectionName: string): string {
    const regex = new RegExp(`${sectionName}: (.+?)(?=\\n\\w|$)`, 's');
    const match = response.match(regex);
    return match ? match[1].trim() : '';
  }
  
  private extractListSection(response: string, sectionName: string): string[] {
    const section = this.extractSection(response, sectionName);
    return section.split('\n').filter(line => line.trim().startsWith('*')).map(line => line.trim().substring(1).trim());
  }
}

export const enhancedSOPGenerator = new EnhancedSOPGenerator();