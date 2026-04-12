function extractMatchId(pathname: string) {
  const match = pathname.match(/^\/(?:track-delivery|matches)\/([^/]+)/);
  return match?.[1] ?? '';
}

export function getCarrierMatchHref(matchId: string) {
  return `/carrier/active-delivery/${matchId}`;
}

export function getCarrierPortalHref(pathname: string) {
  const matchId = extractMatchId(pathname);

  if (matchId) {
    return getCarrierMatchHref(matchId);
  }

  if (pathname.startsWith('/send-package')) {
    return '/carrier/post-trip';
  }

  if (pathname.startsWith('/browse-carriers') || pathname.startsWith('/browse-trips')) {
    return '/carrier/incoming-requests';
  }

  if (pathname.startsWith('/wallet')) {
    return '/carrier/earnings';
  }

  if (pathname.startsWith('/my-deliveries')) {
    return '/carrier/incoming-requests';
  }

  if (pathname.startsWith('/dashboard')) {
    return '/carrier/dashboard';
  }

  return '/carrier/';
}
