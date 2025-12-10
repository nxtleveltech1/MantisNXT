import { Webhook } from 'svix';
import { headers } from 'next/headers';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

/**
 * Clerk Webhook Handler
 *
 * Syncs user data from Clerk to the database when users are created, updated, or deleted.
 * This ensures the application's database stays in sync with Clerk's user data.
 */
export async function POST(req: Request) {
  // Get the webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('[Clerk Webhook] CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { success: false, error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('[Clerk Webhook] Missing svix headers');
    return NextResponse.json(
      { success: false, error: 'Missing webhook verification headers' },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('[Clerk Webhook] Verification failed:', err);
    return NextResponse.json(
      { success: false, error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  // Handle the webhook event
  const eventType = evt.type;

  console.log(`[Clerk Webhook] Received event: ${eventType}`);

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;

      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;

      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;

      default:
        console.log(`[Clerk Webhook] Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error(`[Clerk Webhook] Error processing ${eventType}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

interface ClerkUserData {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verification: { status: string } | null;
  }>;
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
  public_metadata: Record<string, unknown>;
  private_metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  two_factor_enabled: boolean;
}

async function handleUserCreated(data: ClerkUserData) {
  const { id, email_addresses, primary_email_address_id, first_name, last_name, public_metadata } =
    data;

  // Get primary email
  const primaryEmail = email_addresses.find(e => e.id === primary_email_address_id);
  const email = primaryEmail?.email_address;

  if (!email) {
    console.error('[Clerk Webhook] No primary email found for user:', id);
    return;
  }

  const displayName =
    [first_name, last_name].filter(Boolean).join(' ') || email.split('@')[0] || 'User';

  // Extract metadata
  const metadata = public_metadata as {
    org_id?: string;
    role?: string;
    department?: string;
    phone?: string;
    mobile?: string;
  };

  console.log(`[Clerk Webhook] Creating user: ${email} (Clerk ID: ${id})`);

  // Check if user already exists (by Clerk ID or email)
  const existingUser = await db.query(
    `SELECT id FROM auth.users_extended WHERE clerk_id = $1 OR email = $2`,
    [id, email]
  );

  if (existingUser.rows.length > 0) {
    console.log(`[Clerk Webhook] User already exists, updating instead: ${email}`);
    await handleUserUpdated(data);
    return;
  }

  // Insert new user
  // Note: We use a placeholder password hash since Clerk handles authentication
  const placeholderHash = '$clerk$' + id; // Not a real hash, just a marker

  await db.query(
    `
    INSERT INTO auth.users_extended (
      clerk_id,
      email,
      password_hash,
      display_name,
      first_name,
      last_name,
      phone,
      mobile,
      department,
      org_id,
      is_active,
      email_verified,
      two_factor_enabled,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET
      clerk_id = EXCLUDED.clerk_id,
      display_name = EXCLUDED.display_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = NOW()
    `,
    [
      id,
      email,
      placeholderHash,
      displayName,
      first_name,
      last_name,
      metadata.phone || null,
      metadata.mobile || null,
      metadata.department || null,
      metadata.org_id || null,
      primaryEmail?.verification?.status === 'verified',
      data.two_factor_enabled,
    ]
  );

  console.log(`[Clerk Webhook] User created successfully: ${email}`);

  // Assign default role if specified in metadata
  if (metadata.role) {
    await assignUserRole(email, metadata.role, metadata.org_id);
  }
}

async function handleUserUpdated(data: ClerkUserData) {
  const {
    id,
    email_addresses,
    primary_email_address_id,
    first_name,
    last_name,
    public_metadata,
    two_factor_enabled,
  } = data;

  // Get primary email
  const primaryEmail = email_addresses.find(e => e.id === primary_email_address_id);
  const email = primaryEmail?.email_address;

  if (!email) {
    console.error('[Clerk Webhook] No primary email found for user:', id);
    return;
  }

  const displayName =
    [first_name, last_name].filter(Boolean).join(' ') || email.split('@')[0] || 'User';

  // Extract metadata
  const metadata = public_metadata as {
    org_id?: string;
    role?: string;
    department?: string;
    phone?: string;
    mobile?: string;
  };

  console.log(`[Clerk Webhook] Updating user: ${email} (Clerk ID: ${id})`);

  await db.query(
    `
    UPDATE auth.users_extended SET
      display_name = $1,
      first_name = $2,
      last_name = $3,
      phone = $4,
      mobile = $5,
      department = $6,
      org_id = COALESCE($7, org_id),
      email_verified = $8,
      two_factor_enabled = $9,
      updated_at = NOW()
    WHERE clerk_id = $10 OR email = $11
    `,
    [
      displayName,
      first_name,
      last_name,
      metadata.phone || null,
      metadata.mobile || null,
      metadata.department || null,
      metadata.org_id || null,
      primaryEmail?.verification?.status === 'verified',
      two_factor_enabled,
      id,
      email,
    ]
  );

  console.log(`[Clerk Webhook] User updated successfully: ${email}`);

  // Update role if changed
  if (metadata.role) {
    await assignUserRole(email, metadata.role, metadata.org_id);
  }
}

async function handleUserDeleted(data: { id?: string; deleted?: boolean }) {
  const { id } = data;

  if (!id) {
    console.error('[Clerk Webhook] No user ID provided for deletion');
    return;
  }

  console.log(`[Clerk Webhook] Soft-deleting user: ${id}`);

  // Soft delete by deactivating the user
  await db.query(
    `
    UPDATE auth.users_extended SET
      is_active = false,
      updated_at = NOW()
    WHERE clerk_id = $1
    `,
    [id]
  );

  console.log(`[Clerk Webhook] User deactivated successfully: ${id}`);
}

async function assignUserRole(email: string, roleSlug: string, orgId?: string) {
  try {
    // Get user ID
    const userResult = await db.query(`SELECT id FROM auth.users_extended WHERE email = $1`, [
      email,
    ]);

    if (userResult.rows.length === 0) {
      console.warn(`[Clerk Webhook] Cannot assign role: user not found: ${email}`);
      return;
    }

    const userId = userResult.rows[0].id;

    // Get role ID
    const roleResult = await db.query(
      `SELECT id FROM auth.roles WHERE slug = $1 AND (org_id = $2 OR org_id IS NULL) LIMIT 1`,
      [roleSlug, orgId || null]
    );

    if (roleResult.rows.length === 0) {
      console.warn(`[Clerk Webhook] Role not found: ${roleSlug}`);
      return;
    }

    const roleId = roleResult.rows[0].id;

    // Assign role
    await db.query(
      `
      INSERT INTO auth.user_roles (user_id, role_id, assigned_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, role_id) DO NOTHING
      `,
      [userId, roleId]
    );

    console.log(`[Clerk Webhook] Role '${roleSlug}' assigned to user: ${email}`);
  } catch (error) {
    console.error(`[Clerk Webhook] Error assigning role:`, error);
  }
}

// This route handles POST requests for webhooks
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

