/**
 * COMPREHENSIVE TECHNICAL KNOWLEDGE BASE
 * 
 * Fundamental installation, repair, maintenance, and tool management knowledge
 * Covers apprentice to master technician level expertise across all RV systems
 */

export interface TechnicalKnowledge {
  category: string;
  level: 'apprentice' | 'intermediate' | 'advanced' | 'master';
  procedures: TechnicalProcedure[];
  toolRequirements: ToolSpecification[];
  safetyProtocols: SafetyProtocol[];
  qualityChecks: QualityCheck[];
}

export interface TechnicalProcedure {
  name: string;
  description: string;
  steps: string[];
  prerequisites: string[];
  tools: string[];
  materials: string[];
  torqueSpecs: TorqueSpec[];
  timeEstimate: string;
  difficultyLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  safetyWarnings: string[];
  qualityChecks: string[];
}

export interface ToolSpecification {
  name: string;
  type: string;
  calibrationRequired: boolean;
  calibrationInterval: string;
  maintenanceSchedule: string[];
  safetyChecks: string[];
  storageRequirements: string;
}

export interface SafetyProtocol {
  hazard: string;
  ppe: string[];
  procedures: string[];
  emergencyResponse: string[];
}

export interface QualityCheck {
  category: string;
  checkpoints: string[];
  passCriteria: string[];
  tools: string[];
}

export interface TorqueSpec {
  component: string;
  value: string;
  unit: string;
  pattern: string;
  notes: string;
}

class ComprehensiveTechnicalKnowledge {

  // ELECTRICAL SYSTEM FUNDAMENTALS
  private electricalKnowledge: TechnicalKnowledge = {
    category: 'electrical',
    level: 'intermediate',
    procedures: [
      {
        name: 'Transfer Switch Installation',
        description: 'Complete installation of automatic transfer switch for RV electrical systems',
        steps: [
          'Verify power is OFF at all sources using lockout/tagout procedures',
          'Test for zero energy state with calibrated multimeter',
          'Remove existing transfer switch if present',
          'Clean all connection points with contact cleaner',
          'Apply anti-oxidant paste to ALL connection points',
          'Install new transfer switch in proper orientation',
          'Connect shore power lines (Hot, Neutral, Ground)',
          'Connect generator lines (Hot, Neutral, Ground)',
          'Connect load lines to coach electrical panel',
          'Torque all connections to manufacturer specifications',
          'Verify proper grounding and bonding',
          'Test switch operation in both positions',
          'Perform insulation resistance test',
          'Install proper labeling and documentation'
        ],
        prerequisites: [
          'OSHA 10-hour electrical safety training',
          'Lockout/tagout certification',
          'Understanding of NEC Article 551',
          'Calibrated test equipment available'
        ],
        tools: [
          'Calibrated digital multimeter',
          'Insulation resistance tester',
          'Torque wrench (inch-pounds)',
          'Wire strippers/crimpers',
          'Contact cleaner',
          'Anti-oxidant paste',
          'Cable pulling lubricant'
        ],
        materials: [
          'Transfer switch (proper amperage rating)',
          'THWN wire (proper gauge)',
          'Wire nuts (UL listed)',
          'Cable ties',
          'Warning labels',
          'Anti-oxidant paste'
        ],
        torqueSpecs: [
          {
            component: 'Main lugs (30A)',
            value: '25-30',
            unit: 'inch-pounds',
            pattern: 'Alternating pattern',
            notes: 'Do not exceed maximum torque'
          },
          {
            component: 'Ground lugs',
            value: '15-20',
            unit: 'inch-pounds',
            pattern: 'Single pass',
            notes: 'Clean connection surfaces first'
          },
          {
            component: 'Control wiring',
            value: '7-9',
            unit: 'inch-pounds',
            pattern: 'Hand tight plus 1/4 turn',
            notes: 'Use proper wire nuts only'
          }
        ],
        timeEstimate: '2-4 hours',
        difficultyLevel: 'advanced',
        safetyWarnings: [
          'NEVER work on energized circuits',
          'Verify zero energy state before beginning work',
          'Use proper PPE including arc-rated clothing',
          'Anti-oxidant paste is REQUIRED on all connections',
          'Improper torque can cause fire hazard'
        ],
        qualityChecks: [
          'All connections torqued to specification',
          'Anti-oxidant paste applied to all connections',
          'Switch operates smoothly in both positions',
          'No voltage drop under load',
          'Proper grounding verified'
        ]
      }
    ],
    toolRequirements: [
      {
        name: 'Digital Multimeter',
        type: 'Test Equipment',
        calibrationRequired: true,
        calibrationInterval: 'Annually',
        maintenanceSchedule: [
          'Check battery monthly',
          'Inspect test leads quarterly',
          'Verify accuracy against known voltage source monthly',
          'Clean contacts and housing as needed'
        ],
        safetyChecks: [
          'Test lead continuity before use',
          'Verify proper category rating for application',
          'Check for damaged insulation',
          'Ensure proper fuse protection'
        ],
        storageRequirements: 'Clean, dry environment away from magnetic fields'
      },
      {
        name: 'Torque Wrench (Inch-Pounds)',
        type: 'Hand Tool',
        calibrationRequired: true,
        calibrationInterval: 'Annually or 5000 cycles',
        maintenanceSchedule: [
          'Clean and lubricate after each use',
          'Store at lowest setting',
          'Verify calibration before critical applications',
          'Replace if dropped or damaged'
        ],
        safetyChecks: [
          'Check for proper engagement',
          'Verify clicking action',
          'Ensure handle moves freely',
          'Check for cracks or damage'
        ],
        storageRequirements: 'Horizontal storage in protective case'
      }
    ],
    safetyProtocols: [
      {
        hazard: 'Electrical shock/electrocution',
        ppe: [
          'Class 0 electrical gloves',
          'Arc-rated clothing',
          'Safety glasses',
          'Insulated tools only'
        ],
        procedures: [
          'Test for zero energy state',
          'Apply lockout/tagout procedures',
          'Use three-point contact verification',
          'Maintain safe working distances'
        ],
        emergencyResponse: [
          'De-energize circuit immediately',
          'Call emergency services',
          'Begin CPR if qualified',
          'Document incident'
        ]
      }
    ],
    qualityChecks: [
      {
        category: 'Electrical Connections',
        checkpoints: [
          'Proper torque applied to all connections',
          'Anti-oxidant paste applied',
          'No loose strands or damaged wire',
          'Proper wire gauge for load'
        ],
        passCriteria: [
          'Torque within ±10% of specification',
          'All connections show anti-oxidant coverage',
          'Zero ohm resistance at connections',
          'No voltage drop under rated load'
        ],
        tools: [
          'Calibrated torque wrench',
          'Digital multimeter',
          'Clamp-on ammeter'
        ]
      }
    ]
  };

  // TOOL MAINTENANCE AND CALIBRATION
  private toolMaintenanceKnowledge: TechnicalKnowledge = {
    category: 'tool_maintenance',
    level: 'intermediate',
    procedures: [
      {
        name: 'Torque Wrench Calibration Verification',
        description: 'Verify and document torque wrench accuracy for critical applications',
        steps: [
          'Clean torque wrench and remove from service',
          'Set up calibration fixture or use certified tester',
          'Perform pre-load cycles (3-5 cycles at 75% capacity)',
          'Test at 20%, 50%, 75%, and 100% of range',
          'Record actual vs. indicated values',
          'Calculate percentage error for each point',
          'Document results with date and technician',
          'Apply calibration sticker with next due date',
          'Return to service if within ±4% accuracy'
        ],
        prerequisites: [
          'Understanding of calibration procedures',
          'Access to certified test equipment',
          'Calibration log book'
        ],
        tools: [
          'Certified torque tester',
          'Calibration weights',
          'Data recording sheets'
        ],
        materials: [
          'Calibration stickers',
          'Cleaning solvent',
          'Light oil for lubrication'
        ],
        torqueSpecs: [],
        timeEstimate: '30 minutes per wrench',
        difficultyLevel: 'intermediate',
        safetyWarnings: [
          'Do not exceed wrench capacity during testing',
          'Ensure test fixture is properly secured',
          'Wear safety glasses during calibration'
        ],
        qualityChecks: [
          'All test points within ±4% accuracy',
          'Smooth operation throughout range',
          'Proper documentation completed'
        ]
      }
    ],
    toolRequirements: [],
    safetyProtocols: [],
    qualityChecks: []
  };

  // GENERAL INSTALLATION BEST PRACTICES
  private installationKnowledge: TechnicalKnowledge = {
    category: 'installation',
    level: 'intermediate',
    procedures: [
      {
        name: 'Threaded Fastener Installation',
        description: 'Proper installation techniques for threaded fasteners in RV applications',
        steps: [
          'Select proper grade and material for application',
          'Inspect threads for damage or contamination',
          'Clean all threaded surfaces with appropriate solvent',
          'Apply thread locker if specified',
          'Start fastener by hand to prevent cross-threading',
          'Tighten to finger-tight plus calculated turns OR',
          'Use calibrated torque wrench to specification',
          'Verify final position and alignment',
          'Apply final marking if required',
          'Document installation in service records'
        ],
        prerequisites: [
          'Understanding of thread types and grades',
          'Knowledge of material compatibility',
          'Access to torque specifications'
        ],
        tools: [
          'Calibrated torque wrench',
          'Thread pitch gauge',
          'Wire brushes',
          'Cleaning solvent'
        ],
        materials: [
          'Appropriate grade fasteners',
          'Thread locker (if specified)',
          'Anti-seize compound (if specified)'
        ],
        torqueSpecs: [
          {
            component: 'Grade 5 bolts (1/4")',
            value: '7-9',
            unit: 'foot-pounds',
            pattern: 'Single pass',
            notes: 'Dry threads unless otherwise specified'
          },
          {
            component: 'Grade 5 bolts (5/16")',
            value: '15-20',
            unit: 'foot-pounds',
            pattern: 'Single pass',
            notes: 'Check for proper engagement'
          },
          {
            component: 'Stainless steel (1/4")',
            value: '5-7',
            unit: 'foot-pounds',
            pattern: 'Single pass',
            notes: 'Use anti-seize to prevent galling'
          }
        ],
        timeEstimate: 'Variable by application',
        difficultyLevel: 'basic',
        safetyWarnings: [
          'Never exceed maximum torque specification',
          'Stop immediately if unusual resistance felt',
          'Use proper eye protection',
          'Ensure fastener is properly engaged before applying torque'
        ],
        qualityChecks: [
          'Fastener seated properly',
          'No cross-threading evident',
          'Torque within specification',
          'No gaps or misalignment'
        ]
      }
    ],
    toolRequirements: [],
    safetyProtocols: [],
    qualityChecks: []
  };

  /**
   * Get all technical knowledge for validation and SOP generation
   */
  getAllKnowledge(): TechnicalKnowledge[] {
    return [
      this.electricalKnowledge,
      this.toolMaintenanceKnowledge,
      this.installationKnowledge
    ];
  }

  /**
   * Search for specific technical knowledge
   */
  searchKnowledge(query: string): any[] {
    const results: any[] = [];
    const allKnowledge = this.getAllKnowledge();
    
    allKnowledge.forEach(knowledge => {
      knowledge.procedures.forEach(procedure => {
        if (this.matchesQuery(procedure, query)) {
          results.push({
            category: knowledge.category,
            level: knowledge.level,
            procedure: procedure,
            type: 'technical_procedure'
          });
        }
      });
    });
    
    return results;
  }

  private matchesQuery(procedure: TechnicalProcedure, query: string): boolean {
    const queryLower = query.toLowerCase();
    return (
      procedure.name.toLowerCase().includes(queryLower) ||
      procedure.description.toLowerCase().includes(queryLower) ||
      procedure.tools.some(tool => tool.toLowerCase().includes(queryLower)) ||
      procedure.materials.some(material => material.toLowerCase().includes(queryLower))
    );
  }

  /**
   * Validate if a procedure includes critical technical requirements
   */
  validateProcedureCompleteness(procedureText: string): {
    complete: boolean;
    missingElements: string[];
    suggestions: string[];
  } {
    const missing: string[] = [];
    const suggestions: string[] = [];

    // Check for torque specifications
    if (!this.includesTorqueSpecs(procedureText)) {
      missing.push('Torque specifications');
      suggestions.push('Add specific torque values with units (ft-lbs or in-lbs)');
    }

    // Check for anti-oxidant paste in electrical procedures
    if (this.isElectricalProcedure(procedureText) && !procedureText.toLowerCase().includes('anti-oxidant')) {
      missing.push('Anti-oxidant paste application');
      suggestions.push('Include anti-oxidant paste application on all electrical connections');
    }

    // Check for safety warnings
    if (!this.includesSafetyWarnings(procedureText)) {
      missing.push('Safety warnings');
      suggestions.push('Add specific safety warnings and PPE requirements');
    }

    // Check for tool specifications
    if (!this.includesToolSpecs(procedureText)) {
      missing.push('Tool specifications');
      suggestions.push('Specify required tools and their calibration requirements');
    }

    return {
      complete: missing.length === 0,
      missingElements: missing,
      suggestions: suggestions
    };
  }

  private includesTorqueSpecs(text: string): boolean {
    const torqueIndicators = ['torque', 'ft-lb', 'in-lb', 'nm', 'tighten to'];
    return torqueIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
  }

  private isElectricalProcedure(text: string): boolean {
    const electricalIndicators = ['electrical', 'wire', 'connection', 'transfer switch', 'circuit'];
    return electricalIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
  }

  private includesSafetyWarnings(text: string): boolean {
    const safetyIndicators = ['warning', 'caution', 'danger', 'ppe', 'safety'];
    return safetyIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
  }

  private includesToolSpecs(text: string): boolean {
    const toolIndicators = ['torque wrench', 'multimeter', 'calibrated', 'tool'];
    return toolIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
  }
}

export const comprehensiveTechnicalKnowledge = new ComprehensiveTechnicalKnowledge();