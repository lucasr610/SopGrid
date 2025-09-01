import { aiRouter } from './ai-router';

/**
 * Comprehensive RV Trade Knowledge Service
 * Integrates all 14 RV systems with relevant standards, codes, and regulations
 * Automatically enriches incoming documents with trade-specific knowledge
 */

// RV SYSTEMS DEFINITION WITH RELEVANT STANDARDS
export const RV_SYSTEMS = {
  // 1. ELECTRICAL SYSTEM
  ELECTRICAL: {
    name: 'Electrical System',
    subsystems: ['Shore Power', '12V DC', '120V AC', 'Inverter/Converter', 'Battery Management'],
    standards: {
      primary: ['NEC NFPA 70', 'NFPA 70E', 'RVIA LV Standard'],
      safety: ['OSHA 1910.147 (LOTO)', 'OSHA 1910.333 (Electrical Safety)'],
      testing: ['NETA ATS/MTS', 'IEEE 1584 (Arc Flash)'],
      manufacturers: ['Progressive Dynamics', 'WFCO', 'Xantrex', 'Magnum', 'Victron']
    },
    hazards: ['Arc flash', 'Electrocution', 'Fire', 'Battery explosion'],
    ppe: ['Class 0 gloves', 'Arc-rated clothing', 'Face shield', 'Insulated tools']
  },

  // 2. PLUMBING SYSTEM
  PLUMBING: {
    name: 'Plumbing System',
    subsystems: ['Fresh Water', 'Grey Water', 'Black Water', 'Water Heater', 'Pumps'],
    standards: {
      primary: ['IPC', 'UPC', 'NSF 24', 'IAPMO'],
      safety: ['EPA Safe Drinking Water Act', 'Cross-Connection Control'],
      testing: ['ASSE 1013', 'NSF/ANSI 14'],
      manufacturers: ['Dometic', 'Thetford', 'Aqua-Hot', 'Suburban', 'Atwood']
    },
    hazards: ['Scalding', 'Contamination', 'Freezing', 'Flooding'],
    ppe: ['Nitrile gloves', 'Safety glasses', 'Waterproof boots']
  },

  // 3. PROPANE/LPG SYSTEM
  PROPANE: {
    name: 'Propane/LPG System',
    subsystems: ['Tanks', 'Regulators', 'Lines', 'Appliances', 'Detectors'],
    standards: {
      primary: ['NFPA 1192', 'NFPA 58', 'CGA S-1.1'],
      safety: ['OSHA 1910.110 (LPG)', 'DOT 49 CFR'],
      testing: ['NFPA 54 (National Fuel Gas Code)', 'ANSI Z21 series'],
      manufacturers: ['Marshall Excelsior', 'Cavagna', 'RegO', 'Manchester Tank']
    },
    hazards: ['Explosion', 'Asphyxiation', 'Fire', 'Carbon monoxide'],
    ppe: ['Gas detector', 'Fire extinguisher', 'Ventilation equipment']
  },

  // 4. GENERATOR SYSTEM
  GENERATOR: {
    name: 'Generator System',
    subsystems: ['Engine', 'Alternator', 'Control Panel', 'Transfer Switch', 'Exhaust'],
    standards: {
      primary: ['NEC Article 445', 'NFPA 110', 'EPA Tier 4'],
      safety: ['OSHA 1910.169 (Air Receivers)', 'CARB emissions'],
      testing: ['EGSA standards', 'ISO 8528'],
      manufacturers: ['Onan/Cummins', 'Generac', 'Honda', 'Champion', 'Westinghouse']
    },
    hazards: ['Carbon monoxide', 'Electrocution', 'Fire', 'Noise exposure'],
    ppe: ['Hearing protection', 'CO detector', 'Insulated gloves']
  },

  // 5. HVAC SYSTEM
  HVAC: {
    name: 'HVAC System',
    subsystems: ['Air Conditioner', 'Furnace', 'Heat Pump', 'Thermostats', 'Ducting'],
    standards: {
      primary: ['ASHRAE 15', 'ASHRAE 34', 'EPA 608', 'IMC'],
      safety: ['OSHA 1910.147 (LOTO)', 'EPA refrigerant handling'],
      testing: ['ACCA Manual J', 'SMACNA standards'],
      manufacturers: ['Dometic', 'Coleman-Mach', 'Atwood', 'Suburban', 'Truma']
    },
    hazards: ['Refrigerant exposure', 'Carbon monoxide', 'Electrical shock', 'Burns'],
    ppe: ['EPA 608 certification', 'Refrigerant gloves', 'Safety glasses']
  },

  // 6. CHASSIS/SUSPENSION
  CHASSIS: {
    name: 'Chassis/Suspension System',
    subsystems: ['Frame', 'Axles', 'Springs', 'Shocks', 'Leveling'],
    standards: {
      primary: ['FMVSS', 'SAE J2807', 'ANSI B11'],
      safety: ['OSHA 1910.178 (Jack stands)', 'DOT regulations'],
      testing: ['TMC RP', 'SAE standards'],
      manufacturers: ['Lippert', 'Dexter', 'MORryde', 'AL-KO', 'Timbren']
    },
    hazards: ['Crushing', 'Falls', 'Spring tension', 'Heavy lifting'],
    ppe: ['Steel-toed boots', 'Hard hat', 'Safety glasses', 'Work gloves']
  },

  // 7. BRAKING SYSTEM
  BRAKES: {
    name: 'Braking System',
    subsystems: ['Electric Brakes', 'Hydraulic Brakes', 'Brake Controller', 'Emergency Brake'],
    standards: {
      primary: ['FMVSS 121/135', 'SAE J2899', 'DOT regulations'],
      safety: ['OSHA wheel chocking', 'TMC procedures'],
      testing: ['CVSA standards', 'SAE J1627'],
      manufacturers: ['Dexter', 'Kodiak', 'Titan', 'TruRyde', 'Carlisle']
    },
    hazards: ['Brake dust', 'High pressure', 'Hot surfaces', 'Vehicle movement'],
    ppe: ['Dust mask', 'Heat-resistant gloves', 'Safety stands']
  },

  // 8. SLIDE-OUT SYSTEM
  SLIDEOUT: {
    name: 'Slide-Out System',
    subsystems: ['Motors', 'Gears', 'Rails', 'Seals', 'Controls'],
    standards: {
      primary: ['RVIA standards', 'ANSI A119.5'],
      safety: ['OSHA pinch points', 'NEC wiring'],
      testing: ['Cycle testing', 'Load testing'],
      manufacturers: ['Lippert', 'Power Gear', 'Kwikee', 'Schwintek', 'BAL']
    },
    hazards: ['Crushing', 'Pinch points', 'Electrical', 'Structural failure'],
    ppe: ['Safety glasses', 'Work gloves', 'Steel-toed boots']
  },

  // 9. AWNING SYSTEM
  AWNING: {
    name: 'Awning System',
    subsystems: ['Fabric', 'Arms', 'Motor', 'Springs', 'LED Lights'],
    standards: {
      primary: ['RVIA standards', 'Wind load ratings'],
      safety: ['OSHA fall protection', 'Ladder safety'],
      testing: ['UV resistance', 'Wind testing'],
      manufacturers: ['Dometic', 'Carefree', 'Lippert', 'Girard', 'ShadePro']
    },
    hazards: ['Spring tension', 'Falls', 'Wind damage', 'Electrical'],
    ppe: ['Safety harness', 'Gloves', 'Safety glasses']
  },

  // FURNACE SYSTEM (Alias for HVAC subsystem)
  FURNACE: {
    name: 'Furnace System',
    subsystems: ['Burner Assembly', 'Blower Motor', 'Heat Exchanger', 'Thermostat', 'Ducting'],
    standards: {
      primary: ['ANSI Z21.47', 'UL 307A', 'NFPA 54', 'IMC'],
      safety: ['OSHA 1910.147 (LOTO)', 'Carbon monoxide detection'],
      testing: ['Combustion analysis', 'Draft testing', 'Gas leak testing'],
      manufacturers: ['Suburban', 'Atwood', 'Dometic', 'Truma', 'Furrion']
    },
    hazards: ['Carbon monoxide', 'Fire', 'Gas leak', 'Burns', 'Electrical shock'],
    ppe: ['CO detector', 'Gas detector', 'Heat-resistant gloves', 'Safety glasses']
  },

  // 10. ENTERTAINMENT SYSTEM
  ENTERTAINMENT: {
    name: 'Entertainment System',
    subsystems: ['TV', 'Audio', 'Satellite', 'WiFi', 'Cellular'],
    standards: {
      primary: ['FCC Part 15', 'NEC Article 810', 'TIA-568'],
      safety: ['OSHA electrical', 'Ladder safety'],
      testing: ['Signal testing', 'Grounding verification'],
      manufacturers: ['Winegard', 'King', 'WeBoost', 'Furrion', 'Jensen']
    },
    hazards: ['Electrical shock', 'Falls', 'RF exposure'],
    ppe: ['Insulated tools', 'Safety glasses']
  },

  // 11. SOLAR SYSTEM
  SOLAR: {
    name: 'Solar Power System',
    subsystems: ['Panels', 'Charge Controller', 'Inverter', 'Batteries', 'Monitoring'],
    standards: {
      primary: ['NEC Article 690', 'UL 1703', 'IEC 61730'],
      safety: ['OSHA fall protection', 'Electrical safety'],
      testing: ['IV curve testing', 'Grounding testing'],
      manufacturers: ['Zamp', 'Go Power', 'Renogy', 'Battle Born', 'Victron']
    },
    hazards: ['Electrical shock', 'Falls', 'Arc flash', 'Burns'],
    ppe: ['Arc-rated PPE', 'Fall protection', 'Insulated tools']
  },

  // 12. WATER HEATER SYSTEM
  WATER_HEATER: {
    name: 'Water Heater System',
    subsystems: ['Tank', 'Burner', 'Electric Element', 'Anode Rod', 'T&P Valve'],
    standards: {
      primary: ['ANSI Z21.10.1', 'UL 174', 'ASHRAE 90.1'],
      safety: ['OSHA hot water', 'Scalding prevention'],
      testing: ['T&P valve testing', 'Combustion analysis'],
      manufacturers: ['Suburban', 'Atwood', 'Dometic', 'Girard', 'Truma']
    },
    hazards: ['Scalding', 'Carbon monoxide', 'Explosion', 'Electrical'],
    ppe: ['Heat-resistant gloves', 'Safety glasses', 'CO detector']
  },

  // 13. REFRIGERATION SYSTEM
  REFRIGERATION: {
    name: 'Refrigeration System',
    subsystems: ['Absorption', 'Compressor', 'Controls', 'Ventilation', 'Ice Maker'],
    standards: {
      primary: ['UL 250', 'ANSI/ASHRAE 15', 'EPA 608'],
      safety: ['Ammonia handling', 'Propane safety'],
      testing: ['Temperature testing', 'Leak detection'],
      manufacturers: ['Dometic', 'Norcold', 'Thetford', 'Everchill', 'Furrion']
    },
    hazards: ['Ammonia exposure', 'Fire', 'Electrical', 'Refrigerant'],
    ppe: ['Chemical gloves', 'Respirator', 'Safety glasses']
  },

  // 14. STABILIZATION SYSTEM
  STABILIZATION: {
    name: 'Stabilization System',
    subsystems: ['Jacks', 'Leveling System', 'Blocks', 'Chocks', 'Sensors'],
    standards: {
      primary: ['SAE J2180', 'ANSI/ASME B30.1'],
      safety: ['OSHA stability', 'Blocking procedures'],
      testing: ['Load testing', 'Cycle testing'],
      manufacturers: ['Lippert', 'HWH', 'Bigfoot', 'BAL', 'Ultra-Fab']
    },
    hazards: ['Crushing', 'Tipping', 'Hydraulic injection', 'Electrical'],
    ppe: ['Steel-toed boots', 'Hard hat', 'Safety glasses']
  }
};

// Knowledge enrichment function
export class RVTradeKnowledgeService {
  
  /**
   * Enriches document content with relevant trade knowledge
   */
  async enrichDocumentWithTradeKnowledge(
    content: string,
    metadata: any
  ): Promise<{
    system: string;
    standards: string[];
    procedures: string[];
    safety: string[];
    manufacturers: string[];
  }> {
    // Identify which RV system the document relates to
    const identifiedSystem = this.identifyRVSystem(content, metadata);
    
    if (!identifiedSystem) {
      return {
        system: 'unknown',
        standards: [],
        procedures: [],
        safety: [],
        manufacturers: []
      };
    }

    // Get comprehensive knowledge for this system
    const systemKnowledge = RV_SYSTEMS[identifiedSystem];
    
    // Use AI to fetch relevant regulatory updates
    const enrichedKnowledge = await this.fetchLiveRegulatoryData(
      systemKnowledge,
      content
    );

    return enrichedKnowledge;
  }

  /**
   * Identifies which RV system a document relates to
   */
  private identifyRVSystem(content: string, metadata: any): string | null {
    const contentLower = content.toLowerCase();
    const filename = (metadata?.filename || '').toLowerCase();
    
    // Check each system for keyword matches
    for (const [key, system] of Object.entries(RV_SYSTEMS)) {
      const systemName = system.name.toLowerCase();
      const keywords = [
        systemName,
        ...system.subsystems.map(s => s.toLowerCase()),
        ...system.standards.manufacturers.map(m => m.toLowerCase())
      ];
      
      // Check if content or filename contains system keywords
      if (keywords.some(keyword => 
        contentLower.includes(keyword) || filename.includes(keyword)
      )) {
        return key;
      }
    }
    
    return null;
  }

  /**
   * Fetches live regulatory data using AI services
   */
  private async fetchLiveRegulatoryData(
    systemKnowledge: any,
    content: string
  ): Promise<any> {
    // For now, return comprehensive static knowledge with all relevant standards
    // This ensures the system always has complete trade knowledge available
    
    const systemSpecificProcedures = this.getSystemSpecificProcedures(systemKnowledge.name);
    const systemSpecificTesting = this.getSystemSpecificTesting(systemKnowledge.name);
    const systemBestPractices = this.getSystemBestPractices(systemKnowledge.name);
    
    return {
      system: systemKnowledge.name,
      standards: [
        ...systemKnowledge.standards.primary,
        ...systemKnowledge.standards.safety,
        ...systemKnowledge.standards.testing
      ],
      procedures: systemSpecificProcedures,
      safety: [
        ...systemKnowledge.hazards.map((h: string) => `Hazard: ${h}`),
        ...systemKnowledge.ppe.map((p: string) => `PPE: ${p}`),
        'Always perform LOTO before maintenance',
        'Verify zero energy state before work',
        'Use calibrated test equipment only',
        'Document all readings and test results'
      ],
      manufacturers: systemKnowledge.standards.manufacturers,
      testing: systemSpecificTesting,
      bestPractices: systemBestPractices
    };
  }
  
  private getSystemSpecificProcedures(systemName: string): any[] {
    const procedures: { [key: string]: any[] } = {
      'Generator System': [
        { step: 'Pre-start inspection', safety: 'Check for fuel leaks', tools: 'Flashlight, gas detector', verification: 'No fuel odor detected' },
        { step: 'Oil level check', safety: 'Engine must be cool', tools: 'Dipstick', verification: 'Oil between MIN/MAX marks' },
        { step: 'Load bank test', safety: 'Ensure proper ventilation', tools: 'Load bank, multimeter', verification: 'Voltage within ±5% of rated' }
      ],
      'Electrical System': [
        { step: 'Shore power disconnect', safety: 'Verify with meter', tools: 'Multimeter', verification: '0V AC confirmed' },
        { step: 'Battery isolation', safety: 'Remove negative first', tools: 'Wrench set', verification: 'No DC voltage present' },
        { step: 'Inverter shutdown', safety: 'Follow OEM sequence', tools: 'Control panel', verification: 'All LEDs off' }
      ],
      'Propane/LPG System': [
        { step: 'Leak test', safety: 'Use approved solution only', tools: 'Bubble solution, gas detector', verification: 'No bubbles, <10% LEL' },
        { step: 'Regulator inspection', safety: 'System depressurized', tools: 'Manometer', verification: '11" WC ±0.5"' },
        { step: 'Appliance testing', safety: 'CO detector active', tools: 'Combustion analyzer', verification: 'CO < 100ppm' }
      ]
    };
    return procedures[systemName] || [];
  }
  
  private getSystemSpecificTesting(systemName: string): any[] {
    const testing: { [key: string]: any[] } = {
      'Generator System': [
        { test: 'Frequency', standard: 'IEEE 1547', tolerance: '60Hz ±0.5Hz', instrument: 'Frequency meter' },
        { test: 'Voltage regulation', standard: 'NEMA MG-1', tolerance: '±5% no load to full load', instrument: 'Digital multimeter' },
        { test: 'Transfer time', standard: 'NFPA 110', tolerance: '<10 seconds', instrument: 'Timer/recorder' }
      ],
      'Electrical System': [
        { test: 'Insulation resistance', standard: 'NETA ATS', tolerance: '>1 MΩ', instrument: 'Megger' },
        { test: 'Ground fault', standard: 'NEC 551', tolerance: '<6mA trip', instrument: 'GFCI tester' },
        { test: 'Voltage drop', standard: 'NEC 210.19', tolerance: '<3% branch, <5% total', instrument: 'DMM under load' }
      ]
    };
    return testing[systemName] || [];
  }
  
  private getSystemBestPractices(systemName: string): any[] {
    const practices: { [key: string]: any[] } = {
      'Generator System': [
        { practice: 'Monthly exercise under load', source: 'Onan/Cummins', benefit: 'Prevents wet stacking' },
        { practice: 'Annual coolant analysis', source: 'CAT/Cummins', benefit: 'Early failure detection' },
        { practice: 'Quarterly transfer switch cycling', source: 'NFPA 110', benefit: 'Ensures reliable operation' }
      ],
      'Electrical System': [
        { practice: 'Torque check connections annually', source: 'NETA MTS', benefit: 'Prevents thermal failures' },
        { practice: 'IR scan under load', source: 'NFPA 70B', benefit: 'Identifies hot spots' },
        { practice: 'Battery equalization quarterly', source: 'IEEE 450', benefit: 'Extends battery life' }
      ]
    };
    return practices[systemName] || [];
  }

  /**
   * Gets comprehensive knowledge for a specific RV system
   */
  async getSystemKnowledge(systemName: string): Promise<any> {
    // Convert to uppercase for case-insensitive lookup
    let systemKey = systemName.toUpperCase();
    
    // Handle common aliases
    const aliases: Record<string, string> = {
      'SLIDE ROOM': 'SLIDEOUT',
      'SLIDE OUT': 'SLIDEOUT', 
      'SLIDE-OUT': 'SLIDEOUT',
      'SLIDEROOM': 'SLIDEOUT',
      'WATER HEATER': 'PLUMBING',
      'HOT WATER': 'PLUMBING',
      'FURNACE': 'HVAC',
      'AIR CONDITIONER': 'HVAC',
      'AC': 'HVAC',
      'HEAT PUMP': 'HVAC',
      'LEVELING': 'CHASSIS',
      'JACKS': 'CHASSIS',
      'LEVELING JACKS': 'CHASSIS'
    };
    
    if (aliases[systemKey]) {
      systemKey = aliases[systemKey];
    }
    
    const system = RV_SYSTEMS[systemKey];
    if (!system) {
      throw new Error(`Unknown RV system: ${systemName}`);
    }

    // Fetch current regulatory updates
    const prompt = `
    Provide current (2024-2025) regulatory updates and best practices for RV ${system.name}:
    
    Include:
    1. Recent code changes or updates
    2. New safety requirements
    3. Recall information for ${system.standards.manufacturers.join(', ')}
    4. Common failure modes and prevention
    5. Recommended maintenance intervals
    
    Focus on practical, actionable information for RV technicians.
    `;

    try {
      const updates = await aiRouter.analyzeContent(prompt, 'You are an RV systems expert. Provide current, accurate technical information.');

      return {
        ...system,
        currentUpdates: updates
      };
    } catch (error) {
      console.error('Failed to get system updates:', error);
      return system;
    }
  }

  /**
   * Validates procedures against trade standards
   */
  async validateAgainstStandards(
    procedure: string,
    systemName: string
  ): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const system = RV_SYSTEMS[systemName];
    if (!system) {
      return {
        valid: false,
        issues: ['Unknown system'],
        recommendations: []
      };
    }

    const validationPrompt = `
    Validate this RV ${system.name} procedure against standards:
    
    Standards to check:
    - ${system.standards.primary.join('\n- ')}
    - ${system.standards.safety.join('\n- ')}
    
    Procedure:
    ${procedure}
    
    Check for:
    1. Compliance with all listed standards
    2. Safety hazards not addressed
    3. Missing PPE requirements
    4. Incorrect torque specs or tolerances
    5. Missing test points or verification steps
    
    Provide validation results as JSON with:
    - valid: boolean
    - issues: string[] (specific violations)
    - recommendations: string[] (improvements)
    `;

    try {
      const validation = await aiRouter.analyzeSafety(validationPrompt);

      return JSON.parse(validation);
    } catch (error) {
      console.error('Validation failed:', error);
      return {
        valid: false,
        issues: ['Validation service unavailable'],
        recommendations: ['Manual review required']
      };
    }
  }
}

// Export singleton instance
export const rvTradeKnowledge = new RVTradeKnowledgeService();