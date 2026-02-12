# Web Annotator

A modern web application for capturing and annotating articles with a distraction-free reading experience.

## What It Does

Web Annotator lets you save web articles in a clean, readable format and add your own notes and highlights. Think of it as a personal research library where you can:

- Capture articles from any URL in a clean, reader-friendly format
- Add notes and annotations as you read
- Organize articles into projects
- Customize your reading experience (font, size, theme)
- Track your reading progress

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Firebase (Authentication + Firestore)
- **AI Integration**: BYOK chat providers + local CLI bridge support
- **Deployment**: Optimized for Vercel

## Quick Start

### Prerequisites

- Node.js 24.x
- Firebase project with Firestore and Google Authentication enabled

### Installation

1. **Clone and install**

   ```bash
   git clone <repository-url>
   cd web-annotator
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp env.example .env.local
   ```

   Edit `.env.local` and add your Firebase credentials:

   ```env
   # Firebase Client Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Firebase Admin (for local development)
   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

   # Optional: local CLI bridge endpoint for AI chat local mode
   CLI_BRIDGE_URL=http://127.0.0.1:3456
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

   Optional: start with local CLI chat bridge (`../cli-bridge`) for Codex/Claude/Gemini CLI:

   ```bash
   npm run dev:with-cli
   ```

4. **Open [http://localhost:3000](http://localhost:3000)**

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable Google Sign-In in Authentication settings
3. Create a Firestore database
4. Download your service account JSON from Project Settings > Service Accounts
5. Save it as `firebase-service-account.json` in the project root

## Basic Usage

### Importing Articles

1. Sign in with your Google account
2. Paste a URL into the input field on the home page
3. Click "Import" to save the article

### Reading and Annotating

1. Click any article in your library to open the reader
2. Use the toolbar to customize appearance:
   - Adjust font size (XS to 2XL)
   - Change font family (Sans, Serif, Mono)
   - Switch theme (Light, Dark, Sepia)
3. Click "Add Note" to create annotations
4. Drag notes to position them anywhere on screen

### Notes AI Chat

1. In reader view, open the right sidebar and switch to **AI Chat**
2. Pick a provider and model from the chat settings
3. For cloud providers (OpenAI/Anthropic/Gemini/Gateway), paste your own API key (stored only in local browser storage)
4. For local provider mode, run `../cli-bridge` or use `npm run dev:with-cli`
5. Ask questions using article + note context

### Organizing with Projects

1. Create projects from the home page
2. Assign articles to projects when importing or via the article menu
3. Filter your library by project
4. Mark articles as "In Progress" or "Read"

## Development

### Available Commands

```bash
npm run dev          # Start development server
npm run dev:with-cli # Start Next.js + local ../cli-bridge
npm run cli-bridge   # Start only local ../cli-bridge
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # Check TypeScript types
```

### Code Quality

This project uses automated pre-commit hooks that run:

- Prettier (code formatting)
- ESLint (code quality)
- TypeScript (type checking)

Simply make your changes and commit - the hooks will ensure code quality automatically.

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

Examples:
feat(reader): add PDF export
fix(auth): resolve token refresh issue
chore: update dependencies
```

## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel project settings:
   - All `NEXT_PUBLIC_*` variables
   - `FIREBASE_SERVICE_ACCOUNT_KEY` (base64-encoded service account JSON)

To encode your service account for Vercel:

```bash
# macOS
base64 firebase-service-account.json | tr -d '\n'

# Linux
base64 -w0 firebase-service-account.json
```

## Project Structure

```
web-annotator/
├── src/
│   ├── app/              # Next.js pages and API routes
│   ├── components/       # React components
│   ├── lib/              # Business logic and utilities
│   └── types.ts          # TypeScript definitions
├── public/               # Static assets
├── AGENTS.md             # AI agent development guide
└── README.md             # This file
```

## Features

### Current

- Clean article extraction using Mozilla Readability
- Google Sign-In authentication
- Per-user data isolation
- Contextual annotations with optional DOM anchoring
- AI chat in notes sidebar (BYOK + local CLI mode)
- Project-based organization
- Customizable reader (theme, font, size)
- Reading progress tracking

### Roadmap

- PDF and image document support
- YouTube videos with timestamped comments
- Export to Markdown/PDF
- Browser extension for quick capture
- Collaboration features
- Canvas view for linking related documents

## Security

- All HTML content is sanitized before storage
- User authentication required for all operations
- Per-user data isolation enforced at the database level
- Ownership verification on all operations

## For Developers

For comprehensive development documentation including architecture, patterns, and technical decisions, see **[AGENTS.md](./AGENTS.md)**.

## License

This project is private and not licensed for public use.

## Support

For issues or questions, please open an issue on GitHub.
