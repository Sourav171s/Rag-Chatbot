# Common UI Wrapper

A reusable UI component library built with Vite, React, shadcn/ui, Tailwind CSS, and Radix UI. This package provides a common wrapper and UI components that AI agent projects can import and use with their own custom content.

## Features

- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🎭 **shadcn/ui** - Re-usable components built with Radix UI
- ⚡ **Vite** - Fast build tool and dev server
- 🔧 **TypeScript** - Full type safety
- 🎯 **Radix UI** - Accessible component primitives
- 🌓 **Dark Mode** - Built-in dark mode support

## Installation

From the root of the monorepo:

```bash
npm install
```

## Development

To run the development server:

```bash
npm run dev:common-ui
```

To build the library:

```bash
npm run build:common-ui
```

## Usage in AI Agent Projects

### 1. Import the UIWrapper

The `UIWrapper` component provides a consistent layout foundation while allowing you to render your own content:

```tsx
import { UIWrapper } from '@render-rag-chatbot/common-ui'
import '@render-rag-chatbot/common-ui/styles'

function MyAIApp() {
  return (
    <UIWrapper>
      <h1>My AI Agent Content</h1>
      {/* Your custom AI agent UI goes here */}
    </UIWrapper>
  )
}
```

### 2. Use Pre-built Components

The library exports shadcn/ui components that you can use:

```tsx
import { 
  UIWrapper, 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@render-rag-chatbot/common-ui'
import '@render-rag-chatbot/common-ui/styles'

function MyAIApp() {
  return (
    <UIWrapper>
      <Card>
        <CardHeader>
          <CardTitle>AI Chatbot</CardTitle>
          <CardDescription>Chat with our AI assistant</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Your chat interface */}
          <Button>Send Message</Button>
        </CardContent>
      </Card>
    </UIWrapper>
  )
}
```

### 3. UIWrapper Props

The `UIWrapper` component accepts the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | The content to render inside the wrapper |
| `className` | `string` | `undefined` | Additional CSS classes |
| `fullWidth` | `boolean` | `false` | Whether to use full width (no max-width constraint) |
| `centered` | `boolean` | `true` | Whether to center the content vertically |

Example with props:

```tsx
<UIWrapper fullWidth centered={false} className="bg-gradient-to-br from-blue-50 to-indigo-100">
  {/* Your content */}
</UIWrapper>
```

## Available Components

### UI Components

- **Button** - Versatile button component with variants (default, destructive, outline, secondary, ghost, link)
- **Card** - Card container with sub-components (CardHeader, CardTitle, CardDescription, CardContent, CardFooter)

### Utilities

- **cn** - Utility function for merging Tailwind CSS classes

```tsx
import { cn } from '@render-rag-chatbot/common-ui'

const className = cn('base-class', condition && 'conditional-class', customClass)
```

## Adding More shadcn/ui Components

To add additional shadcn/ui components:

1. Navigate to the common-ui directory:
```bash
cd common-ui
```

2. Use the shadcn CLI (if installed):
```bash
npx shadcn-ui@latest add [component-name]
```

3. Or manually create components in `src/components/ui/` following the shadcn patterns

4. Export the new component from `src/index.ts`

## Project Structure

```
common-ui/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   │   ├── Button.tsx
│   │   │   └── Card.tsx
│   │   └── UIWrapper.tsx # Main wrapper component
│   ├── lib/
│   │   └── utils.ts      # Utility functions
│   ├── styles/
│   │   └── globals.css   # Global styles and Tailwind directives
│   └── index.ts          # Main entry point
├── components.json       # shadcn/ui configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
└── package.json
```

## Styling

The package uses CSS variables for theming, making it easy to customize colors:

- Light and dark mode support out of the box
- Customizable via CSS variables in `globals.css`
- Follows shadcn/ui theming conventions

## TypeScript Support

Full TypeScript support with exported types:

```tsx
import type { UIWrapperProps, ButtonProps } from '@render-rag-chatbot/common-ui'
```

## License

MIT
