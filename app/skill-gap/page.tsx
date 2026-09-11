"use client";

import { useState } from "react";

type RoadmapItem = {
  week: number;
  focus: string;
  topics: string[];
  task: string;
};

type SkillGapAnalysis = {
  matchPercentage: number;
  summary: string;
  strongSkills: string[];
  partialSkills: string[];
  missingSkills: string[];
  recommendedTopics: string[];
  learningRoadmap: RoadmapItem[];
};

export default function SkillGapPage() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] =
    useState<SkillGapAnalysis | null>(null);

  async function analyzeSkillGap() {
    if (!resume.trim() || !jobDescription.trim()) {
      alert("Please enter both your resume and job description.");
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const response = await fetch("/api/skill-gap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume,
          jobDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to analyze skill gap"
        );
      }

      setAnalysis(data.analysis);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setAnalyzing(false);
    }
  }

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
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            🎤 AI Interviewer
          </a>

          <a
            href="/skill-gap"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            📊 Skill Gap Analyzer
          </a>
        </div>

      </div>
    </nav>

    {/* EXISTING SKILL GAP CONTENT */}
    <div className="mx-auto max-w-6xl px-6 py-12">

        {/* HEADER */}

        <div className="text-center">
          <div className="text-5xl">🎯</div>

          <h1 className="mt-4 text-4xl font-bold">
            AI Skill-Gap Analyzer
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-slate-400">
            Compare your skills with a real job description
            and get a personalized learning roadmap.
          </p>
        </div>

        {/* INPUT SECTION */}

        {!analysis && (
          <div className="mt-10 grid gap-6 md:grid-cols-2">

            {/* RESUME */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">
                📄 Your Resume
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Paste your resume, projects, skills,
                certifications, and experience.
              </p>

              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder={`Example:

B.Tech Computer Science student

Skills:
JavaScript, React, Next.js, Python, MongoDB

Projects:
AI Interviewer using Next.js and Gemini API
Student Management System using MongoDB

Experience:
...`}
                className="mt-5 min-h-80 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* JOB DESCRIPTION */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">
                💼 Job Description
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Paste the job posting you want to compare
                yourself against.
              </p>

              <textarea
                value={jobDescription}
                onChange={(e) =>
                  setJobDescription(e.target.value)
                }
                placeholder={`Example:

We are looking for a Software Developer.

Requirements:
- JavaScript
- React
- Node.js
- REST APIs
- MongoDB
- Git
- Basic cloud knowledge
- Problem solving

Good communication and teamwork skills...`}
                className="mt-5 min-h-80 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-white outline-none focus:border-blue-500"
                
              />
              <p className="mt-2 text-right text-xs text-slate-500">
                {jobDescription.length} characters
                </p>
              <p className="mt-2 text-right text-xs text-slate-500">
                {resume.length} characters
                </p>
            </div>
          </div>
        )}

        {/* ANALYZE BUTTON */}

        {!analysis && (
          <button
            onClick={analyzeSkillGap}
            disabled={analyzing}
            className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold hover:bg-blue-500 disabled:opacity-50"
          >
            {analyzing
                ? "🤖 AI is analyzing your skills..."
                : "🔍 Analyze Skill Gap →"}
          </button>
        )}

        {/* RESULTS */}

        {analysis && (
          <div className="mt-10 space-y-6">

            {/* MATCH SCORE */}

            <div className="rounded-2xl border border-blue-500/30 bg-slate-900 p-8 text-center">
              <p className="text-sm text-slate-400">
                JOB SKILL MATCH
              </p>

              <p className="mt-2 text-6xl font-bold text-blue-400">
                {analysis.matchPercentage}%
              </p>

              <p className="mx-auto mt-4 max-w-2xl text-slate-300">
                {analysis.summary}
              </p>
            </div>

            {/* SKILLS GRID */}

            <div className="grid gap-6 md:grid-cols-3">

              {/* STRONG */}

              <div className="rounded-2xl border border-green-500/30 bg-slate-900 p-6">
                <h2 className="text-xl font-semibold text-green-400">
                  ✅ Strong Skills
                </h2>

                <ul className="mt-4 space-y-2 text-slate-300">
                  {analysis.strongSkills.map(
                    (skill, index) => (
                      <li key={index}>
                        • {skill}
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* PARTIAL */}

              <div className="rounded-2xl border border-yellow-500/30 bg-slate-900 p-6">
                <h2 className="text-xl font-semibold text-yellow-400">
                  🟡 Partial Skills
                </h2>

                <ul className="mt-4 space-y-2 text-slate-300">
                  {analysis.partialSkills.map(
                    (skill, index) => (
                      <li key={index}>
                        • {skill}
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* MISSING */}

              <div className="rounded-2xl border border-red-500/30 bg-slate-900 p-6">
                <h2 className="text-xl font-semibold text-red-400">
                  ❌ Missing Skills
                </h2>

                <ul className="mt-4 space-y-2 text-slate-300">
                  {analysis.missingSkills.map(
                    (skill, index) => (
                      <li key={index}>
                        • {skill}
                      </li>
                    )
                  )}
                </ul>
              </div>

            </div>

            {/* RECOMMENDED TOPICS */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-2xl font-semibold">
                📚 Recommended Topics
              </h2>

              <div className="mt-5 flex flex-wrap gap-3">
                {analysis.recommendedTopics.map(
                  (topic, index) => (
                    <span
                      key={index}
                      className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300"
                    >
                      {topic}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* LEARNING ROADMAP */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-2xl font-semibold">
                🗺️ Personalized 4-Week Roadmap
              </h2>

              <div className="mt-6 space-y-5">

                {analysis.learningRoadmap.map(
                  (item) => (
                    <div
                      key={item.week}
                      className="rounded-xl border border-slate-700 bg-slate-950 p-6"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-600 px-3 py-2 font-bold">
                          Week {item.week}
                        </div>

                        <h3 className="text-xl font-semibold">
                          {item.focus}
                        </h3>
                      </div>

                      <p className="mt-4 text-sm text-slate-400">
                        Topics
                      </p>

                      <ul className="mt-2 space-y-1 text-slate-300">
                        {item.topics.map(
                          (topic, index) => (
                            <li key={index}>
                              • {topic}
                            </li>
                          )
                        )}
                      </ul>

                      <p className="mt-4 text-sm text-slate-400">
                        Practical Task
                      </p>

                      <p className="mt-2 text-slate-300">
                        {item.task}
                      </p>
                    </div>
                  )
                )}

              </div>
            </div>

            {/* RESET */}

            <button
              onClick={() => setAnalysis(null)}
              className="w-full rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:bg-slate-800"
            >
              🔄 Analyze Another Job
            </button>

          </div>
        )}
      </div>
    </main>
  );
}