// Route policy is shared by the app shell and its regression tests.
// Independent visual identities must never inherit the general office theme.
export function classifySyncWorksRoute(pathname = "/") {
  const path = (String(pathname).replace(/\/+$/, "") || "/").toLowerCase();
  if (/^\/(login|register|forgot-password|reset-password|get-started|onboarding|accept-invite|employee\/invite|partner\/join|gamecast|sports\/invite|sports\/team-invite|social\/invite|social\/fan)(\/|$)/.test(path)) return "public";
  if (/^\/customer\/(games?|poker|fyb|bozo|442|card-club|card-clubs)(\/|$)/.test(path)) return "games";
  if (/^\/customer\/forge(\/|$)/.test(path)) return "forge";
  if (/^\/customer\/health(\/|$)/.test(path)) return "health";
  if (/^\/connect\/groups\/[^/]+\/sports\/games(\/|$)/.test(path)) return "games";
  if (path === "/platform" || path === "/god-mode") return "platform";
  return "workspace";
}

export function usesUniversalWorkspaceStyle(pathname) {
  return classifySyncWorksRoute(pathname) === "workspace";
}
