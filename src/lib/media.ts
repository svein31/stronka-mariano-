// Generated development imagery. Replace with approved real garment/process photos.
export const mediaSlots = ['botanika','gest','forma','process']
const resolved = new Map<string,string|null>()
export const candidatesFor = (slot:string) => ['/media/'+slot+'.webp','/media/'+slot+'.jpg']
export const knownPath = (slot:string) => resolved.get(slot) ?? null
export const isResolved = (slot:string) => resolved.has(slot) ? resolved.get(slot)!==null : null
export const markResolved = (slot:string,path:string|null) => { resolved.set(slot,path) }
