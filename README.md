# Clarity

Audio transcription and AI refinement platform built with Next.js and React.

## Features

- Record audio directly in browser with real-time waveform visualization
- Upload audio files (MP3, WAV, FLAC, OGG, M4A, WEBM)
- Multi-provider support: OpenAI, Groq, AssemblyAI
- AI-powered text refinement and improvement
- Markdown notes with edit/preview modes
- Full export/import for transcripts and notes
- Dark mode support
- Responsive design (mobile, tablet, desktop)
- Client-side only - all data stays in your browser

## Quick Start

### Prerequisites
- Node.js 18+
- API key from: OpenAI, Groq, or AssemblyAI

### Installation

```bash
git clone <repository>
cd clarity
pnpm install
pnpm dev
```

Open http://localhost:3000

### First Run

1. Complete onboarding (select provider, add API key, choose models)
2. Record audio or upload a file
3. View transcripts and refine with AI
4. Create notes and manage data

## Project Structure

```
clarity/
├── app/                     # Pages and layouts
│   ├── transcribe/         # Recording interface
│   ├── transcripts/        # Transcript history
│   ├── notes/              # Markdown notes
│   ├── settings/           # Configuration
│   ├── fine-tune/          # Refinement comparison
│   └── onboarding/         # Setup flow
├── components/             # React components
│   ├── audio-recorder/     # Recording components
│   ├── onboarding/         # Setup flow steps
│   ├── transcript-list/    # History management
│   ├── transcription/      # Results display
│   └── ui/                 # Base components
├── lib/                    # Services and utilities
│   ├── audio-recorder.ts   # Web Audio API
│   ├── storage.ts          # localStorage management
│   ├── transcription-service.ts
│   ├── finetuning-service.ts
│   ├── providers.ts        # API integration
│   ├── encryption.ts       # Data encryption
│   └── types.ts            # TypeScript definitions
└── public/                 # Static assets
```

## Architecture

### Recording & Transcription
1. User records audio or uploads file
2. Web Audio API processes audio (FFT 2048, time-domain analysis)
3. Audio Blob sent to selected provider (OpenAI/Groq/AssemblyAI)
4. Transcript returned and saved to localStorage
5. User can edit, tag, and refine transcript

### Fine-tuning
1. User clicks "Refine" on transcript
2. Raw text + custom system prompt sent to provider
3. AI model improves text
4. Side-by-side comparison displayed
5. User accepts or rejects refinement

### Storage
All data persists in localStorage with encryption:
- `clarity-settings` - User preferences and provider config
- `clarity-transcripts` - All transcripts with metadata
- `clarity-notes` - All markdown notes
- API keys encrypted with AES-256

## Configuration

### Supported Providers

**OpenAI**
- Transcription: Whisper
- Refinement: GPT-4 Turbo
- Max file: 25MB

**Groq**
- Transcription: Whisper
- Refinement: Mixtral 8x7b
- Max file: 25MB

**AssemblyAI**
- Transcription: Universal Model
- Refinement: Limited support
- Max file: 2GB

### API Keys
Enter during onboarding. Keys stored encrypted locally, never sent to external servers.

### System Prompt
Optional custom instructions for AI refinement. Applied to all fine-tuning requests.

## Technology Stack

- **Framework**: Next.js 16.0.10
- **UI**: React 19.2.0, Tailwind CSS 4.x
- **Components**: Shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **Markdown**: @uiw/react-md-editor
- **Type Safety**: TypeScript 5.0.2
- **Form Validation**: React Hook Form + Zod

## Performance

- Page Load: < 2 seconds
- Time to Interactive: < 3 seconds
- Bundle Size: ~200KB (gzipped)
- Real-time waveform at 60fps
- Deferred model loading for instant page display

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

### Available Scripts

```bash
pnpm dev      # Start dev server on port 3000
pnpm build    # Production build
pnpm start    # Run production server
pnpm lint     # Run ESLint
```

### Code Structure

**RecorderContainer** - Main recording UI with controls and waveform
**TranscriptionResult** - Display transcript, edit, tags, and refinement
**NotesPage** - Markdown editor with edit/preview modes
**SettingsPage** - Provider config, data management, export/import

### Key Services

**audio-recorder.ts** - Web Audio API wrapper for recording
**storage.ts** - localStorage management with encryption
**transcription-service.ts** - Provider API calls for transcription
**finetuning-service.ts** - Provider API calls for refinement
**providers.ts** - Provider-specific integrations

## Design System

### Colors (Notion-inspired)
- Background: #f7f6f3 (warm off-white)
- Foreground: #37352f (dark gray)
- Primary: #2383e2 (vibrant blue)
- Secondary: #f1f0ed (light gray)
- Border: #d3d1cb (subtle gray)
- Accent: #e9f3ff (light blue)

### Icons
Lucide React with Notion-style minimalism

## Data Security

- Client-side processing only
- Sensitive data encrypted with AES-256
- No data persisted on servers
- Full data export/import capability
- Open source and auditable code

## Troubleshooting

### Microphone not working
- Check browser permissions
- Ensure microphone connected
- Try different browser
- Restart computer

### API key rejected
- Verify correct API key
- Check provider account is active
- Try refreshing page
- Confirm API key from correct provider

### Transcription slow
- Check internet connection
- Try shorter audio file
- Verify provider API status
- Check file size limits

### Data lost
- Check if browser data was cleared
- Try importing from backup
- Clear browser cache
- Export remaining data

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

Or connect GitHub repository to Vercel dashboard.

### Other Platforms

- **Netlify**: `netlify deploy`
- **Self-hosted**: `pnpm build && pnpm start`

Environment: Node.js 18+

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Hold to record |
| Esc | Close dialog |
| Ctrl/Cmd+A | Select all |
| Ctrl/Cmd+C | Copy |

## File Size Limits

| Provider | Limit |
|----------|-------|
| OpenAI | 25MB |
| Groq | 25MB |
| AssemblyAI | 2GB |

## Browser Storage

Default localStorage quota:
- Chrome: 5-10MB
- Firefox: 10MB
- Safari: 5MB

Check usage in Settings. Export if running low.

## Contributing

To contribute:

1. Fork repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "Add my feature"`
4. Push branch: `git push origin feature/my-feature`
5. Open Pull Request

Code should follow existing patterns, use TypeScript, include error handling.

## FAQ

**Q: Is my API key safe?**
A: Yes. Keys are encrypted and stored locally. Never sent to external servers.

**Q: Can I use this offline?**
A: Partially. App loads offline but transcription requires internet.

**Q: Can I self-host?**
A: Yes. Use `pnpm build && pnpm start`.

**Q: What happens to my data?**
A: All data stays in your browser. Never sent to servers. Export anytime.

**Q: Can I change providers?**
A: Yes. Settings > Reset Provider to re-run onboarding.

**Q: How do I backup my data?**
A: Settings > Data Management > Export as JSON.

**Q: How do I restore data?**
A: Settings > Data Management > Import JSON file.

**Q: What browsers work?**
A: Chrome, Firefox, Safari, Edge (latest versions).

**Q: Can I edit transcripts?**
A: Yes. Click on any transcript to edit text directly.

**Q: How does refinement work?**
A: Raw transcript + custom prompt sent to AI. AI improves text. You accept/reject.

## Support

For issues:
1. Check browser console for errors (F12)
2. Verify API key and provider account
3. Try clearing browser cache
4. Check provider API status
5. Report issue with details and browser info

## License

Educational and personal use.

---

Built with Next.js and React
Latest Update: January 2026
