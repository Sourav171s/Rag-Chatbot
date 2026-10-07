// Export styles
import './styles/globals.css'

// Export main wrapper
export { UIWrapper, type UIWrapperProps } from './components/UIWrapper'

// Export UI components
export { Button, buttonVariants, type ButtonProps } from './components/ui/Button'
export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from './components/ui/Card'

// Export utilities
export { cn } from './lib/utils'
