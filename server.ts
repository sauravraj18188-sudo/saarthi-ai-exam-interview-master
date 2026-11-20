import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const portArgIdx = process.argv.indexOf('--port');
const cliPort = portArgIdx !== -1 ? Number(process.argv[portArgIdx + 1]) : NaN;
const PORT = Number.isFinite(cliPort) && cliPort > 0 ? cliPort : Number(process.env.PORT || 3000);

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getLanguageInstruction(language: string): string {
  switch (language) {
    case 'Hindi':
      return 'Strictly write ALL text, questions, options, explanations, feedback, notes, and flashcards in clear, natural Devanagari Hindi (हिंदी). Standard technical/exam terms may appear in brackets if helpful.';
    case 'Hinglish':
      return 'Strictly write ALL text, questions, options, explanations, feedback, notes, and flashcards in natural Indian Hinglish (conversational Hindi written in Roman/Latin script mixed smoothly with standard English exam and technical terms, e.g., "Is question ka sahi answer Article 356 hai kyunki..."). Do NOT use Devanagari script.';
    default:
      return 'Strictly write ALL text, questions, options, explanations, feedback, notes, and flashcards in crisp, clear Indian competitive-exam English.';
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Do not retry auth or bad request errors
      if (
        msg.includes('API_KEY_INVALID') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('400') ||
        msg.includes('403') ||
        msg.includes('not configured')
      ) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 700 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

function handleApiError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected AI service error';
  console.error('[Saarthi AI API Error]:', message);

  if (message.includes('GEMINI_API_KEY') || message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')) {
    return res.status(403).json({
      error: 'Gemini API key is missing or invalid. Please configure GEMINI_API_KEY in Settings > Secrets.',
    });
  }
  if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
    return res.status(429).json({
      error: 'AI request quota temporarily reached. Please wait a moment and retry.',
    });
  }
  return res.status(500).json({
    error: `Unable to generate response right now. ${message}`,
  });
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', app: 'Saarthi AI' });
  });

  // 1. Generate Adaptive Mock Quiz
  app.post('/api/quiz/generate', async (req: Request, res: Response) => {
    try {
      const {
        examName = 'SSC CGL',
        topic = 'Indian Polity & General Knowledge',
        gradeLevel = '',
        count = 5,
        difficulty = 'Moderate',
        language = 'English',
        isDailySprint = false,
      } = req.body ?? {};

      const safeCount = Math.min(Math.max(Number(count) || 5, 1), 20);
      const ai = getAIClient();
      const langInstruction = getLanguageInstruction(language);

      const gradeContext = gradeLevel
        ? `Target Student Grade: ${gradeLevel} (Strictly calibrate vocabulary, syllabus concepts, and mathematical/scientific depth to ${gradeLevel} NCERT/CBSE & Olympiad standards — e.g., simple age-appropriate arithmetic/reasoning for Classes 1-5, middle-school concepts for Classes 6-8, board/NTSE/Olympiad level for Classes 9-10, and senior secondary/JEE-NEET-Board foundation for Classes 11-12).`
        : '';

      const olympiadContext =
        /hindustan|sof|imo|nso|ieo|igko|icso|olympiad/i.test(examName)
          ? 'Follow authentic Indian school Olympiad question patterns (Logical Reasoning, Everyday Maths/Science, Achievers / HOTS section style).'
          : '';

      const prompt = isDailySprint
        ? `Generate a 5-question "Daily 5-Minute Current Affairs & GK Sprint" quiz tailored for Indian competitive exam aspirants (UPSC, BPSC, SSC CGL, Banking, Railways). Include a balanced mix of Current Affairs / National Schemes, Indian Polity, Economy, General Science, and History. Difficulty: Moderate exam level. ${langInstruction}`
        : `Generate exactly ${safeCount} high-yield multiple-choice questions for the "${examName}" exam on the topic "${topic}". ${gradeContext} ${olympiadContext} Difficulty level: "${difficulty}".
Each question must match authentic Indian exam standards (accurate facts, realistic distractors, no duplicate options, exactly 4 options A/B/C/D without "A." prefix in option text).
Include a concise, crystal-clear "explanation" explaining why the correct answer is right and why key distractors are wrong.
${langInstruction}`;

      const result = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction:
              'You are a senior Indian exam & Olympiad question-setter for UPSC, BPSC, SSC CGL, Banking, Hindustan Olympiad, SOF Olympiads (IMO, NSO, IEO, IGKO, ICSO), and NCERT/CBSE Classes 1 to 12. Always output strictly valid JSON matching the schema. Double-check factual accuracy, age-appropriate level, dates, formulas, and calculations.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                quizTitle: { type: Type.STRING, description: 'Concise title for this mock quiz.' },
                examTag: { type: Type.STRING, description: 'Target exam name.' },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      subject: { type: Type.STRING, description: 'Short subject name like Polity, History, Quant, Reasoning, Science, Economy, Current Affairs.' },
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Exactly 4 distinct answer choices.',
                      },
                      correctIndex: {
                        type: Type.INTEGER,
                        description: '0-based index (0, 1, 2, or 3) of the correct option.',
                      },
                      explanation: {
                        type: Type.STRING,
                        description: 'Clear 2-3 sentence explanation of why this option is correct.',
                      },
                    },
                    required: ['id', 'subject', 'question', 'options', 'correctIndex', 'explanation'],
                  },
                },
              },
              required: ['quizTitle', 'examTag', 'questions'],
            },
          },
        });
        return JSON.parse((response.text ?? '{}').trim());
      });

      if (!Array.isArray(result.questions) || result.questions.length === 0) {
        throw new Error('Quiz generation returned no questions.');
      }

      // Normalize options to exactly 4 and valid index
      result.questions = result.questions.slice(0, safeCount).map((q: any, idx: number) => ({
        id: String(q.id || `q-${idx + 1}`),
        subject: String(q.subject || topic || 'General'),
        question: String(q.question || ''),
        options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: Math.min(Math.max(Number(q.correctIndex) || 0, 0), 3),
        explanation: String(q.explanation || ''),
      }));

      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // 2. Generate Memory Trick / Mnemonic
  app.post('/api/quiz/memory-trick', async (req: Request, res: Response) => {
    try {
      const { question, correctAnswer, explanation, examName = 'Competitive Exam', language = 'English' } = req.body ?? {};
      if (!question || !correctAnswer) {
        return res.status(400).json({ error: 'Question and correctAnswer are required.' });
      }

      const ai = getAIClient();
      const langInstruction = getLanguageInstruction(language);

      const result = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Create a memorable, exam-hall ready memory trick, mnemonic, or quantitative shortcut for an Indian ${examName} aspirant.
Question: ${question}
Correct Answer: ${correctAnswer}
Context: ${explanation || ''}
${langInstruction}`,
          config: {
            systemInstruction:
              'You are a top Indian exam coach famous for clever mnemonics, acronyms, story hooks, and 10-second math shortcuts.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mnemonicTitle: { type: Type.STRING, description: 'Short catchy 3-6 word title for the trick.' },
                trick: { type: Type.STRING, description: 'Memorable mnemonic, acronym, or shortcut explanation.' },
                quickFormulaOrFact: { type: Type.STRING, description: '1-line high-yield takeaway to remember in the exam hall.' },
              },
              required: ['mnemonicTitle', 'trick', 'quickFormulaOrFact'],
            },
          },
        });
        return JSON.parse((response.text ?? '{}').trim());
      });

      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // 3. Start AI Mock Interview
  app.post('/api/interview/start', async (req: Request, res: Response) => {
    try {
      const {
        jobRole = 'Software Engineer',
        departmentType = 'IT Startup',
        experience = 'Fresher',
        strictness = 'Friendly Mentor',
        language = 'English',
      } = req.body ?? {};

      const ai = getAIClient();
      const langInstruction = getLanguageInstruction(language);

      const result = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Start a structured 5-round mock interview.
Target Role: ${jobRole}
Organization / Department Type: ${departmentType}
Candidate Experience: ${experience}
Interviewer Persona: ${strictness}
Introduce yourself briefly, clearly state that this interview consists of 5 rounds, and ask Round 1 (Question 1).
${langInstruction}`,
          config: {
            systemInstruction:
              'You are an experienced Indian interview panelist conducting realistic PSU, UPSC/State PCS board, Banking, or Corporate interviews. Keep the greeting concise and realistic.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                interviewerName: { type: Type.STRING },
                interviewerRole: { type: Type.STRING },
                greeting: { type: Type.STRING, description: 'Brief intro mentioning 5 rounds total.' },
                questionNumber: { type: Type.INTEGER },
                question: { type: Type.STRING, description: 'Round 1 interview question.' },
                focusCompetency: { type: Type.STRING, description: 'Skill or trait being tested (e.g., Role Clarity, Fundamentals, Situational Judgment).' },
              },
              required: ['interviewerName', 'interviewerRole', 'greeting', 'questionNumber', 'question', 'focusCompetency'],
            },
          },
        });
        return JSON.parse((response.text ?? '{}').trim());
      });

      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // 4. Evaluate Interview Answer + Next Question or Final Dossier
  app.post('/api/interview/evaluate', async (req: Request, res: Response) => {
    try {
      const {
        jobRole,
        departmentType,
        experience,
        strictness,
        language = 'English',
        history = [],
        currentQuestion,
        userAnswer,
        currentRound = 1,
        totalRounds = 5,
      } = req.body ?? {};

      if (!currentQuestion || !userAnswer) {
        return res.status(400).json({ error: 'Question and candidate answer are required.' });
      }

      const ai = getAIClient();
      const langInstruction = getLanguageInstruction(language);
      const isFinalRound = Number(currentRound) >= Number(totalRounds);

      const transcriptSummary = Array.isArray(history)
        ? history.map((h: any, i: number) => `Round ${i + 1} Q: ${h.question}\nA: ${h.answer}\nScore: ${h.score}/10`).join('\n---\n')
        : '';

      const prompt = `Evaluate the candidate's answer for Round ${currentRound} of ${totalRounds}.
Target Role: ${jobRole} | Organization: ${departmentType} | Experience: ${experience} | Panelist Strictness: ${strictness}

Previous Rounds:
${transcriptSummary || 'None'}

Current Question (Round ${currentRound}): ${currentQuestion}
Candidate's Answer: ${userAnswer}

Provide:
1. A fair, honest score from 1 to 10 calibrated to "${strictness}".
2. Communication & Structure feedback (clarity, confidence, STAR method or logical framing).
3. Red Flags / Improvements (specific gaps, vague statements, or missing technical/domain depth).
4. Model 10/10 Answer showing exactly how a top selected candidate would answer this same question.
${
  isFinalRound
    ? 'Since this was the final round (Round 5 of 5), also generate the complete "Selection Readiness Report" (finalDossier) with a verdict ("Strong-Hire", "Hire", "Hold / Borderline", or "Needs-Practice"), overallScore (0-100), executive summary, and top 3 concrete focus areas with action steps. Set hasNextQuestion to false and leave nextQuestion fields empty.'
    : `Also generate Question ${Number(currentRound) + 1} of ${totalRounds} probing a complementary competency (role depth, situational ethics/pressure, problem-solving, or domain current affairs). Set hasNextQuestion to true and isComplete to false.`
}
${langInstruction}`;

      const result = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction:
              'You are a strict yet constructive Indian interview evaluator (UPSC board / PSU panel / senior engineering manager). Always output valid JSON matching the schema.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                rubric: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER, description: 'Score between 1 and 10.' },
                    communicationAndStructure: { type: Type.STRING },
                    redFlagsOrImprovements: { type: Type.STRING },
                    modelAnswer: { type: Type.STRING },
                  },
                  required: ['score', 'communicationAndStructure', 'redFlagsOrImprovements', 'modelAnswer'],
                },
                hasNextQuestion: { type: Type.BOOLEAN },
                nextQuestion: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: { type: Type.INTEGER },
                    question: { type: Type.STRING },
                    focusCompetency: { type: Type.STRING },
                  },
                  required: ['questionNumber', 'question', 'focusCompetency'],
                },
                isComplete: { type: Type.BOOLEAN },
                finalDossier: {
                  type: Type.OBJECT,
                  properties: {
                    verdict: {
                      type: Type.STRING,
                      description: 'Must be one of: Strong-Hire, Hire, Hold / Borderline, Needs-Practice',
                    },
                    overallScore: { type: Type.INTEGER, description: '0 to 100 readiness score.' },
                    summary: { type: Type.STRING },
                    topFocusAreas: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          area: { type: Type.STRING },
                          actionStep: { type: Type.STRING },
                        },
                        required: ['area', 'actionStep'],
                      },
                    },
                  },
                  required: ['verdict', 'overallScore', 'summary', 'topFocusAreas'],
                },
              },
              required: ['rubric', 'hasNextQuestion', 'nextQuestion', 'isComplete', 'finalDossier'],
            },
          },
        });
        return JSON.parse((response.text ?? '{}').trim());
      });

      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // 5. Generate AI Notes, Flashcards & Probable Questions
  app.post('/api/notes/generate', async (req: Request, res: Response) => {
    try {
      const { inputMode = 'topic', content = '', language = 'English', gradeLevel = '' } = req.body ?? {};
      if (!content || String(content).trim().length < 2) {
        return res.status(400).json({ error: 'Please provide a topic or study text to summarize.' });
      }

      const ai = getAIClient();
      const langInstruction = getLanguageInstruction(language);
      const levelNote = gradeLevel
        ? `Target Class / Level: ${gradeLevel} (tailor depth, terminology, and examples cleanly for ${gradeLevel} students, including NCERT/SOF/Hindustan Olympiad points where relevant).`
        : 'Tailor depth for Indian competitive exams (UPSC/State PCS/SSC/Banking) and Olympiad/Board learners.';

      const prompt =
        inputMode === 'text'
          ? `Analyze and distill the following pasted study passage/article into high-yield revision material. ${levelNote}\n"""\n${String(content).slice(0, 12000)}\n"""\n`
          : `Create comprehensive, exam-focused revision material on the topic: "${String(content).trim()}". ${levelNote}\n`;

      const fullPrompt = `${prompt}
Produce:
1. "bulletNotes": 3 to 5 structured sections with crisp headings and bullet points highlighting key facts, dates, constitutional articles, committees, or formulas.
2. "flashcards": 6 to 8 interactive flip-cards with a sharp Question/Term on "front" and concise Answer/Definition on "back".
3. "probableQuestions": Exactly 5 most probable exam questions with detailed model answers and short examRelevance note (e.g. "UPSC Prelims Pattern", "SSC Tier-II High Yield").
${langInstruction}`;

      const result = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: fullPrompt,
          config: {
            systemInstruction:
              'You are an elite Indian exam mentor creating ultra-crisp, high-retention study notes, flashcards, and probable exam questions.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subjectTag: { type: Type.STRING },
                bulletNotes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      heading: { type: Type.STRING },
                      points: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                    required: ['heading', 'points'],
                  },
                },
                flashcards: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      front: { type: Type.STRING },
                      back: { type: Type.STRING },
                    },
                    required: ['front', 'back'],
                  },
                },
                probableQuestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      answer: { type: Type.STRING },
                      examRelevance: { type: Type.STRING },
                    },
                    required: ['question', 'answer', 'examRelevance'],
                  },
                },
              },
              required: ['title', 'subjectTag', 'bulletNotes', 'flashcards', 'probableQuestions'],
            },
          },
        });
        return JSON.parse((response.text ?? '{}').trim());
      });

      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Vite middleware for dev or static serving in production
  if (process.env.NODE_ENV !== 'production') {
    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
if ("document" in globalThis) {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
const cspNonce = "document" in globalThis ? document.querySelector("meta[property=csp-nonce]")?.nonce : undefined;
let lastInsertedStyle;
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (cspNonce) style.setAttribute("nonce", cspNonce);
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = undefined; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement("afterend", style);
    }
    lastInsertedStyle = style;
  } else {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return pathname + "?" + queryToInject + (search ? "&" + search.slice(1) : "") + (hash || "");
}
export class ErrorOverlay extends HTMLElement {}
`);
    });
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Saarthi AI server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
