/**
 * BugPilot AI Agent — Client-Side Application
 * Handles tab switching, file upload, API interactions, and result display.
 */

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
    selectedFiles: [],
    currentReport: null,
    isEditing: false,
    isAnalyzing: false,
    settings: {
        groq_api_key: '',
        jira_url: '',
        jira_email: '',
        jira_api_token: '',
        jira_project: ''
    }
};

const SETTINGS_STORAGE_KEY = 'bugpilot-settings';
const VERIFIED_STORAGE_KEY = 'bugpilot-jira-verified';

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
    // Tabs
    tabBtns: $$('.tab-btn'),
    tabPanels: $$('.tab-panel'),

    // Upload
    uploadZone: $('#upload-zone'),
    fileInput: $('#file-input'),
    browseBtn: $('#browse-btn'),
    filePreview: $('#file-preview'),
    previewImage: $('#preview-image'),
    fileName: $('#file-name'),
    removeFile: $('#remove-file'),

    // Input
    testerNotes: $('#tester-notes'),
    analyzeBtn: $('#analyze-btn'),

    // Results
    resultsEmpty: $('#results-empty'),
    resultsLoading: $('#results-loading'),
    resultsReport: $('#results-report'),
    loadingStatus: $('#loading-status'),
    progressFill: $('#progress-fill'),

    // Report Fields (display)
    fieldTitle: $('#field-title'),
    fieldDescription: $('#field-description'),
    fieldSteps: $('#field-steps'),
    fieldExpected: $('#field-expected'),
    fieldActual: $('#field-actual'),
    fieldSeverity: $('#field-severity'),

    // Report Fields (edit)
    editTitle: $('#edit-title'),
    editDescription: $('#edit-description'),
    editSteps: $('#edit-steps'),
    editExpected: $('#edit-expected'),
    editActual: $('#edit-actual'),
    editSeverity: $('#edit-severity'),

    // Actions
    editBtn: $('#edit-btn'),
    resetBtn: $('#reset-btn'),
    createJiraBtn: $('#create-jira-btn'),
    attachScreenshot: $('#attach-screenshot'),

    // Settings
    settingGroqKey: $('#setting-groq-key'),
    settingJiraUrl: $('#setting-jira-url'),
    settingJiraEmail: $('#setting-jira-email'),
    settingJiraToken: $('#setting-jira-token'),
    settingJiraProject: $('#setting-jira-project'),
    testConnectionBtn: $('#test-connection-btn'),
    saveSettingsBtn: $('#save-settings-btn'),
    resetSettingsBtn: $('#reset-settings-btn'),
    connectionResult: $('#connection-result'),
    connectionMessage: $('#connection-message'),

    // Status
    jiraStatusBadge: $('#jira-status-badge'),
    themeToggleBtn: $('#theme-toggle'),

    // Toast
    toastContainer: $('#toast-container'),
};

// ─── Tab Switching ────────────────────────────────────────────────────────────
function switchTab(tabName) {
    els.tabBtns.forEach((btn) => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive);
    });

    els.tabPanels.forEach((panel) => {
        panel.classList.toggle('active', panel.id === `panel-${tabName}`);
    });

    // Persist active tab across refreshes
    sessionStorage.setItem('bugpilot-tab', tabName);
}

els.tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ─── File Upload ──────────────────────────────────────────────────────────────
function handleFiles(files) {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(file => {
        if (!file.type.startsWith('image/')) {
            showToast(`Skipping ${file.name}: Not an image file.`, 'error');
            return false;
        }
        return true;
    });

    if (validFiles.length === 0) return;

    // Add new files to the state
    state.selectedFiles = [...state.selectedFiles, ...validFiles];

    renderPreviews();

    els.uploadZone.classList.add('hidden');
    els.filePreview.classList.remove('hidden');
    els.analyzeBtn.disabled = false;

    // Update step indicator
    updateStepIndicator(2);
}

function renderPreviews() {
    // Clear existing previews in the container
    // We'll reuse the filePreview but change how it renders thumbnails
    els.filePreview.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'preview-grid';

    state.selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'preview-item';

        const img = document.createElement('img');
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-remove-preview';
        removeBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        `;
        removeBtn.onclick = () => removeFile(index);

        const nameLabel = document.createElement('span');
        nameLabel.className = 'preview-name';
        nameLabel.textContent = file.name;

        item.appendChild(img);
        item.appendChild(removeBtn);
        // item.appendChild(nameLabel); // Optional: show name
        grid.appendChild(item);
    });

    // Add "Add More" button to the grid
    const addMore = document.createElement('div');
    addMore.className = 'preview-add-more';
    addMore.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    `;
    addMore.onclick = () => els.fileInput.click();
    grid.appendChild(addMore);

    els.filePreview.appendChild(grid);

    // Add back the global remove all or similar if needed, or just rely on individual removal
}

function removeFile(index) {
    state.selectedFiles.splice(index, 1);

    if (state.selectedFiles.length === 0) {
        els.fileInput.value = '';
        els.uploadZone.classList.remove('hidden');
        els.filePreview.classList.add('hidden');
        els.analyzeBtn.disabled = true;
        updateStepIndicator(1);
    } else {
        renderPreviews();
    }
}

function updateStepIndicator(step) {
    const indicator = $('.step-indicator');
    if (indicator) {
        indicator.textContent = `Step ${step} of 3`;
    }
}

// Drag & Drop
els.uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.uploadZone.classList.add('drag-over');
});

els.uploadZone.addEventListener('dragleave', () => {
    els.uploadZone.classList.remove('drag-over');
});

els.uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

els.uploadZone.addEventListener('click', () => els.fileInput.click());
els.browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    els.fileInput.click();
});
els.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

// ─── Bug Analysis ─────────────────────────────────────────────────────────────
async function analyzeBug() {
    if (state.selectedFiles.length === 0 || state.isAnalyzing) return;

    state.isAnalyzing = true;
    showResults('loading');
    els.analyzeBtn.disabled = true;

    // Animate progress bar
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 8;
        if (progress > 90) progress = 90;
        els.progressFill.style.width = `${progress}%`;

        // Update loading status text
        if (progress < 30) {
            els.loadingStatus.textContent = 'Extracting text from screenshots using LLaMA Scout...';
        } else if (progress < 60) {
            els.loadingStatus.textContent = 'Analyzing extracted content for issues...';
        } else {
            els.loadingStatus.textContent = 'Generating structured bug report...';
        }
    }, 500);

    try {
        const formData = new FormData();
        state.selectedFiles.forEach(file => {
            formData.append('screenshots', file);
        });
        formData.append('notes', els.testerNotes.value || '');

        // Include Groq API Key from local settings
        formData.append('groq_api_key', els.settingGroqKey.value.trim());

        const response = await fetch('/api/analyze-bug', {
            method: 'POST',
            body: formData,
        });

        // ── Check for HTML response (Proxy Interception) ──
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            const htmlSnippet = await response.text();
            const snippet = htmlSnippet.substring(0, 1000).replace(/</g, '&lt;').replace(/>/g, '&gt;');
            throw new Error(`Server returned HTML (Interception?). Snippet: ${snippet}...`);
        }

        const data = await response.json();
        clearInterval(progressInterval);

        if (data.success) {
            state.currentReport = data.report;
            displayReport(data.report);
            showResults('report');
            updateStepIndicator(3);
            showToast('Bug analysis complete!', 'success');
        } else {
            showResults('empty');
            showToast(data.message || 'Analysis failed.', 'error');
        }
    } catch (error) {
        clearInterval(progressInterval);
        showResults('empty');
        showToast(`Network error: ${error.message}`, 'error');
    } finally {
        state.isAnalyzing = false;
        els.analyzeBtn.disabled = state.selectedFiles.length === 0;
    }
}

els.analyzeBtn.addEventListener('click', analyzeBug);

// ─── Display Report ───────────────────────────────────────────────────────────
function displayReport(report) {
    els.fieldTitle.textContent = report.title || 'Information Not Available';
    els.fieldDescription.textContent = report.description || 'Information Not Available';
    els.fieldSteps.textContent = report.steps_to_reproduce || 'Information Not Available';
    els.fieldExpected.textContent = report.expected_result || 'Information Not Available';
    els.fieldActual.textContent = report.actual_result || 'Information Not Available';

    // Severity with badge
    const severity = report.severity || 'Medium';
    els.fieldSeverity.innerHTML = `<span class="severity-badge ${severity.toLowerCase()}">${severity}</span>`;

    // Populate edit fields
    els.editTitle.value = report.title || '';
    els.editDescription.value = report.description || '';
    els.editSteps.value = report.steps_to_reproduce || '';
    els.editExpected.value = report.expected_result || '';
    els.editActual.value = report.actual_result || '';
    els.editSeverity.value = severity;
}

function showResults(view) {
    els.resultsEmpty.classList.toggle('hidden', view !== 'empty');
    els.resultsLoading.classList.toggle('hidden', view !== 'loading');
    els.resultsReport.classList.toggle('hidden', view !== 'report');

    if (view === 'loading') {
        els.progressFill.style.width = '0%';
    }
}

// ─── Edit Mode ────────────────────────────────────────────────────────────────
function toggleEdit() {
    state.isEditing = !state.isEditing;

    const displays = $$('.field-display');
    const edits = $$('.field-edit');

    displays.forEach((el) => el.classList.toggle('hidden', state.isEditing));
    edits.forEach((el) => el.classList.toggle('hidden', !state.isEditing));

    // Update button text
    els.editBtn.innerHTML = state.isEditing
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Done`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit`;

    // If done editing, update report from edit fields
    if (!state.isEditing) {
        state.currentReport = {
            ...state.currentReport,
            title: els.editTitle.value,
            description: els.editDescription.value,
            steps_to_reproduce: els.editSteps.value,
            expected_result: els.editExpected.value,
            actual_result: els.editActual.value,
            severity: els.editSeverity.value,
        };
        displayReport(state.currentReport);
    }
}

els.editBtn.addEventListener('click', toggleEdit);

// ─── Reset / New Analysis ─────────────────────────────────────────────────────
function resetAnalysis() {
    state.currentReport = null;
    state.isEditing = false;

    // Reset files
    state.selectedFiles = [];
    els.fileInput.value = '';
    els.uploadZone.classList.remove('hidden');
    els.filePreview.classList.add('hidden');
    els.filePreview.innerHTML = '';

    els.analyzeBtn.disabled = true;
    els.testerNotes.value = '';
    showResults('empty');
    updateStepIndicator(1);

    // Reset attachment toggle to default (checked)
    if (els.attachScreenshot) {
        els.attachScreenshot.checked = true;
    }

    // Reset edit state
    $$('.field-display').forEach((el) => el.classList.remove('hidden'));
    $$('.field-edit').forEach((el) => el.classList.add('hidden'));
}

els.resetBtn.addEventListener('click', resetAnalysis);

// ─── Create JIRA Ticket ──────────────────────────────────────────────────────
async function createJiraTicket() {
    if (!state.currentReport) return;

    // If in edit mode, save changes first
    if (state.isEditing) {
        toggleEdit();
    }

    els.createJiraBtn.disabled = true;
    els.createJiraBtn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Creating...`;

    try {
        const report = state.currentReport;
        const formData = new FormData();
        formData.append('title', report.title || '');
        formData.append('description', report.description || '');
        formData.append('steps_to_reproduce', report.steps_to_reproduce || '');
        formData.append('expected_result', report.expected_result || '');
        formData.append('actual_result', report.actual_result || '');
        formData.append('severity', report.severity || 'Medium');

        // Append screenshots only if selected AND the user wants them attached
        if (state.selectedFiles.length > 0 && els.attachScreenshot && els.attachScreenshot.checked) {
            state.selectedFiles.forEach(file => {
                formData.append('screenshots', file);
            });
        }

        // Include JIRA credentials from local settings
        formData.append('jira_url', els.settingJiraUrl.value.trim());
        formData.append('jira_email', els.settingJiraEmail.value.trim());
        formData.append('jira_api_token', els.settingJiraToken.value.trim());
        formData.append('jira_project', els.settingJiraProject.value.trim());

        const response = await fetch('/api/create-jira-ticket', {
            method: 'POST',
            body: formData,
        });

        // ── Check for HTML response (Proxy Interception) ──
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            const htmlSnippet = await response.text();
            const snippet = htmlSnippet.substring(0, 1000).replace(/</g, '&lt;').replace(/>/g, '&gt;');
            throw new Error(`Server returned HTML (Interception?). Snippet: ${snippet}...`);
        }

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            if (data.issue_url) {
                showToast(`View ticket: ${data.issue_key}`, 'info');
            }
        } else {
            showToast(data.message || 'Failed to create JIRA ticket.', 'error');
        }
    } catch (error) {
        showToast(`Network error: ${error.message}`, 'error');
    } finally {
        els.createJiraBtn.disabled = false;
        els.createJiraBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Create JIRA Ticket`;
    }
}

els.createJiraBtn.addEventListener('click', createJiraTicket);

// ─── Settings ─────────────────────────────────────────────────────────────────
async function loadSettings() {
    try {
        // 1. Try to load from sessionStorage first (User's private keys)
        const saved = sessionStorage.getItem(SETTINGS_STORAGE_KEY);
        let settings = {};

        if (saved) {
            settings = JSON.parse(saved);
        } else {
            // 2. Fallback to server defaults (e.g. Vercel environment variables)
            const response = await fetch('/api/settings');
            settings = await response.json();
        }

        state.settings = settings;

        // Populate fields
        if (els.settingJiraUrl) els.settingJiraUrl.value = settings.jira_url || '';
        if (els.settingJiraEmail) els.settingJiraEmail.value = settings.jira_email || '';
        if (els.settingJiraProject) els.settingJiraProject.value = settings.jira_project || '';
        if (els.settingGroqKey) els.settingGroqKey.value = settings.groq_api_key || '';
        if (els.settingJiraToken) els.settingJiraToken.value = settings.jira_api_token || '';

        // Update JIRA status badge based on VERIFICATION, not just configuration
        const isVerified = sessionStorage.getItem(VERIFIED_STORAGE_KEY) === 'true';
        updateJiraStatus(isVerified);
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

async function saveSettings() {
    if (!els.settingGroqKey || !els.settingJiraUrl || !els.settingJiraEmail || !els.settingJiraToken || !els.settingJiraProject) {
        showToast('UI Error: Missing settings fields.', 'error');
        return false;
    }

    const newSettings = {
        groq_api_key: els.settingGroqKey.value.trim(),
        jira_url: els.settingJiraUrl.value.trim(),
        jira_email: els.settingJiraEmail.value.trim(),
        jira_api_token: els.settingJiraToken.value.trim(),
        jira_project: els.settingJiraProject.value.trim()
    };

    if (!Object.values(newSettings).every(val => val !== '')) {
        showToast('Please fill in all Settings fields before saving.', 'error');
        return false;
    }

    els.saveSettingsBtn.disabled = true;

    try {
        // 1. Save to sessionStorage (Primary storage)
        sessionStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
        state.settings = newSettings;

        // 2. Also notify backend (Optional, helps server-side connection testing)
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings),
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
                const snippet = errorText.substring(0, 1000).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                showToast(`Settings sync failed: Server returned HTML (Interception?). Snippet: ${snippet}...`, 'error');
            } else {
                showToast(`Settings sync failed: ${response.statusText}`, 'error');
            }
        } else {
            showToast('Settings saved to browser successfully!', 'success');
        }
        return true;
    } catch (error) {
        showToast(`Error saving settings: ${error.message}`, 'error');
        return false;
    } finally {
        els.saveSettingsBtn.disabled = false;
    }
}

/** Clear all fields locally AND persist the empty state to the backend. */
async function resetSettings() {
    resetAnalysis();

    // 1. Clear UI
    if (els.settingGroqKey) els.settingGroqKey.value = '';
    if (els.settingJiraUrl) els.settingJiraUrl.value = '';
    if (els.settingJiraEmail) els.settingJiraEmail.value = '';
    if (els.settingJiraToken) els.settingJiraToken.value = '';
    if (els.settingJiraProject) els.settingJiraProject.value = '';

    if (els.connectionResult) els.connectionResult.classList.add('hidden');
    updateJiraStatus(false);

    // 2. Clear sessionStorage
    sessionStorage.removeItem(SETTINGS_STORAGE_KEY);
    sessionStorage.removeItem(VERIFIED_STORAGE_KEY);
    state.settings = {};

    // 3. Clear server side if possible
    try {
        const clearSettings = {
            groq_api_key: '',
            jira_url: '',
            jira_email: '',
            jira_api_token: '',
            jira_project: ''
        };
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clearSettings)
        });
    } catch (e) { }

    showToast('Settings reset successfully.', 'info');
}

async function testConnection() {
    if (!els.settingJiraUrl || !els.settingJiraEmail || !els.settingJiraToken || !els.settingJiraProject) {
        showToast('UI Error: Missing JIRA fields.', 'error');
        return;
    }

    if (!els.settingJiraUrl.value || !els.settingJiraEmail.value || !els.settingJiraToken.value || !els.settingJiraProject.value) {
        showToast('Please fill in all JIRA fields before testing connection.', 'error');
        return;
    }

    els.testConnectionBtn.disabled = true;
    els.testConnectionBtn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Testing...`;

    try {
        const connectionData = {
            jira_url: els.settingJiraUrl.value.trim(),
            jira_email: els.settingJiraEmail.value.trim(),
            jira_api_token: els.settingJiraToken.value.trim(),
            jira_project: els.settingJiraProject.value.trim()
        };

        const response = await fetch('/api/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(connectionData),
        });

        // ── Check for HTML response (Proxy Interception) ──
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            const htmlSnippet = await response.text();
            if (htmlSnippet.trim().startsWith('<!DOCTYPE') || htmlSnippet.trim().startsWith('<html')) {
                const snippet = htmlSnippet.substring(0, 1000).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                showToast(`Connection failed: Server returned HTML (Proxy/WAF interception?). Snippet: ${snippet}...`, 'error');
            } else {
                showToast(`Connection failed: ${response.statusText}`, 'error');
            }
        } else {
            const data = await response.json();

            // Show result
            els.connectionResult.classList.remove('hidden');
            els.connectionMessage.textContent = data.message;
            els.connectionMessage.className = `connection-message ${data.success ? 'success' : 'error'}`;

            // PERSIST verification status
            sessionStorage.setItem(VERIFIED_STORAGE_KEY, data.success ? 'true' : 'false');
            updateJiraStatus(data.success);
            showToast(data.message, data.success ? 'success' : 'error');
        }
    } catch (error) {
        els.connectionResult.classList.remove('hidden');
        els.connectionMessage.textContent = `Network error: ${error.message}`;
        els.connectionMessage.className = 'connection-message error';
        showToast(`Network error: ${error.message}`, 'error');
    } finally {
        els.testConnectionBtn.disabled = false;
        els.testConnectionBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Test Connection`;
    }
}

function updateJiraStatus(connected) {
    const badge = els.jiraStatusBadge;
    const statusText = badge.querySelector('.status-text');

    if (connected) {
        badge.classList.add('connected');
        statusText.textContent = 'JIRA Connected';
    } else {
        badge.classList.remove('connected');
        statusText.textContent = 'Connection Required';
    }
}

els.saveSettingsBtn.addEventListener('click', saveSettings);
els.testConnectionBtn.addEventListener('click', testConnection);
if (els.resetSettingsBtn) {
    els.resetSettingsBtn.addEventListener('click', resetSettings);
}

// When any JIRA field is changed, invalidate the previous verification status
const jiraInputs = [els.settingJiraUrl, els.settingJiraEmail, els.settingJiraToken, els.settingJiraProject];
jiraInputs.forEach(input => {
    input.addEventListener('input', () => {
        sessionStorage.setItem(VERIFIED_STORAGE_KEY, 'false');
        updateJiraStatus(false);
    });
});

// ─── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
    };

    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;
    els.toastContainer.appendChild(toast);

    // Auto-remove after animation
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 4000);
}

// ─── Theme Toggling ───────────────────────────────────────────────────────────
function initTheme() {
    const savedTheme = sessionStorage.getItem('bugpilot-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    sessionStorage.setItem('bugpilot-theme', newTheme);
}

els.themeToggleBtn.addEventListener('click', toggleTheme);

// ─── Initialize ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    // Verify critical settings elements
    const missing = [];
    if (!els.settingGroqKey) missing.push('setting-groq-key');
    if (!els.settingJiraUrl) missing.push('setting-jira-url');
    if (!els.settingJiraEmail) missing.push('setting-jira-email');
    if (!els.settingJiraToken) missing.push('setting-jira-token');
    if (!els.settingJiraProject) missing.push('setting-jira-project');

    if (missing.length > 0) {
        console.error('CRITICAL: Missing DOM elements detected:', missing);
        showToast(`UI Initialization Error: Missing elements: ${missing.join(', ')}`, 'error');
    }

    // Restore the last active tab (default to 'analyzer')
    const savedTab = sessionStorage.getItem('bugpilot-tab') || 'analyzer';
    switchTab(savedTab);

    // Clear all form fields immediately on load to prevent browser autocomplete
    // from restoring previously entered values that were never saved.
    clearAllFormFields();

    loadSettings();
    showResults('empty');
});

/**
 * Clear every form field on the page so the browser's autocomplete / restore
 * cannot sneak old values back in after a refresh.
 */
function clearAllFormFields() {
    // Settings fields - with safety checks
    if (els.settingGroqKey) els.settingGroqKey.value = '';
    if (els.settingJiraUrl) els.settingJiraUrl.value = '';
    if (els.settingJiraEmail) els.settingJiraEmail.value = '';
    if (els.settingJiraToken) els.settingJiraToken.value = '';
    if (els.settingJiraProject) els.settingJiraProject.value = '';

    // Bug Analyzer fields
    els.testerNotes.value = '';
}
