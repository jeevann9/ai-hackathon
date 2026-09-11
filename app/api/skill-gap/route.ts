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

    const { resume, jobDescription } = body;

    if (!resume?.trim() || !jobDescription?.trim()) {
      return Response.json(
        {
          error: "Resume and job description are required",
        },
        { status: 400 }
      );
    }

    const prompt = `
You are an expert career advisor and technical recruiter.

Analyze the student's resume against the provided job description.

IMPORTANT:
- Evaluate ONLY the information present in the resume.
- Do not assume the student knows a skill that is not mentioned.
- Do not invent experience, projects, certifications, or skills.
- Compare the student's actual skills with the requirements of the job.
- Be realistic and helpful for a college student.
- Focus especially on technical skills, projects, tools, programming languages,
  frameworks, databases, cloud technologies, and important concepts.

STUDENT RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Return ONLY valid JSON in exactly this structure:

{
  "matchPercentage": 0,
  "summary": "",
  "strongSkills": [],
  "partialSkills": [],
  "missingSkills": [],
  "recommendedTopics": [],
  "learningRoadmap": [
    {
      "week": 1,
      "focus": "",
      "topics": [],
      "task": ""
    },
    {
      "week": 2,
      "focus": "",
      "topics": [],
      "task": ""
    },
    {
      "week": 3,
      "focus": "",
      "topics": [],
      "task": ""
    },
    {
      "week": 4,
      "focus": "",
      "topics": [],
      "task": ""
    }
  ]
}

Rules:

- matchPercentage must be between 0 and 100.
- strongSkills should contain skills clearly demonstrated in the resume
  and relevant to the job.
- partialSkills should contain skills where the resume shows some evidence
  but the job requires more depth.
- missingSkills should contain important job requirements not demonstrated
  in the resume.
- recommendedTopics should contain 4 to 8 useful learning topics.
- summary should explain the candidate's current position in simple language.
- The learning roadmap must be practical for a college student.
- Do not recommend skills that are unrelated to the job description.
- Each roadmap week must contain a focus, topics, and a practical task.
- Return valid JSON only.
`;

    const response = await generateWithFallback(prompt);

    const text = response.text?.trim();

    if (!text) {
      throw new Error("AI returned an empty response");
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
    console.error("SKILL GAP AI ERROR:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze skill gap",
      },
      { status: 500 }
    );
  }
}