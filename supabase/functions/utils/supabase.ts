import { createClient } from 'npm:@supabase/supabase-js@2.105.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

export interface Context {
    req: Request
    params: Record<string, string>
}

export function getAuthToken(req: Request): string | null {
    const authHeader = req.headers.get('authorization')
    return authHeader?.replace('Bearer ', '') || null
}

export function getCookie(req: Request, name: string): string | null {
    const cookie = req.headers.get('cookie')
    if (!cookie) return null

    const match = cookie.match(new RegExp(`${name}=([^;]+)`))
    return match ? match[1] : null
}

export function createErrorResponse(message: string, status: number = 400): Response {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    })
}

export function createSuccessResponse(data: unknown): Response {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
    })
}
