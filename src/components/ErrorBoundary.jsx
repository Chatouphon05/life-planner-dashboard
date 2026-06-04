import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { caught: false };

  static getDerivedStateFromError() {
    return { caught: true };
  }

  render() {
    if (this.state.caught) {
      return (
        <div className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', padding: '12px 0' }}>
          ● Something went wrong — pull to retry
        </div>
      );
    }
    return this.props.children;
  }
}
