/* ==========================================================================
   Bag state. Held in memory and mirrored to localStorage so a visitor who
   leaves mid-session comes back to the same bag. Persisted shape is
   versioned, because a stale garment slug should clear rather than throw.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { garmentBySlug } from '../data/collection'

const STORAGE_KEY = 'sumi.bag.v1'

export interface CartLine {
  /** Composite key: one line per slug, size, and colourway. */
  key: string
  slug: string
  name: string
  size: string
  colour: string
  price: number
  slot: string
  alt: string
  quantity: number
}

interface CartValue {
  lines: CartLine[]
  count: number
  total: number
  open: boolean
  add: (line: Omit<CartLine, 'key' | 'quantity'>) => void
  remove: (key: string) => void
  setQuantity: (key: string, quantity: number) => void
  clear: () => void
  setOpen: (open: boolean) => void
}

export const lineKey = (slug: string, size: string, colour: string): string =>
  `${slug}::${size}::${colour}`

const CartContext = createContext<CartValue | null>(null)

function read(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Drop anything whose garment no longer exists rather than rendering a
    // line that cannot be resolved.
    return parsed.filter((line): line is CartLine => {
      if (typeof line !== 'object' || line === null) return false
      const candidate = line as Partial<CartLine>
      return (
        typeof candidate.slug === 'string' &&
        typeof candidate.size === 'string' &&
        typeof candidate.colour === 'string' &&
        garmentBySlug(candidate.slug) !== undefined
      )
    })
  } catch {
    return []
  }
}

function write(lines: CartLine[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  } catch {
    // Private mode or a full quota. The bag still works for this session.
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [open, setOpen] = useState(false)

  // Read once on mount rather than in the initialiser, so the first paint is
  // identical for every visitor and there is no hydration-shaped mismatch.
  useEffect(() => {
    setLines(read())
  }, [])

  useEffect(() => {
    write(lines)
  }, [lines])

  const add = useCallback((line: Omit<CartLine, 'key' | 'quantity'>) => {
    const key = lineKey(line.slug, line.size, line.colour)
    setLines((current) => {
      const existing = current.find((entry) => entry.key === key)
      if (existing) {
        return current.map((entry) =>
          entry.key === key ? { ...entry, quantity: entry.quantity + 1 } : entry,
        )
      }
      return [...current, { ...line, key, quantity: 1 }]
    })
    setOpen(true)
  }, [])

  const remove = useCallback((key: string) => {
    setLines((current) => current.filter((entry) => entry.key !== key))
  }, [])

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((entry) => entry.key !== key)
        : current.map((entry) => (entry.key === key ? { ...entry, quantity } : entry)),
    )
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const count = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  )

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [lines],
  )

  const value = useMemo<CartValue>(
    () => ({ lines, count, total, open, add, remove, setQuantity, clear, setOpen }),
    [lines, count, total, open, add, remove, setQuantity, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be called inside a CartProvider')
  return context
}
