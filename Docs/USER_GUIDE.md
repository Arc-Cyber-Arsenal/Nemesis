# Nemesis User Guide

Complete guide to running security assessments with AI-driven pentesting.

---

## Overview

Nemesis follows a streamlined workflow:

```
Create Assessment → Configure Workspace → Connect AI → Run Tests → Review Findings
```

**You manage** the assessment scope and configuration.  
**The AI handles** command execution, vulnerability testing, and documentation.

---

## Quick Start

### 1. Create a New Assessment

Click **"New Assessment"** from the sidebar or dashboard.

<img src="../assets/doc/new-assessment-button.png" alt="New Assessment Button" width="33%" />

Fill in the required information:
- **Assessment Name** - Unique identifier (e.g., "Acme Corp Pentest")
- **Client Name** - Organization being tested
- **Target Domains** - Primary targets (e.g., `app.acme.com`)
- **IP Scopes** - Network ranges (e.g., `10.0.0.0/24`)
- **Category** - Type of assessment (API, Website, Infrastructure, etc.)
- **Environment** - Production, Development
- **Scope & Objectives** - What's in scope and out of scope
- **Start/End Dates** - Assessment timeline

<img src="../assets/doc/assessment-creation.png" alt="Assessment Creation" width="66%" />

Your assessment is now ready!

---

## 📁 Assessment Workspace

Each assessment gets its own isolated workspace inside the pentesting container with a predefined folder structure:

```
/workspace/assessment-name/
├── recon/          # Scan outputs, nmap results, enumeration data
├── exploits/       # PoC scripts, payloads, exploit code
├── loot/           # Extracted data, credentials, sensitive files
├── notes/          # Screenshots, analysis notes, observations
├── scripts/        # Custom automation scripts
└── context/        # User-provided documentation (uploaded files)
```

**How it works:**
- The AI automatically saves scan results to appropriate folders
- All commands execute within this workspace context
- Files persist across sessions
- You can access the workspace directly via the UI

---

## 🔑 Credentials & Authentication

### Managing Credentials

Store discovered credentials or provide authentication tokens for testing:

![Credentials Management](../assets/doc/credentials-management.png)

**Supported credential types:**
- **Bearer Tokens** - API tokens, JWT tokens
- **API Keys** - Service API keys
- **Cookies** - Session cookies
- **SSH Credentials** - Username/password or key pairs
- **Basic Auth** - HTTP basic authentication
- **Custom** - Any other authentication format

**Placeholder Usage:**

When you add a credential, Nemesis generates a placeholder like `{{ADMIN_API_TOKEN}}`. The AI can use this in commands:

```bash
curl -H "Authorization: Bearer {{ADMIN_API_TOKEN}}" https://api.acme.com/admin
```

The placeholder is automatically replaced with the actual token during execution.

---

## Context Documents

Upload supporting documentation to help the AI understand your target:

![Context Upload](../assets/doc/context-upload.png)

**What to upload:**
- API documentation (OpenAPI/Swagger specs)
- Architecture diagrams
- Previous penetration test reports
- Scope definitions and rules of engagement
- Configuration files
- Source code (if white-box testing)

**After upload:**

<img src="../assets/doc/workspace-view.png" alt="Workspace View" width="33%" />

The AI can read these documents for context when planning attacks and understanding the application architecture.

---

## Reconnaissance Data & Import

### Automatic Reconnaissance Tracking

The AI automatically tracks discovered assets in the **Recon Data** section:

![Recon Data](../assets/doc/recon-data.png)

**Tracked asset types:**
- Endpoints (API routes, URLs)
- Subdomains
- Services (ports, protocols)
- Technologies (frameworks, libraries)
- Databases
- Ports
- Vulnerabilities

### Pre-Assessment Scans Import

For infrastructure assessments, it's recommended to run long scans beforehand and import results:

<img src="../assets/doc/import-scans.png" alt="Import Scan Results" width="66%" />

**Supported import formats:**
- Nmap XML output
- Nuclei JSON results
- ffuf JSON output
- Custom JSON/CSV formats

**Why pre-import?**
- Saves time during the assessment
- Long-running scans (full port scans) can run overnight
- AI starts with complete reconnaissance data
- More efficient testing workflow

---

## 🚀 Starting the Assessment

### Connect Your AI

Launch Nemesis with your preferred AI client:

```bash
# Auto-detect Claude Code or Kimi CLI
python3 nemesis.py --assessment "Acme Corp Pentest"

# Or force a specific CLI
python3 nemesis.py --assessment "Acme Corp Pentest" --cli claude
python3 nemesis.py --assessment "Acme Corp Pentest" --cli kimi
```

The CLI injects the preprompt and loads the assessment context automatically. Then tell the AI:

```
Load assessment 'Acme Corp Pentest'
```

The AI receives:
- Assessment metadata (scope, targets, objectives)
- Pre-loaded reconnaissance data
- Existing findings and cards
- Command history from previous sessions
- Credential placeholders for authenticated testing
- Context documents (if uploaded)

### Running Commands

The AI executes commands directly in the pentesting container:

**Example commands:**
```bash
# Network scanning
nmap -sV -p- 10.0.0.1

# Directory enumeration
ffuf -u https://app.acme.com/FUZZ -w /usr/share/wordlists/common.txt

# SQL injection testing
sqlmap -u "https://app.acme.com/api?id=1" --dbs --batch

# Subdomain discovery
subfinder -d acme.com -silent
```

All output is captured and logged in command history.

### Creating Findings

When the AI discovers vulnerabilities, it automatically creates finding cards:

**Example finding card:**
```
Title: SQL Injection in User API
Severity: CRITICAL
Status: confirmed
Target: https://app.acme.com/api/users?id=1
Technical Analysis: 
  The 'id' parameter is vulnerable to SQL injection. 
  Error-based injection reveals MySQL 5.7 database.
Proof:
  sqlmap -u "https://app.acme.com/api/users?id=1" --dbs
  [Output showing database extraction]
```

### Credential Storage

When credentials are discovered, the AI stores them with placeholders:

**Example:**
```
Type: Bearer Token
Name: Admin API Access
Service: Admin API
Target: https://api.acme.com/admin
Placeholder: {{ADMIN_API_ACCESS}}
Notes: Found in config.js, expires 2026-02-28
```

---

## Command Approval System

For security and control, Nemesis supports three command approval modes:

![Command Approval Settings](../assets/doc/command-approval-modes.png)

### Approval Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Open** | All commands execute automatically | Trusted environments, development |
| **Filtered** | Only flagged commands require approval | Production testing with safeguards |
| **Closed** | Every command requires manual approval | High-risk targets, strict compliance |

### Filtered Mode Configuration

![Filtered Keywords](../assets/doc/command-approval-keywords.png)

In **Filtered** mode, specify dangerous keywords that trigger approval.

### Approval Notifications

**⚠️ Important:** Enable browser notifications!

When a command requires approval:
1. Browser notification appears
2. Popup shows command details
3. You approve or reject
4. Unapproved commands timeout after 30 seconds (by default) *

**Without notifications enabled, commands will timeout!**

*Configure in **Settings → Command Execution**.

---

## Cards System

Cards are the primary documentation mechanism in Nemesis. There are three types:

### 1. Finding Cards (Vulnerabilities)

Confirmed or potential security vulnerabilities.

![Finding Card Example](../assets/doc/finding-card-example.png)

**Fields:**

| Field | Description | Example |
|-------|-------------|---------|
| **Title** | Vulnerability name | "SQL Injection in Login Form" |
| **Severity** | Risk level | CRITICAL / HIGH / MEDIUM / LOW / INFO |
| **Status** | Confirmation status | confirmed / potential / untested |
| **Target/Service** | Affected component | `https://app.acme.com/login` |
| **Technical Analysis** | Detailed explanation | "The username parameter lacks input validation..." |
| **Proof** | PoC commands and output | Full reproduction steps |

**Severity Guidelines:**
- **CRITICAL** - Direct exploitation with major impact (RCE, full DB access)
- **HIGH** - Exploitable with significant impact (auth bypass, data leak)
- **MEDIUM** - Conditional exploitation (CSRF, XSS)
- **LOW** - Minor issues (information disclosure)
- **INFO** - Hardening recommendations

### 2. Observation Cards

Security-relevant findings that aren't direct vulnerabilities but indicate weaknesses or misconfigurations.

**Examples:**
- "Server discloses version in headers (nginx/1.18.0)"
- "No rate limiting on login endpoint"
- "Cookies missing HttpOnly and Secure flags"
- "Cloudflare WAF detected - bypass may be possible"
- "Directory listing enabled on /backup/"
- "Verbose error messages reveal stack traces"

### 3. Info Cards

General notes and context information.

**Examples:**
- "Application stack: React 18 + Node.js + PostgreSQL"
- "API documentation available at /swagger"
- "Authentication uses JWT tokens with 24h expiry"
- "Backup endpoint found at /api/v1/export"

---

## Command History

Every command execution is logged with full details:

<!-- TODO: Add command history screenshot -->
![Command History](../assets/doc/command-history.png)

**Logged information:**
- Command text
- Execution timestamp
- Exit code (success/failure)
- Standard output (stdout)
- Error output (stderr)
- Execution time
- Associated phase (recon, mapping, exploitation)

Access via **Commands** page or within each assessment detail view.

---

## Folder Organization

Organize assessments into folders for better project management:

**Default folders:**
- **Active** - Ongoing engagements
- **Archived** - Completed assessments

**Create custom folders:**
- By client (e.g., "Acme Corp", "Beta Inc")
- By type (e.g., "Web Apps", "Infrastructure", "APIs")
- By quarter (e.g., "Q1 2026", "Q2 2026")

Folders help maintain organization across multiple concurrent assessments.

---

## Settings & Configuration

### Platform Settings

**Backend Configuration:**
- API URL (default: `http://localhost:8000/api`)
- Container management (Exegol)
- Database connection

**Command Execution:**
- Approval mode (Open/Filtered/Closed)
- Dangerous keywords (for Filtered mode)
- Command timeout duration
- Output length limits

**UI Preferences:**
- Theme (light/dark)

### Pentesting Container

Nemesis manages the pentesting container automatically:
- **nemesis-pentest** (default): `docker exec -it nemesis-pentest bash`
- **Exegol** (if selected): `docker exec -it exegol-nemesis /bin/zsh`

Container name and workspace mount are configurable in **Settings → Container**.

---

## Best Practices

### Before Starting

1. **Define scope clearly** - Specify exactly what's in/out of scope
2. **Upload context docs** - API docs, architecture diagrams
3. **Pre-run long scans** - Import nmap, nuclei results
4. **Configure credentials** - Add known test accounts
5. **Set approval mode** - Choose appropriate command control

### During Assessment

1. **Enable notifications** - For command approvals
2. **Monitor command history** - Check AI decision-making

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [**Installation Guide**](INSTALLATION.md) | Setup Nemesis — Claude Code, Kimi, and other clients |
| [**MCP Tools Reference**](MCP_TOOLS.md) | Complete list of AI-available tools |
| [**Architecture**](ARCHITECTURE.md) | Technical deep dive into Nemesis |
| [**PrePrompt**](PrePrompt.txt) | AI behavior guidelines |

---

Need help? Contact **vasco0x4** on Discord.
