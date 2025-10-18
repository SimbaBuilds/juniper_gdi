# Juniper GDI - Log Visualization Tool

A Next.js-based log visualization tool designed to help developers analyze and debug multi-agent AI systems. This tool provides three specialized viewers for different types of log data, making it easy to understand agent behavior, conversation flows, and system execution.

## Overview

Juniper GDI (General Debugging Interface) is a web-based visualization tool that helps you:
- **Visualize agent execution flows** in real-time NDJSON logs
- **Analyze agent decision-making** through thought, action, and observation sequences
- **Review conversation histories** between users and AI assistants

## Three Types of Viewers

### 1. Agent Flow Viewer (NDJSON)
**Format:** Newline-Delimited JSON (`.log`, `.ndjson`)

Visualizes real-time application logs from multi-agent systems. Each line is a separate JSON object containing structured log data.

**Use case:** Monitor live agent execution, track API calls, debug performance issues, and trace system behavior.

**Example log structure:**
```json
{"timestamp": "2025-08-23T16:04:32.105148+00:00", "level": "INFO", "logger": "app.auth", "message": "Authentication successful", "module": "auth", "component": "api"}
{"timestamp": "2025-08-23T16:04:32.106083+00:00", "level": "INFO", "logger": "app.endpoints.chat", "message": "Received chat request", "module": "chat", "component": "api"}
```

### 2. Agent Logs Viewer (JSON Array)
**Format:** JSON Array (`.json`)

Displays agent reasoning traces showing the complete decision-making process including thoughts, actions, observations, and responses.

**Use case:** Debug agent behavior, understand why agents made specific decisions, analyze multi-turn agent interactions.

**Example log structure:**
```json
[
  {
    "idx": 0,
    "id": "017a3bc8-4fdb-4353-9168-4962423baae6",
    "request_id": "web-1758583337366-1u6n5zlg7",
    "user_id": "56a2c117-6486-4ca5-a57d-6c2e877e7083",
    "type": "thought",
    "turn": 1,
    "agent_name": "Wellness Agent",
    "content": "I need to search their medical records for surgical history",
    "model": "claude-sonnet-4-20250514",
    "created_at": "2025-09-22 23:22:35.649887+00"
  },
  {
    "idx": 1,
    "type": "action",
    "turn": 1,
    "agent_name": "Wellness Agent",
    "action_name": "fetch_medical_records",
    "action_params": "{\"query\": \"surgery\"}",
    "content": "Action: fetch_medical_records"
  }
]
```

### 3. Conversation Viewer (JSON Array)
**Format:** JSON Array (`.json`)

Shows user-assistant conversation histories with full message content and metadata.

**Use case:** Review conversation quality, analyze user interactions, debug assistant responses.

**Example log structure:**
```json
[
  {
    "idx": 0,
    "id": "22e232a0-89b2-4163-90f9-6d72fbd2220f",
    "conversation_id": "b6f6d89e-7041-47b1-861b-be2de4afebea",
    "user_id": "1beb9177-3ea3-48d7-8d02-7f0bb52d1f49",
    "role": "assistant",
    "content": "Here's a nutrient-dense lunch idea...",
    "metadata": "{\"request_id\": \"1759682989083-g6o0i6erd\"}",
    "created_at": "2025-10-05 16:50:22.181723+00"
  },
  {
    "idx": 1,
    "role": "user",
    "content": "what is a healthy lunch idea",
    "created_at": "2025-10-05 16:49:50.03184+00"
  }
]
```

## Getting Started

### Installation

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Using the Viewers

1. **Open the application** in your browser
2. **Select the appropriate viewer** based on your log format:
   - Agent Flow for `.log` or `.ndjson` files
   - Agent Logs for agent reasoning trace JSON arrays
   - Conversation for message history JSON arrays
3. **Upload your log file** using the file picker
4. **Explore the visualization** with filtering, search, and navigation tools

## Example Logs

Sample log files are provided in the `/examples` directory:

- `agent_flow_example.log` - NDJSON application logs for Agent Flow Viewer
- `agent_logs_example.json` - Agent reasoning traces for Agent Logs Viewer
- `conversation_example.json` - Conversation history for Conversation Viewer

You can upload these files to test each viewer and understand the expected format.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **UI:** React with TypeScript
- **Styling:** Tailwind CSS (likely)
- **Font:** Geist (Vercel's font family)

## Development

The page can be edited by modifying `app/page.tsx`. The page auto-updates as you edit the file.

Individual viewer components are located in:
- `/components/ConversationViewer.tsx`
- `/components/LogViewer.tsx`
- `/agent_flow_viewer/AgentFlowViewer.tsx`

## Learn More

To learn more about Next.js:
- [Next.js Documentation](https://nextjs.org/docs) - Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - Interactive Next.js tutorial

## Deployment

The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
