import { lazy, Suspense } from 'react'
import { useMotionBudget } from '../lib/capabilities'
import { EnhancementBoundary } from './EnhancementBoundary'
import type { Cloth } from '../data/collection'

// The static document does not import Three. Both the module fetch and Canvas
// mount are conditional; a rejected chunk leaves the document untouched.
const HangingCloth = lazy(() => import('./three/SumiCloth').then((module) => ({ default: module.SumiCloth })))
const Swatch = lazy(() => import('./three/ClothSwatch').then((module) => ({ default: module.ClothSwatch })))

export function ClothStudy({ cloth, tint }: { cloth?: Cloth; tint?: string }) {
  const budget = useMotionBudget()
  if (!budget.enabled) return null
  return (
    <EnhancementBoundary>
      <Suspense fallback={null}>
        {cloth && tint
          ? <Swatch cloth={cloth} tint={tint} label="Turn the cloth study" />
          : <HangingCloth />}
      </Suspense>
    </EnhancementBoundary>
  )
}
