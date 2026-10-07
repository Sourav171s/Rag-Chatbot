# Usage Examples for AI Agent Projects

This document provides practical examples of how to use the common-ui wrapper in your AI agent projects.

## Example 1: Simple AI Chatbot Interface

```tsx
import { UIWrapper, Card, CardHeader, CardTitle, CardContent, Button } from '@render-rag-chatbot/common-ui'
import '@render-rag-chatbot/common-ui/styles'

function AIChatbot() {
  return (
    <UIWrapper>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-96 overflow-y-auto border rounded p-4">
              {/* Chat messages */}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 border rounded px-3 py-2"
                placeholder="Type your message..."
              />
              <Button>Send</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </UIWrapper>
  )
}
```

## Example 2: RAG Document Q&A Interface

```tsx
import { 
  UIWrapper, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent,
  Button 
} from '@render-rag-chatbot/common-ui'
import '@render-rag-chatbot/common-ui/styles'

function RAGChatbot() {
  return (
    <UIWrapper centered={false}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Upload Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Upload documents for the AI to reference</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Upload Document
            </Button>
            {/* Document list */}
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ask Questions</CardTitle>
            <CardDescription>Chat with your documents</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Your RAG chat interface */}
          </CardContent>
        </Card>
      </div>
    </UIWrapper>
  )
}
```

## Example 3: AI Image Generator

```tsx
import { 
  UIWrapper, 
  Card, 
  CardHeader, 
  CardTitle,
  CardContent,
  Button 
} from '@render-rag-chatbot/common-ui'
import '@render-rag-chatbot/common-ui/styles'

function ImageGenerator() {
  return (
    <UIWrapper fullWidth>
      <div className="max-w-6xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>AI Image Generator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <textarea 
                  className="w-full border rounded p-3"
                  rows={4}
                  placeholder="Describe the image you want to generate..."
                />
              </div>
              <Button size="lg">Generate Image</Button>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                {/* Generated images */}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </UIWrapper>
  )
}
```

## Example 4: Custom Styling with Dark Mode

```tsx
import { UIWrapper, Card, CardHeader, CardTitle, Button, cn } from '@render-rag-chatbot/common-ui'
import '@render-rag-chatbot/common-ui/styles'
import { useState } from 'react'

function CustomStyledApp() {
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className={darkMode ? 'dark' : ''}>
      <UIWrapper className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => setDarkMode(!darkMode)}
          >
            Toggle Dark Mode
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle>Your AI Agent</CardTitle>
            </CardHeader>
            {/* Your content */}
          </Card>
        </div>
      </UIWrapper>
    </div>
  )
}
```

## Example 5: Multi-step AI Workflow

```tsx
import { 
  UIWrapper, 
  Card, 
  CardHeader, 
  CardTitle,
  CardContent,
  CardFooter,
  Button 
} from '@render-rag-chatbot/common-ui'
import '@render-rag-chatbot/common-ui/styles'

function MultiStepWorkflow() {
  return (
    <UIWrapper>
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>AI Analysis Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Step indicators */}
            <div className="flex justify-between mb-8">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  1
                </div>
                <span className="text-sm mt-2">Input</span>
              </div>
              <div className="flex-1 h-0.5 bg-border self-center mx-4" />
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  2
                </div>
                <span className="text-sm mt-2">Process</span>
              </div>
              <div className="flex-1 h-0.5 bg-border self-center mx-4" />
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  3
                </div>
                <span className="text-sm mt-2">Results</span>
              </div>
            </div>
            
            {/* Step content */}
            <div>
              {/* Your workflow steps */}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="outline">Previous</Button>
          <Button>Next</Button>
        </CardFooter>
      </Card>
    </UIWrapper>
  )
}
```

## Installing in Your AI Project

Add the common-ui as a dependency in your AI project's `package.json`:

```json
{
  "dependencies": {
    "@render-rag-chatbot/common-ui": "workspace:*"
  }
}
```

Then run `npm install` from the root of the monorepo.

## Tips

1. **Always import the styles**: Don't forget to import `'@render-rag-chatbot/common-ui/styles'` in your root component
2. **Use the cn utility**: For conditional classes, use the `cn` utility function
3. **Customize as needed**: The UIWrapper accepts className prop for custom styling
4. **Responsive design**: All components are responsive by default
5. **Dark mode**: Wrap your app in a div with the `dark` class to enable dark mode
