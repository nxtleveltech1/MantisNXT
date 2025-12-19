/**
 * Clerk Synchronization Utility
 * 
 * Handles bidirectional sync between database user data and Clerk user metadata/attributes
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_API_URL = 'https://api.clerk.com/v1';

if (!CLERK_SECRET_KEY) {
  console.warn('[Clerk Sync] CLERK_SECRET_KEY not configured - Clerk sync will be disabled');
}

export interface ClerkSyncData {
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  phoneNumbers?: Array<{ phone_number: string; verified: boolean }>;
  publicMetadata?: Record<string, unknown>;
  privateMetadata?: Record<string, unknown>;
}

export interface ClerkSyncResult {
  success: boolean;
  error?: string;
}

/**
 * Update Clerk user metadata (public and private)
 */
export async function updateClerkMetadata(
  clerkId: string,
  publicMetadata: Record<string, unknown>,
  privateMetadata?: Record<string, unknown>
): Promise<ClerkSyncResult> {
  if (!CLERK_SECRET_KEY) {
    return { success: false, error: 'CLERK_SECRET_KEY not configured' };
  }

  try {
    const response = await fetch(`${CLERK_API_URL}/users/${clerkId}/metadata`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: publicMetadata,
        ...(privateMetadata && { private_metadata: privateMetadata }),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const errorMessage = data.errors?.[0]?.message || `HTTP ${response.status}`;
      console.error(`[Clerk Sync] Failed to update metadata for ${clerkId}:`, errorMessage);
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Clerk Sync] Error updating metadata for ${clerkId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Update Clerk user attributes (firstName, lastName, imageUrl)
 */
export async function updateClerkUserAttributes(
  clerkId: string,
  attributes: {
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
  }
): Promise<ClerkSyncResult> {
  if (!CLERK_SECRET_KEY) {
    return { success: false, error: 'CLERK_SECRET_KEY not configured' };
  }

  try {
    const body: Record<string, string> = {};
    if (attributes.firstName !== undefined) body.first_name = attributes.firstName;
    if (attributes.lastName !== undefined) body.last_name = attributes.lastName;
    if (attributes.imageUrl !== undefined) body.image_url = attributes.imageUrl;

    if (Object.keys(body).length === 0) {
      return { success: true }; // Nothing to update
    }

    const response = await fetch(`${CLERK_API_URL}/users/${clerkId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const errorMessage = data.errors?.[0]?.message || `HTTP ${response.status}`;
      console.error(`[Clerk Sync] Failed to update attributes for ${clerkId}:`, errorMessage);
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Clerk Sync] Error updating attributes for ${clerkId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Sync complete user profile from database to Clerk
 * Updates both metadata and user attributes
 */
export async function syncUserProfileToClerk(
  clerkId: string,
  profileData: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    mobile?: string;
    department?: string;
    jobTitle?: string;
    avatarUrl?: string;
    orgId?: string;
    role?: string;
  }
): Promise<ClerkSyncResult> {
  if (!CLERK_SECRET_KEY) {
    return { success: false, error: 'CLERK_SECRET_KEY not configured' };
  }

  try {
    // Update user attributes (firstName, lastName, imageUrl)
    const attributesResult = await updateClerkUserAttributes(clerkId, {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      imageUrl: profileData.avatarUrl,
    });

    if (!attributesResult.success) {
      return attributesResult;
    }

    // Update public metadata (phone, mobile, department, jobTitle, orgId, role)
    const publicMetadata: Record<string, unknown> = {};
    if (profileData.phone !== undefined) publicMetadata.phone = profileData.phone;
    if (profileData.mobile !== undefined) publicMetadata.mobile = profileData.mobile;
    if (profileData.department !== undefined) publicMetadata.department = profileData.department;
    if (profileData.jobTitle !== undefined) publicMetadata.job_title = profileData.jobTitle;
    if (profileData.orgId !== undefined) publicMetadata.org_id = profileData.orgId;
    if (profileData.role !== undefined) publicMetadata.role = profileData.role;

    // Only update metadata if there are changes
    if (Object.keys(publicMetadata).length > 0) {
      const metadataResult = await updateClerkMetadata(clerkId, publicMetadata);
      if (!metadataResult.success) {
        return metadataResult;
      }
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Clerk Sync] Error syncing profile for ${clerkId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}









