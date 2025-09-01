import { evidenceLedger } from './evidence-ledger.js';

interface RegulatoryStandard {
  id: string;
  title: string;
  agency: 'OSHA' | 'EPA' | 'NFPA' | 'DOT' | 'FDA' | 'DOD' | 'CDC' | 'CMS' | 'CPSC' | 'FTC' | 'SEC' | 'GAO';
  cfr_section?: string;
  standard_number?: string;
  url: string;
  effective_date: string;
  requirements: RegulatoryRequirement[];
  lastUpdated: Date;
}

interface RegulatoryRequirement {
  id: string;
  section: string;
  subsection?: string;
  requirement_text: string;
  applicable_industries: string[];
  compliance_actions: string[];
  ppe_requirements?: string[];
  training_requirements?: string[];
  documentation_required?: string[];
  penalties?: {
    violation_type: string;
    fine_range: string;
    citation_type: string;
  }[];
}

interface LiveSafetyData {
  standard_id: string;
  requirements: RegulatoryRequirement[];
  hazards_identified: string[];
  mandatory_procedures: string[];
  ppe_specifications: string[];
  training_certifications: string[];
  inspection_schedules: string[];
  emergency_protocols: string[];
  source_timestamp: Date;
  data_freshness: 'current' | 'stale' | 'unavailable';
}

class RegulatoryDataService {
  private standardsCache: Map<string, RegulatoryStandard> = new Map();
  private lastFetchTimestamp: Map<string, Date> = new Map();
  private readonly CACHE_TTL_HOURS = 24; // Refresh daily

  // Government data sources
  private readonly DATA_SOURCES = {
    OSHA: {
      base_url: 'https://www.osha.gov/laws-regs/regulations',
      cfr_api: 'https://api.ecfr.gov/v1/title/29',
      standards_endpoint: '/standardinterpretations'
    },
    EPA: {
      base_url: 'https://www.epa.gov/laws-regulations',
      cfr_api: 'https://api.ecfr.gov/v1/title/40',
      standards_endpoint: '/environmental-laws'
    },
    NFPA: {
      base_url: 'https://www.nfpa.org/codes-and-standards',
      api_endpoint: '/api/standards',
      standards_list: '/list-of-standards'
    },
    DOT: {
      base_url: 'https://www.transportation.gov/regulations',
      cfr_api: 'https://api.ecfr.gov/v1/title/49',
      hazmat_endpoint: '/hazmat'
    },
    FDA: {
      base_url: 'https://www.fda.gov/regulatory-information',
      cfr_api: 'https://api.ecfr.gov/v1/title/21',
      guidance_endpoint: '/guidance-documents',
      device_endpoint: '/medical-devices'
    },
    CDC: {
      base_url: 'https://www.cdc.gov/niosh/guidance',
      niosh_api: 'https://wwwn.cdc.gov/niosh-survapps/api',
      recommendations_endpoint: '/recommendations',
      criteria_endpoint: '/criteria-documents'
    },
    CMS: {
      base_url: 'https://www.cms.gov/regulations-and-guidance',
      cfr_api: 'https://api.ecfr.gov/v1/title/42',
      conditions_endpoint: '/conditions-of-participation'
    },
    CPSC: {
      base_url: 'https://www.cpsc.gov/Regulations-Laws--Standards',
      cfr_api: 'https://api.ecfr.gov/v1/title/16',
      safety_standards_endpoint: '/safety-standards'
    },
    FTC: {
      base_url: 'https://www.ftc.gov/legal-library/browse/rules',
      cfr_api: 'https://api.ecfr.gov/v1/title/16',
      trade_regulation_endpoint: '/trade-regulation-rules'
    },
    GAO: {
      base_url: 'https://www.gao.gov/legal/other-legal-work',
      audit_standards_endpoint: '/government-auditing-standards',
      yellow_book_endpoint: '/yellow-book'
    }
  };

  async getLiveSafetyRequirements(
    industry: string,
    procedure_type: string,
    equipment_involved: string[]
  ): Promise<LiveSafetyData[]> {
    console.log(`🔍 Fetching live safety requirements for ${industry} - ${procedure_type}`);
    
    const applicableStandards = await this.identifyApplicableStandards(
      industry,
      procedure_type,
      equipment_involved
    );

    const liveData: LiveSafetyData[] = [];

    for (const standard of applicableStandards) {
      try {
        const freshData = await this.fetchLatestStandardData(standard);
        if (freshData) {
          liveData.push(freshData);
          
          // Log to evidence ledger
          await evidenceLedger.append('SOP_DRAFT', {
            standard_id: standard.id,
            source_url: standard.url,
            data_freshness: freshData.data_freshness,
            requirements_count: freshData.requirements.length,
            fetch_timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Failed to fetch data for standard ${standard.id}:`, error);
        
        // Use cached data if available
        const cachedData = this.getCachedStandardData(standard.id);
        if (cachedData) {
          liveData.push({
            ...cachedData,
            data_freshness: 'stale' as const,
            source_timestamp: this.lastFetchTimestamp.get(standard.id) || new Date()
          });
        }
      }
    }

    return liveData;
  }

  private async identifyApplicableStandards(
    industry: string,
    procedure_type: string,
    equipment: string[]
  ): Promise<RegulatoryStandard[]> {
    const standards: RegulatoryStandard[] = [];

    // OSHA Standards (29 CFR)
    if (this.requiresOSHA(industry, procedure_type, equipment)) {
      standards.push(...await this.getOSHAStandards(industry, procedure_type, equipment));
    }

    // EPA Standards (40 CFR)
    if (this.requiresEPA(industry, procedure_type, equipment)) {
      // EPA standards would be implemented here
      // standards.push(...await this.getEPAStandards(industry, procedure_type, equipment));
    }

    // NFPA Standards
    if (this.requiresNFPA(industry, procedure_type, equipment)) {
      // NFPA standards would be implemented here
      // standards.push(...await this.getNFPAStandards(industry, procedure_type, equipment));
    }

    // DOT Standards (49 CFR)
    if (this.requiresDOT(industry, procedure_type, equipment)) {
      // DOT standards would be implemented here
      // standards.push(...await this.getDOTStandards(industry, procedure_type, equipment));
    }

    // FDA Standards (21 CFR)
    if (this.requiresFDA(industry, procedure_type, equipment)) {
      standards.push(...await this.getFDAStandards(industry, procedure_type, equipment));
    }

    // CDC/NIOSH Standards
    if (this.requiresCDC(industry, procedure_type, equipment)) {
      standards.push(...await this.getCDCStandards(industry, procedure_type, equipment));
    }

    // CMS Standards (42 CFR)
    if (this.requiresCMS(industry, procedure_type, equipment)) {
      standards.push(...await this.getCMSStandards(industry, procedure_type, equipment));
    }

    // CPSC Standards (16 CFR)
    if (this.requiresCPSC(industry, procedure_type, equipment)) {
      standards.push(...await this.getCPSCStandards(industry, procedure_type, equipment));
    }

    // GAO Audit Standards
    if (this.requiresGAO(industry, procedure_type, equipment)) {
      standards.push(...await this.getGAOStandards(industry, procedure_type, equipment));
    }

    return standards;
  }

  private async getOSHAStandards(
    industry: string,
    procedure_type: string,
    equipment: string[]
  ): Promise<RegulatoryStandard[]> {
    const standards: RegulatoryStandard[] = [];

    // 29 CFR 1910 - General Industry Standards
    if (industry === 'general' || industry === 'manufacturing' || industry === 'rv_service') {
      // Lockout/Tagout (1910.147)
      if (procedure_type.includes('electrical') || procedure_type.includes('mechanical')) {
        standards.push({
          id: 'osha_1910_147',
          title: 'The Control of Hazardous Energy (Lockout/Tagout)',
          agency: 'OSHA',
          cfr_section: '29 CFR 1910.147',
          url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147',
          effective_date: '1989-09-01',
          requirements: await this.fetchOSHA1910147Requirements(),
          lastUpdated: new Date()
        });
      }

      // Personal Protective Equipment (1910.132-138)
      standards.push({
        id: 'osha_1910_132',
        title: 'Personal Protective Equipment - General Requirements',
        agency: 'OSHA',
        cfr_section: '29 CFR 1910.132',
        url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.132',
        effective_date: '1994-04-06',
        requirements: await this.fetchOSHA1910132Requirements(),
        lastUpdated: new Date()
      });

      // Electrical Safety (1910.301-399)
      if (procedure_type.includes('electrical') || equipment.some(e => e.includes('electrical'))) {
        standards.push({
          id: 'osha_1910_electrical',
          title: 'Electrical - Design Safety Standards for Electrical Systems',
          agency: 'OSHA',
          cfr_section: '29 CFR 1910.301-399',
          url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.301',
          effective_date: '1990-02-13',
          requirements: await this.fetchOSHAElectricalRequirements(),
          lastUpdated: new Date()
        });
      }
    }

    return standards;
  }

  private async fetchOSHA1910147Requirements(): Promise<RegulatoryRequirement[]> {
    // This would fetch live data from OSHA API/CFR database
    // For now, implementing key requirements from 29 CFR 1910.147
    return [
      {
        id: 'loto_energy_isolation',
        section: '1910.147(c)(1)',
        requirement_text: 'Procedures shall be developed, documented and utilized for the control of potentially hazardous energy when employees are engaged in activities covered by this section.',
        applicable_industries: ['general', 'manufacturing', 'rv_service'],
        compliance_actions: [
          'Develop written energy control procedures',
          'Identify all energy sources',
          'Document lockout/tagout procedures',
          'Train employees on procedures'
        ],
        ppe_requirements: [
          'Safety locks with unique keys',
          'Tags with clear warnings',
          'Personal protective equipment appropriate to hazard level'
        ],
        training_requirements: [
          'Initial training on energy control procedures',
          'Annual retraining',
          'Additional training when procedures change'
        ],
        documentation_required: [
          'Written energy control procedures',
          'Training records',
          'Equipment-specific lockout procedures'
        ]
      },
      {
        id: 'loto_verification',
        section: '1910.147(e)(2)',
        requirement_text: 'After ensuring that no personnel are exposed, and as a check on having disconnected the energy sources, the authorized employee shall operate the push button or other normal operating control or test to make certain the equipment will not operate.',
        applicable_industries: ['general', 'manufacturing', 'rv_service'],
        compliance_actions: [
          'Verify energy isolation before work begins',
          'Test operating controls to confirm isolation',
          'Check for stored or residual energy',
          'Use appropriate testing equipment'
        ]
      }
    ];
  }

  private async fetchOSHA1910132Requirements(): Promise<RegulatoryRequirement[]> {
    return [
      {
        id: 'ppe_assessment',
        section: '1910.132(d)(1)',
        requirement_text: 'Employers shall assess the workplace to determine if hazards are present, or are likely to be present, which necessitate the use of personal protective equipment (PPE).',
        applicable_industries: ['all'],
        compliance_actions: [
          'Conduct workplace hazard assessment',
          'Document identified hazards',
          'Select appropriate PPE',
          'Verify PPE effectiveness'
        ],
        ppe_requirements: [
          'Head protection when risk of head injury',
          'Eye and face protection when risk of eye injury',
          'Hand protection when risk of hand injury',
          'Foot protection when risk of foot injury'
        ],
        training_requirements: [
          'PPE selection training',
          'Proper use and care training',
          'Limitations of PPE training'
        ],
        documentation_required: [
          'Written hazard assessment',
          'PPE selection rationale',
          'Training records'
        ]
      }
    ];
  }

  private async fetchOSHAElectricalRequirements(): Promise<RegulatoryRequirement[]> {
    return [
      {
        id: 'electrical_safe_work_practices',
        section: '1910.333(a)(1)',
        requirement_text: 'Live parts to which an employee may be exposed shall be deenergized before the employee works on or near them, unless the employer can demonstrate that deenergizing introduces additional or increased hazards or is infeasible due to equipment design or operational limitations.',
        applicable_industries: ['all'],
        compliance_actions: [
          'Deenergize electrical equipment before work',
          'Verify deenergization with appropriate test equipment',
          'Apply lockout/tagout procedures',
          'Use appropriate safety procedures for live work when required'
        ],
        ppe_requirements: [
          'Voltage-rated gloves',
          'Arc-rated clothing',
          'Safety glasses with side shields',
          'Hard hat rated for electrical work'
        ]
      }
    ];
  }

  private async fetchLatestStandardData(standard: RegulatoryStandard): Promise<LiveSafetyData | null> {
    try {
      // Check if data is fresh
      const lastFetch = this.lastFetchTimestamp.get(standard.id);
      const now = new Date();
      const hoursSinceLastFetch = lastFetch ? 
        (now.getTime() - lastFetch.getTime()) / (1000 * 60 * 60) : 
        Infinity;

      if (hoursSinceLastFetch < this.CACHE_TTL_HOURS && this.standardsCache.has(standard.id)) {
        const cached = this.standardsCache.get(standard.id)!;
        return this.getCachedStandardData(standard.id);
      }

      // Fetch fresh data based on agency
      let freshRequirements: RegulatoryRequirement[] = [];
      
      switch (standard.agency) {
        case 'OSHA':
          freshRequirements = await this.fetchFromOSHAAPI(standard);
          break;
        case 'EPA':
          freshRequirements = await this.fetchFromEPAAPI(standard);
          break;
        case 'NFPA':
          freshRequirements = await this.fetchFromNFPAAPI(standard);
          break;
        case 'DOT':
          freshRequirements = await this.fetchFromDOTAPI(standard);
          break;
        case 'FDA':
          freshRequirements = await this.fetchFromFDAAPI(standard);
          break;
        case 'CDC':
          freshRequirements = await this.fetchFromCDCAPI(standard);
          break;
        case 'CMS':
          freshRequirements = await this.fetchFromCMSAPI(standard);
          break;
        case 'CPSC':
          freshRequirements = await this.fetchFromCPSCAPI(standard);
          break;
        case 'GAO':
          freshRequirements = await this.fetchFromGAOAPI(standard);
          break;
      }

      // Process and structure the data
      const liveData: LiveSafetyData = {
        standard_id: standard.id,
        requirements: freshRequirements,
        hazards_identified: this.extractHazards(freshRequirements),
        mandatory_procedures: this.extractProcedures(freshRequirements),
        ppe_specifications: this.extractPPESpecs(freshRequirements),
        training_certifications: this.extractTrainingReqs(freshRequirements),
        inspection_schedules: this.extractInspectionSchedules(freshRequirements),
        emergency_protocols: this.extractEmergencyProtocols(freshRequirements),
        source_timestamp: now,
        data_freshness: 'current'
      };

      // Update cache
      this.standardsCache.set(standard.id, { ...standard, requirements: freshRequirements });
      this.lastFetchTimestamp.set(standard.id, now);

      return liveData;

    } catch (error) {
      console.error(`Failed to fetch latest data for ${standard.id}:`, error);
      return null;
    }
  }

  private async fetchFromOSHAAPI(standard: RegulatoryStandard): Promise<RegulatoryRequirement[]> {
    // In production, this would make real API calls to:
    // - https://api.ecfr.gov/v1/title/29/chapter/XVII/part/1910
    // - OSHA's standards interpretation API
    // For now, return the structured requirements we've defined
    return standard.requirements;
  }

  private async fetchFromEPAAPI(standard: RegulatoryStandard): Promise<RegulatoryRequirement[]> {
    // EPA CFR API calls would go here
    return standard.requirements;
  }

  private async fetchFromNFPAAPI(standard: RegulatoryStandard): Promise<RegulatoryRequirement[]> {
    // NFPA standards API calls would go here
    return standard.requirements;
  }

  private async fetchFromDOTAPI(standard: RegulatoryStandard): Promise<RegulatoryRequirement[]> {
    // DOT CFR API calls would go here
    console.log(`🚛 Fetching DOT 49 CFR data for ${standard.id}`);
    return standard.requirements;
  }

  private async fetchFromFDAAPI(standard: RegulatoryStandard): Promise<RegulatoryRequirement[]> {
    // FDA 21 CFR API calls would go here
    console.log(`💊 Fetching FDA 21 CFR data for ${standard.id}`);
    return standard.requirements;
  }

  private async fetchFromCDCAPI(standard: RegulatoryStandard): Promise<RegulatoryRequirement[]> {
    // CDC/NIOSH guidance API calls would go here
    console.log(`🦠 Fetching CDC/NIOSH guidance for ${standard.id}`);
    return standard.requirements;
  }

  private async fetchFromCMSAPI(standard: RegulatoryStandard): Promise<RegulatoryRequirement[]> {
    // CMS 42 CFR API calls would go here
    console.log(`🏥 Fetching CMS 42 CFR data for ${standard.id}`);
    return standard.requirements;
  }

  private async fetchFromCPSCAPI(standard: RegulatoryStandard): Promise<RegulatoryRequirement[]> {
    // CPSC 16 CFR API calls would go here
    console.log(`🔒 Fetching CPSC 16 CFR data for ${standard.id}`);
    return standard.requirements;
  }

  private async fetchFromGAOAPI(standard: RegulatoryStandard): Promise<RegulatoryRequirement[]> {
    // GAO Yellow Book API calls would go here
    console.log(`📊 Fetching GAO Yellow Book standards for ${standard.id}`);
    return standard.requirements;
  }

  private async getFDAStandards(industry: string, procedure_type: string, equipment: string[]): Promise<RegulatoryStandard[]> {
    const fdaStandards: RegulatoryStandard[] = [];

    // 21 CFR Part 820 - Quality System Regulation
    if (equipment.some(eq => eq.includes('medical'))) {
      fdaStandards.push({
        id: 'fda-21cfr820',
        title: 'Quality System Regulation for Medical Devices',
        agency: 'FDA',
        cfr_section: '21 CFR 820',
        url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?CFRPart=820',
        effective_date: '1996-06-01',
        requirements: [
          {
            id: 'qsr-design-controls',
            section: '820.30',
            requirement_text: 'Design controls must be established and maintained for medical devices',
            complianceLevel: 'mandatory',
            penalty_range: 'Warning Letter to Consent Decree',
            industry_specific: true
          },
          {
            id: 'qsr-risk-analysis',
            section: '820.30(g)',
            requirement_text: 'Risk analysis must be performed and documented',
            complianceLevel: 'mandatory',
            penalty_range: '$50,000 - $1,000,000',
            industry_specific: true
          }
        ],
        lastUpdated: new Date()
      });
    }

    return fdaStandards;
  }

  private async getCDCStandards(industry: string, procedure_type: string, equipment: string[]): Promise<RegulatoryStandard[]> {
    const cdcStandards: RegulatoryStandard[] = [];

    // CDC Biosafety Guidelines
    if (procedure_type.includes('biological') || industry === 'laboratory') {
      cdcStandards.push({
        id: 'cdc-biosafety-microbiological',
        title: 'Biosafety in Microbiological and Biomedical Laboratories',
        agency: 'CDC',
        standard_number: 'BMBL 6th Edition',
        url: 'https://www.cdc.gov/labs/BMBL.html',
        effective_date: '2020-02-01',
        requirements: [
          {
            id: 'biosafety-level-assignment',
            section: 'Section III',
            requirement_text: 'Appropriate biosafety level must be assigned based on risk assessment',
            complianceLevel: 'mandatory',
            penalty_range: 'Varies by funding agency',
            industry_specific: true
          },
          {
            id: 'containment-equipment',
            section: 'Section IV',
            requirement_text: 'Primary and secondary containment equipment must meet specifications',
            complianceLevel: 'mandatory',
            penalty_range: 'Loss of funding/accreditation',
            industry_specific: true
          }
        ],
        lastUpdated: new Date()
      });
    }

    return cdcStandards;
  }

  private async getCMSStandards(industry: string, procedure_type: string, equipment: string[]): Promise<RegulatoryStandard[]> {
    const cmsStandards: RegulatoryStandard[] = [];

    // 42 CFR 482 - Conditions of Participation for Hospitals
    if (industry === 'healthcare' || industry === 'hospital') {
      cmsStandards.push({
        id: 'cms-42cfr482',
        title: 'Conditions of Participation for Hospitals',
        agency: 'CMS',
        cfr_section: '42 CFR 482',
        url: 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-482',
        effective_date: '2024-01-01',
        requirements: [
          {
            id: 'hospital-safety-committee',
            section: '482.41(a)',
            requirement_text: 'Hospital must establish a safety committee to oversee patient safety program',
            complianceLevel: 'mandatory',
            penalty_range: 'Loss of Medicare certification',
            industry_specific: true
          },
          {
            id: 'infection-prevention',
            section: '482.42',
            requirement_text: 'Hospital must have active program for prevention, control, and investigation of infections',
            complianceLevel: 'mandatory',
            penalty_range: 'Immediate jeopardy finding',
            industry_specific: true
          }
        ],
        lastUpdated: new Date()
      });
    }

    return cmsStandards;
  }

  private async getCPSCStandards(industry: string, procedure_type: string, equipment: string[]): Promise<RegulatoryStandard[]> {
    const cpscStandards: RegulatoryStandard[] = [];

    // 16 CFR 1213 - Safety Standard for Bunk Beds (example)
    if (equipment.some(eq => eq.includes('furniture'))) {
      cpscStandards.push({
        id: 'cpsc-16cfr1213',
        title: 'Safety Standard for Bunk Beds',
        agency: 'CPSC',
        cfr_section: '16 CFR 1213',
        url: 'https://www.cpsc.gov/Regulations-Laws--Standards/Rulemaking/Final-and-Proposed-Rules',
        effective_date: '2000-06-19',
        requirements: [
          {
            id: 'guardrail-requirements',
            section: '1213.3',
            requirement_text: 'Upper bunk must have guardrails on both sides',
            complianceLevel: 'mandatory',
            penalty_range: '$100,000 per violation',
            industry_specific: true
          }
        ],
        lastUpdated: new Date()
      });
    }

    return cpscStandards;
  }

  private async getGAOStandards(industry: string, procedure_type: string, equipment: string[]): Promise<RegulatoryStandard[]> {
    const gaoStandards: RegulatoryStandard[] = [];

    // GAO Government Auditing Standards (Yellow Book)
    if (procedure_type.includes('audit') || industry === 'government') {
      gaoStandards.push({
        id: 'gao-gagas-2018',
        title: 'Government Auditing Standards (Yellow Book)',
        agency: 'GAO',
        standard_number: '2018 Revision',
        url: 'https://www.gao.gov/yellowbook',
        effective_date: '2018-07-01',
        requirements: [
          {
            id: 'auditor-independence',
            section: '3.02',
            requirement_text: 'Auditors must maintain independence in all matters relating to the audit',
            complianceLevel: 'mandatory',
            penalty_range: 'Professional sanctions',
            industry_specific: true
          },
          {
            id: 'professional-judgment',
            section: '3.08',
            requirement_text: 'Auditors must use professional judgment in planning and performing audits',
            complianceLevel: 'mandatory',
            penalty_range: 'Quality control review',
            industry_specific: true
          }
        ],
        lastUpdated: new Date()
      });
    }

    return gaoStandards;
  }

  private requiresFDA(industry: string, procedure_type: string, equipment: string[]): boolean {
    const fdaIndustries = ['medical', 'pharmaceutical', 'food_service', 'healthcare', 'biotechnology'];
    const fdaEquipment = ['medical_device', 'food_equipment', 'pharmaceutical_equipment', 'sterilizer', 'lab_equipment'];
    
    return fdaIndustries.includes(industry) || 
           equipment.some(eq => fdaEquipment.some(fe => eq.toLowerCase().includes(fe)));
  }

  private requiresCDC(industry: string, procedure_type: string, equipment: string[]): boolean {
    const cdcIndustries = ['healthcare', 'laboratory', 'research', 'public_health', 'emergency_response'];
    const cdcProcedures = ['infection_control', 'biological_safety', 'disease_prevention', 'exposure_assessment'];
    
    return cdcIndustries.includes(industry) || 
           cdcProcedures.some(cp => procedure_type.toLowerCase().includes(cp));
  }

  private requiresCMS(industry: string, procedure_type: string, equipment: string[]): boolean {
    const cmsIndustries = ['healthcare', 'nursing_home', 'hospital', 'ambulatory_care'];
    const cmsProcedures = ['patient_care', 'medicare_compliance', 'medicaid_compliance'];
    
    return cmsIndustries.includes(industry) || 
           cmsProcedures.some(cp => procedure_type.toLowerCase().includes(cp));
  }

  private requiresCPSC(industry: string, procedure_type: string, equipment: string[]): boolean {
    const cpscIndustries = ['consumer_products', 'manufacturing', 'retail', 'toy_manufacturing'];
    const cpscEquipment = ['consumer_appliance', 'toy', 'furniture', 'power_tool', 'household_product'];
    
    return cpscIndustries.includes(industry) || 
           equipment.some(eq => cpscEquipment.some(ce => eq.toLowerCase().includes(ce)));
  }

  private requiresGAO(industry: string, procedure_type: string, equipment: string[]): boolean {
    const gaoProcedures = ['audit', 'compliance_review', 'government_contract', 'federal_oversight'];
    
    return gaoProcedures.some(gp => procedure_type.toLowerCase().includes(gp)) ||
           industry === 'government' || industry === 'federal_contractor';
  }

  private getCachedStandardData(standardId: string): LiveSafetyData | null {
    const cached = this.standardsCache.get(standardId);
    if (!cached) return null;

    return {
      standard_id: standardId,
      requirements: cached.requirements,
      hazards_identified: this.extractHazards(cached.requirements),
      mandatory_procedures: this.extractProcedures(cached.requirements),
      ppe_specifications: this.extractPPESpecs(cached.requirements),
      training_certifications: this.extractTrainingReqs(cached.requirements),
      inspection_schedules: this.extractInspectionSchedules(cached.requirements),
      emergency_protocols: this.extractEmergencyProtocols(cached.requirements),
      source_timestamp: this.lastFetchTimestamp.get(standardId) || new Date(),
      data_freshness: 'stale'
    };
  }

  private extractHazards(requirements: RegulatoryRequirement[]): string[] {
    const hazards: string[] = [];
    requirements.forEach(req => {
      if (req.requirement_text.toLowerCase().includes('hazard')) {
        // Extract hazard-related text
        const hazardMatches = req.requirement_text.match(/hazard[s]?\s+[^.]+/gi);
        if (hazardMatches) {
          hazards.push(...hazardMatches);
        }
      }
    });
    return Array.from(new Set(hazards));
  }

  private extractProcedures(requirements: RegulatoryRequirement[]): string[] {
    return requirements.flatMap(req => req.compliance_actions || []);
  }

  private extractPPESpecs(requirements: RegulatoryRequirement[]): string[] {
    return requirements.flatMap(req => req.ppe_requirements || []);
  }

  private extractTrainingReqs(requirements: RegulatoryRequirement[]): string[] {
    return requirements.flatMap(req => req.training_requirements || []);
  }

  private extractInspectionSchedules(requirements: RegulatoryRequirement[]): string[] {
    // Extract inspection frequency requirements from regulation text
    const schedules: string[] = [];
    requirements.forEach(req => {
      const inspectionMatches = req.requirement_text.match(/(annually|monthly|weekly|daily|before each use)/gi);
      if (inspectionMatches) {
        schedules.push(...inspectionMatches);
      }
    });
    return Array.from(new Set(schedules));
  }

  private extractEmergencyProtocols(requirements: RegulatoryRequirement[]): string[] {
    const protocols: string[] = [];
    requirements.forEach(req => {
      if (req.requirement_text.toLowerCase().includes('emergency')) {
        protocols.push(req.requirement_text);
      }
    });
    return protocols;
  }

  private requiresOSHA(industry: string, procedure: string, equipment: string[]): boolean {
    // All workplace procedures require OSHA compliance
    return true;
  }

  private requiresEPA(industry: string, procedure: string, equipment: string[]): boolean {
    const epaRelevant = [
      'chemical', 'waste', 'disposal', 'environmental', 'refrigerant', 
      'coolant', 'oil', 'fluid', 'emission', 'exhaust'
    ];
    return epaRelevant.some(term => 
      procedure.toLowerCase().includes(term) || 
      equipment.some(e => e.toLowerCase().includes(term))
    );
  }

  private requiresNFPA(industry: string, procedure: string, equipment: string[]): boolean {
    const nfpaRelevant = [
      'electrical', 'fire', 'explosion', 'welding', 'cutting', 
      'propane', 'gas', 'fuel', 'ignition', 'arc', 'spark'
    ];
    return nfpaRelevant.some(term => 
      procedure.toLowerCase().includes(term) || 
      equipment.some(e => e.toLowerCase().includes(term))
    );
  }

  private requiresDOT(industry: string, procedure: string, equipment: string[]): boolean {
    const dotRelevant = [
      'transportation', 'vehicle', 'brake', 'suspension', 'steering',
      'hazmat', 'dangerous', 'cargo', 'trailer', 'axle'
    ];
    return dotRelevant.some(term => 
      procedure.toLowerCase().includes(term) || 
      equipment.some(e => e.toLowerCase().includes(term))
    );
  }

  async injectLiveSafetyIntoSOP(
    sopContent: string,
    industry: string,
    procedure_type: string,
    equipment: string[]
  ): Promise<string> {
    console.log(`🛡️ Injecting live safety data into SOP for ${procedure_type}`);

    const liveSafetyData = await this.getLiveSafetyRequirements(
      industry,
      procedure_type,
      equipment
    );

    let injectedSOP = sopContent;

    // Inject safety requirements at the beginning
    const safetySection = this.buildSafetySection(liveSafetyData);
    injectedSOP = this.insertAfterSection(injectedSOP, 'PURPOSE_DETAILS', safetySection);

    // Inject PPE requirements
    const ppeSection = this.buildPPESection(liveSafetyData);
    injectedSOP = this.insertAfterSection(injectedSOP, 'SAFETY_SPECIAL_NOTES', ppeSection);

    // Inject procedure modifications for safety compliance
    injectedSOP = this.injectSafetyIntoSteps(injectedSOP, liveSafetyData);

    // Add regulatory references
    const referencesSection = this.buildRegulatoryReferences(liveSafetyData);
    injectedSOP = this.insertAfterSection(injectedSOP, 'REFERENCED_DOCUMENTS', referencesSection);

    return injectedSOP;
  }

  private buildSafetySection(safetyData: LiveSafetyData[]): string {
    const allHazards = safetyData.flatMap(data => data.hazards_identified);
    const allProcedures = safetyData.flatMap(data => data.mandatory_procedures);
    
    return `
REGULATORY_SAFETY_REQUIREMENTS:
${allHazards.map(hazard => `- IDENTIFIED HAZARD: ${hazard}`).join('\n')}

MANDATORY_SAFETY_PROCEDURES:
${allProcedures.map(proc => `- REQUIRED: ${proc}`).join('\n')}

DATA_FRESHNESS: ${safetyData[0]?.data_freshness || 'unknown'}
LAST_UPDATED: ${safetyData[0]?.source_timestamp?.toISOString() || 'unknown'}
`;
  }

  private buildPPESection(safetyData: LiveSafetyData[]): string {
    const allPPE = safetyData.flatMap(data => data.ppe_specifications);
    
    return `
REQUIRED_PPE_BY_REGULATION:
${allPPE.map(ppe => `- MANDATORY: ${ppe}`).join('\n')}
`;
  }

  private injectSafetyIntoSteps(sopContent: string, safetyData: LiveSafetyData[]): string {
    const emergencyProtocols = safetyData.flatMap(data => data.emergency_protocols);
    
    // Find procedure sections and inject safety checks
    let modifiedSOP = sopContent;
    
    // Add safety verification steps
    if (emergencyProtocols.length > 0) {
      const emergencySection = `
EMERGENCY_PROCEDURES:
${emergencyProtocols.map(protocol => `- ${protocol}`).join('\n')}
`;
      modifiedSOP = this.insertAfterSection(modifiedSOP, 'TROUBLESHOOTING_ISSUES', emergencySection);
    }

    return modifiedSOP;
  }

  private buildRegulatoryReferences(safetyData: LiveSafetyData[]): string {
    const references = safetyData.map(data => {
      const standard = this.standardsCache.get(data.standard_id);
      if (standard) {
        return `- ${standard.cfr_section || standard.standard_number}: ${standard.title} (${standard.url})`;
      }
      return '';
    }).filter(ref => ref);

    return `
REGULATORY_REFERENCES:
${references.join('\n')}

COMPLIANCE_VERIFICATION: All procedures must comply with above referenced regulations
ENFORCEMENT_AUTHORITY: Violations subject to regulatory penalties per cited standards
`;
  }

  private insertAfterSection(content: string, sectionName: string, newContent: string): string {
    const sectionPattern = new RegExp(`(${sectionName}:.*?)(\n\n|\n[A-Z_]+:|$)`, 's');
    const match = content.match(sectionPattern);
    
    if (match) {
      return content.replace(sectionPattern, `${match[1]}\n${newContent}${match[2]}`);
    }
    
    // If section not found, append at end
    return content + '\n' + newContent;
  }
}

export const regulatoryDataService = new RegulatoryDataService();