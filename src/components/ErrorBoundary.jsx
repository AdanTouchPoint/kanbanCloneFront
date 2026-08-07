import { Component } from 'react';
import '../styles/ErrorBoundary.css';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production, you would send this to a monitoring service.
    console.error('[ErrorBoundary]', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="error-boundary">
        <div className="error-boundary-content glass">
          <div className="error-boundary-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="error-boundary-title">Algo salió mal</h1>
          <p className="error-boundary-message">
            La aplicación encontró un error inesperado. Puedes intentar recargar la página o reiniciar la sesión.
          </p>
          {this.state.error?.message && (
            <pre className="error-boundary-detail">{this.state.error.message}</pre>
          )}
          <div className="error-boundary-actions">
            <button className="error-boundary-btn secondary" onClick={this.handleReset}>
              Reintentar
            </button>
            <button className="error-boundary-btn primary" onClick={this.handleReload}>
              Recargar página
            </button>
          </div>
        </div>
      </div>
    );
  }
}
