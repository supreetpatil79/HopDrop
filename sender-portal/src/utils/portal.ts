function extractMatchId(pathname: string) {
  const match = pathname.match(/^\/(?:track-delivery|matches)\/([^/]+)/);
  return match?.[1] ?? '';
}

function getCarrierBase() {
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('sender-portal') || window.location.hostname.includes('vercel.app')) {
      return 'https://hop-drop-carrier-portal.vercel.app';
    }
    if (window.location.hostname === 'localhost' && window.location.port === '3001') {
      return 'http://localhost:3002';
    }
  }
  return '/carrier';
}

export function getCarrierMatchHref(matchId: string) {
  const base = getCarrierBase();
  return `${base}/active-delivery/${matchId}`;
}

export function getCarrierPortalHref(pathname: string) {
  const base = getCarrierBase();
  const matchId = extractMatchId(pathname);

  if (matchId) {
    return getCarrierMatchHref(matchId);
  }

  let route = '';
  if (pathname.startsWith('/send-package')) {
    route = '/post-trip';
  } else if (pathname.startsWith('/browse-carriers') || pathname.startsWith('/browse-trips')) {
    route = '/incoming-requests';
  } else if (pathname.startsWith('/wallet')) {
    route = '/earnings';
  } else if (pathname.startsWith('/my-deliveries') || pathname.startsWith('/shipments')) {
    route = '/incoming-requests';
  } else if (pathname.startsWith('/dashboard')) {
    route = '/dashboard';
  }

  return `${base}${route}`;
}
