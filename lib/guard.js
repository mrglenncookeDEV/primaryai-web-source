export function requiresAuth(pathname) {
  return ["/dashboard", "/account", "/billing"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function requiresPaidEntitlement(pathname) {
  return pathname.startsWith("/dashboard/premium");
}
