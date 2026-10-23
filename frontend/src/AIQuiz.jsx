import { useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function AIQuiz() {
  const [topic, setTopic] = useState("Python loops");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateQuiz() {
    setLoading(true);
    setError("");
    setQuiz(null);
    setAnswers({});
    setSubmitted(false);

    try {
      const response = await fetch(`${API}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" ,},
        body: JSON.stringify({
          topic,
          difficulty,
          num_questions: Number(count),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to generate quiz.");
      }

      setQuiz(data);
    } catch (err) {
      setError(err.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  function submitQuiz() {
    if (Object.keys(answers).length !== quiz.questions.length) {
      setError("Please answer every question before submitting.");
      return;
    }

    setError("");
    setSubmitted(true);
  }

  const score = quiz
    ? quiz.questions.reduce(
        (total, question, index) =>
          total +
          (answers[index] === question.correct_answer ? 1 : 0),
        0
      )
    : 0;

  return (
    <article className="card ai-quiz">
      <h2>🤖 AI Quiz Generator</h2>
      <p>Generate a personalized quiz from any study topic.</p>

      <label>
        Topic
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="e.g. Python loops"
          maxLength={200}
        />
      </label>

      <label>
        Difficulty
        <select
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </label>

      <label>
        Number of questions
        <select
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
        >
          <option value={5}>5 Questions</option>
          <option value={10}>10 Questions</option>
          <option value={15}>15 Questions</option>
        </select>
      </label>

      <button onClick={generateQuiz} disabled={loading}>
        {loading ? "Generating quiz..." : "Generate AI Quiz"}
      </button>

      {error && <p className="error-message">{error}</p>}

      {quiz && (
        <div className="quiz-content">
          <h3>{quiz.topic}</h3>
          <p>Difficulty: {quiz.difficulty}</p>

          {quiz.questions.map((question, index) => (
            <div className="quiz-question" key={index}>
              <h4>
                {index + 1}. {question.question}
              </h4>

              {question.options.map((option) => (
                <label className="quiz-option" key={option}>
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={option}
                    checked={answers[index] === option}
                    disabled={submitted}
                    onChange={() =>
                      setAnswers((previous) => ({
                        ...previous,
                        [index]: option,
                      }))
                    }
                  />
                  {option}
                </label>
              ))}

              {submitted && (
                <div className="quiz-feedback">
                  <p>
                    <strong>Correct answer:</strong>{" "}
                    {question.correct_answer}
                  </p>
                  <p>{question.explanation}</p>
                </div>
              )}
            </div>
          ))}

          {!submitted ? (
            <button onClick={submitQuiz}>Submit Answers</button>
          ) : (
            <div className="quiz-result">
              <h3>
                Your Score: {score}/{quiz.questions.length}
              </h3>
              <p>
                Percentage:{" "}
                {Math.round((score / quiz.questions.length) * 100)}%
              </p>
              <button onClick={generateQuiz}>Generate Another Quiz</button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
