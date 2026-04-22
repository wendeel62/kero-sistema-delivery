import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary capturou:', error, errorInfo.componentStack)
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">
            Algo deu errado
          </h2>
          <p className="text-gray-600 mb-4">
            Pedimos desculpas pelo incômodo. Tente novamente.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="text-xs bg-gray-100 p-2 overflow-auto text-left">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-primary text-white rounded"
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}