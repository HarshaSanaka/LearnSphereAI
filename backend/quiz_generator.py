import json
import os
import re

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing. Add it to the backend .env file."
    )

client = genai.Client(api_key=API_KEY)

MODEL = "gemini-3.5-flash-lite"


def generate_quiz(topic: str, difficulty: str, num_questions: int):
    topic = topic.strip()
    difficulty = difficulty.strip().lower()

    if not topic:
        raise ValueError("Please enter a topic.")

    if len(topic) > 200:
        raise ValueError("Topic must be 200 characters or fewer.")

    if difficulty not in {"easy", "medium", "hard"}:
        raise ValueError("Difficulty must be easy, medium, or hard.")

    if not 1 <= num_questions <= 15:
        raise ValueError("Choose between 1 and 15 questions.")

    prompt = f"""
    Create a programming and computer-science learning quiz.

    Topic: {topic}
    Difficulty: {difficulty}
    Number of questions: {num_questions}

    Requirements:
    - Generate exactly {num_questions} multiple-choice questions.
    - Every question must have exactly four options.
    - Each question must have exactly one correct answer.
    - Include a short explanation for the correct answer.
    - Keep questions relevant to the specified topic and difficulty.
    - Avoid duplicate questions.
    - Return only valid JSON matching this structure:

    {{
      "topic": "{topic}",
      "difficulty": "{difficulty}",
      "questions": [
        {{
          "question": "Question text",
          "options": [
            "Option A",
            "Option B",
            "Option C",
            "Option D"
          ],
          "correct_answer": "Exact text of the correct option",
          "explanation": "Short explanation"
        }}
      ]
    }}
    """

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.4,
        ),
    )

    text = response.text

    if not text:
        raise RuntimeError("The AI returned an empty response.")

    # Remove Markdown fences if the model happens to include them.
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text)

    data = json.loads(text)

    questions = data.get("questions")

    if not isinstance(questions, list) or len(questions) != num_questions:
        raise RuntimeError("The AI did not generate the requested question count.")

    for question in questions:
        options = question.get("options", [])

        if (
            not isinstance(question.get("question"), str)
            or not isinstance(options, list)
            or len(options) != 4
            or not all(isinstance(option, str) for option in options)
            or len(set(options)) != 4
            or question.get("correct_answer") not in options
            or not isinstance(question.get("explanation"), str)
        ):
            raise RuntimeError("The AI returned an invalid question format.")

    return data
