# 🐞 BugPilot AI Agent

BugPilot is an AI-powered QA copilot that transforms screenshots and tester notes into structured, professional bug reports and automatically creates JIRA tickets.

## ⚠️ The Problem
**Every tester takes screenshots of bugs but then spends 10-15 minutes writing up the Jira ticket manually.** They switch between the screenshots, the browser, Jira, and their notes. It's repetitive, slow, and error-prone. What if you could just drop your screenshots and have AI generate the entire bug report and push it directly to Jira?

---

## 🏗️ What We're Building
A web application where the user uploads bug screenshots, the AI (LLaMA 4 Scout vision model on Groq) analyzes what's wrong across the evidence, generates a structured bug report, and with one click pushes it to Jira as a real ticket with all screenshots attached. The user provides their Groq API key and Jira credentials in a settings panel.

---

## ✨ Features

- **AI Bug Analysis**: Uses LLaMA 4 Scout Vision (via Groq) to analyze multiple screenshots simultaneously and extract technical details.
- **Structured Reports**: Automatically generates Title, Description, Steps to Reproduce, Expected vs. Actual results, and Severity.
- **JIRA Integration**: Create JIRA tickets directly from the app with just one click.
- **Attachment Support**: Automatically attaches all uploaded screenshots to the JIRA ticket.
- **Premium UI**: Modern, glassmorphism-inspired dark theme with smooth micro-animations.

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.8+
- A [Groq API Key](https://console.groq.com/)
- A JIRA account (API Token, Email, and Project Key)

### 2. Installation
```bash
# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration
Copy the `.env.example` to `.env` and fill in your keys (optional, you can also configure them inside the app):
```bash
cp .env.example .env
```

### 4. Running the App
```bash
python -m src.main
```
The app will be available at `http://localhost:8080`.

## 📁 Project Structure

- `src/`: Backend logic (FastAPI, Groq, JIRA).
- `ui/`: Frontend assets (HTML, CSS, Vanilla JS).
- `tests/`: Automated tests for core functionality.
- `settings.json`: Local persistence for your configuration (Git ignored).

## 🛠️ Tech Stack

- **Backend**: FastAPI, Python, Groq SDK, Requests.
- **Frontend**: Shadow DOM-less Vanilla JS, Modern CSS (Flexbox/Grid), Glassmorphism.
- **AI**: LLaMA 4 Scout (via Groq).

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Built with ❤️ for better QA workflows.*
