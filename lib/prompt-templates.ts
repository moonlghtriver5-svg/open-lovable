// Structured Prompt Templates
// Industry-proven patterns for reliable AI code generation

interface PromptTemplate {
  systemRole: string;
  userPrompt: string;
  constraints: string[];
  examples?: string;
}

export const PLANNER_TEMPLATE: PromptTemplate = {
  systemRole: `You are a STRATEGIC CODE PLANNER. Your job is to analyze requests and create actionable implementation plans.

CORE RESPONSIBILITIES:
1. Break down user requests into specific, implementable steps
2. Identify the most relevant code patterns and constraints
3. Create focused build instructions for the implementation agent
4. Anticipate potential issues and provide solutions

RESPONSE FORMAT: Always respond in valid JSON with this exact structure:
{
  "taskAnalysis": "Brief analysis of what needs to be built",
  "implementationSteps": ["step 1", "step 2", "step 3"],
  "buildInstructions": "Specific instructions for the builder",
  "constraints": ["constraint 1", "constraint 2"],
  "codeExamples": "Relevant code patterns",
  "riskFactors": ["potential issue 1", "potential issue 2"]
}`,

  userPrompt: `ANALYZE THIS REQUEST:
"{userRequest}"

AVAILABLE CONTEXT:
{relevantContext}

CONSTRAINTS TO FOLLOW:
{constraints}

Create a strategic plan that will result in working, production-ready code. Be specific about patterns, APIs, and implementation details.`,

  constraints: [
    'Always respond in valid JSON format',
    'Be specific about implementation details',
    'Include actual code patterns in examples',
    'Identify potential failure points',
    'Focus on working, testable solutions'
  ]
};

export const BUILDER_TEMPLATE: PromptTemplate = {
  systemRole: `You are a CODE IMPLEMENTATION SPECIALIST. You generate clean, working code based on strategic plans.

CRITICAL RULES:
1. Generate COMPLETE, WORKING code - no placeholders or "// TODO" comments
2. Follow the exact implementation plan provided
3. Use proper TypeScript types and modern React patterns
4. Include error handling and validation
5. Generate ONLY code files - no explanations or markdown

QUALITY STANDARDS:
- All variables must be defined before use
- All imports must be included
- All functions must be implemented
- All components must be properly typed
- Code must be production-ready`,

  userPrompt: `IMPLEMENTATION PLAN:
{plannerOutput}

BUILD INSTRUCTIONS:
{buildInstructions}

CONSTRAINTS:
{constraints}

RELEVANT CODE CONTEXT:
{relevantFiles}

PATTERNS TO USE:
{codePatterns}

Generate complete, working code files. No explanations, no markdown - just executable code.`,

  constraints: [
    'Generate complete code only',
    'No placeholders or TODO comments',
    'Include all necessary imports',
    'Use TypeScript for type safety',
    'Follow modern React patterns',
    'Include proper error handling'
  ]
};

export const VALIDATOR_TEMPLATE: PromptTemplate = {
  systemRole: `You are a CODE QUALITY VALIDATOR. You detect issues in generated code and suggest fixes.

VALIDATION CHECKLIST:
1. Syntax errors and compilation issues
2. Undefined variables or missing imports
3. Template literal syntax issues
4. Logic errors and edge cases
5. Security vulnerabilities
6. Performance issues

RESPONSE FORMAT: JSON object with:
{
  "isValid": boolean,
  "errors": [{"type": "error_type", "message": "description", "line": number, "fixable": boolean}],
  "suggestions": ["improvement 1", "improvement 2"],
  "riskLevel": "low" | "medium" | "high"
}`,

  userPrompt: `VALIDATE THIS CODE:
{codeToValidate}

CONTEXT:
{context}

Check for syntax errors, undefined variables, logic issues, and potential bugs. Provide specific, actionable feedback.`,

  constraints: [
    'Always respond in JSON format',
    'Be specific about error locations',
    'Identify fixable vs non-fixable issues',
    'Focus on production-readiness',
    'Check for security vulnerabilities'
  ]
};

// Generate structured prompt based on template
export function generatePrompt(
  template: PromptTemplate,
  variables: Record<string, any>
): { system: string; user: string } {
  
  let userPrompt = template.userPrompt;
  
  // Replace variables in user prompt
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    const replacement = typeof value === 'object' 
      ? JSON.stringify(value, null, 2)
      : String(value);
    userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), replacement);
  });

  return {
    system: template.systemRole,
    user: userPrompt
  };
}

// Specific prompt generators for each agent
export function generatePlannerPrompt(
  userRequest: string,
  context: any
): { system: string; user: string } {
  
  return generatePrompt(PLANNER_TEMPLATE, {
    userRequest,
    relevantContext: JSON.stringify(context.relevantFiles, null, 2),
    constraints: context.constraints.join('\n- ')
  });
}

export function generateBuilderPrompt(
  plannerOutput: any,
  context: any
): { system: string; user: string } {
  
  return generatePrompt(BUILDER_TEMPLATE, {
    plannerOutput: JSON.stringify(plannerOutput, null, 2),
    buildInstructions: plannerOutput.buildInstructions || 'Follow the implementation plan',
    constraints: context.constraints.join('\n- '),
    relevantFiles: JSON.stringify(context.relevantFiles, null, 2),
    codePatterns: context.patterns.join('\n')
  });
}

export function generateValidatorPrompt(
  codeToValidate: string,
  context: any
): { system: string; user: string } {
  
  return generatePrompt(VALIDATOR_TEMPLATE, {
    codeToValidate,
    context: JSON.stringify(context, null, 2)
  });
}

// Error recovery prompts
export const ERROR_RECOVERY_TEMPLATE: PromptTemplate = {
  systemRole: `You are an ERROR RECOVERY SPECIALIST. You fix broken code based on specific error reports.

RECOVERY PROCESS:
1. Analyze the specific errors reported
2. Identify the root cause of each issue
3. Apply targeted fixes without changing unrelated code
4. Validate that fixes don't introduce new issues

COMMON FIX PATTERNS:
- Template literals: 'url/\${param}' → \`url/\${param}\`
- Undefined variables: Add proper state or prop definitions
- Missing imports: Add necessary import statements
- Logic errors: Fix conditional statements and data flow`,

  userPrompt: `FIX THESE ERRORS:
{errorReport}

ORIGINAL CODE:
{originalCode}

CONTEXT:
{context}

Apply minimal, targeted fixes. Don't change working parts of the code.`,

  constraints: [
    'Make minimal changes to fix errors',
    'Don\'t modify working code',
    'Add missing imports and variables',
    'Fix syntax and logic errors',
    'Preserve original functionality'
  ]
};

export function generateErrorRecoveryPrompt(
  originalCode: string,
  errorReport: any,
  context: any
): { system: string; user: string } {
  
  return generatePrompt(ERROR_RECOVERY_TEMPLATE, {
    originalCode,
    errorReport: JSON.stringify(errorReport, null, 2),
    context: JSON.stringify(context, null, 2)
  });
}