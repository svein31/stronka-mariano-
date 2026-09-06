import { Component, type ReactNode } from 'react'

/** Optional imagery must never take the document down with it. */
export class EnhancementBoundary extends Component<
  { children: ReactNode; onFailure?: () => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onFailure?.()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
