
import { useEffect, useState } from "react";
import AIQuiz from "./AIQuiz";
import "./App.css";

const API = import.meta.env.VITE_API_URL;

const DEFAULT_TASKS = [
  { id: 1, title: "Review fundamental concepts", minutes: 15, done: false },
  { id: 2, title: "Practice coding problems", minutes: 20, done: false },
  { id: 3, title: "Learn a new concept", minutes: 15, done: false },
  { id: 4, title: "Revise previous topics", minutes: 10, done: false },
];

function parseJson(value) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function ResultView({ data }) {
  if (typeof data === "string") {
    return <p>{data}</p>;
  }

  if (Array.isArray(data)) {
    return (
      <div>
        {data.map((item, index) => (
          <ResultView key={index} data={item} />
        ))}
      </div>
    );
  }

  if (data && typeof data === "object") {
    if (Array.isArray(data.plan)) {
      return (
        <div className="study-plan">
          <h3>{data.skill} Study Plan</h3>
          <p>
            Level: {data.level} · {data.daily_minutes} minutes per day
          </p>

          {data.plan.map((item, index) => (
            <div className="study-topic" key={index}>
              <span className="topic-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="topic-name">{item.topic}</span>
              <span className="topic-time">{item.minutes} min</span>
            </div>
          ))}
        </div>
      );
    }

    if (data.topic && data.percentage !== undefined) {
      return (
        <div className="study-plan">
          <h3>Quiz Analysis: {data.topic}</h3>
          <p className="score">{data.percentage}%</p>
          <p>Status: {data.status}</p>
          <p>{data.recommendation}</p>
        </div>
      );
    }

    if (data.progress_percentage !== undefined) {
      return (
        <div className="study-plan">
          <h3>Your Progress</h3>
          <p className="score">{data.progress_percentage}%</p>
          <p>{data.next_action}</p>
        </div>
      );
    }

    return <pre>{JSON.stringify(data, null, 2)}</pre>;
  }

  return <p>{String(data)}</p>;
}

function getMotivation(progress) {
  if (progress === 100) {
    return {
      title: "Outstanding work! 🎉",
      message: "You've completed every task in your current checklist.",
    };
  }

  if (progress >= 75) {
    return {
      title: "You're almost there! 🚀",
      message: "Keep your momentum going and finish your remaining tasks.",
    };
  }

  if (progress >= 50) {
    return {
      title: "You're making great progress! ✨",
      message: "You're more than halfway there. Keep learning!",
    };
  }

  if (progress > 0) {
    return {
      title: "Great start! 🌱",
      message: "Every completed task brings you closer to your goal.",
    };
  }

  return {
    title: "Your learning journey starts here! 💜",
    message: "Complete your first task and start building momentum.",
  };
}

export default function App() {
  const [skill, setSkill] = useState("Python");
  const [level, setLevel] = useState("Beginner");
  const [minutes, setMinutes] = useState(60);

  const [topic, setTopic] = useState("Python loops");
  const [total, setTotal] = useState(10);
  const [correct, setCorrect] = useState(5);

  const [goal, setGoal] = useState("Prepare for placements");
  const [completed, setCompleted] = useState(2);
  const [tasks, setTasks] = useState(5);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [checklist, setChecklist] = useState(() => {
    try {
      const saved = localStorage.getItem("learnsphere-checklist");
      return saved ? JSON.parse(saved) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "learnsphere-checklist",
        JSON.stringify(checklist)
      );
    } catch {
      // The app can still work if browser storage is unavailable.
    }
  }, [checklist]);

  const completedChecklist = checklist.filter((task) => task.done).length;

  const progress =
    checklist.length === 0
      ? 0
      : Math.round((completedChecklist / checklist.length) * 100);

  const motivation = getMotivation(progress);

  function toggleTask(id) {
    setChecklist((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  }

  function resetChecklist() {
    setChecklist(DEFAULT_TASKS.map((task) => ({ ...task })));
  }

  async function callApi(path, body) {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "The request failed."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        `${err.message}. Check that both backend servers are running.`
      );
    } finally {
      setLoading(false);
    }
  }

  function submitStudyPlan() {
    if (!skill.trim()) {
      setError("Please enter a skill or subject.");
      return;
    }

    if (!Number.isFinite(minutes) || minutes < 10 || minutes > 600) {
      setError("Daily study time must be between 10 and 600 minutes.");
      return;
    }

    callApi("/api/study-plan", {
      skill: skill.trim(),
      level,
      daily_minutes: minutes,
    });
  }

  function submitQuizAnalysis() {
    if (!topic.trim()) {
      setError("Please enter a quiz topic.");
      return;
    }

    if (
      !Number.isInteger(total) ||
      total < 1 ||
      total > 100 ||
      !Number.isInteger(correct) ||
      correct < 0 ||
      correct > total
    ) {
      setError(
        "Enter 1–100 total questions and a correct-answer count between 0 and the total."
      );
      return;
    }

    callApi("/api/quiz-analysis", {
      topic: topic.trim(),
      total_questions: total,
      correct_answers: correct,
    });
  }

  function submitNextAction() {
    if (!goal.trim()) {
      setError("Please enter your learning goal.");
      return;
    }

    if (
      !Number.isInteger(completed) ||
      !Number.isInteger(tasks) ||
      tasks < 0 ||
      completed < 0 ||
      completed > tasks
    ) {
      setError(
        "Completed tasks must be between zero and the total number of tasks."
      );
      return;
    }

    callApi("/api/next-action", {
      goal: goal.trim(),
      completed_tasks: completed,
      total_tasks: tasks,
    });
  }

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="LearnSphere AI home">
          <span className="logo">L</span>
          <span>LearnSphere <span className="brand-ai">AI</span></span>
        </a>

        <a className="nav-link" href="#learning-tools">
          Learning tools ↗
        </a>
      </header>

      <section className="hero" id="home">
        <div className="hero-content">
          <span className="eyebrow">YOUR PERSONAL LEARNING COACH</span>

          <h1>
            Learn smarter.
            <br />
            <span>Grow every day.</span>
          </h1>

          <p>
            Turn your learning goals into a clear plan, understand
            your weak areas, and make progress one day at a time.
          </p>

          <div className="status">
            <span className="status-dot" />
            MCP-powered learning tools
          </div>
        </div>
      </section>

      <section className="dashboard">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR OVERVIEW</span>
            <h2>Student dashboard</h2>
            <p>Your learning journey, all in one place.</p>
          </div>

          <span className="today-badge">✦ Keep moving forward</span>
        </div>

        <div className="dashboard-grid">
          <article className="overview-card goal-card">
            <span className="overview-label">CURRENT LEARNING GOAL</span>
            <div className="overview-icon">🎯</div>
            <h3>{goal.trim() || "Set your learning goal"}</h3>
            <p>Keep your goal in sight as you work through your plan.</p>
          </article>

          <article className="overview-card">
            <span className="overview-label">DAILY STUDY TARGET</span>
            <div className="overview-icon">⏱️</div>
            <h3>{minutes} minutes</h3>
            <p>Planned study time each day.</p>
          </article>

          <article className="overview-card">
            <span className="overview-label">TASKS COMPLETED</span>
            <div className="overview-icon">✓</div>
            <h3>{completedChecklist} of {checklist.length}</h3>
            <p>Tasks completed in your daily checklist.</p>
          </article>
        </div>

        <article className="progress-card">
          <div className="progress-heading">
            <div>
              <span className="overview-label">DAILY PROGRESS</span>
              <h3>{progress}% completed</h3>
            </div>
            <span className="progress-fraction">
              {completedChecklist}/{checklist.length} tasks
            </span>
          </div>

          <div
            className="progress-track"
            role="progressbar"
            aria-label="Daily study checklist progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="motivation">
            <span className="motivation-sparkle">✦</span>
            <div>
              <h4>{motivation.title}</h4>
              <p>{motivation.message}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="checklist-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR DAILY ROUTINE</span>
            <h2>Today's study checklist</h2>
            <p>Small steps today. Stronger skills tomorrow.</p>
          </div>

          <button
            className="secondary-button reset-button"
            type="button"
            onClick={resetChecklist}
          >
            Reset checklist
          </button>
        </div>

        <article className="checklist-card">
          {checklist.map((task) => (
            <label
              className={`checklist-item ${task.done ? "task-done" : ""}`}
              key={task.id}
            >
              <input
                className="task-checkbox"
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task.id)}
              />

              <span className="custom-checkbox" aria-hidden="true">
                {task.done ? "✓" : ""}
              </span>

              <span className="checklist-title">{task.title}</span>
              <span className="checklist-time">{task.minutes} min</span>
            </label>
          ))}

          <div className="checklist-footer">
            <span>
              {checklist.length - completedChecklist} tasks remaining
            </span>
            <span>{progress}% of today's checklist complete</span>
          </div>
        </article>
      </section>

      <section className="tools-section" id="learning-tools">
        <div className="section-heading">
          <div>
            <span className="eyebrow">POWERED BY MCP</span>
            <h2>Your learning tools</h2>
            <p>Build a plan, understand your results, and decide what to do next.</p>
          </div>
        </div>

        <div className="grid">
          <article className="card">
            <div className="card-icon">01</div>
            <h2>Create your study plan</h2>
            <p>Build a learning schedule around your goals.</p>

            <label htmlFor="skill">Skill or subject</label>
            <input
              id="skill"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            />

            <label htmlFor="level">Current level</label>
            <select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>

            <label htmlFor="minutes">Daily study time (minutes)</label>
            <input
              id="minutes"
              type="number"
              min="10"
              max="600"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />

            <button type="button" onClick={submitStudyPlan} disabled={loading}>
              Generate my plan →
            </button>
          </article>

          <article className="card">
            <div className="card-icon">02</div>
            <h2>Find your knowledge gaps</h2>
            <p>Use quiz results to identify topics that need work.</p>

            <label htmlFor="topic">Quiz topic</label>
            <input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />

            <label htmlFor="total">Total questions</label>
            <input
              id="total"
              type="number"
              min="1"
              max="100"
              value={total}
              onChange={(e) => setTotal(Number(e.target.value))}
            />

            <label htmlFor="correct">Correct answers</label>
            <input
              id="correct"
              type="number"
              min="0"
              max="100"
              value={correct}
              onChange={(e) => setCorrect(Number(e.target.value))}
            />

            <button
              type="button"
              onClick={submitQuizAnalysis}
              disabled={loading}
            >
              Analyze my result →
            </button>
          </article>

          <article className="card">
            <div className="card-icon">03</div>
            <h2>Choose your next step</h2>
            <p>Get a recommendation based on your recorded progress.</p>

            <label htmlFor="goal">Learning goal</label>
            <input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />

            <label htmlFor="completed">Completed tasks</label>
            <input
              id="completed"
              type="number"
              min="0"
              value={completed}
              onChange={(e) => setCompleted(Number(e.target.value))}
            />

            <label htmlFor="tasks">Total tasks</label>
            <input
              id="tasks"
              type="number"
              min="0"
              value={tasks}
              onChange={(e) => setTasks(Number(e.target.value))}
            />

            <button
              type="button"
              onClick={submitNextAction}
              disabled={loading}
            >
              Recommend next action →
            </button>
          </article>
        </div>

        <AIQuiz />
      </section>

      {loading && (
        <section className="result" aria-live="polite">
          <h2>Building your recommendation...</h2>
          <p>LearnSphere is calling its MCP learning tool.</p>
        </section>
      )}

      {error && (
        <section className="result error" role="alert">
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </section>
      )}

      {result && (
        <section className="result">
          <span className="eyebrow">YOUR LEARNING INSIGHT</span>
          <h2>Here's your next move.</h2>

          <p className="tool-label">
            MCP tool called: <code>{result.tool}</code>
          </p>

          <div className="result-content">
            {Array.isArray(result.result) ? (
              result.result.map((item, index) => (
                <ResultView
                  key={index}
                  data={
                    typeof item === "string"
                      ? parseJson(item)
                      : item
                  }
                />
              ))
            ) : (
              <ResultView data={result.result} />
            )}
          </div>
        </section>
      )}

      <footer>
        <div className="footer-brand">LearnSphere AI</div>
        Learn with purpose. Grow with confidence.
      </footer>
    </main>
  );
}
