"""
BugPilot AI Agent — Configuration Manager
Manages Groq API and JIRA connection settings with local persistence.
"""

import json
import os
from pathlib import Path

SETTINGS_FILE = Path(__file__).parent.parent / "settings.json"

# Default settings structure
DEFAULT_SETTINGS = {
    "groq_api_key": "",
    "jira_url": "",
    "jira_email": "",
    "jira_api_token": "",
    "jira_project": "",
    "jira_issue_type": "Bug",
}


def load_settings() -> dict:
    """Load settings from settings.json, falling back to defaults."""
    settings = DEFAULT_SETTINGS.copy()

    # Load from file if it exists
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
            settings.update(saved)
        except (json.JSONDecodeError, IOError):
            pass

    # Override with environment variables if present
    env_map = {
        "GROQ_API_KEY": "groq_api_key",
        "JIRA_URL": "jira_url",
        "JIRA_EMAIL": "jira_email",
        "JIRA_API_TOKEN": "jira_api_token",
        "JIRA_PROJECT": "jira_project",
        "JIRA_ISSUE_TYPE": "jira_issue_type",
    }
    for env_key, setting_key in env_map.items():
        val = os.environ.get(env_key)
        if val:
            settings[setting_key] = val

    return settings


def save_settings(settings: dict) -> None:
    """Persist settings to settings.json."""
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2)


def mask_token(token: str) -> str:
    """Mask a sensitive token for display, showing only last 4 characters."""
    if not token or len(token) <= 4:
        return "****"
    return "*" * (len(token) - 4) + token[-4:]


def get_masked_settings() -> dict:
    """Return settings with sensitive tokens masked for frontend display."""
    settings = load_settings()
    groq_key = settings.get("groq_api_key", "")
    jira_token = settings.get("jira_api_token", "")
    return {
        # Only return a masked value if the token is actually configured;
        # return "" for empty/unconfigured tokens so the frontend field stays blank.
        "groq_api_key": mask_token(groq_key) if groq_key else "",
        "jira_url": settings.get("jira_url", ""),
        "jira_email": settings.get("jira_email", ""),
        "jira_api_token": mask_token(jira_token) if jira_token else "",
        "jira_project": settings.get("jira_project", ""),
        "jira_issue_type": settings.get("jira_issue_type", "Bug"),
        # Indicate whether keys are actually configured
        "groq_configured": bool(groq_key),
        "jira_configured": all([
            settings.get("jira_url"),
            settings.get("jira_email"),
            jira_token,
            settings.get("jira_project"),
        ]),
    }
