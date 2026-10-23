from mcp.server.fastmcp import FastMCP

mcp = FastMCP(
    "LearnSphere AI",
    instructions=(
        "You are LearnSphere, a student learning coach. "
        "Use learning goals and quiz results to recommend "
        "realistic study actions. Never claim that a student "
        "completed work unless a completion record exists."
    ),
)


@mcp.tool()
def create_study_plan(
    skill: str,
    level: str,
    daily_minutes: int,
) -> dict:
    """Create a personalized study plan for a student."""

    if daily_minutes < 10 or daily_minutes > 600:
        return {
            "error": "Daily study time must be between 10 and 600 minutes."
        }

    topics = {
        "python": [
            "Variables and data types",
            "Conditional statements",
            "Loops",
            "Lists and arrays",
            "Functions",
            "Practice problems",
        ],
        "java": [
            "Variables and data types",
            "Conditional statements",
            "Loops",
            "Arrays",
            "Methods",
            "Practice problems",
        ],
        "dsa": [
            "Time complexity basics",
            "Arrays",
            "Strings",
            "Searching",
            "Sorting",
            "Practice problems",
        ],
        "aptitude": [
            "Percentages",
            "Ratios and proportions",
            "Averages",
            "Time and work",
            "Logical reasoning",
            "Practice tests",
        ],
    }

    selected_topics = topics.get(
        skill.lower(),
        [
            "Learn the fundamentals",
            "Study important concepts",
            "Practice examples",
            "Take a short quiz",
            "Review mistakes",
        ],
    )

    minutes_per_topic = daily_minutes // len(selected_topics)

    return {
        "skill": skill,
        "level": level,
        "daily_minutes": daily_minutes,
        "plan": [
            {
                "topic": topic,
                "minutes": minutes_per_topic,
            }
            for topic in selected_topics
        ],
    }


@mcp.tool()
def analyze_quiz(
    topic: str,
    total_questions: int,
    correct_answers: int,
) -> dict:
    """Analyze quiz performance and recommend a next step."""

    if total_questions <= 0:
        return {"error": "Total questions must be greater than zero."}

    if not 0 <= correct_answers <= total_questions:
        return {
            "error": "Correct answers must be between zero and total questions."
        }

    percentage = round(
        (correct_answers / total_questions) * 100,
        2,
    )

    if percentage < 50:
        recommendation = (
            f"Review the fundamentals of {topic}, "
            "then solve five beginner-level questions."
        )
        status = "Needs practice"

    elif percentage < 80:
        recommendation = (
            f"Practice intermediate questions on {topic} "
            "and review the mistakes."
        )
        status = "Improving"

    else:
        recommendation = (
            f"Try advanced questions on {topic} "
            "and revisit this topic with a short revision quiz."
        )
        status = "Strong performance"

    return {
        "topic": topic,
        "percentage": percentage,
        "status": status,
        "recommendation": recommendation,
    }


@mcp.tool()
def recommend_next_action(
    goal: str,
    completed_tasks: int,
    total_tasks: int,
) -> dict:
    """Recommend a next learning action using progress records."""

    if total_tasks < 0 or completed_tasks < 0:
        return {"error": "Task counts cannot be negative."}

    if completed_tasks > total_tasks:
        return {
            "error": "Completed tasks cannot exceed total tasks."
        }

    if total_tasks == 0:
        progress = 0
    else:
        progress = round(
            completed_tasks / total_tasks * 100,
            2,
        )

    if total_tasks == 0:
        action = "Start by creating your first learning task."

    elif completed_tasks == total_tasks:
        action = (
            f"You completed all recorded tasks for {goal}. "
            "Take a revision quiz or choose your next learning goal."
        )

    else:
        action = (
            f"Continue with the next unfinished task for {goal}. "
            "Review difficult concepts before moving ahead."
        )

    return {
        "goal": goal,
        "progress_percentage": progress,
        "next_action": action,
    }


if __name__ == "__main__":
    mcp.settings.host = "127.0.0.1"
    mcp.settings.port = 8001
    mcp.run(
        transport="streamable-http",
    )