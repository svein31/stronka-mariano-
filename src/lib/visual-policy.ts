import type {PerfTier} from './motion'

export interface VisualCapabilities {
  tier: PerfTier
  reducedMotion: boolean
  richEffects: boolean
  webgl: boolean
  saveData: boolean
  reducedTransparency: boolean
}

// Full effects remain an explicit desktop preview until physical-device QA.
// Capability and accessibility vetoes cannot be overridden by the opt-in.
export function visualPolicyFor(capabilities: VisualCapabilities) {
  const capable = capabilities.tier === 'high' && !capabilities.saveData
  const rich = capable && capabilities.richEffects && !capabilities.reducedMotion
  return {
    componentMotion: !capabilities.reducedMotion,
    richAvailable: capable && !capabilities.reducedMotion,
    depth: rich && capabilities.webgl,
    parallax: rich,
    pin: rich,
    glass: capable && !capabilities.reducedMotion && !capabilities.reducedTransparency,
    magnetic: rich,
  }
}
