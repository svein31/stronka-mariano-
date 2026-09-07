export function getConfig(env = process.env) {
  const demo = env.STORE_MODE !== 'live'
  const seller = { name: env.SELLER_NAME || '', email: env.SELLER_EMAIL || '', address: env.SELLER_ADDRESS || '', returnsAddress: env.RETURNS_ADDRESS || '' }
  const policyVersion = env.POLICY_VERSION || 'draft-2026-09-07'
  const origin = env.PUBLIC_ORIGIN || 'http://localhost:5173'
  if (!demo && (!Object.values(seller).every(Boolean) || env.POLICIES_APPROVED !== 'true' || policyVersion.startsWith('draft') || !origin.startsWith('https://'))) throw new Error('Live mode requires seller details, HTTPS origin and approved policies.')
  return {demo, seller, policyVersion, origin, paymentsEnabled:false}
}
