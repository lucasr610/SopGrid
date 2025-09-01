// Input Validation Service
// Ensures comprehensive information is collected before generating SOPs

interface ValidationResponse {
  isValid: boolean;
  missingInfo: string[];
  clarifyingQuestions: string[];
  suggestedInputs?: string[];
  validatedInput?: ValidatedInput;
}

interface ValidatedInput {
  rvType: string;        // Class A/B/C, diesel, travel trailer, fifth wheel
  manufacturer: string;   // Lippert, Dometic, etc.
  component: string;     // jack, furnace, pump, etc.
  action: string;        // replace, repair, diagnose, install
  location?: string;     // rear, front, driver side, etc.
  model?: string;        // specific model if provided
  suspensionStyle?: string; // for axle/suspension work
  system?: string;       // electrical, hydraulic, etc.
}

interface RequiredFields {
  [key: string]: {
    required: string[];
    conditional: { [condition: string]: string[] };
    clarifyingQuestions: { [field: string]: string };
  };
}

class InputValidationService {
  private requiredFields: RequiredFields = {
    // Axle and suspension work requires specific details
    'axle|suspension|bearing|jack': {
      required: ['rvType', 'manufacturer', 'component', 'action'],
      conditional: {
        'bearing|axle': ['suspensionStyle'],
        'jack': ['system'] // hydraulic vs electric
      },
      clarifyingQuestions: {
        rvType: 'What type of RV are you working on? (Class A, Class B, Class C, diesel pusher, travel trailer, or fifth wheel)',
        manufacturer: 'What manufacturer? (Lippert, Dexter, AL-KO, etc.)',
        suspensionStyle: 'What suspension style? (leaf spring, independent, torsion axle, air suspension)',
        system: 'What type of jack system? (hydraulic, electric, manual)',
        location: 'Which location? (front, rear, driver side, passenger side, all four corners)'
      }
    },
    
    // Generator work requires RV type and generator specifics
    'generator|genset': {
      required: ['rvType', 'manufacturer', 'component', 'action'],
      conditional: {
        'generator': ['model']
      },
      clarifyingQuestions: {
        rvType: 'What type of RV? (Class A, Class B, Class C, travel trailer, fifth wheel)',
        manufacturer: 'Generator manufacturer? (Onan, Generac, Honda, Yamaha, etc.)',
        model: 'Generator model and wattage? (e.g., Onan 4000, Generac GP3000)',
        action: 'What needs to be done? (repair, replace, diagnose, service, install)'
      }
    },
    
    // HVAC requires RV type and system specifics
    'hvac|furnace|air.*condition|ac|heat': {
      required: ['rvType', 'manufacturer', 'component', 'action'],
      conditional: {
        'furnace': ['system'], // propane vs electric
        'ac|air.*condition': ['system'] // ducted vs ductless
      },
      clarifyingQuestions: {
        rvType: 'What type of RV? (Class A, Class B, Class C, travel trailer, fifth wheel)',
        manufacturer: 'HVAC manufacturer? (Dometic, Suburban, Atwood, Coleman, etc.)',
        system: 'What type of system? (propane furnace, electric heat, ducted AC, ductless AC)',
        location: 'Which unit? (main cabin, bedroom, driver area, etc.)'
      }
    },
    
    // Water heater requires type and fuel source
    'water.*heater|hot.*water': {
      required: ['rvType', 'manufacturer', 'component', 'action'],
      conditional: {
        'water.*heater': ['system']
      },
      clarifyingQuestions: {
        rvType: 'What type of RV? (Class A, Class B, Class C, travel trailer, fifth wheel)',
        manufacturer: 'Water heater manufacturer? (Atwood, Suburban, Dometic, etc.)',
        system: 'What type of water heater? (propane only, electric only, propane/electric combo)',
        model: 'Model and capacity? (e.g., Atwood GC6AA-10E, 6-gallon)'
      }
    },
    
    // Electrical work requires system specifics
    'electrical|electric|inverter|converter|battery': {
      required: ['rvType', 'manufacturer', 'component', 'action'],
      conditional: {
        'inverter|converter': ['system'],
        'battery': ['system']
      },
      clarifyingQuestions: {
        rvType: 'What type of RV? (Class A, Class B, Class C, travel trailer, fifth wheel)',
        manufacturer: 'Electrical manufacturer? (Progressive Dynamics, WFCO, Magnum, Victron, etc.)',
        system: 'What type of system? (12V converter, inverter/charger, solar, lithium battery, AGM battery)',
        location: 'Where is the component located? (main panel, basement, bedroom, etc.)'
      }
    },
    
    // Plumbing requires system details
    'plumbing|water|pump|tank|toilet': {
      required: ['rvType', 'manufacturer', 'component', 'action'],
      conditional: {
        'pump': ['system'],
        'tank': ['system']
      },
      clarifyingQuestions: {
        rvType: 'What type of RV? (Class A, Class B, Class C, travel trailer, fifth wheel)',
        manufacturer: 'Plumbing manufacturer? (Shurflo, Flojet, Dometic, Thetford, etc.)',
        system: 'What type of system? (fresh water pump, macerator pump, black tank, gray tank, toilet)',
        location: 'Which tank or location? (fresh, black, gray, galley, bathroom)'
      }
    },
    
    // Slide-out requires mechanism type
    'slide.*out|slideout|slide|room': {
      required: ['rvType', 'manufacturer', 'component', 'action'],
      conditional: {
        'slide': ['system']
      },
      clarifyingQuestions: {
        rvType: 'What type of RV? (Class A, Class B, Class C, travel trailer, fifth wheel)',
        manufacturer: 'Slide-out manufacturer? (Lippert, HWH, Schwintek, etc.)',
        system: 'What type of slide mechanism? (hydraulic, electric motor, gear drive, cable drive)',
        location: 'Which slide-out? (main salon, bedroom, kitchen, driver side, passenger side)'
      }
    },
    
    // Default for any other components
    'default': {
      required: ['rvType', 'manufacturer', 'component', 'action'],
      conditional: {},
      clarifyingQuestions: {
        rvType: 'What type of RV are you working on? (Class A, Class B, Class C, diesel pusher, travel trailer, or fifth wheel)',
        manufacturer: 'What is the manufacturer of this component?',
        component: 'What specific component needs work?',
        action: 'What needs to be done? (repair, replace, diagnose, install, adjust)'
      }
    }
  };

  /**
   * Validates user input and identifies missing information
   */
  validateInput(userMessage: string): ValidationResponse {
    console.log(`🔍 INPUT VALIDATION: Analyzing user request: "${userMessage}"`);
    
    // Extract entities from the message
    const extractedInfo = this.extractEntities(userMessage);
    
    // Determine the component category to get required fields
    const category = this.determineCategory(extractedInfo.component);
    const requirements = this.requiredFields[category] || this.requiredFields['default'];
    
    // Check for missing required fields
    const missingRequired = requirements.required.filter(field => !extractedInfo[field as keyof ValidatedInput]);
    
    // Check conditional requirements
    const missingConditional: string[] = [];
    for (const [condition, fields] of Object.entries(requirements.conditional)) {
      const regex = new RegExp(condition, 'i');
      if (regex.test(extractedInfo.component)) {
        fields.forEach(field => {
          if (!extractedInfo[field as keyof ValidatedInput]) {
            missingConditional.push(field);
          }
        });
      }
    }
    
    const allMissing = [...missingRequired, ...missingConditional];
    
    // Generate clarifying questions for missing info
    const clarifyingQuestions = allMissing.map(field => 
      requirements.clarifyingQuestions[field] || `What is the ${field}?`
    );
    
    // Generate suggested inputs based on what we know
    const suggestedInputs = this.generateSuggestions(extractedInfo, category);
    
    const isValid = allMissing.length === 0;
    
    console.log(`🔍 INPUT VALIDATION: ${isValid ? 'COMPLETE' : 'INCOMPLETE'} - Missing: ${allMissing.join(', ')}`);
    
    return {
      isValid,
      missingInfo: allMissing,
      clarifyingQuestions,
      suggestedInputs,
      validatedInput: isValid ? extractedInfo : undefined
    };
  }

  /**
   * Extract entities from user message using pattern matching
   */
  private extractEntities(message: string): ValidatedInput {
    const lowerMessage = message.toLowerCase();
    
    // Extract RV type
    const rvType = this.extractRVType(lowerMessage);
    
    // Extract manufacturer
    const manufacturer = this.extractManufacturer(lowerMessage);
    
    // Extract component
    const component = this.extractComponent(lowerMessage);
    
    // Extract action
    const action = this.extractAction(lowerMessage);
    
    // Extract location
    const location = this.extractLocation(lowerMessage);
    
    // Extract system type
    const system = this.extractSystem(lowerMessage);
    
    // Extract suspension style for axle work
    const suspensionStyle = this.extractSuspensionStyle(lowerMessage);
    
    return {
      rvType,
      manufacturer,
      component,
      action,
      location,
      system,
      suspensionStyle
    };
  }

  private extractRVType(message: string): string {
    const rvTypes = {
      'class a|motorhome class a|diesel pusher|pusher|coach': 'Class A',
      'class b|van|sprinter|promaster|transit': 'Class B', 
      'class c|mini.*motor|motorhome class c': 'Class C',
      'travel trailer|trailer|bumper pull|conventional': 'Travel Trailer',
      'fifth wheel|5th wheel|gooseneck': 'Fifth Wheel',
      'diesel|diesel pusher': 'Diesel Pusher'
    };
    
    for (const [pattern, type] of Object.entries(rvTypes)) {
      if (new RegExp(pattern, 'i').test(message)) {
        return type;
      }
    }
    return '';
  }

  private extractManufacturer(message: string): string {
    const manufacturers = [
      'lippert', 'dometic', 'norcold', 'atwood', 'suburban', 'onan', 'generac',
      'honda', 'yamaha', 'coleman', 'dexter', 'al-ko', 'shurflo', 'flojet',
      'progressive dynamics', 'wfco', 'magnum', 'victron', 'thetford',
      'hwh', 'schwintek', 'happijac', 'bigfoot', 'power gear'
    ];
    
    for (const mfg of manufacturers) {
      if (message.includes(mfg)) {
        return mfg.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
    }
    return '';
  }

  private extractComponent(message: string): string {
    const components = [
      'jack', 'pump', 'generator', 'furnace', 'air conditioner', 'water heater',
      'inverter', 'converter', 'battery', 'slide out', 'bearing', 'axle',
      'toilet', 'tank', 'valve', 'motor', 'switch', 'thermostat', 'fan',
      'awning', 'antenna', 'microwave', 'refrigerator'
    ];
    
    for (const component of components) {
      if (message.includes(component)) {
        return component;
      }
    }
    
    // Extract any word that might be a component
    const words = message.split(' ');
    const possibleComponents = words.filter(word => 
      word.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(word)
    );
    
    return possibleComponents[0] || 'component';
  }

  private extractAction(message: string): string {
    const actions = {
      'replace|replacing|replacement|swap|change': 'replace',
      'repair|fix|fixing|mend': 'repair', 
      'install|installing|installation|mount|mounting': 'install',
      'diagnose|troubleshoot|check|test|inspect': 'diagnose',
      'adjust|calibrate|tune|set': 'adjust',
      'service|maintain|clean|maintenance': 'service'
    };
    
    for (const [pattern, action] of Object.entries(actions)) {
      if (new RegExp(pattern, 'i').test(message)) {
        return action;
      }
    }
    return '';
  }

  private extractLocation(message: string): string {
    const locations = {
      'front|forward': 'front',
      'rear|back|aft': 'rear',
      'driver|left': 'driver side',
      'passenger|right': 'passenger side',
      'all|both|four': 'all corners'
    };
    
    for (const [pattern, location] of Object.entries(locations)) {
      if (new RegExp(pattern, 'i').test(message)) {
        return location;
      }
    }
    return '';
  }

  private extractSystem(message: string): string {
    const systems = {
      'hydraulic|fluid|oil': 'hydraulic',
      'electric|motor|12v|24v': 'electric',
      'propane|gas|lp': 'propane',
      'solar|photovoltaic|pv': 'solar',
      'lithium|lifepo4': 'lithium',
      'agm|gel|lead.*acid': 'AGM'
    };
    
    for (const [pattern, system] of Object.entries(systems)) {
      if (new RegExp(pattern, 'i').test(message)) {
        return system;
      }
    }
    return '';
  }

  private extractSuspensionStyle(message: string): string {
    const suspensions = {
      'leaf.*spring|leaf|spring': 'leaf spring',
      'independent|ifs': 'independent',
      'torsion|torsion.*axle': 'torsion axle',
      'air.*bag|air.*suspension|air': 'air suspension'
    };
    
    for (const [pattern, suspension] of Object.entries(suspensions)) {
      if (new RegExp(pattern, 'i').test(message)) {
        return suspension;
      }
    }
    return '';
  }

  private determineCategory(component: string): string {
    const categories = [
      'axle|suspension|bearing|jack',
      'generator|genset',
      'hvac|furnace|air.*condition|ac|heat',
      'water.*heater|hot.*water',
      'electrical|electric|inverter|converter|battery',
      'plumbing|water|pump|tank|toilet',
      'slide.*out|slideout|slide|room'
    ];
    
    for (const category of categories) {
      if (new RegExp(category, 'i').test(component)) {
        return category;
      }
    }
    return 'default';
  }

  private generateSuggestions(extractedInfo: ValidatedInput, category: string): string[] {
    const suggestions: string[] = [];
    
    // Generate format suggestions based on what's missing
    if (!extractedInfo.rvType) {
      suggestions.push('Specify RV type: "Class A diesel pusher"');
      suggestions.push('Specify RV type: "Travel trailer"');
    }
    
    if (!extractedInfo.manufacturer) {
      if (category.includes('generator')) {
        suggestions.push('Add manufacturer: "Onan 4000 generator"');
      } else if (category.includes('jack')) {
        suggestions.push('Add manufacturer: "Lippert hydraulic jacks"');
      }
    }
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Format a helpful response asking for missing information
   */
  formatMissingInfoResponse(validation: ValidationResponse): string {
    if (validation.isValid) {
      return '';
    }

    let response = "🔧 **I need more specific information to generate an accurate SOP:**\n\n";
    
    validation.clarifyingQuestions.forEach((question, index) => {
      response += `**${index + 1}.** ${question}\n`;
    });
    
    response += "\n**Please provide these details so I can create a targeted, safe procedure for your specific RV configuration.**";
    
    if (validation.suggestedInputs && validation.suggestedInputs.length > 0) {
      response += "\n\n**Example format:**\n";
      validation.suggestedInputs.forEach(suggestion => {
        response += `• ${suggestion}\n`;
      });
    }
    
    return response;
  }
}

export const inputValidationService = new InputValidationService();