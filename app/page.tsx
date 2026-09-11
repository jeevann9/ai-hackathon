"use client";

import { useState } from "react";
import InterviewMedia from "@/components/InterviewMedia";

type Evaluation = {
  score: number;
  technicalAccuracy: number;
  clarity: number;
  completeness: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  improvedAnswer: string;
};

type FinalAnalysis = {
  overallScore: number;
  readiness: string;
  summary: string;
  strongestSkills: string[];
  areasToImprove: string[];
  recommendedTopics: string[];
  sevenDayPlan: {
    day: number;
    focus: string;
    task: string;
  }[];
};

export default function Home() {
  const [role, setRole] = useState("Software Developer");
  const [difficulty, setDifficulty] = useState("Medium");
  const [interviewType, setInterviewType] = useState("Technical");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [finalAnalysis, setFinalAnalysis] = useState<FinalAnalysis | null>(null);

  const [generatingFinalAnalysis, setGeneratingFinalAnalysis] = useState(false);
  const [topic, setTopic] = useState("Data Structures");

  const [starting, setStarting] = useState(false);
  const [question, setQuestion] = useState("");

  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const [questionNumber, setQuestionNumber] = useState(0);
  
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);

  const [scores, setScores] = useState<number[]>([]);

  const TOTAL_QUESTIONS = 5;

  async function getQuestion(
    currentQuestionNumber: number,
    questionsHistory: string[],
    scoreHistory: number[]
  ) {
    setStarting(true);

    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          difficulty,
          interviewType,
          topic,
          questionNumber: currentQuestionNumber,
          previousQuestions: questionsHistory,
          previousScores: scoreHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to generate question"
        );
      }

      setQuestion(data.question);

      setPreviousQuestions((previous) => [
        ...previous,
        data.question,
      ]);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setStarting(false);
    }
  }
    
  async function startInterview() {
    setQuestionNumber(1);
    setScores([]);
    setEvaluations([]);
    setPreviousQuestions([]);
    setEvaluation(null);
    setFinalAnalysis(null);
    setAnswer("");

    await getQuestion(1, [], []);
  }

  async function submitAnswer() {
    if (!answer.trim()) {
      alert("Please enter your answer first.");
      return;
    }

    setEvaluating(true);

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          difficulty,
          topic,
          question,
          answer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to evaluate answer"
        );
      }

setEvaluation(data.evaluation);

const newEvaluation = data.evaluation as Evaluation;

const newScore = Number(newEvaluation.score);

setEvaluations((previousEvaluations) => [
  ...previousEvaluations,
  newEvaluation,
]);

setScores((previousScores) => [
  ...previousScores,
  newScore,
]);
if (questionNumber === TOTAL_QUESTIONS) {
  setGeneratingFinalAnalysis(true);

  try {
    const completedScores = [
      ...scores,
      newScore,
    ];

    const completedEvaluations = [
      ...evaluations,
      newEvaluation,
    ];

    const finalResponse = await fetch(
      "/api/final-analysis",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          difficulty,
          interviewType,
          topic,
          scores: completedScores,
          evaluations: completedEvaluations,
        }),
      }
    );

    const finalData = await finalResponse.json();

    if (!finalResponse.ok) {
      throw new Error(
        finalData.error || "Failed to generate final analysis"
      );
    }

    setFinalAnalysis(finalData.analysis);
  } catch (error) {
    console.error("FINAL ANALYSIS ERROR:", error);
  } finally {
    setGeneratingFinalAnalysis(false);
  }
}
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setEvaluating(false);
    }
  }

  async function nextQuestion() {
    if (questionNumber >= TOTAL_QUESTIONS) {
      return;
    }

    const nextNumber = questionNumber + 1;

    setQuestionNumber(nextNumber);
    setEvaluation(null);
    setAnswer("");

    await getQuestion(
      nextNumber,
      previousQuestions,
      scores
    );
  }

function restartInterview() {
  setQuestion("");
  setAnswer("");
  setEvaluation(null);
  setQuestionNumber(0);
  setScores([]);
  setEvaluations([]);
  setPreviousQuestions([]);
  setFinalAnalysis(null);
}

  const interviewFinished =
    questionNumber === TOTAL_QUESTIONS && evaluation !== null;

  const averageScore =
    scores.length > 0
      ? (
          scores.reduce((total, score) => total + score, 0) /
          scores.length
        ).toFixed(1)
      : "0.0";

return (
  <main className="min-h-screen bg-slate-950 text-white">

    {/* NAVIGATION */}
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

        <a
          href="/"
          className="text-xl font-bold text-blue-400 hover:text-blue-300"
        >
          InterviewAI
        </a>

        <div className="flex gap-3">
          <a
            href="/"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            🎤 AI Interviewer
          </a>

          <a
            href="/skill-gap"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            📊 Skill Gap Analyzer
          </a>
        </div>

      </div>
    </nav>

    {/* EXISTING INTERVIEWER CONTENT */}
    <div className="mx-auto max-w-4xl px-6 py-16">

        {/* HEADER */}

        <div className="text-center">
          <div className="mb-4 text-5xl">🤖</div>

          <h1 className="text-5xl font-bold tracking-tight">
            InterviewAI
          </h1>

          <p className="mt-4 text-lg text-slate-400">
            Practice. Improve. Get Hired.
          </p>

          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
            An AI-powered mock interviewer that conducts technical
            interviews and gives instant personalized feedback.
          </p>
        </div>

        {/* INTERVIEW SETUP */}

        {!question && (
          <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">

            <h2 className="text-2xl font-semibold">
              Set Up Your Interview
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Choose your preferences before starting.
            </p>

            <div className="mt-8 grid gap-6 md:grid-cols-2">

              {/* ROLE */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Job Role
                </label>

                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
                >
                  <option>Software Developer</option>
                  <option>Frontend Developer</option>
                  <option>Backend Developer</option>
                  <option>Data Analyst</option>
                  <option>Data Scientist</option>
                  <option>AI/ML Engineer</option>
                </select>
              </div>

              {/* DIFFICULTY */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Difficulty
                </label>

                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>

              {/* TYPE */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Interview Type
                </label>

                <select
                  value={interviewType}
                  onChange={(e) =>
                    setInterviewType(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
                >
                  <option>Technical</option>
                  <option>HR</option>
                  <option>Mixed</option>
                </select>
              </div>

              {/* TOPIC */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Main Topic
                </label>

                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
                >
                  <option>Data Structures</option>
                  <option>Algorithms</option>
                  <option>DBMS</option>
                  <option>Operating Systems</option>
                  <option>Computer Networks</option>
                  <option>OOP</option>
                  <option>JavaScript</option>
                  <option>Python</option>
                  <option>Machine Learning</option>
                </select>
              </div>

            </div>

            <button
              onClick={startInterview}
              disabled={starting}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold transition hover:bg-blue-500 disabled:opacity-50"
            >
              {starting
                ? "Starting Interview..."
                : "Start Interview →"}
            </button>

          </div>
        )}

        {/* INTERVIEW */}

        {question && (
          <div className="mt-12">

            {/* PROGRESS */}

            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Question {questionNumber} of {TOTAL_QUESTIONS}
              </p>

              <p className="text-sm text-blue-400">
                {scores.length} completed
              </p>
            </div>

            {/* PROGRESS BAR */}

            <div className="mb-8 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{
                  width: `${
                    (questionNumber / TOTAL_QUESTIONS) * 100
                  }%`,
                }}
              />
            </div>

            {/* QUESTION CARD */}

            <div className="rounded-2xl border border-blue-500/30 bg-slate-900 p-8 shadow-xl">

              <div className="flex items-center gap-3">

                <div className="text-3xl">
                  🤖
                </div>

                <div>
                  <p className="text-sm text-blue-400">
                    AI INTERVIEWER
                  </p>

                  <h2 className="text-xl font-semibold">
                    Question {questionNumber}
                  </h2>
                </div>

              </div>

              {/* QUESTION */}

              <div className="mt-6 rounded-xl bg-slate-950 p-6">

                <p className="text-lg leading-8 text-slate-200">
                  {question}
                </p>

              </div>

              {/* ANSWER */}

              {!evaluation && (
                <>
                  <textarea
                    value={answer}
                    onChange={(e) =>
                      setAnswer(e.target.value)
                    }
                    placeholder="Type your answer here..."
                    className="mt-6 min-h-40 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-white outline-none focus:border-blue-500"
                  />
                  <InterviewMedia
                    answer={answer}
                    setAnswer={setAnswer}
                    question={question}
                  />

                  <button
                    onClick={submitAnswer}
                    disabled={evaluating}
                    className="mt-4 w-full rounded-xl bg-green-600 px-6 py-3 font-semibold hover:bg-green-500 disabled:opacity-50"
                  >
                    {evaluating
                      ? "Evaluating Answer..."
                      : "Submit Answer"}
                  </button>
                </>
              )}

              {/* EVALUATION */}

              {evaluation && (
                <div className="mt-8 space-y-6">

                  {/* SCORE */}

                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-6 text-center">

                    <p className="text-sm text-slate-400">
                      QUESTION SCORE
                    </p>

                    <p className="mt-2 text-5xl font-bold text-blue-400">
                      {evaluation.score}/10
                    </p>

                  </div>

                  {/* METRICS */}

                  <div className="grid gap-4 md:grid-cols-3">

                    <div className="rounded-xl border border-slate-700 bg-slate-950 p-5">
                      <p className="text-sm text-slate-400">
                        Technical Accuracy
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {evaluation.technicalAccuracy}/10
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-950 p-5">
                      <p className="text-sm text-slate-400">
                        Clarity
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {evaluation.clarity}/10
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-950 p-5">
                      <p className="text-sm text-slate-400">
                        Completeness
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {evaluation.completeness}/10
                      </p>
                    </div>

                  </div>

                  {/* FEEDBACK */}

                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-6">

                    <h3 className="text-xl font-semibold">
                      💡 AI Feedback
                    </h3>

                    <p className="mt-3 leading-7 text-slate-300">
                      {evaluation.feedback}
                    </p>

                  </div>

                  {/* STRENGTHS */}

                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-6">

                    <h3 className="text-xl font-semibold">
                      ✅ Strengths
                    </h3>

                    <ul className="mt-3 space-y-2 text-slate-300">

                      {evaluation.strengths?.map(
                        (item, index) => (
                          <li key={index}>
                            • {item}
                          </li>
                        )
                      )}

                    </ul>

                  </div>

                  {/* WEAKNESSES */}

                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-6">

                    <h3 className="text-xl font-semibold">
                      ⚠️ Areas to Improve
                    </h3>

                    <ul className="mt-3 space-y-2 text-slate-300">

                      {evaluation.weaknesses?.map(
                        (item, index) => (
                          <li key={index}>
                            • {item}
                          </li>
                        )
                      )}

                    </ul>

                  </div>

                  {/* BETTER ANSWER */}

                  <div className="rounded-xl border border-blue-500/30 bg-slate-950 p-6">

                    <h3 className="text-xl font-semibold">
                      📝 Better Answer
                    </h3>

                    <p className="mt-3 leading-7 text-slate-300">
                      {evaluation.improvedAnswer}
                    </p>

                  </div>

                  {/* NEXT QUESTION / FINISH */}

                  {!interviewFinished ? (
                    <button
                      onClick={nextQuestion}
                      disabled={starting}
                      className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold hover:bg-blue-500 disabled:opacity-50"
                    >
                      {starting
                        ? "Generating Next Question..."
                        : "Next Question →"}
                    </button>
                  ) : (
                    <div className="rounded-xl border border-green-500/30 bg-green-950/20 p-6 text-center">

                      <p className="text-sm text-green-400">
                        INTERVIEW COMPLETED
                      </p>

                      <h2 className="mt-2 text-2xl font-bold">
                        🎉 Great Job!
                      </h2>

                      <p className="mt-3 text-slate-300">
                        You completed all {TOTAL_QUESTIONS} questions.
                      </p>

                    </div>
                  )}

                </div>
              )}

            </div>

            {/* FINAL REPORT */}

            {interviewFinished && (
              <div className="mt-8 rounded-2xl border border-blue-500/30 bg-slate-900 p-8 shadow-xl">

                <h2 className="text-2xl font-bold">
                  📊 Interview Report
                </h2>

                <p className="mt-2 text-slate-400">
                  Your performance across the interview.
                </p>

                <div className="mt-6 rounded-xl bg-slate-950 p-6 text-center">

                  <p className="text-sm text-slate-400">
                    AVERAGE SCORE
                  </p>

                  <p className="mt-2 text-5xl font-bold text-blue-400">
                    {averageScore}/10
                  </p>

                </div>

                <div className="mt-6">

                  <h3 className="mb-4 text-lg font-semibold">
                    Question Scores
                  </h3>

                  <div className="grid gap-3 md:grid-cols-5">

                    {scores.map((score, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-center"
                      >
                        <p className="text-sm text-slate-400">
                          Q{index + 1}
                        </p>

                        <p className="mt-2 text-2xl font-bold">
                          {score}/10
                        </p>
                      </div>
                    ))}

                  </div>

                </div>

                <button
                  onClick={restartInterview}
                  className="mt-8 w-full rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:bg-slate-800"
                >
                  🔄 Start New Interview
                </button>
                {generatingFinalAnalysis && (
  <div className="mt-8 rounded-2xl border border-blue-500/30 bg-slate-950 p-8 text-center">
    <div className="text-4xl">🤖</div>

    <h3 className="mt-3 text-xl font-semibold">
      AI is analyzing your interview...
    </h3>

    <p className="mt-2 text-slate-400">
      Analyzing your technical skills, weaknesses,
      and interview readiness.
    </p>
  </div>
)}

{finalAnalysis && (
  <div className="mt-8 space-y-6">

    {/* AI FINAL ANALYSIS */}

    <div className="rounded-2xl border border-blue-500/30 bg-slate-950 p-8">

      <div className="flex items-center gap-3">
        <div className="text-4xl">🤖</div>

        <div>
          <h2 className="text-2xl font-bold">
            AI Final Interview Analysis
          </h2>

          <p className="text-sm text-slate-400">
            Your personalized performance analysis
          </p>
        </div>
      </div>

      {/* OVERALL SCORE */}

      <div className="mt-6 rounded-xl bg-slate-900 p-6 text-center">

        <p className="text-sm text-slate-400">
          AI OVERALL SCORE
        </p>

        <p className="mt-2 text-5xl font-bold text-blue-400">
          {finalAnalysis.overallScore}/10
        </p>

        <p className="mt-3 text-lg font-semibold text-green-400">
          {finalAnalysis.readiness}
        </p>

      </div>

      {/* SUMMARY */}

      <div className="mt-6">
        <h3 className="text-xl font-semibold">
          🧠 AI Summary
        </h3>

        <p className="mt-3 leading-7 text-slate-300">
          {finalAnalysis.summary}
        </p>
      </div>

      {/* STRONGEST SKILLS */}

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-6">

        <h3 className="text-xl font-semibold">
          💪 Strongest Skills
        </h3>

        <ul className="mt-4 space-y-2 text-slate-300">
          {finalAnalysis.strongestSkills.map(
            (skill, index) => (
              <li key={index}>
                ✅ {skill}
              </li>
            )
          )}
        </ul>

      </div>

      {/* AREAS TO IMPROVE */}

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-6">

        <h3 className="text-xl font-semibold">
          ⚠️ Areas to Improve
        </h3>

        <ul className="mt-4 space-y-2 text-slate-300">
          {finalAnalysis.areasToImprove.map(
            (area, index) => (
              <li key={index}>
                • {area}
              </li>
            )
          )}
        </ul>

      </div>

      {/* RECOMMENDED TOPICS */}

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-6">

        <h3 className="text-xl font-semibold">
          📚 Recommended Learning Topics
        </h3>

        <div className="mt-4 flex flex-wrap gap-3">
          {finalAnalysis.recommendedTopics.map(
            (topic, index) => (
              <span
                key={index}
                className="rounded-full bg-blue-500/10 px-4 py-2 text-sm text-blue-300"
              >
                {topic}
              </span>
            )
          )}
        </div>

      </div>

      {/* 7 DAY PLAN */}

      <div className="mt-6">

        <h3 className="text-xl font-semibold">
          📅 Your Personalized 7-Day Plan
        </h3>

        <div className="mt-4 space-y-3">

          {finalAnalysis.sevenDayPlan.map(
            (item) => (
              <div
                key={item.day}
                className="rounded-xl border border-slate-700 bg-slate-900 p-5"
              >
                <p className="font-semibold text-blue-400">
                  Day {item.day} — {item.focus}
                </p>

                <p className="mt-2 text-slate-300">
                  {item.task}
                </p>
              </div>
            )
          )}

        </div>

      </div>

    </div>

  </div>
)}

              </div>
            )}

          </div>
        )}

      </div>
    </main>
  );
}