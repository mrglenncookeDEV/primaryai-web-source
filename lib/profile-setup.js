import { getOrCreateUserProfile, updateUserProfile } from "@/lib/user-profile";
import { getSupabaseAdminClient, getSupabaseConfig } from "@/lib/supabase";

function parseFormatPrefs(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normaliseDisplayName(value) {
  return String(value || "").trim();
}

function normaliseAvatarUrl(value) {
  return String(value || "").trim();
}

export async function getProfileSetup(userId) {
  const db = getSupabaseAdminClient();
  if (db) {
    try {
      const { data: tableRow, error: tableError } = await db
        .from("user_profile_setup")
        .select("display_name, avatar_url, profile_completed")
        .eq("user_id", userId)
        .maybeSingle();
      if (!tableError && tableRow) {
        const displayName = normaliseDisplayName(tableRow.display_name);
        const avatarUrl = normaliseAvatarUrl(tableRow.avatar_url);
        const profileCompleted = Boolean(tableRow.profile_completed) && displayName.length > 0;
        return { displayName, avatarUrl, profileCompleted };
      }

      const { data, error } = await db.auth.admin.getUserById(userId);
      if (!error && data?.user) {
        const meta = data.user.user_metadata || {};
        const displayName = normaliseDisplayName(meta.display_name || meta.displayName);
        const avatarUrl = normaliseAvatarUrl(meta.avatar_url || meta.avatarUrl);
        const profileCompleted = Boolean(meta.profile_completed || meta.profileCompleted) && displayName.length > 0;
        if (displayName || avatarUrl || profileCompleted) {
          return { displayName, avatarUrl, profileCompleted };
        }
      }
    } catch {
      // Fall through to legacy profile storage.
    }
  }

  const profile = await getOrCreateUserProfile(userId);
  const prefs = parseFormatPrefs(profile?.formatPrefs);

  const displayName = normaliseDisplayName(prefs.displayName);
  const avatarUrl = normaliseAvatarUrl(prefs.avatarUrl);
  const profileCompleted = Boolean(prefs.profileCompleted) && displayName.length > 0;

  return {
    displayName,
    avatarUrl,
    profileCompleted,
  };
}

async function updateUserMetadataWithAccessToken(accessToken, payload) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    return false;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          display_name: payload.displayName,
          avatar_url: payload.avatarUrl,
          profile_completed: payload.profileCompleted,
          profile_updated_at: new Date().toISOString(),
        },
      }),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function saveProfileSetup(userId, payload, options = {}) {
  const displayName = normaliseDisplayName(payload?.displayName);
  const avatarUrl = normaliseAvatarUrl(payload?.avatarUrl);
  const profileCompleted = displayName.length > 0;

  const db = getSupabaseAdminClient();
  let updatedInSupabase = false;
  if (db) {
    try {
      const { error: tableError } = await db.from("user_profile_setup").upsert(
        {
          user_id: userId,
          display_name: displayName,
          avatar_url: avatarUrl,
          profile_completed: profileCompleted,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (!tableError) {
        updatedInSupabase = true;
      }

      const { error: metaError } = await db.auth.admin.updateUserById(userId, {
        user_metadata: {
          display_name: displayName,
          avatar_url: avatarUrl,
          profile_completed: profileCompleted,
          profile_updated_at: new Date().toISOString(),
        },
      });
      if (!metaError) {
        updatedInSupabase = true;
      }
    } catch {
      // Continue with fallbacks.
    }
  }

  if (updatedInSupabase) {
    return { displayName, avatarUrl, profileCompleted };
  }

  const updatedViaAccessToken = await updateUserMetadataWithAccessToken(options?.accessToken, {
    displayName,
    avatarUrl,
    profileCompleted,
  });
  if (updatedViaAccessToken) {
    return { displayName, avatarUrl, profileCompleted };
  }

  const profile = await getOrCreateUserProfile(userId);
  const prefs = parseFormatPrefs(profile?.formatPrefs);

  const nextPrefs = {
    ...prefs,
    displayName,
    avatarUrl,
    profileCompleted,
    profileUpdatedAt: new Date().toISOString(),
  };

  await updateUserProfile(userId, {
    formatPrefs: JSON.stringify(nextPrefs),
  });

  return { displayName, avatarUrl, profileCompleted };
}
