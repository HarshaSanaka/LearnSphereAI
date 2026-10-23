import os
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from typing import Literal
from fastapi import HTTPException 
from pydantic import BaseModel, Field 
from quiz_generator import generate_quiz
from pydantic import BaseModel


logger = logging.getLogger(__name__)
MCP_URL = "http://127.0.0.1:8001/mcp"

@asynccontextmanager
async def mcp_session():
    async with streamable_http_client(MCP_URL) as (read_stream, write_stream, _):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            yield session


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="LearnSphere AI",
    description="Personalized learning coach",
    lifespan=lifespan,
)
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url,"http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)


class StudyPlanRequest(BaseModel):
    skill: str = Field(min_length=1, max_length=80)
    level: str = Field(default="Beginner", max_length=30)
    daily_minutes: int = Field(ge=10, le=600)


class QuizRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=80)
    total_questions: int = Field(gt=0, le=100)
    correct_answers: int = Field(ge=0, le=100)
    difficulty: str = "medium"
    num_questions: int = 5

class QuizGenerationRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=200)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    num_questions: int = Field(default=5, ge=1, le=15)


class ProgressRequest(BaseModel):
    goal: str = Field(min_length=1, max_length=120)
    completed_tasks: int = Field(ge=0, le=10000)
    total_tasks: int = Field(ge=0, le=10000)


async def call_mcp_tool(tool_name: str, arguments: dict):
    try:
        async with mcp_session() as client:
            result = await client.call_tool(
                tool_name,
                arguments=arguments,
            )

            if result.isError:
                raise HTTPException(
                    status_code=502,
                    detail=f"MCP tool failed: {tool_name}",
                )
            structured =getattr(result, "structuredContent", None)
            if structured is None:
                structured=getattr(
                    result,"structuredContent",None
                )
            if structured is not None:
                output=structured 
            else:
                output = []
                for item in result.content:
                    if hasattr(item, "text"): 
                        text_value = item.text

                        try: 
                            import json 
                            output.append(json.loads(text_value)) 
                        except (json.JSONDecodeError, TypeError): 
                            output.append(text_value)

            return {
                "tool": tool_name,
                "result": output,
            }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Cannot reach LearnSphere MCP server. "
                "Check that server.py is running."
            ),
        ) from exc


@app.get("/")
def home():
    return {
        "app": "LearnSphere AI",
        "status": "running",
    }


@app.get("/api/tools")
async def list_tools():
    try:
        async with mcp_session() as session:
            result = await session.list_tools()

            return {
                "tools": [
                    {
                        "name": tool.name,
                        "description": tool.description,
                    }
                    for tool in result.tools
                ]
            }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="MCP server is unavailable.",
        ) from exc


@app.post("/api/study-plan")
async def study_plan(request: StudyPlanRequest):
    return await call_mcp_tool(
        "create_study_plan",
        request.model_dump(),
    )


@app.post("/api/quiz-analysis")
async def quiz_analysis(request: QuizRequest):
    if request.correct_answers > request.total_questions:
        raise HTTPException(
            status_code=400,
            detail="Correct answers cannot exceed total questions.",
        )

    return await call_mcp_tool(
        "analyze_quiz",
        request.model_dump(),
    )


@app.post("/api/next-action")
async def next_action(request: ProgressRequest):
    if request.completed_tasks > request.total_tasks:
        raise HTTPException(
            status_code=400,
            detail="Completed tasks cannot exceed total tasks.",
        )

    return await call_mcp_tool(
        "recommend_next_action",
        request.model_dump(),
    )
@app.post("/generate-quiz")
def create_quiz(request: QuizGenerationRequest):
    try:
        return generate_quiz(
            topic=request.topic,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("AI quiz generation failed")
        raise HTTPException(
            status_code=502,
            detail="Quiz generation failed. Check the backend terminal for the cause.",
        ) from exc