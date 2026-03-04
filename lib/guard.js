export function requiresAuth(pathname) {
  return ["/dashboard", "/account", "/billing", "/settings", "/library", "/profile-setup"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function requiresPaidEntitlement(pathname) {
  // Temporary MVP override: disable paid-only route checks.
  return false;
}
