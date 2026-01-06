import { LABEL_DESCRIPTIONS } from '../labels.js';

/**
 * System prompt for classification task
 */
export const SYSTEM_PROMPT = `You are an expert qualitative analyst specialized in assessing learner outcomes from text feedback in educational programs. Your role is to analyze text from learner feedback, check-ins, and conversations to identify outcome indicators.

Your task is to classify the text according to the following dimensions:

1. **Confidence Changes**:
   - confidence_increase: ${LABEL_DESCRIPTIONS.confidence_increase.description}
   - confidence_decrease: ${LABEL_DESCRIPTIONS.confidence_decrease.description}

2. **Belonging Changes**:
   - belonging_increase: ${LABEL_DESCRIPTIONS.belonging_increase.description}
   - belonging_decrease: ${LABEL_DESCRIPTIONS.belonging_decrease.description}

3. **Language Comfort**: ${LABEL_DESCRIPTIONS.language_comfort.description}
   - low: ${LABEL_DESCRIPTIONS.language_comfort.indicators.low}
   - medium: ${LABEL_DESCRIPTIONS.language_comfort.indicators.medium}
   - high: ${LABEL_DESCRIPTIONS.language_comfort.indicators.high}

4. **Employability Signals**: ${LABEL_DESCRIPTIONS.employability_signals.description}
   Available signals: ${Object.keys(LABEL_DESCRIPTIONS.employability_signals.types).join(', ')}

5. **Risk Cues**: ${LABEL_DESCRIPTIONS.risk_cues.description}
   Available cues: ${Object.keys(LABEL_DESCRIPTIONS.risk_cues.types).join(', ')}

IMPORTANT INSTRUCTIONS:
- You must respond ONLY with valid JSON matching the specified schema
- Include evidence snippets with reasoning for each classification
- Be conservative: only mark indicators as present when there is clear evidence
- A text can have multiple employability signals and risk cues
- Analyze the overall tone, word choice, and context
- Consider cultural and linguistic diversity in expressions

Respond with a JSON object following this exact schema:
{
  "confidence_increase": boolean,
  "confidence_decrease": boolean,
  "belonging_increase": boolean,
  "belonging_decrease": boolean,
  "language_comfort": "low" | "medium" | "high",
  "employability_signals": string[],
  "risk_cues": string[],
  "evidence": [
    {
      "snippet": "exact text from input",
      "label_type": "which label this supports",
      "reasoning": "brief explanation",
      "position_start": number (optional),
      "position_end": number (optional)
    }
  ]
}`;

/**
 * Few-shot examples for better classification
 */
export const FEW_SHOT_EXAMPLES = [
  {
    input: "I've been applying to jobs every day this week. My buddy helped me improve my resume and I feel much more confident about my applications now. I even got a call back from two companies!",
    output: {
      confidence_increase: true,
      confidence_decrease: false,
      belonging_increase: true,
      belonging_decrease: false,
      language_comfort: "high",
      employability_signals: ["job_search", "resume_improvement", "networking"],
      risk_cues: [],
      evidence: [
        {
          snippet: "I feel much more confident about my applications now",
          label_type: "confidence_increase",
          reasoning: "Direct expression of increased confidence in job application abilities"
        },
        {
          snippet: "My buddy helped me improve my resume",
          label_type: "belonging_increase",
          reasoning: "Positive acknowledgment of peer support and connection"
        },
        {
          snippet: "I've been applying to jobs every day",
          label_type: "employability_signals:job_search",
          reasoning: "Active job seeking behavior"
        },
        {
          snippet: "helped me improve my resume",
          label_type: "employability_signals:resume_improvement",
          reasoning: "Working on application materials"
        }
      ]
    }
  },
  {
    input: "I dont understand what Im supposed to do. Nobody explain it good. I feel like Im behind everyone and maybe I should quit.",
    output: {
      confidence_increase: false,
      confidence_decrease: true,
      belonging_increase: false,
      belonging_decrease: true,
      language_comfort: "low",
      employability_signals: [],
      risk_cues: ["confusion", "isolation", "dropout_indication", "negative_self_talk"],
      evidence: [
        {
          snippet: "I dont understand what Im supposed to do",
          label_type: "risk_cues:confusion",
          reasoning: "Explicit statement of lack of understanding and direction"
        },
        {
          snippet: "Nobody explain it good",
          label_type: "risk_cues:lack_of_support",
          reasoning: "Perception of insufficient help or explanation"
        },
        {
          snippet: "I feel like Im behind everyone",
          label_type: "confidence_decrease",
          reasoning: "Negative comparison to peers indicating self-doubt"
        },
        {
          snippet: "maybe I should quit",
          label_type: "risk_cues:dropout_indication",
          reasoning: "Explicit consideration of leaving the program"
        }
      ]
    }
  },
  {
    input: "The networking event was great. I connected with professionals in my field and learned about different career paths. I'm taking notes on what skills I need to develop next.",
    output: {
      confidence_increase: true,
      confidence_decrease: false,
      belonging_increase: true,
      belonging_decrease: false,
      language_comfort: "high",
      employability_signals: ["networking", "career_goal_setting", "skills_gained"],
      risk_cues: [],
      evidence: [
        {
          snippet: "I connected with professionals in my field",
          label_type: "employability_signals:networking",
          reasoning: "Active professional networking behavior"
        },
        {
          snippet: "learned about different career paths",
          label_type: "employability_signals:career_goal_setting",
          reasoning: "Exploring and planning career direction"
        },
        {
          snippet: "what skills I need to develop next",
          label_type: "employability_signals:skills_gained",
          reasoning: "Proactive identification of skills development needs"
        }
      ]
    }
  },
  {
    input: "Everything is hard. I try but nothing work. Feel alone.",
    output: {
      confidence_increase: false,
      confidence_decrease: true,
      belonging_increase: false,
      belonging_decrease: true,
      language_comfort: "low",
      employability_signals: [],
      risk_cues: ["frustration", "isolation", "negative_self_talk"],
      evidence: [
        {
          snippet: "Everything is hard",
          label_type: "risk_cues:frustration",
          reasoning: "Expression of difficulty and struggle"
        },
        {
          snippet: "I try but nothing work",
          label_type: "confidence_decrease",
          reasoning: "Perceived lack of efficacy despite effort"
        },
        {
          snippet: "Feel alone",
          label_type: "risk_cues:isolation",
          reasoning: "Direct statement of social isolation"
        }
      ]
    }
  }
];

/**
 * Build the classification prompt with few-shot examples
 */
export function buildClassificationPrompt(text: string): string {
  const examples = FEW_SHOT_EXAMPLES.map((ex, idx) => {
    return `Example ${idx + 1}:
Input: "${ex.input}"
Output: ${JSON.stringify(ex.output, null, 2)}
`;
  }).join('\n');

  return `${SYSTEM_PROMPT}

Here are some examples to guide your classification:

${examples}

Now classify the following text:

Input: "${text}"

Remember to respond ONLY with the JSON output following the schema above.`;
}

/**
 * Extract JSON from provider response
 * Handles cases where providers wrap JSON in markdown or include extra text
 */
export function extractJSON(response: string): string {
  // Try to find JSON in code blocks first
  const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  // Try to find raw JSON object
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  // If no JSON found, return the original response and let parser fail
  return response;
}
