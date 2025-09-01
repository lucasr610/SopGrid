interface JurisdictionRules {
  id: string;
  name: string;
  country: string;
  state?: string;
  province?: string;
  regulations: {
    osha: boolean;
    epa: boolean;
    dot: boolean;
    localCodes: string[];
    customRequirements: string[];
  };
  language: string;
  currency: string;
  dateFormat: string;
  units: 'metric' | 'imperial';
  lastUpdated: Date;
}

export class MultiJurisdictionSupport {
  private jurisdictions: Map<string, JurisdictionRules> = new Map();

  constructor() {
    this.initializeJurisdictions();
  }

  private initializeJurisdictions(): void {
    const defaultJurisdictions: JurisdictionRules[] = [
      {
        id: 'us-federal',
        name: 'United States Federal',
        country: 'US',
        regulations: {
          osha: true,
          epa: true,
          dot: true,
          localCodes: ['NFPA', 'IEEE', 'ASME'],
          customRequirements: ['RV Industry Association standards']
        },
        language: 'en-US',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        units: 'imperial',
        lastUpdated: new Date()
      },
      {
        id: 'us-california',
        name: 'California',
        country: 'US',
        state: 'CA',
        regulations: {
          osha: true,
          epa: true,
          dot: true,
          localCodes: ['NFPA', 'IEEE', 'ASME', 'CAL-OSHA'],
          customRequirements: ['CARB emissions standards', 'Prop 65 warnings']
        },
        language: 'en-US',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        units: 'imperial',
        lastUpdated: new Date()
      },
      {
        id: 'ca-federal',
        name: 'Canada Federal',
        country: 'CA',
        regulations: {
          osha: false,
          epa: false,
          dot: false,
          localCodes: ['CSA', 'WHMIS'],
          customRequirements: ['Transport Canada regulations']
        },
        language: 'en-CA',
        currency: 'CAD',
        dateFormat: 'DD/MM/YYYY',
        units: 'metric',
        lastUpdated: new Date()
      },
      {
        id: 'au-federal',
        name: 'Australia Federal',
        country: 'AU',
        regulations: {
          osha: false,
          epa: false,
          dot: false,
          localCodes: ['AS/NZS', 'WHS'],
          customRequirements: ['Australian Design Rules (ADR)']
        },
        language: 'en-AU',
        currency: 'AUD',
        dateFormat: 'DD/MM/YYYY',
        units: 'metric',
        lastUpdated: new Date()
      }
    ];

    defaultJurisdictions.forEach(jurisdiction => {
      this.jurisdictions.set(jurisdiction.id, jurisdiction);
    });

    console.log('🌍 Multi-jurisdiction support initialized with 4 jurisdictions');
  }

  getJurisdiction(jurisdictionId: string): JurisdictionRules | null {
    return this.jurisdictions.get(jurisdictionId) || null;
  }

  getAllJurisdictions(): JurisdictionRules[] {
    return Array.from(this.jurisdictions.values());
  }

  getJurisdictionsByCountry(country: string): JurisdictionRules[] {
    return Array.from(this.jurisdictions.values())
      .filter(j => j.country === country);
  }

  async validateSOPForJurisdiction(
    sopContent: string,
    jurisdictionId: string
  ): Promise<{
    compliant: boolean;
    violations: string[];
    warnings: string[];
    requiredModifications: string[];
  }> {
    const jurisdiction = this.getJurisdiction(jurisdictionId);
    if (!jurisdiction) {
      throw new Error(`Jurisdiction ${jurisdictionId} not found`);
    }

    const violations: string[] = [];
    const warnings: string[] = [];
    const requiredModifications: string[] = [];

    // Check for required regulatory compliance
    if (jurisdiction.regulations.osha && !this.checkOSHACompliance(sopContent)) {
      violations.push('OSHA safety requirements not met');
      requiredModifications.push('Add OSHA-compliant safety procedures');
    }

    if (jurisdiction.regulations.epa && !this.checkEPACompliance(sopContent)) {
      violations.push('EPA environmental requirements not met');
      requiredModifications.push('Include EPA environmental protection measures');
    }

    // Check local codes
    for (const code of jurisdiction.regulations.localCodes) {
      if (!this.checkLocalCodeCompliance(sopContent, code)) {
        warnings.push(`${code} standards should be referenced`);
      }
    }

    // Check units system
    if (!this.checkUnitsCompliance(sopContent, jurisdiction.units)) {
      requiredModifications.push(`Convert measurements to ${jurisdiction.units} system`);
    }

    console.log(`✅ SOP validated for ${jurisdiction.name}: ${violations.length} violations, ${warnings.length} warnings`);

    return {
      compliant: violations.length === 0,
      violations,
      warnings,
      requiredModifications
    };
  }

  private checkOSHACompliance(content: string): boolean {
    const oshaKeywords = ['safety', 'ppe', 'hazard', 'lockout', 'tagout', 'msds'];
    return oshaKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }

  private checkEPACompliance(content: string): boolean {
    const epaKeywords = ['environmental', 'waste', 'disposal', 'emission', 'pollution'];
    return epaKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }

  private checkLocalCodeCompliance(content: string, code: string): boolean {
    return content.toLowerCase().includes(code.toLowerCase());
  }

  private checkUnitsCompliance(content: string, units: 'metric' | 'imperial'): boolean {
    const metricUnits = ['meter', 'metre', 'kilogram', 'celsius', 'litre', 'liter'];
    const imperialUnits = ['foot', 'feet', 'inch', 'pound', 'fahrenheit', 'gallon'];
    
    const targetUnits = units === 'metric' ? metricUnits : imperialUnits;
    const conflictUnits = units === 'metric' ? imperialUnits : metricUnits;
    
    const hasTargetUnits = targetUnits.some(unit => 
      content.toLowerCase().includes(unit)
    );
    const hasConflictUnits = conflictUnits.some(unit => 
      content.toLowerCase().includes(unit)
    );
    
    return hasTargetUnits || !hasConflictUnits;
  }
}

export const multiJurisdictionSupport = new MultiJurisdictionSupport();