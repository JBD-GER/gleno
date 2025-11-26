// src/lib/activity-log.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export type ActivitySource =
  | 'app'
  | 'api'
  | 'automation'
  | 'system'
  | 'webhook'
  | 'import'

export type ActivityEventType =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'view'
  | 'file_upload'
  | 'file_download'
  | 'email_sent'
  | 'login'
  | 'logout'
  | 'password_reset'
  | 'automation_run'
  | 'consent'
  | 'export'
  | 'other'

export type LogActivityParams = {
  supabase: SupabaseClient
  tenantUserId: string
  actorUserId?: string | null
  actorEmployeeId?: string | null
  actorDisplayName?: string | null
  actorEmail?: string | null
  actorRole?: string | null
  source?: ActivitySource
  eventType: ActivityEventType
  action: string
  entityType?: string | null
  entityTable?: string | null
  entityId?: string | null
  entityLabel?: string | null
  details?: Record<string, any> | null
  ipHash?: string | null
  userAgent?: string | null
}

/**
 * Zentrale Helper-Funktion, um einen Activity-Log-Eintrag zu schreiben.
 * Kann in API-Routes, Server Actions etc. genutzt werden.
 */
export async function logActivity({
  supabase,
  tenantUserId,
  actorUserId = null,
  actorEmployeeId = null,
  actorDisplayName = null,
  actorEmail = null,
  actorRole = null,
  source = 'app',
  eventType,
  action,
  entityType = null,
  entityTable = null,
  entityId = null,
  entityLabel = null,
  details = null,
  ipHash = null,
  userAgent = null,
}: LogActivityParams): Promise<void> {
  const payload = {
    tenant_user_id: tenantUserId,
    actor_user_id: actorUserId,
    actor_employee_id: actorEmployeeId,
    actor_display_name: actorDisplayName,
    actor_email: actorEmail,
    actor_role: actorRole,
    source,
    event_type: eventType,
    action,
    entity_type: entityType,
    entity_table: entityTable,
    entity_id: entityId,
    entity_label: entityLabel,
    details,
    ip_hash: ipHash,
    user_agent: userAgent,
  }

  const { error } = await supabase
    .from('activity_log') // <-- wichtig: .from() statt supabase('...')
    .insert(payload)

  if (error) {
    // Absichtlich kein throw, damit Logging nicht deine eigentliche Aktion zerschießt
    console.error('Error logging activity', error)
  }
}
