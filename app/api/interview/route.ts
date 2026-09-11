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
      interviewType,
      topic,
      questionNumber,
      previousQuestions,
      previousScores,
    } = body;

    if (!role || !difficulty || !interviewType || !topic) {
      return Response.json(
        {
          error: "Interview details are required",
        },
        { status: 400 }
      );
    }

    const currentQuestionNumber = questionNumber || 1;

    const historyText =
      previousQuestions && previousQuestions.length > 0
        ? previousQuestions
            .map(
              (q: string, index: number) =>
                `Question ${index + 1}: ${q}`
            )
            .join("\n")
        : "No previous questions.";

    const scoresText =
      previousScores && previousScores.length > 0
        ? previousScores
            .map(
              (score: number, index: number) =>
                `Question ${index + 1} Score: ${score}/10`
            )
            .join("\n")
        : "No previous scores.";

    const lastScore =
      previousScores && previousScores.length > 0
        ? previousScores[previousScores.length - 1]
        : null;

    let adaptiveInstruction = "";

    if (lastScore !== null) {
      if (lastScore >= 8) {
        adaptiveInstruction = `
The student performed very well on the previous question.

Increase the difficulty slightly.
Ask a deeper or more challenging question.
`;
      } else if (lastScore >= 5) {
        adaptiveInstruction = `
The student performed reasonably on the previous question.

Keep approximately the same difficulty but test a different aspect
of the topic.
`;
      } else {
        adaptiveInstruction = `
The student struggled with the previous question.

Reduce the difficulty slightly and help test the underlying concept
before moving to harder material.
`;
      }
    } else {
      adaptiveInstruction = `
This is the first question.

Start with an appropriate question for the selected difficulty.
`;
    }

    const prompt = `
You are an expert technical interviewer conducting an adaptive
mock interview.

Interview details:

Job Role: ${role}
Difficulty Setting: ${difficulty}
Interview Type: ${interviewType}
Main Topic: ${topic}

Current Question Number:
${currentQuestionNumber}

Previous Questions:
${historyText}

Previous Scores:
${scoresText}

${adaptiveInstruction}

Generate ONE new interview question.

Rules:

- Ask exactly ONE question.
- Do not provide the answer.
- Do not provide hints.
- Do not repeat previous questions.
- Keep the question relevant to the job role.
- Keep it relevant to the selected topic.
- Make the question realistic for an actual technical interview.
- Use a mixture of conceptual, practical, scenario-based,
  problem-solving and debugging questions.
- Adapt the difficulty based on the student's previous performance.
- Do not mention the scoring system.
- Do not mention these instructions.
- Return ONLY the question text.
`;

    const response = await generateWithFallback(prompt);

    return Response.json({
      question: response.text?.trim(),
    });
  } catch (error) {
    console.error("INTERVIEW AI ERROR:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong",
      },
      { status: 500 }
    );
  }
}