import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";

if (!apiKey) {
  console.warn('Google Gemini API key not found. Some features may be limited.');
}

const genAI = new GoogleGenerativeAI(apiKey);

interface ComplianceAnalysisResult {
  compliant: boolean;
  violations: string[];
  recommendations: string[];
  score: number;
}

interface SafetyAnalysisResult {
  hazards: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigationStrategies: string[];
  requiredPPE: string[];
  emergencyProcedures: string[];
}

class GeminiService {
  async analyzeCompliance(prompt: string): Promise<ComplianceAnalysisResult> {
    try {
      if (!apiKey) {
        return {
          compliant: true,
          violations: [],
          recommendations: ['Google Gemini API key not configured'],
          score: 75
        };
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `You are a compliance analysis expert for SOPGRID. Analyze content for regulatory compliance against OSHA, EPA, DOT, FDA standards.
            
${prompt}

Provide a detailed assessment in JSON format with:
- compliant (boolean): Overall compliance status
- violations (array): List of specific violations found
- recommendations (array): Actionable recommendations for compliance
- score (number): Compliance score from 0-100

Return ONLY valid JSON, no other text.`
          }]
        }]
      });

      const response = result.response;
      const rawText = response.text();
      
      if (!rawText) {
        throw new Error("Empty response from Gemini");
      }

      // Clean and parse JSON response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      
      const parsedResult = JSON.parse(jsonMatch[0]);
      
      return {
        compliant: parsedResult.compliant || false,
        violations: parsedResult.violations || [],
        recommendations: parsedResult.recommendations || [],
        score: parsedResult.score || 0
      };
    } catch (error) {
      console.error('Gemini compliance analysis failed:', error);
      // Return a default response instead of throwing
      return {
        compliant: false,
        violations: ['Analysis temporarily unavailable'],
        recommendations: ['Manual review recommended'],
        score: 50
      };
    }
  }

  async analyzeSafety(content: string): Promise<SafetyAnalysisResult> {
    try {
      if (!apiKey) {
        return {
          hazards: ['Safety analysis requires API configuration'],
          riskLevel: 'medium',
          mitigationStrategies: ['Configure Google Gemini API'],
          requiredPPE: ['Standard PPE recommended'],
          emergencyProcedures: ['Follow standard procedures']
        };
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `Analyze the following content for safety considerations:

${content}

Identify:
1. Potential hazards and risks
2. Overall risk level (low, medium, high, critical)
3. Mitigation strategies and safety measures
4. Required Personal Protective Equipment (PPE)
5. Emergency procedures that should be in place

Return ONLY valid JSON with these fields:
- hazards (array of strings)
- riskLevel (string: low/medium/high/critical)
- mitigationStrategies (array of strings)
- requiredPPE (array of strings)
- emergencyProcedures (array of strings)`
          }]
        }]
      });

      const response = result.response;
      const rawText = response.text();
      
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      
      const parsedResult = JSON.parse(jsonMatch[0]);
      
      return {
        hazards: parsedResult.hazards || [],
        riskLevel: parsedResult.riskLevel || 'medium',
        mitigationStrategies: parsedResult.mitigationStrategies || [],
        requiredPPE: parsedResult.requiredPPE || [],
        emergencyProcedures: parsedResult.emergencyProcedures || []
      };
    } catch (error) {
      console.error('Gemini safety analysis failed:', error);
      return {
        hazards: ['Analysis temporarily unavailable'],
        riskLevel: 'medium',
        mitigationStrategies: ['Follow standard safety protocols'],
        requiredPPE: ['Standard PPE required'],
        emergencyProcedures: ['Follow emergency protocols']
      };
    }
  }

  async generateSOP(topic: string, context: string): Promise<string> {
    try {
      if (!apiKey) {
        return JSON.stringify({
          title: topic,
          content: 'Google Gemini API key not configured - using fallback SOP',
          steps: ['Configure API key for full functionality'],
          safety: ['Standard safety precautions apply'],
          compliance: ['Follow all applicable regulations']
        });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `Generate an EXTREMELY DETAILED, granular SOP for RV technicians for: ${topic}

Context: ${context}

CRITICAL: Break down EVERY action into individual numbered steps. Be as detailed as the Lippert manual examples.

MANDATORY FORMAT:

SOP_TITLE: [Equipment with model/capacity, e.g., "Lippert 3,200 lb Tandem Axle: Annual Bearing Pack"]
SOP_ID: [CATEGORY-TYPE-MFG-MODEL-001]
VERSION: 1.0
DATE_CREATED: [Today]

PURPOSE_DETAILS: [2-3 paragraphs explaining what this procedure accomplishes, why it's necessary, and the expected outcome]

SCOPE_DETAILS: [Who performs this, what specific equipment models it applies to, when/how often]

SAFETY_SPECIAL_NOTES:
- FALL HAZARD: [Description]. CORRECTION: [Specific mitigation with jack stands rated for weight]
- ELECTRICAL HAZARD: [Description]. CORRECTION: [LOTO procedures, disconnect power]
- PINCH/CRUSH HAZARD: [Description]. CORRECTION: [Proper chocking, body positioning]
- FIRE/HEALTH HAZARD: [Description]. CORRECTION: [Ventilation, PPE, fire extinguisher]
- COMPONENT FAILURE HAZARD: [Description]. CORRECTION: [Torque specs, inspection criteria]

MATERIALS_LIST:
- New Grease Seals (qty. 4, [part number])
- Wheel Bearing Grease (NLGI GC-LB rated, high-temp lithium complex)
- Clean lint-free shop rags
- Brake cleaner or suitable solvent
- New Cotter Pins (qty. 4, SINGLE-USE - discard after removal)
- [Continue with ALL consumables]

TOOLS_LIST:
- Hydraulic floor jack (rated for RV weight)
- Jack stands (rated for RV weight)
- Torque wrench (50-250 ft-lb range, calibrated)
- Socket set (list specific sizes: 15mm, 24mm, etc.)
- Needle-nose pliers (for cotter pin removal)
- Flathead screwdriver or dust cap removal tool
- Seal puller tool
- Bearing packer tool
- [Continue with ALL tools]

PROCEDURE_SECTION_A_TITLE: [e.g., "RV Preparation & Component Access"]
PROCEDURE_SECTION_A_STEPS:
1. Verify the RV is parked on a level, hard, stable surface.
2. Engage the RV's parking brake by pulling the lever fully upward until it clicks.
3. Place wheel chocks on both sides of the wheels opposite to those being serviced.
4. Disconnect the negative terminal of the 12V battery using a 10mm wrench, turning counterclockwise.
5. Disconnect shore power by unplugging the 30A or 50A connector.
6. Using the hydraulic floor jack, position the saddle under the frame rail (NOT the axle).
7. Pump the jack handle to lift the RV until the tire clears the ground by 2-3 inches.
8. Position jack stands under the frame at the manufacturer's designated lift points.
9. Lower the jack slowly until the RV's weight transfers completely to the jack stands.
10. Shake the RV gently to ensure it's stable on the stands. (PTC)
[Continue with EVERY individual action]

PROCEDURE_SECTION_B_TITLE: [e.g., "Hub/Drum Removal & Bearing Inspection"]
PROCEDURE_SECTION_B_STEPS:
1. Using a flathead screwdriver, insert the tip between the grease cap and hub at the 12 o'clock position.
2. Gently pry outward with a rocking motion to loosen the cap.
3. Move to the 3 o'clock position and repeat the prying motion.
4. Continue around the cap until it pops free.
5. Set the grease cap on a clean surface with the open end facing up.
6. Using needle-nose pliers, grasp the bottom leg of the cotter pin.
7. Straighten the bent leg by pulling it perpendicular to the spindle.
8. Rotate the pliers to grasp the head of the cotter pin.
9. Pull the cotter pin straight out through the castle nut and spindle hole.
10. Discard the used cotter pin - NEVER reuse cotter pins as they are single-use items.
[Continue with extreme detail]

TROUBLESHOOTING_ISSUES:
Issue: No grease exits the wet bolt zerk
Cause: Clogged zerk, dry-seized bushing, or misalignment
Action: 1. Try clearing zerk with zerk cleaning tool. 2. Rotate wheel to relieve pressure. 3. If still blocked, bolt/bushing replacement required.

MAINTENANCE_SCHEDULE:
- Wheel Bearing Repack: Every 12,000 miles or annually, whichever comes first
- Wet Bolt Lubrication: Every 5,000 miles for frequent travelers, annually for occasional use
- Brake Inspection: Annually with bearing service
- U-Bolt Torque Check: Annually or if axle movement detected

REFERENCED_DOCUMENTS:
- Lippert Components Trailer Axle Service Manual Rev. 2024
- RV Service Center Technical Bulletin: LOTO Procedures
- OSHA 1910.147 Lockout/Tagout Standard

DEFINITIONS_TERMS:
- Wet Bolt: Suspension bolt with grease zerk for lubrication
- Castle Nut: Slotted nut that accepts a cotter pin for locking
- Preload: Slight bearing tension for proper seating
- (PTC): Procedure Test Checkpoint - verify before proceeding
- (PC): Pause Checkpoint - stop and inspect`
          }]
        }]
      });

      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini SOP generation failed:', error);
      throw new Error(`SOP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateStructuredContent(
    prompt: string,
    systemPrompt: string
  ): Promise<any> {
    try {
      if (!apiKey) {
        return {
          success: false,
          content: 'Google Gemini API key not configured',
          message: 'Please configure API key for full functionality'
        };
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `${systemPrompt}\n\n${prompt}`
          }]
        }]
      });

      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini content generation failed:', error);
      throw new Error(`Gemini content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async arbitrateContent(prompt: string): Promise<string> {
    try {
      if (!apiKey) {
        return 'Gemini API key not configured - arbitration unavailable';
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: prompt
          }]
        }]
      });

      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini arbitration failed:', error);
      throw new Error(`Arbitration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verifyCompliance(content: string, regulations: string[]): Promise<{
    compliant: boolean;
    details: Record<string, any>;
  }> {
    try {
      if (!apiKey) {
        return {
          compliant: true,
          details: { message: 'Compliance verification requires API configuration' }
        };
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const regulationList = regulations.join(', ');
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `Verify compliance of the following content against these regulations: ${regulationList}

Content to verify:
${content}

Check for:
1. Direct violations of any regulation
2. Missing required safety information
3. Incomplete or unclear procedures
4. Potential liability issues

Return JSON with:
- compliant (boolean)
- violations (array of specific violations)
- missing (array of missing required elements)
- suggestions (array of improvement suggestions)
- regulationStatus (object with each regulation as key and compliance status as value)`
          }]
        }]
      });

      const response = result.response;
      const rawText = response.text();
      
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { compliant: false, details: { error: 'Invalid response format' } };
      }
      
      const parsedResult = JSON.parse(jsonMatch[0]);
      
      return {
        compliant: parsedResult.compliant || false,
        details: parsedResult
      };
    } catch (error) {
      console.error('Compliance verification failed:', error);
      return {
        compliant: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  async crawlGovernmentRegulations(topic: string, agency: string): Promise<{
    regulations: string[];
    guidelines: string[];
    standards: string[];
  }> {
    try {
      if (!apiKey) {
        return {
          regulations: ['API configuration required for regulatory lookup'],
          guidelines: [],
          standards: []
        };
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const agencyMap: Record<string, string> = {
        'OSHA': 'Occupational Safety and Health Administration workplace safety standards',
        'EPA': 'Environmental Protection Agency environmental regulations',
        'DOT': 'Department of Transportation vehicle and transportation safety',
        'FDA': 'Food and Drug Administration medical device and food safety',
        'DOD': 'Department of Defense military specifications and standards'
      };

      const agencyContext = agencyMap[agency] || agency;
      
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `As a regulatory compliance expert, provide current ${agencyContext} regulations, guidelines, and standards for: ${topic}

Focus on:
1. Specific regulation numbers and codes
2. Key compliance requirements
3. Safety standards that must be met
4. Recent updates or changes (2023-2025)

Return JSON with:
- regulations (array of specific regulation citations with brief descriptions)
- guidelines (array of best practice guidelines)
- standards (array of applicable industry standards)

Include actual regulation numbers where applicable (e.g., "29 CFR 1910.147 - Lockout/Tagout")`
          }]
        }]
      });

      const response = result.response;
      const rawText = response.text();
      
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      
      const parsedResult = JSON.parse(jsonMatch[0]);
      
      return {
        regulations: parsedResult.regulations || [],
        guidelines: parsedResult.guidelines || [],
        standards: parsedResult.standards || []
      };
    } catch (error) {
      console.error('Regulatory crawl failed:', error);
      return {
        regulations: [`Error fetching ${agency} regulations`],
        guidelines: [],
        standards: []
      };
    }
  }

  async generateSOPContent(prompt: string): Promise<string> {
    try {
      if (!apiKey) {
        return "SOP generation requires Google Gemini API key configuration.";
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `You are SOAP, the primary SOP author for SOPGRID. Generate an EXTREMELY DETAILED Standard Operating Procedure with EVERY action as its own numbered step.

${prompt}

CREATE A GRANULAR SOP WITH THIS EXACT STRUCTURE:

SOP_TITLE: [Specific equipment and procedure]
SOP_ID: [CATEGORY-TYPE-MFG-MODEL-001]
VERSION: 1.0

PURPOSE_DETAILS: [2-3 paragraphs]

SCOPE_DETAILS: [Who, what equipment, when]

SAFETY_SPECIAL_NOTES:
- List each hazard type with CORRECTION steps
- Include OSHA/EPA/DOT references

MATERIALS_LIST:
- Every consumable with specs and quantities
- Note single-use items (e.g., cotter pins)

TOOLS_LIST:
- Every tool with specifications
- Include torque wrench ranges
- Socket sizes needed

PROCEDURE_SECTION_[X]_STEPS:
1. [ONE action with specific tool]
   Example: "Using needle-nose pliers, grasp the cotter pin leg"
2. [Next single action]
   Example: "Pull the leg straight with steady pressure"
3. [Continue breaking down EVERY movement]

Include:
- Tool for each action
- Direction of rotation
- Torque specifications
- Visual/audio cues
- (PTC) checkpoints
- Single-use part notes

TROUBLESHOOTING_ISSUES:
[Common problems with solutions]

MAINTENANCE_SCHEDULE:
[Intervals in miles/time]

REFERENCED_DOCUMENTS:
[Manuals and standards]

DEFINITIONS_TERMS:
[Technical terms explained]`
          }]
        }]
      });

      const response = result.response;
      return response.text() || "Failed to generate SOP content";
    } catch (error) {
      console.error('Gemini SOP generation failed:', error);
      throw new Error(`SOP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async chat(message: string): Promise<string> {
    try {
      if (!apiKey) {
        return "Chat functionality requires Google Gemini API key configuration.";
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `You are an AI assistant for SOPGRID, specializing in compliance, safety, and standard operating procedures for technical work. Respond helpfully and accurately to: ${message}`
          }]
        }]
      });

      const response = result.response;
      return response.text() || "I apologize, but I couldn't generate a response.";
    } catch (error) {
      console.error('Gemini chat failed:', error);
      return "I'm having trouble responding right now. Please try again later.";
    }
  }
}

export const geminiService = new GeminiService();