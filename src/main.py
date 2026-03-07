"""
BugPilot AI Agent — FastAPI Server
Serves the frontend UI and provides API endpoints for bug analysis and JIRA integration.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from typing import List
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from src.config import load_settings, save_settings, get_masked_settings
from src.groq_client import analyze_bug
from src.jira_client import test_connection, create_issue

# Load .env file if present
load_dotenv(Path(__file__).parent.parent / ".env")

app = FastAPI(title="BugPilot AI Agent", version="1.0.0")

# Mount static files (CSS, JS)
UI_DIR = Path(__file__).parent.parent / "ui"
app.mount("/static", StaticFiles(directory=str(UI_DIR)), name="static")


# ─── Frontend ────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def serve_ui():
    """Serve the main HTML page."""
    index_path = UI_DIR / "index.html"
    return HTMLResponse(content=index_path.read_text(encoding="utf-8"))


# ─── Settings API ────────────────────────────────────────────────────────────

@app.get("/api/settings")
async def get_settings():
    """Return current settings with sensitive tokens masked."""
    return get_masked_settings()


@app.post("/api/settings")
async def update_settings(
    groq_api_key: str = Form(""),
    jira_url: str = Form(""),
    jira_email: str = Form(""),
    jira_api_token: str = Form(""),
    jira_project: str = Form(""),
):
    """Save settings. All fields are written; empty string clears a value.
    Masked placeholder values (starting with '*' but not '*CLEAR*') are ignored
    so they don't overwrite the real stored secret.
    """
    current = load_settings()

    def _apply(key: str, value: str) -> None:
        """Write value to settings, skipping omitted fields."""
        if value == "*OMIT*":
            return
        current[key] = value

    _apply("groq_api_key", groq_api_key)
    _apply("jira_url", jira_url)
    _apply("jira_email", jira_email)
    _apply("jira_api_token", jira_api_token)
    _apply("jira_project", jira_project)
    current["jira_issue_type"] = "Bug"

    save_settings(current)
    return {"success": True, "message": "Settings saved successfully."}


# ─── JIRA Connection Test ────────────────────────────────────────────────────

@app.post("/api/test-connection")
async def api_test_connection(
    jira_url: str = Form(""),
    jira_email: str = Form(""),
    jira_api_token: str = Form(""),
    jira_project: str = Form(""),
):
    """Test JIRA connection using provided credentials (or saved if omitted)."""
    settings = load_settings()

    # If the token is masked (contains '*') or *OMIT*, use the real saved token
    if jira_api_token == "*OMIT*" or "*" in jira_api_token:
        jira_api_token = settings.get("jira_api_token", "")

    result = test_connection(
        jira_url=jira_url,
        email=jira_email,
        api_token=jira_api_token,
        project=jira_project,
    )
    return result


# ─── Bug Analysis ────────────────────────────────────────────────────────────

@app.post("/api/analyze-bug")
async def api_analyze_bug(
    screenshots: List[UploadFile] = File(...),
    notes: str = Form(""),
):
    """Upload multiple screenshots + tester notes → AI generates structured bug report."""
    settings = load_settings()
    api_key = settings.get("groq_api_key", "")

    if not api_key:
        return {
            "success": False,
            "message": "Groq API key not configured. Go to Settings and add your API key.",
        }

    try:
        images_data = []
        for screenshot in screenshots:
            content = await screenshot.read()
            images_data.append({
                "bytes": content,
                "filename": screenshot.filename or "screenshot.png"
            })

        report = analyze_bug(
            api_key=api_key,
            images_data=images_data,
            tester_notes=notes,
        )
        return {"success": True, "report": report}
    except Exception as e:
        return {"success": False, "message": f"Analysis failed: {str(e)}"}


# ─── JIRA Ticket Creation ────────────────────────────────────────────────────

@app.post("/api/create-jira-ticket")
async def api_create_jira_ticket(
    title: str = Form(...),
    description: str = Form(""),
    steps_to_reproduce: str = Form(""),
    expected_result: str = Form(""),
    actual_result: str = Form(""),
    severity: str = Form("Medium"),
    screenshots: List[UploadFile] = File(None),
):
    """Submit the reviewed bug report to JIRA."""
    settings = load_settings()

    if not all([
        settings.get("jira_url"),
        settings.get("jira_email"),
        settings.get("jira_api_token"),
        settings.get("jira_project"),
    ]):
        return {
            "success": False,
            "message": "JIRA is not fully configured. Go to Settings and complete the configuration.",
        }

    bug_report = {
        "title": title,
        "description": description,
        "steps_to_reproduce": steps_to_reproduce,
        "expected_result": expected_result,
        "actual_result": actual_result,
        "severity": severity,
    }

    attachments = []
    if screenshots:
        for screenshot in screenshots:
            if screenshot.filename:
                content = await screenshot.read()
                attachments.append({
                    "data": content,
                    "filename": screenshot.filename,
                    "mimetype": screenshot.content_type
                })

    result = create_issue(
        jira_url=settings["jira_url"],
        email=settings["jira_email"],
        api_token=settings["jira_api_token"],
        project=settings["jira_project"],
        issue_type=settings.get("jira_issue_type", "Bug"),
        bug_report=bug_report,
        attachments=attachments,
    )
    return result


# ─── Server Entry Point ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
