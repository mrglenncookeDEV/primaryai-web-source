export function isLeaderSession(session) {
  if (!session?.userId) return false;

  const role = String(session.role || "").toLowerCase();
  if (["owner", "admin", "leader", "headteacher", "trustleader", "director"].includes(role)) {
    return true;
  }

  const adminEmails = String(process.env.SURVEY_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(String(session.email || "").toLowerCase());
}
