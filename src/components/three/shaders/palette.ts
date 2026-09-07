// Interface values match audited CSS; fabric colors are illustrative product pigments.
export const SHADER_PALETTE = {
 canvas:'#ffffff',ecru:'#f0f1f2',charcoal:'#101114',muted:'#555b65',line:'#707780',
 indigo:'#344b64',clay:'#914f38'
} as const
export type ShaderPaletteKey=keyof typeof SHADER_PALETTE
