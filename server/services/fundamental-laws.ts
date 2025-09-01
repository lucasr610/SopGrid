// SOPGRID Fundamental Engineering Laws & Principles Database
// Core physics and engineering knowledge to validate against misinformation

export interface FundamentalLaw {
  id: string;
  category: 'electrical' | 'thermal' | 'hydraulic' | 'mechanical' | 'thermodynamic' | 'pneumatic';
  name: string;
  formula: string;
  variables: Record<string, string>;
  units: Record<string, string>;
  validationRanges: Record<string, { min: number; max: number; }>;
  description: string;
  commonMisconceptions: string[];
  relatedLaws: string[];
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  appliedLaws: string[];
  discrepancies: Array<{
    law: string;
    expected: number;
    actual: number;
    variance: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  requiresManualConsultation: boolean;
  manualReferences: string[];
}

class FundamentalLawsService {
  private laws: Map<string, FundamentalLaw> = new Map();
  private readonly VARIANCE_THRESHOLD = 0.05; // 5% threshold

  constructor() {
    this.initializeLaws();
  }

  private initializeLaws(): void {
    // ELECTRICAL LAWS
    this.addLaw({
      id: 'ohms_law',
      category: 'electrical',
      name: "Ohm's Law",
      formula: 'V = I × R',
      variables: {
        'V': 'Voltage',
        'I': 'Current', 
        'R': 'Resistance'
      },
      units: {
        'V': 'Volts (V)',
        'I': 'Amperes (A)',
        'R': 'Ohms (Ω)'
      },
      validationRanges: {
        'V': { min: 0, max: 1000 }, // Common RV range
        'I': { min: 0, max: 200 },  // Common RV range
        'R': { min: 0.001, max: 1000000 }
      },
      description: 'Fundamental relationship between voltage, current, and resistance',
      commonMisconceptions: [
        'Higher voltage always means more danger (ignores current)',
        'Resistance is constant (ignores temperature effects)',
        'Power is directly proportional to voltage only'
      ],
      relatedLaws: ['watts_law', 'kirchhoffs_law']
    });

    this.addLaw({
      id: 'watts_law',
      category: 'electrical',
      name: "Watt's Law (Power Law)",
      formula: 'P = V × I = I² × R = V² / R',
      variables: {
        'P': 'Power',
        'V': 'Voltage',
        'I': 'Current',
        'R': 'Resistance'
      },
      units: {
        'P': 'Watts (W)',
        'V': 'Volts (V)', 
        'I': 'Amperes (A)',
        'R': 'Ohms (Ω)'
      },
      validationRanges: {
        'P': { min: 0, max: 50000 }, // Up to 50kW for large RVs
        'V': { min: 0, max: 1000 },
        'I': { min: 0, max: 200 }
      },
      description: 'Relationship between electrical power, voltage, current, and resistance',
      commonMisconceptions: [
        'Doubling voltage always doubles power (ignores load changes)',
        'Power consumption is always constant',
        'Higher wattage always means better performance'
      ],
      relatedLaws: ['ohms_law', 'joules_law']
    });

    this.addLaw({
      id: 'kirchhoffs_current_law',
      category: 'electrical',
      name: "Kirchhoff's Current Law (KCL)",
      formula: 'Σ I_in = Σ I_out',
      variables: {
        'I_in': 'Current flowing into node',
        'I_out': 'Current flowing out of node'
      },
      units: {
        'I_in': 'Amperes (A)',
        'I_out': 'Amperes (A)'
      },
      validationRanges: {
        'I_in': { min: 0, max: 200 },
        'I_out': { min: 0, max: 200 }
      },
      description: 'Conservation of charge - current in equals current out at any node',
      commonMisconceptions: [
        'Current is consumed by components',
        'Voltage divides equally in parallel',
        'Ground connections dont count as paths'
      ],
      relatedLaws: ['kirchhoffs_voltage_law', 'ohms_law']
    });

    // THERMAL/THERMODYNAMIC LAWS
    this.addLaw({
      id: 'first_law_thermodynamics',
      category: 'thermodynamic',
      name: 'First Law of Thermodynamics',
      formula: 'ΔU = Q - W',
      variables: {
        'ΔU': 'Change in internal energy',
        'Q': 'Heat added to system',
        'W': 'Work done by system'
      },
      units: {
        'ΔU': 'Joules (J) or BTU',
        'Q': 'Joules (J) or BTU',
        'W': 'Joules (J) or BTU'
      },
      validationRanges: {
        'Q': { min: -100000, max: 100000 }, // BTU range for RV systems
        'W': { min: -50000, max: 50000 }
      },
      description: 'Conservation of energy - energy cannot be created or destroyed',
      commonMisconceptions: [
        'Heat pumps violate conservation of energy (ignores electrical input)',
        'Insulation creates heat (it only reduces heat transfer)',
        'Perpetual motion is possible with efficient enough systems'
      ],
      relatedLaws: ['second_law_thermodynamics', 'heat_transfer']
    });

    this.addLaw({
      id: 'heat_transfer_conduction',
      category: 'thermal',
      name: 'Fourier\'s Law of Heat Conduction',
      formula: 'Q = k × A × (ΔT / Δx)',
      variables: {
        'Q': 'Heat transfer rate',
        'k': 'Thermal conductivity',
        'A': 'Cross-sectional area',
        'ΔT': 'Temperature difference',
        'Δx': 'Thickness'
      },
      units: {
        'Q': 'Watts (W) or BTU/hr',
        'k': 'W/(m·K)',
        'A': 'Square meters (m²)',
        'ΔT': 'Kelvin (K) or °F',
        'Δx': 'Meters (m)'
      },
      validationRanges: {
        'k': { min: 0.01, max: 1000 }, // Range from insulation to metals
        'ΔT': { min: 0, max: 200 } // Temperature differences in RV applications
      },
      description: 'Heat conduction through materials',
      commonMisconceptions: [
        'Thicker insulation always reduces heat transfer linearly',
        'All materials conduct heat at same rate',
        'Heat flows from cold to hot naturally'
      ],
      relatedLaws: ['heat_transfer_convection', 'thermal_resistance']
    });

    // HYDRAULIC LAWS
    this.addLaw({
      id: 'bernoullis_principle',
      category: 'hydraulic',
      name: "Bernoulli's Principle",
      formula: 'P₁ + ½ρv₁² + ρgh₁ = P₂ + ½ρv₂² + ρgh₂',
      variables: {
        'P': 'Pressure',
        'ρ': 'Fluid density',
        'v': 'Fluid velocity',
        'g': 'Gravitational acceleration',
        'h': 'Height'
      },
      units: {
        'P': 'Pascals (Pa) or PSI',
        'ρ': 'kg/m³',
        'v': 'm/s',
        'g': '9.81 m/s²',
        'h': 'meters (m)'
      },
      validationRanges: {
        'P': { min: 0, max: 1000000 }, // 0 to ~145 PSI
        'v': { min: 0, max: 50 }, // Typical fluid velocities
        'h': { min: 0, max: 100 } // Height differences in RV systems
      },
      description: 'Conservation of energy in fluid flow',
      commonMisconceptions: [
        'Higher pressure always means faster flow',
        'Pumps create pressure (they create flow)',
        'Water flows uphill if pushed hard enough'
      ],
      relatedLaws: ['continuity_equation', 'pascals_principle']
    });

    this.addLaw({
      id: 'pascals_principle',
      category: 'hydraulic',
      name: "Pascal's Principle",
      formula: 'P = F / A',
      variables: {
        'P': 'Pressure',
        'F': 'Force',
        'A': 'Area'
      },
      units: {
        'P': 'Pascals (Pa) or PSI',
        'F': 'Newtons (N) or lbs',
        'A': 'Square meters (m²) or in²'
      },
      validationRanges: {
        'P': { min: 0, max: 10000000 }, // Wide range for hydraulic systems
        'F': { min: 0, max: 100000 },
        'A': { min: 0.0001, max: 10 }
      },
      description: 'Pressure applied to confined fluid is transmitted equally in all directions',
      commonMisconceptions: [
        'Larger pistons always provide more force',
        'Hydraulic systems multiply energy',
        'Pressure equals force directly'
      ],
      relatedLaws: ['bernoullis_principle', 'archimedes_principle']
    });

    // MECHANICAL LAWS
    this.addLaw({
      id: 'conservation_energy',
      category: 'mechanical',
      name: 'Conservation of Energy',
      formula: 'KE + PE + Heat = Constant',
      variables: {
        'KE': 'Kinetic Energy (½mv²)',
        'PE': 'Potential Energy (mgh)',
        'Heat': 'Heat energy from friction'
      },
      units: {
        'KE': 'Joules (J)',
        'PE': 'Joules (J)',
        'Heat': 'Joules (J)'
      },
      validationRanges: {
        'KE': { min: 0, max: 1000000 },
        'PE': { min: 0, max: 1000000 },
        'Heat': { min: 0, max: 1000000 }
      },
      description: 'Total energy in isolated system remains constant',
      commonMisconceptions: [
        'Moving objects have more energy than they started with',
        'Friction destroys energy (it converts to heat)',
        'Perpetual motion machines are theoretically possible'
      ],
      relatedLaws: ['newtons_laws', 'work_energy_theorem']
    });

    this.addLaw({
      id: 'ideal_gas_law',
      category: 'thermodynamic',
      name: 'Ideal Gas Law',
      formula: 'PV = nRT',
      variables: {
        'P': 'Pressure',
        'V': 'Volume',
        'n': 'Number of moles',
        'R': 'Gas constant',
        'T': 'Temperature'
      },
      units: {
        'P': 'Pascals (Pa) or PSI',
        'V': 'Cubic meters (m³)',
        'n': 'moles',
        'R': '8.314 J/(mol·K)',
        'T': 'Kelvin (K)'
      },
      validationRanges: {
        'P': { min: 0, max: 10000000 },
        'V': { min: 0.001, max: 1000 },
        'T': { min: 200, max: 800 } // Reasonable temperature range
      },
      description: 'Relationship between pressure, volume, and temperature of gases',
      commonMisconceptions: [
        'Gas temperature doesnt affect pressure at constant volume',
        'Compressing gas doesnt increase temperature',
        'All gases behave identically under all conditions'
      ],
      relatedLaws: ['boyles_law', 'charles_law', 'gay_lussacs_law']
    });
  }

  private addLaw(law: FundamentalLaw): void {
    this.laws.set(law.id, law);
  }

  async validateManualData(data: {
    category: string;
    manualMeasurements: Record<string, number>;
    manualSource: string;
    context?: string;
  }): Promise<ValidationResult> {
    const relevantLaws = Array.from(this.laws.values())
      .filter(law => law.category === data.category);

    const result: ValidationResult = {
      isValid: true,
      confidence: 1.0,
      appliedLaws: [],
      discrepancies: [],
      requiresManualConsultation: false,
      manualReferences: []
    };

    for (const law of relevantLaws) {
      const validation = await this.validateAgainstLaw(law, data.manualMeasurements);
      
      if (validation.hasDiscrepancy) {
        result.discrepancies.push({
          law: law.name,
          expected: validation.expected,
          actual: validation.actual,
          variance: validation.variance,
          severity: validation.variance > 0.2 ? 'critical' : 
                   validation.variance > 0.1 ? 'high' :
                   validation.variance > this.VARIANCE_THRESHOLD ? 'medium' : 'low'
        });

        // Always flag for HITL when manual contradicts fundamental physics
        if (validation.variance > this.VARIANCE_THRESHOLD) {
          result.requiresManualConsultation = true;
          result.manualReferences.push(
            `CONTRADICTION DETECTED: Manual "${data.manualSource}" conflicts with ${law.name}`,
            `Manual states: ${validation.actual}, Physics expects: ${validation.expected}`,
            `Variance: ${(validation.variance * 100).toFixed(1)}% - Requires HITL arbitration`,
            `Possible causes: Component-specific behavior, measurement error, manual error`
          );
        }
      }

      result.appliedLaws.push(law.id);
    }

    // Calculate overall confidence
    const maxVariance = Math.max(...result.discrepancies.map(d => d.variance), 0);
    result.confidence = Math.max(0, 1 - maxVariance);
    result.isValid = result.discrepancies.length === 0 || 
                    !result.discrepancies.some(d => d.severity === 'critical');

    return result;
  }

  private async validateAgainstLaw(
    law: FundamentalLaw, 
    measurements: Record<string, number>
  ): Promise<{
    hasDiscrepancy: boolean;
    expected: number;
    actual: number;
    variance: number;
  }> {
    // Implement specific validation logic for each law
    switch (law.id) {
      case 'ohms_law':
        return this.validateOhmsLaw(measurements);
      case 'watts_law':
        return this.validateWattsLaw(measurements);
      case 'pascals_principle':
        return this.validatePascalsPrinciple(measurements);
      case 'ideal_gas_law':
        return this.validateIdealGasLaw(measurements);
      default:
        return {
          hasDiscrepancy: false,
          expected: 0,
          actual: 0,
          variance: 0
        };
    }
  }

  private validateOhmsLaw(measurements: Record<string, number>): {
    hasDiscrepancy: boolean;
    expected: number;
    actual: number;
    variance: number;
  } {
    const { V, I, R } = measurements;
    
    if (V !== undefined && I !== undefined && R !== undefined) {
      // Check V = I × R
      const expectedV = I * R;
      const variance = Math.abs(V - expectedV) / expectedV;
      
      return {
        hasDiscrepancy: variance > this.VARIANCE_THRESHOLD,
        expected: expectedV,
        actual: V,
        variance
      };
    }
    
    return { hasDiscrepancy: false, expected: 0, actual: 0, variance: 0 };
  }

  private validateWattsLaw(measurements: Record<string, number>): {
    hasDiscrepancy: boolean;
    expected: number;
    actual: number;
    variance: number;
  } {
    const { P, V, I, R } = measurements;
    
    if (P !== undefined && V !== undefined && I !== undefined) {
      // Check P = V × I
      const expectedP = V * I;
      const variance = Math.abs(P - expectedP) / expectedP;
      
      return {
        hasDiscrepancy: variance > this.VARIANCE_THRESHOLD,
        expected: expectedP,
        actual: P,
        variance
      };
    }
    
    if (P !== undefined && I !== undefined && R !== undefined) {
      // Check P = I² × R
      const expectedP = I * I * R;
      const variance = Math.abs(P - expectedP) / expectedP;
      
      return {
        hasDiscrepancy: variance > this.VARIANCE_THRESHOLD,
        expected: expectedP,
        actual: P,
        variance
      };
    }
    
    return { hasDiscrepancy: false, expected: 0, actual: 0, variance: 0 };
  }

  private validatePascalsPrinciple(measurements: Record<string, number>): {
    hasDiscrepancy: boolean;
    expected: number;
    actual: number;
    variance: number;
  } {
    const { P, F, A } = measurements;
    
    if (P !== undefined && F !== undefined && A !== undefined) {
      // Check P = F / A
      const expectedP = F / A;
      const variance = Math.abs(P - expectedP) / expectedP;
      
      return {
        hasDiscrepancy: variance > this.VARIANCE_THRESHOLD,
        expected: expectedP,
        actual: P,
        variance
      };
    }
    
    return { hasDiscrepancy: false, expected: 0, actual: 0, variance: 0 };
  }

  private validateIdealGasLaw(measurements: Record<string, number>): {
    hasDiscrepancy: boolean;
    expected: number;
    actual: number;
    variance: number;
  } {
    const { P, V, n, T } = measurements;
    const R = 8.314; // Gas constant
    
    if (P !== undefined && V !== undefined && n !== undefined && T !== undefined) {
      // Check PV = nRT
      const expectedPV = n * R * T;
      const actualPV = P * V;
      const variance = Math.abs(actualPV - expectedPV) / expectedPV;
      
      return {
        hasDiscrepancy: variance > this.VARIANCE_THRESHOLD,
        expected: expectedPV,
        actual: actualPV,
        variance
      };
    }
    
    return { hasDiscrepancy: false, expected: 0, actual: 0, variance: 0 };
  }

  getLawsByCategory(category: string): FundamentalLaw[] {
    return Array.from(this.laws.values()).filter(law => law.category === category);
  }

  getLaw(id: string): FundamentalLaw | undefined {
    return this.laws.get(id);
  }

  getAllLaws(): FundamentalLaw[] {
    return Array.from(this.laws.values());
  }

  getCommonMisconceptions(category?: string): Array<{ law: string; misconceptions: string[] }> {
    const laws = category 
      ? this.getLawsByCategory(category)
      : this.getAllLaws();
      
    return laws.map(law => ({
      law: law.name,
      misconceptions: law.commonMisconceptions
    }));
  }
}

export const fundamentalLaws = new FundamentalLawsService();