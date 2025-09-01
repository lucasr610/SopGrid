// RV Equipment Domain Knowledge Validator
// Ensures procedures are physically possible and appropriate for RV systems

interface EquipmentConstraints {
  hasServicePorts: boolean;
  isSealed: boolean;
  requiresCertification: boolean;
  commonMisconceptions: string[];
  physicalLimitations: string[];
  validProcedures: string[];
  invalidProcedures: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  corrections: string[];
  physicsViolations: string[];
}

class RVEquipmentValidator {
  private equipmentDatabase: Map<string, EquipmentConstraints> = new Map();

  constructor() {
    this.initializeEquipmentDatabase();
  }

  private initializeEquipmentDatabase() {
    // RV Air Conditioner constraints
    this.equipmentDatabase.set('rv_ac_unit', {
      hasServicePorts: false,
      isSealed: true,
      requiresCertification: false,
      commonMisconceptions: [
        'RV A/C units can be recharged by the owner',
        'RV A/C units have service ports like automotive A/C',
        'Refrigerant can be added to improve cooling',
        'DIY refrigerant recovery is possible',
        'RV A/C units have refrigerant lines between components',
        'RV A/C units work like split systems with separate indoor/outdoor units'
      ],
      physicalLimitations: [
        'RV A/C units are hermetically sealed, self-contained systems',
        'No user-serviceable refrigerant ports exist',
        'No refrigerant lines connect between components - it is ONE sealed unit',
        'The entire unit sits on the roof - there are NO refrigerant connections',
        'Units must be replaced entirely if refrigerant is lost',
        'Compressor and refrigerant circuit are non-serviceable',
        'Only electrical and duct connections exist - NO refrigerant connections'
      ],
      validProcedures: [
        'Cleaning coils and filters',
        'Checking electrical connections',
        'Testing capacitors',
        'Replacing complete unit',
        'Adjusting thermostat settings',
        'Cleaning condensate drains',
        'Inspecting gaskets and seals',
        'Testing fan motors'
      ],
      invalidProcedures: [
        'Recovering refrigerant',
        'Charging refrigerant',
        'Accessing service ports',
        'Evacuating the system',
        'Adding refrigerant oil',
        'Checking refrigerant pressure',
        'Purging refrigerant lines',
        'Installing gauge manifolds',
        'Connecting refrigerant lines',
        'Disconnecting refrigerant lines',
        'Brazing refrigerant connections',
        'Quick-connect refrigerant fittings'
      ]
    });

    // RV Generator constraints
    this.equipmentDatabase.set('rv_generator', {
      hasServicePorts: false,
      isSealed: false,
      requiresCertification: false,
      commonMisconceptions: [
        'Generators need refrigerant',
        'Oil changes are optional',
        'Air filters don\'t affect performance'
      ],
      physicalLimitations: [
        'Must be properly grounded',
        'Cannot run continuously without cooling periods',
        'Load capacity cannot exceed rated output',
        'Requires adequate ventilation for exhaust'
      ],
      validProcedures: [
        'Oil changes per hour meter',
        'Air filter replacement',
        'Spark plug replacement',
        'Load testing',
        'Exercise runs monthly',
        'Fuel filter replacement',
        'Coolant level checks'
      ],
      invalidProcedures: [
        'Refrigerant charging',
        'Compressor service',
        'Evacuating system'
      ]
    });

    // Lippert Axles
    this.equipmentDatabase.set('lippert_axle', {
      hasServicePorts: false,
      isSealed: false,
      requiresCertification: false,
      commonMisconceptions: [
        'Hub can be removed without removing castle nut',
        'Bearings can be reused after removal',
        'Cotter pins can be reused',
        'Torque specifications are suggestions',
        'Grease type doesn\'t matter',
        'Hub pulls off easily without proper sequence'
      ],
      physicalLimitations: [
        'HUB REMOVAL REQUIRES: dust cap → cotter pin → castle nut → washer → THEN hub',
        'Castle nut BLOCKS hub - physically impossible to remove hub with nut in place',
        'Weight rating cannot be exceeded',
        'Bearings must be properly preloaded',
        'Seals are single-use after removal',
        'Cotter pins are single-use only',
        'Hub is mechanically locked by castle nut on spindle threads'
      ],
      validProcedures: [
        'Remove dust cap with channel locks',
        'Remove and discard cotter pin',
        'Remove castle nut while holding hub',
        'Remove thrust washer',
        'Pull hub assembly straight off spindle',
        'Annual bearing repack',
        'Wet bolt lubrication',
        'Brake adjustment'
      ],
      invalidProcedures: [
        'Removing hub without removing castle nut',
        'Pulling hub with castle nut installed',
        'Reusing cotter pins',
        'Reusing grease seals',
        'Skipping dust cap removal',
        'Exceeding weight ratings'
      ]
    });

    // RV Water Heater
    this.equipmentDatabase.set('rv_water_heater', {
      hasServicePorts: true,
      isSealed: false,
      requiresCertification: false,
      commonMisconceptions: [
        'Anode rods last forever',
        'Bypass valves are optional',
        'Tank doesn\'t need flushing'
      ],
      physicalLimitations: [
        'Cannot operate without water',
        'Pressure relief valve is mandatory',
        'Electric element burns out if dry',
        'Tank can freeze and crack'
      ],
      validProcedures: [
        'Anode rod replacement',
        'Tank flushing',
        'Pressure relief valve testing',
        'Winterization',
        'Element testing',
        'Thermostat adjustment',
        'Bypass valve operation'
      ],
      invalidProcedures: [
        'Operating without water',
        'Bypassing pressure relief',
        'Exceeding temperature ratings'
      ]
    });
  }

  // Validate if a procedure is appropriate for the equipment
  validateProcedure(equipment: string, procedure: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      corrections: [],
      physicsViolations: []
    };

    // Normalize equipment type
    const equipmentKey = this.normalizeEquipmentType(equipment);
    const constraints = this.equipmentDatabase.get(equipmentKey);

    if (!constraints) {
      result.warnings.push(`Unknown equipment type: ${equipment}. Validation limited.`);
      return result;
    }

    // Check for invalid procedures
    const procedureLower = procedure.toLowerCase();
    
    // Check for refrigerant-related procedures on sealed systems
    if (constraints.isSealed && this.isRefrigerantProcedure(procedureLower)) {
      result.isValid = false;
      result.errors.push(`CRITICAL ERROR: ${equipment} is a sealed system without service ports`);
      result.physicsViolations.push('Cannot access refrigerant in hermetically sealed system');
      result.corrections.push('RV A/C units must be replaced entirely if refrigerant is lost');
      result.corrections.push('Consider: cleaning coils, checking capacitors, or replacing the complete unit');
    }

    // Check for explicitly invalid procedures
    for (const invalid of constraints.invalidProcedures) {
      if (procedureLower.includes(invalid.toLowerCase())) {
        result.isValid = false;
        result.errors.push(`Invalid procedure for ${equipment}: ${invalid}`);
        result.corrections.push(`Instead, consider: ${this.getSuggestedAlternative(invalid, constraints)}`);
      }
    }

    // Check for physics violations
    if (procedureLower.includes('exceed') || procedureLower.includes('bypass safety')) {
      result.isValid = false;
      result.physicsViolations.push('Procedure violates safety limits or physical constraints');
    }

    // Check for single-use part reuse
    if (this.checkSingleUseViolation(procedureLower)) {
      result.isValid = false;
      result.errors.push('SAFETY VIOLATION: Attempting to reuse single-use components');
      result.corrections.push('Cotter pins, seals, and gaskets must be replaced with new ones');
    }

    // Add warnings for certification requirements
    if (constraints.requiresCertification && this.requiresCertification(procedureLower)) {
      result.warnings.push('This procedure may require EPA certification for refrigerant handling');
    }

    return result;
  }

  // Check if procedure involves refrigerant
  private isRefrigerantProcedure(procedure: string): boolean {
    const refrigerantKeywords = [
      'refrigerant', 'freon', 'r410a', 'r134a', 'r22',
      'charge', 'recharge', 'recover', 'evacuate', 'vacuum',
      'service port', 'gauge', 'manifold', 'pressure test',
      'leak test with gauges', 'add coolant', 'top off',
      'refill system', 'purge', 'nitrogen test'
    ];
    
    return refrigerantKeywords.some(keyword => procedure.includes(keyword));
  }

  // Check for single-use part violations
  private checkSingleUseViolation(procedure: string): boolean {
    const singleUseKeywords = [
      'reuse cotter pin',
      'reinstall old seal',
      'reuse gasket',
      'reinstall old o-ring',
      'reuse crush washer'
    ];
    
    return singleUseKeywords.some(keyword => procedure.includes(keyword));
  }

  // Check if procedure requires certification
  private requiresCertification(procedure: string): boolean {
    const certificationKeywords = [
      'recover refrigerant',
      'handle refrigerant',
      'epa certification',
      'section 608'
    ];
    
    return certificationKeywords.some(keyword => procedure.includes(keyword));
  }

  // Normalize equipment type to database key
  private normalizeEquipmentType(equipment: string): string {
    const lower = equipment.toLowerCase();
    
    if (lower.includes('a/c') || lower.includes('air condition') || lower.includes('ac unit')) {
      return 'rv_ac_unit';
    }
    if (lower.includes('generator')) {
      return 'rv_generator';
    }
    if (lower.includes('lippert') && lower.includes('axle')) {
      return 'lippert_axle';
    }
    if (lower.includes('water heater')) {
      return 'rv_water_heater';
    }
    
    return lower.replace(/[^a-z0-9]/g, '_');
  }

  // Get suggested alternative for invalid procedure
  private getSuggestedAlternative(invalidProcedure: string, constraints: EquipmentConstraints): string {
    const lower = invalidProcedure.toLowerCase();
    
    if (lower.includes('refrigerant') || lower.includes('charge')) {
      return 'Clean coils and filters, check capacitors, or replace the complete unit';
    }
    if (lower.includes('reuse') && lower.includes('cotter')) {
      return 'Always use new cotter pins - they are single-use safety items';
    }
    if (lower.includes('service port')) {
      return 'RV A/C units have no service ports - focus on electrical and mechanical maintenance';
    }
    
    // Return first valid procedure as alternative
    return constraints.validProcedures[0] || 'Consult manufacturer documentation';
  }

  // Validate physics and engineering principles
  validatePhysics(equipment: string, procedure: string): string[] {
    const violations: string[] = [];
    const lower = procedure.toLowerCase();
    
    // Check for thermodynamic violations
    if (lower.includes('perpetual') || lower.includes('100% efficient')) {
      violations.push('Violates laws of thermodynamics - no system is 100% efficient');
    }
    
    // Check for pressure/vacuum impossibilities
    if (lower.includes('perfect vacuum') && !lower.includes('specialized equipment')) {
      violations.push('Cannot achieve perfect vacuum without specialized equipment');
    }
    
    // Check for material stress violations
    if (lower.includes('exceed torque') || lower.includes('overtighten')) {
      violations.push('Exceeding torque specifications will damage components');
    }
    
    // Check for electrical violations
    if (lower.includes('bypass ground') || lower.includes('skip grounding')) {
      violations.push('Bypassing electrical grounding violates safety and code');
    }
    
    return violations;
  }

  // Get equipment-specific warnings
  getEquipmentWarnings(equipment: string): string[] {
    const equipmentKey = this.normalizeEquipmentType(equipment);
    const constraints = this.equipmentDatabase.get(equipmentKey);
    
    if (!constraints) {
      return [];
    }
    
    const warnings: string[] = [];
    
    if (constraints.isSealed) {
      warnings.push(`${equipment} is a sealed system - no user serviceable refrigerant components`);
    }
    
    if (constraints.commonMisconceptions.length > 0) {
      warnings.push(`Common misconception: ${constraints.commonMisconceptions[0]}`);
    }
    
    if (constraints.physicalLimitations.length > 0) {
      warnings.push(`Physical limitation: ${constraints.physicalLimitations[0]}`);
    }
    
    return warnings;
  }
}

export const rvEquipmentValidator = new RVEquipmentValidator();

// Enhanced validation with manual knowledge
export async function validateWithManualKnowledge(equipment: string, procedure: string): Promise<ValidationResult> {
  // First run standard validation
  const result = rvEquipmentValidator.validateProcedure(equipment, procedure);
  
  // Import manual knowledge extractor
  const { manualKnowledgeExtractor } = await import('./manual-knowledge-extractor.js');
  
  // Check if this is a single-use part operation
  const singleUsePattern = /reuse|reinstall.*old|use.*existing/i;
  if (singleUsePattern.test(procedure)) {
    const parts = ['cotter pin', 'seal', 'gasket', 'lock washer', 'nyloc'];
    for (const part of parts) {
      if (procedure.toLowerCase().includes(part) && manualKnowledgeExtractor.isSingleUsePart(part)) {
        result.isValid = false;
        result.errors.push(`MANUAL VIOLATION: ${part} is single-use per manufacturer specs`);
        result.corrections.push(`Always use NEW ${part} - never reuse`);
      }
    }
  }
  
  // Check torque specifications
  const torquePattern = /torque|tighten.*to|ft-?lbs?|in-?lbs?/i;
  if (torquePattern.test(procedure)) {
    const components = ['castle nut', 'lug nut', 'u-bolt', 'wet bolt'];
    for (const component of components) {
      if (procedure.toLowerCase().includes(component)) {
        const spec = manualKnowledgeExtractor.getTorqueSpec(component);
        if (spec) {
          result.corrections.push(`Manual specifies: ${component} = ${spec.torqueValue} ${spec.unit} ${spec.notes || ''}`);
        }
      }
    }
  }
  
  return result;
}