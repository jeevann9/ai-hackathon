import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const models = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
];

async function generateWithFallback(prompt: string) {
  let lastError: unknown;

  for (const model of models) {
    console.log(`Trying model: ${model}`);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        return response;
      } catch (error) {
        lastError = error;

        console.log(
          `${model} failed on attempt ${attempt}:`,
          error
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 1500 * attempt)
        );
      }
    }
  }

  throw lastError;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      role,
      difficulty,
      topic,
      question,
      answer,
    } = body;

    if (
      !role ||
      !difficulty ||
      !topic ||
      !question ||
      !answer?.trim()
    ) { 
      return Response.json(
        {
          error: "Interview question and answer are required",
        },
        { status: 400 }
      );
    }

    const prompt = `
You are an expert technical interviewer evaluating a student's answer.

IMPORTANT:
You must evaluate the student's answer ONLY against the EXACT interview question provided below.

Interview Details:
Job Role: ${role}
Difficulty: ${difficulty}
Topic: ${topic}

EXACT INTERVIEW QUESTION:
${question}

STUDENT'S ANSWER:
${answer}

Evaluation rules:

1. First understand the exact requirement of the interview question.
2. Evaluate ONLY whether the student's answer addresses that exact question.
3. Do NOT assume the question asked about another topic, design pattern,
   programming language, architecture, or concept.
4. Do NOT use information from previous questions.
5. Do NOT invent requirements that are not present in the question.
6. If the student answered a different question, clearly mention that.
7. If the student's answer is partially relevant, give credit for the
   relevant parts but reduce completeness appropriately.
8. Judge technical correctness based specifically on the provided question.
9. Consider code examples when evaluating technical accuracy.
10. Be fair and do not unnecessarily penalize the student.

Return ONLY valid JSON in exactly this structure:

{
  "score": 0,
  "technicalAccuracy": 0,
  "clarity": 0,
  "completeness": 0,
  "strengths": [],
  "weaknesses": [],
  "feedback": "",
  "improvedAnswer": ""
}

Scoring:

- score must be between 0 and 10.
- technicalAccuracy must be between 0 and 10.
- clarity must be between 0 and 10.
- completeness must be between 0 and 10.
- strengths must contain 2 or 3 specific points.
- weaknesses must contain 2 or 3 specific points.
- feedback should explain the evaluation in simple language.
- improvedAnswer should directly answer the EXACT interview question.
- Do not evaluate against any question other than the one provided above.
- Do not include markdown.
- Return valid JSON only.
`;

    const response = await generateWithFallback(prompt);

    const text = response.text?.trim();

    if (!text) {
      throw new Error("AI returned an empty response");
    }

    // Remove markdown code fences if Gemini adds them
    const cleanedText = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const evaluation = JSON.parse(cleanedText);

    return Response.json({
      evaluation,
    });

  } catch (error) {
    console.error("EVALUATION AI ERROR:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to evaluate answer",
      },
      { status: 500 }
    );
  }
}