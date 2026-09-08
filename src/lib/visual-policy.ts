import type {PerfTier} from './motion'

export interface VisualCapabilities {
  tier: PerfTier
  reducedMotion: boolean
  webgl: boolean
  saveData: boolean
  reducedTransparency: boolean
}

// Automatically enhance within hardware and system preference limits.
export function visualPolicyFor(capabilities: VisualCapabilities) {
  const capable = capabilities.tier !== 'low' && !capabilities.saveData
  const rich = capable && !capabilities.reducedMotion
  return {
    componentMotion: !capabilities.reducedMotion,
    depth: rich && capabilities.webgl,
    parallax: rich,
    pin: rich && capabilities.tier === 'high',
    glass: capable && !capabilities.reducedMotion && !capabilities.reducedTransparency,
    magnetic: rich && capabilities.tier === 'high',
  }
}
