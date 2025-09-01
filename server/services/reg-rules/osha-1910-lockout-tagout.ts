// 29 CFR 1910.147 - The Control of Hazardous Energy (Lockout/Tagout)
// Machine-readable compliance rules for deterministic checking

export interface OSHALockoutTagoutRule {
  section: string;
  subsection?: string;
  requirement: string;
  applicableIndustries: string[];
  complianceChecks: ComplianceCheck[];
  violations: ViolationRule[];
  mandatoryElements: string[];
}

export interface ComplianceCheck {
  id: string;
  description: string;
  checkType: 'presence' | 'sequence' | 'equipment' | 'training' | 'documentation';
  requiredElements: string[];
  passCondition: string;
  failCondition: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface ViolationRule {
  violationType: string;
  description: string;
  fineRange: string;
  citationType: 'willful' | 'serious' | 'other-than-serious' | 'repeat';
  detectConditions: string[];
}

export const OSHA_1910_147_RULES: OSHALockoutTagoutRule[] = [
  {
    section: '1910.147(c)(1)',
    requirement: 'Procedures shall be developed, documented and utilized for the control of potentially hazardous energy',
    applicableIndustries: ['general', 'manufacturing', 'rv_service', 'electrical', 'mechanical'],
    complianceChecks: [
      {
        id: 'written_procedures_exist',
        description: 'Written energy control procedures must exist',
        checkType: 'documentation',
        requiredElements: [
          'Written lockout/tagout procedures',
          'Energy source identification',
          'Specific shutdown sequence',
          'Lockout/tagout device application procedures',
          'Verification procedures'
        ],
        passCondition: 'All required elements present in SOP',
        failCondition: 'Any required element missing from SOP',
        severity: 'critical'
      },
      {
        id: 'energy_sources_identified',
        description: 'All energy sources must be identified and documented',
        checkType: 'presence',
        requiredElements: [
          'Electrical energy sources',
          'Mechanical energy sources', 
          'Hydraulic energy sources',
          'Pneumatic energy sources',
          'Chemical energy sources',
          'Thermal energy sources'
        ],
        passCondition: 'SOP identifies all applicable energy sources for equipment',
        failCondition: 'SOP fails to identify one or more energy sources',
        severity: 'critical'
      }
    ],
    violations: [
      {
        violationType: 'failure_to_establish_procedures',
        description: 'Failure to establish energy control procedures',
        fineRange: '$7,000 - $70,000',
        citationType: 'serious',
        detectConditions: [
          'No written lockout/tagout procedures',
          'Procedures do not cover all energy sources',
          'Procedures lack required elements'
        ]
      }
    ],
    mandatoryElements: [
      'Written energy control procedure',
      'Energy source identification',
      'Shutdown sequence',
      'Isolation procedures',
      'Verification procedures'
    ]
  },
  {
    section: '1910.147(c)(4)(i)',
    requirement: 'Procedures shall clearly and specifically outline the scope, purpose, authorization, rules, and techniques',
    applicableIndustries: ['general', 'manufacturing', 'rv_service'],
    complianceChecks: [
      {
        id: 'procedure_scope_defined',
        description: 'Procedure scope must be clearly defined',
        checkType: 'presence',
        requiredElements: [
          'Scope statement',
          'Purpose statement', 
          'Authorization requirements',
          'Rules for energy control',
          'Techniques for energy control'
        ],
        passCondition: 'SOP contains all required scope elements',
        failCondition: 'SOP missing any scope elements',
        severity: 'major'
      }
    ],
    violations: [
      {
        violationType: 'inadequate_procedure_scope',
        description: 'Procedures do not clearly outline scope, purpose, authorization, rules, and techniques',
        fineRange: '$1,000 - $15,000',
        citationType: 'other-than-serious',
        detectConditions: [
          'Scope not clearly defined',
          'Purpose not stated',
          'Authorization process unclear',
          'Rules not specified',
          'Techniques not detailed'
        ]
      }
    ],
    mandatoryElements: [
      'Scope statement',
      'Purpose statement',
      'Authorization requirements',
      'Energy control rules',
      'Control techniques'
    ]
  },
  {
    section: '1910.147(d)(1)',
    requirement: 'Only authorized employees shall lockout or tagout machines or equipment',
    applicableIndustries: ['all'],
    complianceChecks: [
      {
        id: 'authorized_personnel_only',
        description: 'Only authorized personnel may perform lockout/tagout',
        checkType: 'presence',
        requiredElements: [
          'Authorization requirements specified',
          'Training requirements listed',
          'Responsibility assignment clear'
        ],
        passCondition: 'SOP clearly states only authorized personnel may perform LOTO',
        failCondition: 'SOP does not restrict LOTO to authorized personnel',
        severity: 'critical'
      }
    ],
    violations: [
      {
        violationType: 'unauthorized_personnel_performing_loto',
        description: 'Allowing unauthorized personnel to perform lockout/tagout',
        fineRange: '$15,000 - $70,000',
        citationType: 'serious',
        detectConditions: [
          'No authorization requirements in procedure',
          'Procedure allows untrained personnel to perform LOTO',
          'Authorization process not defined'
        ]
      }
    ],
    mandatoryElements: [
      'Authorization requirements',
      'Personnel restrictions',
      'Training prerequisites'
    ]
  },
  {
    section: '1910.147(e)(1)',
    requirement: 'The established procedure for the application of energy control shall cover specific steps',
    applicableIndustries: ['all'],
    complianceChecks: [
      {
        id: 'specific_steps_sequence',
        description: 'Procedure must include specific sequential steps',
        checkType: 'sequence',
        requiredElements: [
          'Preparation for shutdown',
          'Machine or equipment shutdown',
          'Isolation of energy sources',
          'Application of lockout/tagout devices',
          'Release of stored energy',
          'Verification of isolation'
        ],
        passCondition: 'SOP contains all steps in proper sequence',
        failCondition: 'SOP missing steps or incorrect sequence',
        severity: 'critical'
      }
    ],
    violations: [
      {
        violationType: 'inadequate_step_sequence',
        description: 'Procedure does not include required sequential steps',
        fineRange: '$7,000 - $70,000',
        citationType: 'serious',
        detectConditions: [
          'Missing required steps',
          'Steps not in proper sequence',
          'Verification step omitted',
          'Stored energy release not addressed'
        ]
      }
    ],
    mandatoryElements: [
      'Preparation step',
      'Shutdown step', 
      'Isolation step',
      'Lockout/tagout application',
      'Stored energy release',
      'Verification step'
    ]
  },
  {
    section: '1910.147(e)(2)',
    requirement: 'Verification of isolation - test to ensure equipment will not operate',
    applicableIndustries: ['all'],
    complianceChecks: [
      {
        id: 'isolation_verification_required',
        description: 'Verification of energy isolation must be performed',
        checkType: 'presence',
        requiredElements: [
          'Verification procedure specified',
          'Test method described',
          'Operating controls test required',
          'Stored energy check required'
        ],
        passCondition: 'SOP includes specific verification procedures',
        failCondition: 'SOP lacks adequate verification procedures',
        severity: 'critical'
      }
    ],
    violations: [
      {
        violationType: 'failure_to_verify_isolation',
        description: 'Failure to verify energy isolation before work begins',
        fineRange: '$15,000 - $70,000',
        citationType: 'serious',
        detectConditions: [
          'No verification step in procedure',
          'Verification method not specified',
          'Testing requirements absent',
          'Stored energy verification missing'
        ]
      }
    ],
    mandatoryElements: [
      'Verification procedure',
      'Testing method',
      'Control verification',
      'Stored energy check'
    ]
  }
];

// Compliance checker function
export function checkOSHALockoutTagoutCompliance(sopContent: string): {
  compliant: boolean;
  violations: string[];
  recommendations: string[];
  score: number;
  criticalFailures: string[];
} {
  const violations: string[] = [];
  const recommendations: string[] = [];
  const criticalFailures: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  const sopLower = sopContent.toLowerCase();

  for (const rule of OSHA_1910_147_RULES) {
    for (const check of rule.complianceChecks) {
      totalChecks++;
      
      let checkPassed = true;
      const missingElements: string[] = [];

      // Check for required elements
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
        const violation = `${rule.section}: ${check.description} - Missing: ${missingElements.join(', ')}`;
        violations.push(violation);
        
        if (check.severity === 'critical') {
          criticalFailures.push(violation);
        }
        
        recommendations.push(`Add to SOP: ${missingElements.join(', ')}`);
      } else {
        passedChecks++;
      }
    }
  }

  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  return {
    compliant: violations.length === 0,
    violations,
    recommendations,
    score,
    criticalFailures
  };
}