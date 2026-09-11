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
    console.log(`Trying final analysis model: ${model}`);

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
      interviewType,
      topic,
      scores,
      evaluations,
    } = body;

    if (!scores || !evaluations || evaluations.length === 0) {
      return Response.json(
        {
          error: "Interview evaluation data is required",
        },
        { status: 400 }
      );
    }

    const prompt = `
You are an expert technical interview coach.

Analyze the student's complete mock interview performance.

Interview Details:
Job Role: ${role}
Initial Difficulty: ${difficulty}
Interview Type: ${interviewType}
Main Topic: ${topic}

Question Scores:
${JSON.stringify(scores)}

Individual Evaluations:
${JSON.stringify(evaluations)}

Based on the complete interview, provide a useful and realistic final assessment.

Return ONLY valid JSON in exactly this structure:

{
  "overallScore": 0,
  "readiness": "",
  "summary": "",
  "strongestSkills": [],
  "areasToImprove": [],
  "recommendedTopics": [],
  "sevenDayPlan": [
    {
      "day": 1,
      "focus": "",
      "task": ""
    },
    {
      "day": 2,
      "focus": "",
      "task": ""
    },
    {
      "day": 3,
      "focus": "",
      "task": ""
    },
    {
      "day": 4,
      "focus": "",
      "task": ""
    },
    {
      "day": 5,
      "focus": "",
      "task": ""
    },
    {
      "day": 6,
      "focus": "",
      "task": ""
    },
    {
      "day": 7,
      "focus": "",
      "task": ""
    }
  ]
}

Rules:

- overallScore must be between 0 and 10.
- readiness must be exactly one of:
  "Beginner"
  "Developing"
  "Interview Ready"
  "Strong Candidate"

- summary should be 2 to 4 sentences.
- strongestSkills should contain 2 to 4 specific skills.
- areasToImprove should contain 2 to 4 specific areas.
- recommendedTopics should contain 3 to 5 useful topics.
- The 7-day plan must be personalized based on the weaknesses.
- Each day must have one focus and one practical task.
- Do not give generic motivational statements.
- Be honest but encouraging.
- Return valid JSON only.
`;

    const response = await generateWithFallback(prompt);

    const text = response.text?.trim();

    if (!text) {
      throw new Error("AI returned an empty final analysis");
    }

    const cleanedText = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const analysis = JSON.parse(cleanedText);

    return Response.json({
      analysis,
    });
  } catch (error) {
    console.error("FINAL ANALYSIS ERROR:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate final analysis",
      },
      { status: 500 }
    );
  }
}