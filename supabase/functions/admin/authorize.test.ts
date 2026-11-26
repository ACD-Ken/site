import { authorizeAdmin } from './authorize.ts'

const token = 'fixture'
const claims = { role: 'authenticated', sub: 'admin-id', aal: 'aal2' }
const user = {
  id: 'admin-id',
  email: 'admin@example.test',
  email_confirmed_at: '2026-11-26T00:00:00Z',
  factors: [{ status: 'verified' }],
}
const access = {
  verifiedClaims: async () => claims,
  currentUser: async () => user,
  hasAdminGrant: async () => true,
}

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Expected ${expected}, received ${actual}`)
}

Deno.test('requires a verified Supabase token before checking roles', async () => {
  const result = await authorizeAdmin(token, {
    ...access,
    verifiedClaims: async () => null,
    hasAdminGrant: async () => { throw new Error('must not read admin roles') },
  })
  assertEquals(result.status, 401)
})

Deno.test('password-only admin access is denied', async () => {
  const result = await authorizeAdmin(token, {
    ...access,
    verifiedClaims: async () => ({ ...claims, aal: 'aal1' }),
  })
  assertEquals(result.status, 403)
})

Deno.test('AAL2 does not authorize a user without an admin grant', async () => {
  const result = await authorizeAdmin(token, { ...access, hasAdminGrant: async () => false })
  assertEquals(result.status, 403)
})

Deno.test('stale AAL2 session without a verified factor is denied', async () => {
  const result = await authorizeAdmin(token, {
    ...access,
    currentUser: async () => ({ ...user, factors: [] }),
  })
  assertEquals(result.status, 403)
})

Deno.test('a changed or unconfirmed Auth identity is denied', async () => {
  for (const changes of [{ id: 'different-user' }, { email_confirmed_at: undefined }]) {
    const result = await authorizeAdmin(token, {
      ...access, currentUser: async () => ({ ...user, ...changes }),
    })
    assertEquals(result.status, 401)
  }
})

Deno.test('AAL2 administrator with a verified factor is allowed', async () => {
  const result = await authorizeAdmin(token, access)
  assertEquals(result.admin?.id, user.id)
  assertEquals(result.admin?.email, user.email)
})
