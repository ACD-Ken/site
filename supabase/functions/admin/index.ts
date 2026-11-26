import { supabaseAdmin, getAuthToken, createErrorResponse, createSuccessResponse } from '../utils/supabase.ts'
import { authorizeAdmin, type AdminContext } from './authorize.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

function withCors(response: Response): Response {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        return withCors(await handleAdminRequest(req))
    } catch (error) {
        console.error('Admin function error:', error)
        return withCors(createErrorResponse('Internal server error', 500))
    }
})

async function handleAdminRequest(req: Request): Promise<Response> {
    const token = getAuthToken(req)
    if (!token) {
        return createErrorResponse('Access token required', 401)
    }

    const result = await authorizeAdmin(token, adminAccess)
    if (!result.admin) {
        return createErrorResponse(result.error, result.status)
    }
    const admin = result.admin

    const urlPath = new URL(req.url).pathname
    const pathParts = urlPath.split('/').filter(p => p)
    const path = pathParts.slice(pathParts.indexOf('admin') + 1).join('/')

    if (path === 'me') {
        return createSuccessResponse({ admin: { id: admin.id, email: admin.email } })
    } else if (path === 'stats' || path === '') {
        return handleGetStats(req, admin)
    } else if (path === 'users') {
        return handleGetUsers(req, admin)
    } else if (path === 'approvals') {
        return handleGetApprovals(req, admin)
    } else if (path.startsWith('users/') && path.endsWith('/approve') && req.method === 'POST') {
        const userId = path.split('/')[1]
        return handleApproveUser(req, admin, userId)
    } else if (path.startsWith('users/') && req.method === 'DELETE') {
        const userId = path.split('users/')[1]
        return handleDeleteUser(req, admin, userId)
    } else if (path === 'devices') {
        return handleGetDevices(req, admin)
    } else if (path.startsWith('devices/by-device-id/') && path.endsWith('/revocation') && req.method === 'PATCH') {
        const deviceId = decodeURIComponent(path.split('/')[2])
        return handleSetDeviceRevocation(req, admin, deviceId)
    } else if (path.startsWith('devices/') && req.method === 'DELETE') {
        const deviceId = path.split('devices/')[1]
        return handleRevokeDevice(req, admin, deviceId)
    } else if (path === 'audit-logs') {
        return handleGetAuditLogs(req, admin)
    }

    return createErrorResponse('Not found', 404)
}

const adminAccess = {
    async verifiedClaims(token: string) {
        const { data, error } = await supabaseAdmin.auth.getClaims(token)
        return error ? null : data?.claims ?? null
    },
    async currentUser(token: string) {
        const { data, error } = await supabaseAdmin.auth.getUser(token)
        return error ? null : data?.user ?? null
    },
    async hasAdminGrant(principal: AdminContext) {
        const [profile, roster] = await Promise.all([
            supabaseAdmin.from('user_profiles').select('role').eq('id', principal.id).maybeSingle(),
            supabaseAdmin.from('admin_console_users').select('role').eq('email', principal.email).maybeSingle(),
        ])
        if (profile.error || roster.error) throw new Error('Admin role lookup failed')
        return profile.data?.role === 'admin' || roster.data?.role === 'admin'
    },
}

async function handleGetStats(req: Request, payload: any): Promise<Response> {
    const [userCount, messageCount, sessionResult, storageResult] = await Promise.all([
        supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('messages').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('sessions').select('id', { count: 'exact', head: true }).gt('expires_at', new Date().toISOString()),
        supabaseAdmin.rpc('get_database_size')
    ])

    return createSuccessResponse({
        userCount: userCount.count || 0,
        messageCount: messageCount.count || 0,
        activeSessions: sessionResult.count || 0,
        databaseSize: storageResult.data || 'unknown'
    })
}

async function handleGetUsers(req: Request, payload: any): Promise<Response> {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, role, totp_enabled, is_approved, approved_by, approved_at, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (error) {
        return createErrorResponse('Failed to get users')
    }

    // Get message counts for each user
    const userIds = (data || []).map(u => u.id)
    const { data: messageCounts } = await supabaseAdmin
        .from('messages')
        .select('user_id, id')
        .in('user_id', userIds)

    const countsMap: Record<string, number> = {}
    messageCounts?.forEach(m => {
        countsMap[m.user_id] = (countsMap[m.user_id] || 0) + 1
    })

    const usersWithCounts = (data || []).map(u => ({
        ...u,
        message_count: countsMap[u.id] || 0
    }))

    return createSuccessResponse({ users: usersWithCounts })
}

async function handleGetApprovals(req: Request, payload: any): Promise<Response> {
    const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, is_approved, approved_by, approved_at, created_at')
        .order('created_at', { ascending: false })

    if (error) {
        return createErrorResponse('Failed to get approvals')
    }

    return createSuccessResponse({ users: data || [] })
}

async function handleApproveUser(req: Request, payload: AdminContext, userId: string): Promise<Response> {
    const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
            is_approved: true,
            approved_by: payload.email,
            approved_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, email, is_approved, approved_by, approved_at, created_at')
        .single()

    if (error || !data) {
        return createErrorResponse('User not found', 404)
    }

    await supabaseAdmin.rpc('log_audit', {
        p_user_id: userId,
        p_action: 'user_approved_by_admin',
        p_details: JSON.stringify({ admin_user_id: payload.id, admin_email: payload.email }),
        p_ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    })

    return createSuccessResponse({ user: data })
}

async function handleDeleteUser(req: Request, payload: AdminContext, userId: string): Promise<Response> {
    // Delete user - cascade will handle all related data
    const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle()

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
        return createErrorResponse('Failed to delete user')
    }

    await supabaseAdmin.rpc('log_audit', {
        p_user_id: null,
        p_action: 'user_deleted_by_admin',
        p_details: JSON.stringify({ deleted_user_id: userId, deleted_email: profile?.email, admin_user_id: payload.id, admin_email: payload.email }),
        p_ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    })

    return createSuccessResponse({ message: 'User deleted successfully', user: { id: userId } })
}

async function handleGetAuditLogs(req: Request, payload: any): Promise<Response> {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const userId = url.searchParams.get('user_id')

    let query = supabaseAdmin
        .from('audit_logs')
        .select('*, user_profiles(email)')
        .order('created_at', { ascending: false })
        .limit(limit)

    if (userId) {
        query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
        return createErrorResponse('Failed to get audit logs')
    }

    return createSuccessResponse({ auditLogs: data || [] })
}

async function handleGetDevices(req: Request, payload: any): Promise<Response> {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const userId = url.searchParams.get('user_id')

    let query = supabaseAdmin
        .from('devices')
        .select('*')
        .order('registered_at', { ascending: false })

    if (userId) {
        query = query.eq('user_id', userId)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
        return createErrorResponse('Failed to get devices')
    }

    return createSuccessResponse({ devices: data || [], total: count || 0 })
}

async function handleSetDeviceRevocation(req: Request, payload: AdminContext, deviceId: string): Promise<Response> {
    const { is_revoked } = await req.json()

    if (typeof is_revoked !== 'boolean') {
        return createErrorResponse('is_revoked boolean is required')
    }

    const { data, error } = await supabaseAdmin
        .from('devices')
        .update({
            is_revoked,
            is_active: !is_revoked,
            revoked_at: is_revoked ? new Date().toISOString() : null
        })
        .eq('device_id', deviceId)
        .select()
        .single()

    if (error || !data) {
        return createErrorResponse('Device not found', 404)
    }

    await supabaseAdmin.rpc('log_audit', {
        p_user_id: data.user_id || null,
        p_action: is_revoked ? 'device_revoked_by_admin' : 'device_restored_by_admin',
        p_details: JSON.stringify({ device_id: deviceId, admin_user_id: payload.id, admin_email: payload.email }),
        p_ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    })

    return createSuccessResponse({ device: data })
}

async function handleRevokeDevice(req: Request, payload: AdminContext, deviceId: string): Promise<Response> {
    const body = req.headers.get('content-type')?.includes('application/json')
        ? await req.json().catch(() => null)
        : null
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 200) : undefined
    // Mark device as inactive (revoke)
    const { data, error } = await supabaseAdmin
        .from('devices')
        .update({ is_active: false, is_revoked: true, revoked_at: new Date().toISOString() })
        .eq('id', deviceId)
        .select()
        .single()

    if (error || !data) {
        return createErrorResponse('Device not found', 404)
    }

    // Log the admin action
    await supabaseAdmin.rpc('log_audit', {
        p_user_id: data.user_id,
        p_action: 'device_revoked_by_admin',
        p_details: JSON.stringify({ device_id: deviceId, admin_user_id: payload.id, admin_email: payload.email, reason }),
        p_ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    })

    return createSuccessResponse({ message: 'Device revoked successfully' })
}
