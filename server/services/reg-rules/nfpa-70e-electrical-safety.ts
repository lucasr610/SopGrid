// NFPA 70E - Standard for Electrical Safety in the Workplace
// Machine-readable compliance rules for electrical safety

export interface NFPA70ERule {
  section: string;
  title: string;
  requirement: string;
  applicableVoltages: string[];
  complianceChecks: ComplianceCheck[];
  ppeRequirements: PPERequirement[];
  arcFlashRequirements: ArcFlashRequirement[];
  violations: ViolationRule[];
}

export interface PPERequirement {
  hazardLevel: 'HRC 0' | 'HRC 1' | 'HRC 2' | 'HRC 3' | 'HRC 4';
  minCalRating: number;
  requiredPPE: string[];
  prohibitedMaterials: string[];
  additionalRequirements: string[];
}

export interface ArcFlashRequirement {
  voltageRange: string;
  workingDistance: string;
  incidentEnergy: string;
  arcFlashBoundary: string;
  analysisRequired: boolean;
}

export interface ComplianceCheck {
  id: string;
  description: string;
  checkType: 'ppe' | 'procedure' | 'training' | 'analysis' | 'equipment';
  requiredElements: string[];
  voltageSpecific: boolean;
  severity: 'critical' | 'major' | 'minor';
}

export interface ViolationRule {
  violationType: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  detectConditions: string[];
}

export const NFPA_70E_RULES: NFPA70ERule[] = [
  {
    section: '130.2(A)',
    title: 'General Approach Boundaries',
    requirement: 'No person shall approach or take any conductive object closer to exposed energized electrical conductors or circuit parts than specified approach boundaries',
    applicableVoltages: ['50V+', '600V+', '1000V+'],
    complianceChecks: [
      {
        id: 'approach_boundaries_defined',
        description: 'Approach boundaries must be clearly defined and communicated',
        checkType: 'procedure',
        requiredElements: [
          'Limited approach boundary',
          'Restricted approach boundary', 
          'Prohibited approach boundary',
          'Arc flash boundary',
          'Voltage-specific distances'
        ],
        voltageSpecific: true,
        severity: 'critical'
      }
    ],
    ppeRequirements: [],
    arcFlashRequirements: [],
    violations: [
      {
        violationType: 'approach_boundary_violation',
        description: 'Failure to establish or observe approach boundaries',
        severity: 'critical',
        detectConditions: [
          'No approach boundaries specified',
          'Boundaries not voltage-appropriate',
          'Personnel access not restricted'
        ]
      }
    ]
  },
  {
    section: '130.3(A)',
    title: 'Arc Flash Hazard Analysis',
    requirement: 'An arc flash hazard analysis shall be performed before any work is performed within the arc flash boundary',
    applicableVoltages: ['50V+'],
    complianceChecks: [
      {
        id: 'arc_flash_analysis_required',
        description: 'Arc flash hazard analysis must be performed and documented',
        checkType: 'analysis',
        requiredElements: [
          'Arc flash hazard analysis',
          'Incident energy calculation',
          'Arc flash boundary determination',
          'PPE category assignment',
          'Arc flash warning labels'
        ],
        voltageSpecific: true,
        severity: 'critical'
      }
    ],
    ppeRequirements: [],
    arcFlashRequirements: [
      {
        voltageRange: '208V-600V',
        workingDistance: '18 inches',
        incidentEnergy: 'Calculate per IEEE 1584',
        arcFlashBoundary: 'Calculate per NFPA 70E Table 130.3(A)',
        analysisRequired: true
      }
    ],
    violations: [
      {
        violationType: 'missing_arc_flash_analysis',
        description: 'Arc flash hazard analysis not performed or documented',
        severity: 'critical',
        detectConditions: [
          'No arc flash analysis mentioned',
          'Incident energy not calculated',
          'PPE selection not based on analysis'
        ]
      }
    ]
  },
  {
    section: '130.4(A)',
    title: 'Personal Protective Equipment',
    requirement: 'Employees working within the arc flash boundary shall wear PPE in accordance with hazard/risk category',
    applicableVoltages: ['all'],
    complianceChecks: [
      {
        id: 'ppe_category_appropriate',
        description: 'PPE must match the determined hazard/risk category',
        checkType: 'ppe',
        requiredElements: [
          'Hazard/risk category determination',
          'Arc-rated clothing',
          'Face protection',
          'Hand protection',
          'Voltage-rated gloves when required'
        ],
        voltageSpecific: false,
        severity: 'critical'
      }
    ],
    ppeRequirements: [
      {
        hazardLevel: 'HRC 0',
        minCalRating: 0,
        requiredPPE: [
          'Safety glasses',
          'Hearing protection',
          'Hard hat',
          'Leather gloves',
          'Long sleeve shirt',
          'Long pants'
        ],
        prohibitedMaterials: ['Synthetic materials'],
        additionalRequirements: ['Non-melting materials only']
      },
      {
        hazardLevel: 'HRC 1',
        minCalRating: 4,
        requiredPPE: [
          'Arc-rated long sleeve shirt (4 cal/cm²)',
          'Arc-rated pants (4 cal/cm²)',
          'Arc-rated face shield',
          'Hard hat',
          'Safety glasses',
          'Hearing protection',
          'Leather gloves'
        ],
        prohibitedMaterials: ['Non-arc-rated synthetic materials'],
        additionalRequirements: ['All clothing must be arc-rated']
      },
      {
        hazardLevel: 'HRC 2',
        minCalRating: 8,
        requiredPPE: [
          'Arc-rated clothing kit (8 cal/cm²)',
          'Arc-rated face shield',
          'Arc-rated balaclava hood',
          'Hard hat',
          'Safety glasses', 
          'Hearing protection',
          'Voltage-rated gloves with leather protectors'
        ],
        prohibitedMaterials: ['Non-arc-rated materials'],
        additionalRequirements: ['Complete arc-rated ensemble required']
      }
    ],
    arcFlashRequirements: [],
    violations: [
      {
        violationType: 'inadequate_ppe',
        description: 'PPE does not meet minimum requirements for hazard category',
        severity: 'critical',
        detectConditions: [
          'PPE category not specified',
          'Cal/cm² rating insufficient',
          'Required PPE items missing',
          'Non-arc-rated materials specified'
        ]
      }
    ]
  },
  {
    section: '120.1',
    title: 'Establishing Electrically Safe Work Condition',
    requirement: 'Live parts to which an employee may be exposed shall be put in an electrically safe work condition before work is started',
    applicableVoltages: ['all'],
    complianceChecks: [
      {
        id: 'electrically_safe_work_condition',
        description: 'Electrically safe work condition must be established using LOTO',
        checkType: 'procedure',
        requiredElements: [
          'Disconnect all sources',
          'Visually verify disconnection',
          'Test with approved tester',
          'Apply lockout/tagout',
          'Try to operate equipment',
          'Test tester after use'
        ],
        voltageSpecific: false,
        severity: 'critical'
      }
    ],
    ppeRequirements: [],
    arcFlashRequirements: [],
    violations: [
      {
        violationType: 'failure_to_establish_safe_condition',
        description: 'Electrically safe work condition not properly established',
        severity: 'critical',
        detectConditions: [
          'LOTO procedure not followed',
          'Verification testing not performed',
          'Proper test equipment not used',
          'Six-step process not completed'
        ]
      }
    ]
  }
];

export function checkNFPA70ECompliance(sopContent: string, voltage?: string): {
  compliant: boolean;
  violations: string[];
  recommendations: string[];
  score: number;
  criticalFailures: string[];
  ppeRecommendations: string[];
} {
  const violations: string[] = [];
  const recommendations: string[] = [];
  const criticalFailures: string[] = [];
  const ppeRecommendations: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  const sopLower = sopContent.toLowerCase();
  const hasElectricalWork = sopLower.includes('electrical') || 
                           sopLower.includes('voltage') || 
                           sopLower.includes('circuit') ||
                           sopLower.includes('wire') ||
                           sopLower.includes('power');

  if (!hasElectricalWork) {
    return {
      compliant: true,
      violations: [],
      recommendations: ['NFPA 70E compliance not required - no electrical work detected'],
      score: 100,
      criticalFailures: [],
      ppeRecommendations: []
    };
  }

  for (const rule of NFPA_70E_RULES) {
    for (const check of rule.complianceChecks) {
      totalChecks++;
      
      let checkPassed = true;
      const missingElements: string[] = [];

      for (const element of check.requiredElements) {
        const elementLower = element.toLowerCase();
        if (!sopLower.includes(elementLower) && 
            !sopLower.includes(elementLower.replace(/[/\s]/g, '')) &&
            !sopLower.includes(elementLower.replace(/\s/g, '_'))) {
          missingElements.push(element);
          checkPassed = false;
        }
      }

      if (!checkPassed) {
        const violation = `NFPA 70E ${rule.section}: ${check.description} - Missing: ${missingElements.join(', ')}`;
        violations.push(violation);
        
        if (check.severity === 'critical') {
          criticalFailures.push(violation);
        }
        
        recommendations.push(`Add NFPA 70E requirement: ${missingElements.join(', ')}`);
      } else {
        passedChecks++;
      }
    }

    // Check PPE requirements
    if (rule.ppeRequirements.length > 0) {
      for (const ppeReq of rule.ppeRequirements) {
        const missingPPE: string[] = [];
        
        for (const ppe of ppeReq.requiredPPE) {
          const ppeLower = ppe.toLowerCase();
          if (!sopLower.includes(ppeLower)) {
            missingPPE.push(ppe);
          }
        }
        
        if (missingPPE.length > 0) {
          ppeRecommendations.push(`${ppeReq.hazardLevel}: ${missingPPE.join(', ')}`);
        }
      }
    }
  }

  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  return {
    compliant: violations.length === 0,
    violations,
    recommendations,
    score,
    criticalFailures,
    ppeRecommendations
  };
}