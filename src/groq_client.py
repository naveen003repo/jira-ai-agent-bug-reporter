"""
BugPilot AI Agent — Groq AI Client
Two-stage pipeline:
  1. Screenshot → text extraction via Groq LLaMA Scout (vision model)
  2. Extracted text + notes → structured bug report via Groq LLaMA (with System Prompt)
"""

import base64
import re
from pathlib import Path

from groq import Groq

# Load System Prompt from the markdown file
SYSTEM_PROMPT_PATH = Path(__file__).parent.parent / "System Prompt.md"


def _load_system_prompt() -> str:
    """Read the System Prompt.md file content."""
    try:
        return SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        return (
            "You are a QA bug analyst. Analyze the provided evidence and generate "
            "a structured bug report with: Title, Description, Steps to Reproduce, "
            "Expected Result, Actual Result, and Severity (Low|Medium|High|Critical)."
        )


def extract_text_from_screenshots(api_key: str, images_data: list) -> str:
    """
    Stage 1: Send screenshots to Groq LLaMA Scout (vision model) to extract
    visible text, UI elements, error messages, and contextual information.
    """
    client = Groq(api_key=api_key)

    content_blocks = [
        {
            "type": "text",
            "text": (
                "You are an expert at reading screenshots. "
                "Extract ALL visible text from THESE screenshots including:\n"
                "- Page titles, headers, labels\n"
                "- Form field values and placeholders\n"
                "- Error messages, warnings, notifications\n"
                "- Button labels, menu items\n"
                "- Status indicators, URLs\n"
                "- Any other visible text content\n\n"
                "Also describe:\n"
                "- The general layout and UI state for each screenshot\n"
                "- Any visual anomalies (misalignment, broken elements, "
                "overlapping content, truncated text)\n"
                "- The application or webpage being shown\n\n"
                "Return all extracted content in a structured format, "
                "clearly separating findings from different screenshots if they represent different states."
            ),
        }
    ]

    for img in images_data:
        image_bytes = img["bytes"]
        filename = img["filename"]
        
        # Determine MIME type
        ext = Path(filename).suffix.lower()
        mime_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                    ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp"}
        mime_type = mime_map.get(ext, "image/png")

        # Base64 encode the image
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        
        content_blocks.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{mime_type};base64,{b64_image}",
            },
        })

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": content_blocks,
            }
        ],
        max_tokens=2048,
        temperature=0.1,
    )

    return response.choices[0].message.content


def generate_bug_report(api_key: str, extracted_text: str, tester_notes: str) -> dict:
    """
    Stage 2: Send extracted text + tester notes to Groq LLaMA with the
    System Prompt to generate a structured bug report.
    """
    client = Groq(api_key=api_key)

    system_prompt = _load_system_prompt()

    user_message = f"""Analyze the following bug evidence and generate a structured bug report.

--- EXTRACTED TEXT FROM SCREENSHOT ---
{extracted_text}

--- TESTER NOTES ---
{tester_notes if tester_notes else "No additional notes provided."}

Generate the bug report now following the exact format specified in your instructions."""

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_tokens=2048,
        temperature=0.2,
    )

    raw_report = response.choices[0].message.content
    return _parse_bug_report(raw_report)


def _parse_bug_report(raw_text: str) -> dict:
    """
    Parse the AI-generated text into structured fields.
    Handles the strict output format: Title, Description, Steps to Reproduce,
    Expected Result, Actual Result, Severity.
    """
    result = {
        "title": "",
        "description": "",
        "steps_to_reproduce": "",
        "expected_result": "",
        "actual_result": "",
        "severity": "Medium",
        "raw_report": raw_text,
    }

    # Define section patterns (case-insensitive)
    sections = [
        ("title", r"Title:\s*\n?(.+?)(?=\n\s*Description:|\Z)"),
        ("description", r"Description:\s*\n?(.+?)(?=\n\s*Steps to Reproduce:|\Z)"),
        ("steps_to_reproduce", r"Steps to Reproduce:\s*\n?(.+?)(?=\n\s*Expected Result:|\Z)"),
        ("expected_result", r"Expected Result:\s*\n?(.+?)(?=\n\s*Actual Result:|\Z)"),
        ("actual_result", r"Actual Result:\s*\n?(.+?)(?=\n\s*Severity:|\Z)"),
        ("severity", r"Severity:\s*\n?(.+?)(?=\n\s*(?:Rules:|$)|\Z)"),
    ]

    for key, pattern in sections:
        match = re.search(pattern, raw_text, re.DOTALL | re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            result[key] = value

    # Normalize severity to one of the valid values
    severity_val = result["severity"].strip().lower()
    severity_map = {"low": "Low", "medium": "Medium", "high": "High", "critical": "Critical"}
    result["severity"] = severity_map.get(severity_val, "Medium")

    return result


def analyze_bug(api_key: str, images_data: list, tester_notes: str) -> dict:
    """
    Full pipeline: Screenshots → text extraction → bug report generation.
    Returns structured bug report dict.
    """
    # Stage 1: Extract text from multiple screenshots
    extracted_text = extract_text_from_screenshots(api_key, images_data)

    # Stage 2: Generate structured bug report
    report = generate_bug_report(api_key, extracted_text, tester_notes)
    report["extracted_text"] = extracted_text

    return report
