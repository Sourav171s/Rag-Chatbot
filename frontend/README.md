# RAG Chatbot Frontend

A modern chatbot interface built with React, Vite, TypeScript, and Tailwind CSS. Fully integrated with the RAG backend API for real-time AI-powered conversations.

## ✨ Features

- 💬 **Real-time Chat** - Full integration with RAG backend API
- 📚 **Source Citations** - Shows reference count for each AI response
- 🎯 **Token Usage Tracking** - Visual gauge showing context window utilization (Gemini 3.8 Flash, 1M-token input context)
- 🔄 **Conversation Persistence** - Maintains conversation ID for multi-turn dialogues
- 🎨 **Modern UI** - Beautiful interface with Tailwind CSS and Radix UI components
- 🌙 **Dark Mode Support** - CSS variable-based theming
- 📜 **Smooth Scrolling** - Auto-scroll to latest messages with Radix UI ScrollArea
- ⌨️ **Loading States** - Visual feedback during API calls
- 🎭 **User Avatars** - Distinct icons for user and assistant (Lucide React)
- 🚀 **Docker Support** - Containerized deployment with Nginx

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless UI components
- **shadcn/ui** - Component library built on Radix UI
- **Lucide React** - Icon library
- **common-ui** - Shared UI wrapper package

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── Chatbot.tsx          # Main chatbot component
│   ├── lib/
│   │   └── utils.ts             # Utility functions (cn)
│   ├── App.tsx                  # Root component with UIWrapper
│   ├── main.tsx                 # Entry point
│   ├── index.css                # Global styles with Tailwind
│   └── vite-env.d.ts           # Vite type definitions
├── index.html                   # HTML template
├── package.json                 # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── postcss.config.js           # PostCSS configuration
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

From the project root:

```bash
npm install
```

### Development

Start the development server:

```bash
# From project root
npm run dev:frontend

# Or from this directory
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

### Build

Build for production:

```bash
# From project root
npm run build:frontend

# Or from this directory
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Component Usage

### Chatbot Component

The `Chatbot` component is the main chat interface:

```tsx
import { Chatbot } from './components/Chatbot'

function App() {
  return <Chatbot />
}
```

### With UIWrapper

The app uses the `UIWrapper` from `common-ui` to provide consistent styling:

```tsx
import { UIWrapper } from 'common-ui'
import { Chatbot } from './components/Chatbot'

function App() {
  return (
    <UIWrapper>
      <Chatbot />
    </UIWrapper>
  )
}
```

## Customization

### Styling

The chatbot uses CSS variables for theming. You can customize colors in `src/index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  /* ... more variables */
}
```

### Backend Integration

The chatbot is **fully integrated** with the RAG backend API. Here's how it works:

**API Configuration (`src/config.ts`):**
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const getApiUrl = (endpoint: string): string => {
  // Handles both relative paths (Docker) and absolute URLs (development)
  // Automatically adds https:// if protocol is missing
}
```

**Chat Flow:**
1. User submits message
2. Frontend sends POST request to `/api/chat`:
   ```json
   {
     "message": "User's question",
     "conversationId": "uuid-if-continuing-conversation"
   }
   ```
3. Backend processes with RAG pipeline:
   - Generates embedding for query
   - Searches vector database for relevant documents
   - Builds context with conversation history
   - Generates AI response with Gemini
4. Backend returns response:
   ```json
   {
     "success": true,
     "data": {
       "message": "AI response",
       "conversationId": "uuid",
       "sourceCount": 3,
       "usage": {
         "promptTokens": 500,
         "completionTokens": 150,
         "totalTokens": 650
       }
     }
   }
   ```
5. Frontend displays response with source count and updates token gauge

**Environment Variables:**
- Development: `VITE_API_URL=http://localhost:3001`
- Docker: Set as build arg in `docker-compose.yml`
- Production (Render): Automatically set from backend service URL

## Available Scripts

- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

## 🚀 Production Deployment

### Docker Deployment

The frontend uses a two-stage Docker build:

**Stage 1: Build**
```bash
# Builds React app with Vite
# Requires VITE_API_URL as build arg
docker build \
  --build-arg VITE_API_URL=https://your-backend-url.com \
  -f frontend/Dockerfile \
  -t rag-frontend .
```

**Stage 2: Serve**
- Uses Nginx Alpine for minimal footprint
- Serves static files from `/usr/share/nginx/html`
- Custom nginx.conf for SPA routing

**Run:**
```bash
docker run -p 3000:80 rag-frontend
```

### Deploy to Render.com

Configured in root `render.yaml`:
- Automatically pulls `VITE_API_URL` from backend service
- Builds with correct API endpoint at build time
- Serves via Nginx on port 80
- Auto-deploy on git push

See root `README.md` for detailed deployment instructions.

### Build-Time vs Runtime Configuration

**Important:** Vite requires environment variables at **build time**, not runtime.

✅ **Correct (Build time):**
```dockerfile
ARG VITE_API_URL=https://api.example.com
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build
```

❌ **Incorrect (Runtime):**
```dockerfile
# This won't work - variables are baked into build
RUN npm run build
ENV VITE_API_URL=$VITE_API_URL
```

## 🎨 UI Components

### Chatbot Component

The main `Chatbot` component includes:
- Message list with user/assistant distinction
- Real-time loading indicators
- Token usage visualization
- Source citation badges
- Auto-scrolling message area
- Error handling with user feedback

### Token Usage Gauge

Visual indicator showing context window usage:
- **Green**: 0-70% usage
- **Yellow**: 70-90% usage  
- **Red**: 90-100% usage

Helps users understand when they're approaching the context limit (1,048,576 input tokens for Gemini 3.8 Flash).

## 🔧 Configuration

### API URL Configuration

The frontend uses `src/config.ts` for API configuration:

```typescript
// Development (local backend)
VITE_API_URL=http://localhost:3001

// Docker Compose (service networking)
VITE_API_URL=http://backend:3001

// Production (Render/other platforms)
VITE_API_URL=https://your-backend-url.com
```

**Or use relative paths:**
```typescript
VITE_API_URL=  # Empty string uses relative paths
```

### Styling Customization

Colors are defined in `src/index.css` using CSS variables:

```css
:root {
  --background: 0 0% 100%;        /* White background */
  --foreground: 222.2 84% 4.9%;   /* Dark text */
  --primary: 221.2 83.2% 53.3%;   /* Blue primary color */
  --muted: 210 40% 96.1%;         /* Light gray for assistant */
  /* ... more variables */
}

.dark {
  /* Dark mode overrides */
}
```

## 📦 Dependencies

**Core:**
- `react` (18.x) - UI library
- `react-dom` (18.x) - React DOM rendering

**UI Components:**
- `@radix-ui/react-scroll-area` - Accessible scrollable container
- `lucide-react` - Icon library (Bot, User, Send icons)

**Styling:**
- `tailwindcss` - Utility-first CSS framework
- `tailwindcss-animate` - Animation utilities
- `tailwind-merge` - Merge Tailwind classes
- `clsx` - Conditional class names

**Monorepo:**
- `common-ui` - Shared UI wrapper (local workspace package)

**Dev Tools:**
- `vite` - Build tool and dev server
- `typescript` - Type safety
- `eslint` - Code linting

## 🐛 Troubleshooting

**1. API connection errors:**
```bash
# Check VITE_API_URL is set correctly
echo $VITE_API_URL

# For development, should point to backend
VITE_API_URL=http://localhost:3001
```

**2. Build failures:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Ensure common-ui is built first
npm run build -w common-ui
```

**3. Environment variables not working:**
- Remember: Vite needs vars at **build time**
- Must start with `VITE_` prefix
- Rebuild after changing env vars

**4. Nginx routing issues (Docker):**
- Check `nginx.conf` includes SPA fallback:
  ```nginx
  try_files $uri $uri/ /index.html;
  ```

## 📚 Additional Documentation

- Root `README.md` - Full project setup and deployment
- `backend/README.md` - API documentation and backend details
- `common-ui/README.md` - Shared component library

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional UI components (file upload, voice input)
- Markdown rendering for AI responses
- Code syntax highlighting
- Message search and filtering
- Export conversation history

## 📄 License

This project is part of the RAG Chatbot monorepo. MIT License.
