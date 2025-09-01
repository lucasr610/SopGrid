// Procedure Sequence Validator
// Ensures mechanical operations follow physically possible sequences

interface SequenceRule {
  operation: string;
  prerequisites: string[];
  blockers: string[];
  physicsReason: string;
}

interface SequenceValidation {
  isValid: boolean;
  violations: string[];
  corrections: string[];
  missingSteps: string[];
}

class ProcedureSequenceValidator {
  private sequenceRules: Map<string, SequenceRule> = new Map();
  
  constructor() {
    this.initializeSequenceRules();
  }
  
  private initializeSequenceRules() {
    // Hub removal sequence rules
    this.sequenceRules.set('remove_hub', {
      operation: 'remove hub/drum',
      prerequisites: [
        'remove dust cap',
        'remove cotter pin',
        'remove castle nut',
        'remove thrust washer'
      ],
      blockers: [
        'castle nut installed',
        'cotter pin installed'
      ],
      physicsReason: 'Hub is mechanically locked by castle nut threaded onto spindle. Physical removal impossible without removing nut first.'
    });
    
    // Castle nut removal rules
    this.sequenceRules.set('remove_castle_nut', {
      operation: 'remove castle nut',
      prerequisites: [
        'remove cotter pin'
      ],
      blockers: [
        'cotter pin installed'
      ],
      physicsReason: 'Cotter pin mechanically blocks castle nut rotation through spindle hole.'
    });
    
    // Bearing removal rules
    this.sequenceRules.set('remove_bearings', {
      operation: 'remove bearings',
      prerequisites: [
        'remove hub',
        'remove grease seal'
      ],
      blockers: [
        'hub installed',
        'seal installed'
      ],
      physicsReason: 'Bearings are inside hub assembly and cannot be accessed without hub removal.'
    });
    
    // Backing plate removal rules
    this.sequenceRules.set('remove_backing_plate', {
      operation: 'remove backing plate',
      prerequisites: [
        'remove hub/drum',
        'disconnect brake components'
      ],
      blockers: [
        'hub installed',
        'brake shoes attached'
      ],
      physicsReason: 'Backing plate is behind hub and brake assembly, physically inaccessible without removal.'
    });
    
    // Spindle nut torque rules
    this.sequenceRules.set('torque_castle_nut', {
      operation: 'torque castle nut',
      prerequisites: [
        'install inner bearing',
        'install hub on spindle',
        'install outer bearing',
        'install thrust washer'
      ],
      blockers: [
        'missing bearings',
        'hub not seated'
      ],
      physicsReason: 'Castle nut sets bearing preload - bearings must be in place for proper torque.'
    });
    
    // Cotter pin installation rules
    this.sequenceRules.set('install_cotter_pin', {
      operation: 'install new cotter pin',
      prerequisites: [
        'torque castle nut',
        'align castle nut slots'
      ],
      blockers: [
        'reusing old cotter pin',
        'slots not aligned'
      ],
      physicsReason: 'New cotter pin required for safety. Must align with spindle hole and castle nut slots.'
    });
  }
  
  validateSequence(steps: string[]): SequenceValidation {
    const validation: SequenceValidation = {
      isValid: true,
      violations: [],
      corrections: [],
      missingSteps: []
    };
    
    const completedSteps = new Set<string>();
    
    for (let i = 0; i < steps.length; i++) {
      const currentStep = steps[i].toLowerCase();
      
      // Check each rule
      for (const [key, rule] of this.sequenceRules) {
        if (this.stepMatchesOperation(currentStep, rule.operation)) {
          // Check prerequisites
          for (const prereq of rule.prerequisites) {
            if (!this.hasCompletedStep(completedSteps, prereq)) {
              validation.isValid = false;
              validation.violations.push(
                `Step ${i + 1}: Cannot "${rule.operation}" without first "${prereq}"`
              );
              validation.corrections.push(
                `Add step: "${prereq}" before attempting "${rule.operation}"`
              );
              validation.missingSteps.push(prereq);
            }
          }
          
          // Check for blockers
          for (const blocker of rule.blockers) {
            if (this.hasBlocker(currentStep, blocker)) {
              validation.isValid = false;
              validation.violations.push(
                `Step ${i + 1}: ${rule.physicsReason}`
              );
            }
          }
        }
      }
      
      // Add current step to completed
      completedSteps.add(currentStep);
    }
    
    return validation;
  }
  
  private stepMatchesOperation(step: string, operation: string): boolean {
    const operationKeywords = operation.toLowerCase().split(/\s+/);
    return operationKeywords.every(keyword => step.includes(keyword));
  }
  
  private hasCompletedStep(completedSteps: Set<string>, requiredStep: string): boolean {
    const keywords = requiredStep.toLowerCase().split(/\s+/);
    for (const step of completedSteps) {
      if (keywords.every(keyword => step.includes(keyword))) {
        return true;
      }
    }
    return false;
  }
  
  private hasBlocker(step: string, blocker: string): boolean {
    return step.includes(blocker.toLowerCase());
  }
  
  // Validate hub removal specific sequence
  validateHubRemoval(procedure: string): SequenceValidation {
    const steps = procedure.toLowerCase().split(/\n|\d+\.\s*/);
    const validation = this.validateSequence(steps);
    
    // Check for specific hub removal issues
    const hasHubRemoval = steps.some(s => s.includes('remove') && s.includes('hub'));
    const hasCotterPinRemoval = steps.some(s => s.includes('remove') && s.includes('cotter'));
    const hasCastleNutRemoval = steps.some(s => s.includes('remove') && s.includes('castle'));
    const hasDustCapRemoval = steps.some(s => s.includes('remove') && s.includes('dust'));
    
    if (hasHubRemoval) {
      if (!hasDustCapRemoval) {
        validation.violations.push('Missing dust cap removal - cannot access castle nut');
        validation.missingSteps.push('Remove dust cap');
      }
      if (!hasCotterPinRemoval) {
        validation.violations.push('Missing cotter pin removal - castle nut is locked');
        validation.missingSteps.push('Remove and discard cotter pin');
      }
      if (!hasCastleNutRemoval) {
        validation.violations.push('CRITICAL: Cannot remove hub without removing castle nut first');
        validation.missingSteps.push('Remove castle nut');
        validation.isValid = false;
      }
    }
    
    // Check for proper cotter pin handling
    if (steps.some(s => s.includes('reuse') && s.includes('cotter'))) {
      validation.violations.push('SAFETY VIOLATION: Cotter pins are single-use only');
      validation.corrections.push('Always use NEW cotter pins');
      validation.isValid = false;
    }
    
    return validation;
  }
  
  // Generate correct sequence for an operation
  generateCorrectSequence(operation: string): string[] {
    const sequences: { [key: string]: string[] } = {
      'hub_removal': [
        'Remove wheel and tire',
        'Remove dust cap using channel lock pliers',
        'Remove and discard old cotter pin using needle-nose pliers',
        'Remove castle nut using appropriate socket',
        'Remove thrust washer',
        'Pull hub/drum assembly straight off spindle',
        'Remove inner grease seal (discard - single use)',
        'Remove inner bearing',
        'Remove outer bearing race if needed'
      ],
      'hub_installation': [
        'Pack inner bearing with appropriate grease',
        'Install NEW inner grease seal',
        'Place hub on spindle carefully',
        'Install outer bearing (packed with grease)',
        'Install thrust washer',
        'Thread castle nut onto spindle',
        'Torque castle nut to specification while rotating hub',
        'Back off castle nut per specification',
        'Align castle nut slot with spindle hole',
        'Install NEW cotter pin',
        'Bend cotter pin legs to secure',
        'Install dust cap',
        'Install wheel and tire'
      ],
      'backing_plate_replacement': [
        'Remove wheel and tire',
        'Remove dust cap',
        'Remove and discard cotter pin',
        'Remove castle nut',
        'Remove thrust washer', 
        'Remove hub/drum assembly',
        'Disconnect brake wiring/hydraulics',
        'Remove brake shoes and hardware',
        'Remove backing plate mounting bolts',
        'Remove old backing plate',
        'Install new backing plate',
        'Reinstall brake components',
        'Reinstall hub with NEW seal and cotter pin'
      ]
    };
    
    return sequences[operation] || [];
  }
}

export const sequenceValidator = new ProcedureSequenceValidator();

// Enhanced sequence validation with manual knowledge
export function validateSequenceWithManuals(procedure: string): SequenceValidation {
  // Run standard validation
  const validation = sequenceValidator.validateHubRemoval(procedure);
  
  // Import manual knowledge
  const { manualKnowledgeExtractor } = require('./manual-knowledge-extractor.js');
  
  // Check for operations that have documented sequences
  const operations = ['bearing_repack', 'hub_removal', 'brake_adjustment', 'wet_bolt'];
  
  for (const op of operations) {
    if (procedure.toLowerCase().includes(op.replace('_', ' '))) {
      const correctSequence = manualKnowledgeExtractor.getCorrectSequence(op);
      
      if (correctSequence.length > 0) {
        // Check if procedure follows manual sequence
        const procedureSteps = procedure.toLowerCase().split(/\n|\d+\.\s*/);
        let stepIndex = 0;
        
        for (const manualStep of correctSequence) {
          const found = procedureSteps.some(step => 
            step.includes(manualStep.toLowerCase().substring(0, 20))
          );
          
          if (!found) {
            validation.missingSteps.push(`Manual requires: ${manualStep}`);
            validation.isValid = false;
          }
        }
        
        validation.corrections.push(`Follow manufacturer sequence for ${op}`);
      }
    }
  }
  
  return validation;
}