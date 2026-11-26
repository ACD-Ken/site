export interface AdminContext {
  id: string
  email: string
}

type Claims = { sub?: string; role?: string; aal?: string }
type User = {
  id: string
  email?: string
  email_confirmed_at?: string
  factors?: { status: string }[]
}

interface Authorization {
  verifiedClaims(token: string): Promise<Claims | null>
  currentUser(token: string): Promise<User | null>
  hasAdminGrant(user: AdminContext): Promise<boolean>
}

export async function authorizeAdmin(token: string, access: Authorization) {
  const claims = await access.verifiedClaims(token)
  if (!claims?.sub || claims.role !== 'authenticated') {
    return { error: 'Invalid session', status: 401 } as const
  }
  if (claims.aal !== 'aal2') {
    return { error: 'Multi-factor authentication required', status: 403 } as const
  }

  const user = await access.currentUser(token)
  if (!user?.email || user.id !== claims.sub || !user.email_confirmed_at) {
    return { error: 'Invalid session', status: 401 } as const
  }
  if (!user.factors?.some((factor) => factor.status === 'verified')) {
    return { error: 'Multi-factor authentication required', status: 403 } as const
  }

  const admin = { id: user.id, email: user.email }
  if (!await access.hasAdminGrant(admin)) {
    return { error: 'Administrator access required', status: 403 } as const
  }
  return { admin } as const
}
