"use client";

import { useEffect, useState } from "react";

type School = { id: string; name: string; urn: string | null; postcode: string | null; plan: string; seat_limit: number };
type StaffMember = { userId: string; role: string; email: string | null; displayName: string | null };
type PendingInvite = { id: string; email: string; expires_at: string };

function SaveBar({ saving, onClick, label = "Save" }: { saving: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      style={{ padding: "0.45rem 1.1rem", borderRadius: "8px", border: "none", background: "var(--accent)", color: "white", fontSize: "0.84rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit" }}
    >
      {saving ? "Saving…" : label}
    </button>
  );
}

export default function SchoolPage() {
  const [school, setSchool] = useState<School | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [seatLimit, setSeatLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create school form
  const [createName, setCreateName] = useState("");
  const [createUrn, setCreateUrn] = useState("");
  const [createPostcode, setCreatePostcode] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ token: string; email: string } | null>(null);

  // Join form
  const [joinToken, setJoinToken] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/schools", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSchool(data.school);
      setRole(data.role);
      if (data.school && data.role === "admin") {
        void loadStaff(data.school.id);
      }
    }
    setLoading(false);
  }

  async function loadStaff(schoolId: string) {
    const res = await fetch(`/api/schools/${schoolId}/staff`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStaff(data.staff ?? []);
      setPendingInvites(data.pendingInvites ?? []);
      setSeatLimit(data.seatLimit ?? 10);
    }
  }

  async function createSchool() {
    if (!createName.trim()) { setError("School name is required"); return; }
    setCreating(true); setError("");
    const res = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName.trim(), urn: createUrn || null, postcode: createPostcode || null }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) { setError(data?.error || "Could not create school"); return; }
    setSchool(data.school);
    setRole("admin");
    void loadStaff(data.school.id);
  }

  async function inviteStaff() {
    if (!school || !inviteEmail.trim()) { setError("Enter an email address"); return; }
    setInviting(true); setError(""); setInviteResult(null);
    const res = await fetch(`/api/schools/${school.id}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setInviting(false);
    if (!res.ok) { setError(data?.error || "Could not invite staff member"); return; }
    setInviteEmail("");
    setInviteResult({ token: data.invite.token, email: data.invite.email });
    void loadStaff(school.id);
  }

  async function joinSchool() {
    if (!joinToken.trim()) { setError("Enter your invite token"); return; }
    setJoining(true); setError("");
    const res = await fetch("/api/schools/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: joinToken.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setJoining(false);
    if (!res.ok) { setError(data?.error || "Could not join school"); return; }
    void load();
  }

  if (loading) {
    return <div style={{ padding: "3rem", color: "var(--muted)", fontSize: "0.9rem" }}>Loading…</div>;
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://primaryai.org.uk";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 0.25rem" }}>School Account</h1>
      <p style={{ margin: "0 0 2rem", color: "var(--muted)", fontSize: "0.88rem" }}>
        Manage your school's PrimaryAI licence, invite staff, and view whole-school settings.
      </p>

      {error && <p style={{ color: "#ef4444", fontSize: "0.82rem", marginBottom: "1rem", padding: "0.5rem 0.75rem", background: "rgb(239 68 68 / 0.08)", borderRadius: "8px" }}>{error}</p>}

      {/* ── No school yet ── */}
      {!school && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Create */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.25rem 1.4rem" }}>
            <h2 style={{ margin: "0 0 0.85rem", fontSize: "1rem", fontWeight: 700 }}>Set up your school</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--muted)" }}>As a headteacher or admin, create your school to invite staff and manage licences.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "0.9rem" }}>
              <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="School name *" style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "0.85rem", fontFamily: "inherit" }} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input value={createUrn} onChange={(e) => setCreateUrn(e.target.value)} placeholder="Ofsted URN (optional)" style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "0.85rem", fontFamily: "inherit" }} />
                <input value={createPostcode} onChange={(e) => setCreatePostcode(e.target.value)} placeholder="Postcode (optional)" style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "0.85rem", fontFamily: "inherit" }} />
              </div>
            </div>
            <SaveBar saving={creating} onClick={createSchool} label="Create school" />
          </div>

          {/* Join */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.25rem 1.4rem" }}>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 700 }}>Join an existing school</h2>
            <p style={{ margin: "0 0 0.85rem", fontSize: "0.82rem", color: "var(--muted)" }}>Enter the invite token your school admin sent you.</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input value={joinToken} onChange={(e) => setJoinToken(e.target.value)} placeholder="Invite token" style={{ flex: 1, minWidth: 180, padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "0.85rem", fontFamily: "inherit" }} />
              <SaveBar saving={joining} onClick={joinSchool} label="Join school" />
            </div>
          </div>
        </div>
      )}

      {/* ── Staff member view ── */}
      {school && role === "staff" && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.25rem 1.4rem" }}>
          <h2 style={{ margin: "0 0 0.35rem", fontSize: "1rem", fontWeight: 700 }}>{school.name}</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>You are a staff member of this school. Contact your school admin for licence queries.</p>
        </div>
      )}

      {/* ── Admin view ── */}
      {school && role === "admin" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* School info */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.1rem 1.3rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 0.1rem", fontWeight: 700, fontSize: "1rem" }}>{school.name}</p>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>
                  {school.urn ? `URN: ${school.urn}` : ""}
                  {school.urn && school.postcode ? " · " : ""}
                  {school.postcode ?? ""}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: "0 0 0.1rem", fontSize: "0.78rem", color: "var(--muted)" }}>Seats used</p>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem" }}>{staff.length}<span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted)" }}>/{seatLimit}</span></p>
              </div>
            </div>
          </div>

          {/* Invite staff */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.1rem 1.3rem" }}>
            <h2 style={{ margin: "0 0 0.65rem", fontSize: "0.95rem", fontWeight: 700 }}>Invite a staff member</h2>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teacher@school.co.uk"
                onKeyDown={(e) => { if (e.key === "Enter") void inviteStaff(); }}
                style={{ flex: 1, minWidth: 200, padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "0.85rem", fontFamily: "inherit" }}
              />
              <SaveBar saving={inviting} onClick={inviteStaff} label="Send invite" />
            </div>
            {inviteResult && (
              <div style={{ background: "color-mix(in srgb, #22c55e 8%, var(--bg))", border: "1px solid color-mix(in srgb, #22c55e 30%, var(--border))", borderRadius: "8px", padding: "0.6rem 0.85rem", marginTop: "0.5rem" }}>
                <p style={{ margin: "0 0 0.2rem", fontSize: "0.8rem", fontWeight: 600, color: "#16a34a" }}>Invite created for {inviteResult.email}</p>
                <p style={{ margin: "0 0 0.25rem", fontSize: "0.75rem", color: "var(--muted)" }}>Share this link with them:</p>
                <code style={{ fontSize: "0.73rem", wordBreak: "break-all", color: "var(--fg)" }}>{appUrl}/school?token={inviteResult.token}</code>
              </div>
            )}
          </div>

          {/* Staff list */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.1rem 1.3rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>Staff ({staff.length})</h2>
            {staff.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>No staff yet. Invite teachers above.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {staff.map((s) => (
                  <div key={s.userId} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.45rem 0.6rem", borderRadius: "8px", background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "white", flexShrink: 0 }}>
                      {(s.displayName ?? s.email ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "0.83rem", fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.displayName ?? s.email ?? "Unknown"}</p>
                      {s.displayName && <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--muted)" }}>{s.email}</p>}
                    </div>
                    <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", background: s.role === "admin" ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--border)", color: s.role === "admin" ? "var(--accent)" : "var(--muted)" }}>
                      {s.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.1rem 1.3rem" }}>
              <h2 style={{ margin: "0 0 0.65rem", fontSize: "0.95rem", fontWeight: 700 }}>Pending Invites</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {pendingInvites.map((inv) => (
                  <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.4rem 0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}>
                    <span style={{ flex: 1, fontSize: "0.82rem", color: "var(--fg)" }}>{inv.email}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Expires {new Date(inv.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
