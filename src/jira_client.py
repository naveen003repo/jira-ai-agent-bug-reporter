"""
BugPilot AI Agent — JIRA Client
Handles JIRA REST API v3 interactions: connection testing and issue creation.
"""

import requests


def test_connection(jira_url: str, email: str, api_token: str, project: str) -> dict:
    """
    Validate JIRA credentials and project access.
    Returns {"success": True/False, "message": "...", "project_name": "..."}
    """
    if not all([jira_url, email, api_token, project]):
        return {"success": False, "message": "All JIRA fields are required."}

    # Normalize URL
    base_url = jira_url.rstrip("/")

    try:
        # Test authentication by fetching current user
        auth_resp = requests.get(
            f"{base_url}/rest/api/3/myself",
            auth=(email, api_token),
            headers={"Accept": "application/json"},
            timeout=10,
        )

        if auth_resp.status_code == 401:
            return {"success": False, "message": "Authentication failed. Check your email and API token."}
        if auth_resp.status_code != 200:
            return {"success": False, "message": f"JIRA API error: {auth_resp.status_code} — {auth_resp.text[:200]}"}

        user_data = auth_resp.json()

        # Test project access
        proj_resp = requests.get(
            f"{base_url}/rest/api/3/project/{project}",
            auth=(email, api_token),
            headers={"Accept": "application/json"},
            timeout=10,
        )

        if proj_resp.status_code == 404:
            return {"success": False, "message": f"Project '{project}' not found. Check the project key."}
        if proj_resp.status_code != 200:
            return {"success": False, "message": f"Cannot access project '{project}': {proj_resp.status_code}"}

        proj_data = proj_resp.json()
        return {
            "success": True,
            "message": f"Connected as {user_data.get('displayName', email)}. "
                       f"Project: {proj_data.get('name', project)}",
            "project_name": proj_data.get("name", project),
        }

    except requests.exceptions.ConnectionError:
        return {"success": False, "message": f"Cannot connect to {base_url}. Check the JIRA URL."}
    except requests.exceptions.Timeout:
        return {"success": False, "message": "Connection timed out. Check your network and JIRA URL."}
    except Exception as e:
        return {"success": False, "message": f"Unexpected error: {str(e)}"}


def _severity_to_jira_priority(severity: str) -> str:
    """Map BugPilot severity to JIRA priority name."""
    mapping = {
        "Critical": "Highest",
        "High": "High",
        "Medium": "Medium",
        "Low": "Low",
    }
    return mapping.get(severity, "Medium")


def _text_to_adf(text: str) -> dict:
    """
    Convert plain text to Atlassian Document Format (ADF).
    Handles multi-line text by splitting into paragraphs.
    """
    paragraphs = []
    for line in text.split("\n"):
        if line.strip():
            paragraphs.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": line}]
            })
        else:
            paragraphs.append({"type": "paragraph", "content": []})

    if not paragraphs:
        paragraphs = [{"type": "paragraph", "content": [{"type": "text", "text": text or "No content"}]}]

    return {
        "version": 1,
        "type": "doc",
        "content": paragraphs,
    }


def create_issue(
    jira_url: str,
    email: str,
    api_token: str,
    project: str,
    issue_type: str,
    bug_report: dict,
    attachments: list = None,
) -> dict:
    """
    Create a JIRA issue from the structured bug report.
    Returns {"success": True/False, "message": "...", "issue_key": "...", "issue_url": "..."}
    """
    base_url = jira_url.rstrip("/")

    # Build the description combining all fields
    description_parts = []

    if bug_report.get("description"):
        description_parts.append(f"Description:\n{bug_report['description']}")

    if bug_report.get("steps_to_reproduce"):
        description_parts.append(f"\nSteps to Reproduce:\n{bug_report['steps_to_reproduce']}")

    if bug_report.get("expected_result"):
        description_parts.append(f"\nExpected Result:\n{bug_report['expected_result']}")

    if bug_report.get("actual_result"):
        description_parts.append(f"\nActual Result:\n{bug_report['actual_result']}")

    if bug_report.get("severity"):
        description_parts.append(f"\nSeverity: {bug_report['severity']}")

    full_description = "\n".join(description_parts)

    # Build JIRA payload
    payload = {
        "fields": {
            "project": {"key": project},
            "summary": bug_report.get("title", "Bug Report"),
            "description": _text_to_adf(full_description),
            "issuetype": {"name": issue_type or "Bug"},
            "priority": {"name": _severity_to_jira_priority(bug_report.get("severity", "Medium"))},
        }
    }

    try:
        response = requests.post(
            f"{base_url}/rest/api/3/issue",
            auth=(email, api_token),
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )

        if response.status_code in (200, 201):
            data = response.json()
            issue_key = data.get("key", "")

            # Upload Attachments if provided
            if attachments:
                for attachment in attachments:
                    attachment_data = attachment.get("data")
                    attachment_filename = attachment.get("filename")
                    
                    if not attachment_data or not attachment_filename:
                        continue
                        
                    mimetype = attachment.get("mimetype") or "image/png"
                    
                    attach_resp = requests.post(
                        f"{base_url}/rest/api/3/issue/{issue_key}/attachments",
                        auth=(email, api_token),
                        headers={
                            "X-Atlassian-Token": "no-check",
                            "Accept": "application/json"
                        },
                        files={
                            "file": (attachment_filename, attachment_data, mimetype)
                        },
                        timeout=30,
                    )
                    
                    if attach_resp.status_code not in (200, 201):
                        error_detail = attach_resp.text[:200]
                        # We continue uploading other attachments even if one fails
                        print(f"Failed to attach {attachment_filename}: {attach_resp.status_code} - {error_detail}")

            return {
                "success": True,
                "message": f"JIRA ticket {issue_key} created successfully!",
                "issue_key": issue_key,
                "issue_url": f"{base_url}/browse/{issue_key}",
            }
        else:
            error_text = response.text[:300]
            return {
                "success": False,
                "message": f"Failed to create JIRA issue: {response.status_code} — {error_text}",
            }

    except requests.exceptions.ConnectionError:
        return {"success": False, "message": f"Cannot connect to {base_url}. Check your JIRA URL."}
    except requests.exceptions.Timeout:
        return {"success": False, "message": "Request timed out while creating JIRA issue."}
    except Exception as e:
        return {"success": False, "message": f"Unexpected error: {str(e)}"}
