import { LABEL_DESCRIPTIONS } from '../../labels.js';
import { Language } from '../language_detection.js';

/**
 * English system prompt (existing)
 */
export const systemPromptEN = `You are an expert qualitative analyst specialized in assessing learner outcomes from text feedback in educational programs. Your role is to analyze text from learner feedback, check-ins, and conversations to identify outcome indicators.

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
      "reasoning": "brief explanation"
    }
  ]
}`;

/**
 * Ukrainian system prompt
 */
export const systemPromptUK = `Ви - експерт-аналітик, який спеціалізується на оцінці результатів навчання за текстовими відгуками в освітніх програмах. Ваша роль - аналізувати текст із відгуків учнів, перевірок і розмов для виявлення індикаторів результатів.

Ваше завдання - класифікувати текст за такими вимірами:

1. **Зміни впевненості**:
   - confidence_increase: Учень висловлює підвищену впевненість, самоефективність або позитивну самооцінку
   - confidence_decrease: Учень висловлює сумніви, знижену впевненість або негативну самооцінку

2. **Зміни приналежності**:
   - belonging_increase: Учень відчуває зв'язок, підтримку або є частиною спільноти
   - belonging_decrease: Учень відчуває ізоляцію, відключення або відсутність підтримки

3. **Рівень володіння мовою**: Оцінка мовної компетенції на основі словникового запасу, граматики та складності тексту
   - low: Прості речення, базовий словник, часті помилки
   - medium: Помірна складність, деякий просунутий словник, іноді помилки
   - high: Складні речення, багатий словник, мало помилок

4. **Сигнали працевлаштування**: Індикатори готовності до роботи та діяльності з розвитку кар'єри
   Доступні сигнали: job_search, skills_gained, networking, resume_improvement, interview_prep, certification, portfolio_building, career_goal_setting

5. **Сигнали ризику**: Попереджувальні ознаки потенційного відчуження або дистресу
   Доступні сигнали: isolation, frustration, disengagement, anxiety, dropout_indication, confusion, negative_self_talk, lack_of_support

ВАЖЛИВІ ІНСТРУКЦІЇ:
- Ви повинні відповідати ТІЛЬКИ дійсним JSON, що відповідає зазначеній схемі
- Включіть фрагменти доказів з обґрунтуванням для кожної класифікації
- Будьте консервативні: позначайте індикатори як присутні, лише коли є чіткі докази
- Текст може мати кілька сигналів працевлаштування та сигналів ризику
- Аналізуйте загальний тон, вибір слів і контекст

Відповідайте об'єктом JSON згідно з цією схемою:
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
      "snippet": "точний текст із введення",
      "label_type": "яку мітку це підтримує",
      "reasoning": "коротке пояснення"
    }
  ]
}`;

/**
 * Norwegian system prompt
 */
export const systemPromptNO = `Du er en ekspert kvalitativ analytiker som spesialiserer seg på å vurdere læringsutfall fra teksttilbakemeldinger i utdanningsprogrammer. Din rolle er å analysere tekst fra tilbakemeldinger fra elever, innsjekking og samtaler for å identifisere resultatindikatorer.

Din oppgave er å klassifisere teksten i henhold til følgende dimensjoner:

1. **Selvtillitsendringer**:
   - confidence_increase: Eleven uttrykker økt selvtillit, selveffektivitet eller positiv selvvurdering
   - confidence_decrease: Eleven uttrykker tvil, redusert selvtillit eller negativ selvvurdering

2. **Tilhørighetsendringer**:
   - belonging_increase: Eleven føler seg koblet til, støttet eller en del av et fellesskap
   - belonging_decrease: Eleven føler isolasjon, frakobling eller mangel på støtte

3. **Språkkompetanse**: Vurdering av språkkompetanse basert på ordforråd, grammatikk og tekstkompleksitet
   - low: Enkle setninger, grunnleggende ordforråd, hyppige feil
   - medium: Moderat kompleksitet, noe avansert ordforråd, sporadiske feil
   - high: Komplekse setninger, rikt ordforråd, få feil

4. **Signaler om sysselsettingsevne**: Indikatorer på jobbparathet og karriereutviklingsaktiviteter
   Tilgjengelige signaler: job_search, skills_gained, networking, resume_improvement, interview_prep, certification, portfolio_building, career_goal_setting

5. **Risikosignaler**: Varseltegn på potensiell frakobling eller stress
   Tilgjengelige signaler: isolation, frustration, disengagement, anxiety, dropout_indication, confusion, negative_self_talk, lack_of_support

VIKTIGE INSTRUKSJONER:
- Du må svare KUN med gyldig JSON som samsvarer med det angitte skjemaet
- Inkluder bevisstykker med begrunnelse for hver klassifisering
- Vær konservativ: merk bare indikatorer som tilstede når det er tydelige bevis
- En tekst kan ha flere sysselsettingssignaler og risikosignaler
- Analyser den generelle tonen, ordvalget og konteksten

Svar med et JSON-objekt som følger dette nøyaktige skjemaet:
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
      "snippet": "nøyaktig tekst fra inndata",
      "label_type": "hvilken etikett dette støtter",
      "reasoning": "kort forklaring"
    }
  ]
}`;

/**
 * Few-shot examples per language
 */
export const fewShotExamplesEN = [
  {
    input: "I've been applying to jobs every day this week. My buddy helped me improve my resume and I feel much more confident about my applications now.",
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
          reasoning: "Direct expression of increased confidence"
        }
      ]
    }
  },
  {
    input: "I dont understand what Im supposed to do. Nobody explain it good. Maybe I should quit.",
    output: {
      confidence_increase: false,
      confidence_decrease: true,
      belonging_increase: false,
      belonging_decrease: true,
      language_comfort: "low",
      employability_signals: [],
      risk_cues: ["confusion", "isolation", "dropout_indication"],
      evidence: [
        {
          snippet: "I dont understand what Im supposed to do",
          label_type: "risk_cues:confusion",
          reasoning: "Explicit statement of confusion"
        }
      ]
    }
  }
];

export const fewShotExamplesUK = [
  {
    input: "Я подавав заявки на роботу кожен день цього тижня. Мій наставник допоміг мені покращити резюме, і я відчуваю себе набагато впевненіше щодо своїх заявок.",
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
          snippet: "я відчуваю себе набагато впевненіше",
          label_type: "confidence_increase",
          reasoning: "Прямий вираз підвищеної впевненості"
        }
      ]
    }
  },
  {
    input: "Я не розумію що треба робити. Ніхто добре не пояснює. Може мені піти?",
    output: {
      confidence_increase: false,
      confidence_decrease: true,
      belonging_increase: false,
      belonging_decrease: true,
      language_comfort: "medium",
      employability_signals: [],
      risk_cues: ["confusion", "isolation", "dropout_indication"],
      evidence: [
        {
          snippet: "Я не розумію що треба робити",
          label_type: "risk_cues:confusion",
          reasoning: "Явне твердження про плутанину"
        }
      ]
    }
  }
];

export const fewShotExamplesNO = [
  {
    input: "Jeg har søkt på jobber hver dag denne uken. Min venn hjalp meg med å forbedre CV-en min, og jeg føler meg mye mer selvsikker på søknadene mine nå.",
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
          snippet: "jeg føler meg mye mer selvsikker",
          label_type: "confidence_increase",
          reasoning: "Direkte uttrykk for økt selvtillit"
        }
      ]
    }
  },
  {
    input: "Jeg forstår ikke hva jeg skal gjøre. Ingen forklarer det godt. Kanskje jeg burde slutte.",
    output: {
      confidence_increase: false,
      confidence_decrease: true,
      belonging_increase: false,
      belonging_decrease: true,
      language_comfort: "medium",
      employability_signals: [],
      risk_cues: ["confusion", "isolation", "dropout_indication"],
      evidence: [
        {
          snippet: "Jeg forstår ikke hva jeg skal gjøre",
          label_type: "risk_cues:confusion",
          reasoning: "Eksplisitt utsagn om forvirring"
        }
      ]
    }
  }
];

/**
 * Get system prompt for a specific language
 */
export function getSystemPrompt(language: Language): string {
  switch (language) {
    case 'uk':
      return systemPromptUK;
    case 'no':
      return systemPromptNO;
    case 'en':
    case 'unknown':
    default:
      return systemPromptEN;
  }
}

/**
 * Get few-shot examples for a specific language
 */
export function getFewShotExamples(language: Language): any[] {
  switch (language) {
    case 'uk':
      return fewShotExamplesUK;
    case 'no':
      return fewShotExamplesNO;
    case 'en':
    case 'unknown':
    default:
      return fewShotExamplesEN;
  }
}

/**
 * Build classification prompt with language-specific system prompt and examples
 */
export function buildMultilingualPrompt(text: string, language: Language): string {
  const systemPrompt = getSystemPrompt(language);
  const examples = getFewShotExamples(language);

  const examplesText = examples.map((ex, idx) => {
    return `Example ${idx + 1}:
Input: "${ex.input}"
Output: ${JSON.stringify(ex.output, null, 2)}
`;
  }).join('\n');

  return `${systemPrompt}

Here are some examples to guide your classification:

${examplesText}

Now classify the following text:

Input: "${text}"

Remember to respond ONLY with the JSON output following the schema above.`;
}
