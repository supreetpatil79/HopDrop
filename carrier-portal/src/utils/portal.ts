function extractMatchId(pathname: string) {
  const match = pathname.match(/^\/active-delivery\/([^/]+)/);
  return match?.[1] ?? '';
}

function getSenderBase() {
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('carrier-portal') || window.location.hostname.includes('vercel.app')) {
      return 'https://hop-drop-sender-portal.vercel.app';
    }
    if (window.location.hostname === 'localhost' && window.location.port === '3002') {
      return 'http://localhost:3001';
    }
  }
  return '';
}

export function getSenderMatchHref(matchId: string) {
  const base = getSenderBase();
  return `${base}/track-delivery/${matchId}`;
}

export function getSenderPortalHref(pathname: string) {
  const base = getSenderBase();
  const matchId = extractMatchId(pathname);

  if (matchId) {
    return getSenderMatchHref(matchId);
  }

  let route = '';
  if (pathname.startsWith('/post-trip')) {
    route = '/send-package';
  } else if (pathname.startsWith('/incoming-requests')) {
    route = '/browse-carriers';
  } else if (pathname.startsWith('/earnings')) {
    route = '/wallet';
  } else if (pathname.startsWith('/my-trips')) {
    route = '/shipments';
  } else if (pathname.startsWith('/dashboard')) {
    route = '/dashboard';
  }

  return `${base}${route}`;
}
