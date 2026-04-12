function extractMatchId(pathname: string) {
  const match = pathname.match(/^\/active-delivery\/([^/]+)/);
  return match?.[1] ?? '';
}

export function getSenderMatchHref(matchId: string) {
  return `/track-delivery/${matchId}`;
}

export function getSenderPortalHref(pathname: string) {
  const matchId = extractMatchId(pathname);

  if (matchId) {
    return getSenderMatchHref(matchId);
  }

  if (pathname.startsWith('/post-trip')) {
    return '/send-package';
  }

  if (pathname.startsWith('/incoming-requests')) {
    return '/browse-carriers';
  }

  if (pathname.startsWith('/earnings')) {
    return '/wallet';
  }

  if (pathname.startsWith('/my-trips')) {
    return '/my-deliveries';
  }

  if (pathname.startsWith('/dashboard')) {
    return '/dashboard';
  }

  return '/';
}
