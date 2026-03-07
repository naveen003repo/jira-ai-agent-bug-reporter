# 🚀 Deployment Guide

Follow these steps to host your BugPilot AI Agent on the cloud using GitHub and Vercel.

---

## 1. Push to GitHub

If you've made changes locally and want to push them to your repository:

1.  **Open Terminal** in the project folder.
2.  **Add all changes**:
    ```bash
    git add .
    ```
3.  **Commit your changes**:
    ```bash
    git commit -m "Your message here"
    ```
4.  **Push to GitHub**:
    ```bash
    git push origin main
    ```

---

## 2. Host on Vercel

Vercel is the best place to host this FastAPI + Vanilla JS application.

### Step A: Connect Repository
1.  Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New"** > **"Project"**.
3.  Search for your repository `jira-ai-bug-reporter-Agent` and click **"Import"**.

### Step B: Configure Environment Variables
Before clicking "Deploy", you can add global keys that everyone will use by default.

> [!NOTE]
> **Who provides the keys?**
> - **Global Keys (Vercel)**: If you add keys in Vercel, *everyone* who uses your link will use these keys by default.
> - **Individual Keys (User Settings)**: If you leave these blank in Vercel, every user *must* enter their own keys in the app's **Settings** tab. Even if you provide global keys, a user can still override them with their own private keys in the app.

1.  Find the **"Environment Variables"** section.
2.  Add the following **Keys** (Values are optional if you want users to use their own):
    - `GROQ_API_KEY`
    - `JIRA_URL`
    - `JIRA_EMAIL`
    - `JIRA_API_TOKEN`
    - `JIRA_PROJECT`

### Step C: Deploy
1.  Click **"Deploy"**.
2.  Once finished, Vercel will give you a public URL (e.g., `bugpilot-ai.vercel.app`).

---

## 🔑 Multi-User Usage (Important)

Because this app uses **Local Storage** for passwords and keys:
- **For You**: Your keys stay in your browser. You can use the Vercel URL privately.
- **For Teammates/Clients**: Send them your Vercel URL. They will see the app, but they will need to go to the **Settings** tab and enter their own credentials once. This ensures everyone's data stays separate and secure!

> [!TIP]
> If you want to provide a **default** Groq key for everyone, make sure it is added in the Vercel Environment Variables. The app will use that key if the user doesn't provide their own.

---

## 🛠️ Troubleshooting
- **API Errors**: Ensure your `JIRA_URL` includes `https://`.
- **White Screen**: Check the browser console (F12) for errors.
- **Vercel Build Failure**: Ensure `api/index.py` and `vercel.json` are in the root directory.
