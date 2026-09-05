import axios from 'axios';
import { env } from '../config/env';
import { cacheRedis } from '../config/redis';
import { callRoutingSearch } from './routingSearch.service';
import { ALL_INDIAN_CITIES } from './indianCities';


const MAPMYINDIA_BASE = 'https://apis.mapmyindia.com';
const MAPMYINDIA_ATLAS = 'https://atlas.mappls.com';
const PROVIDER_CACHE_TTL_SECONDS = 3600;
const QUERY_CLICK_TTL_SECONDS = 60 * 60 * 24 * 30;
const TOKEN_PATTERN = /[a-z0-9]+/g;
const CITY_POPULARITY_PRIORS: Record<string, number> = {
  bengaluru: 9.5,
  mumbai: 10,
  delhi: 10,
  hyderabad: 8.5,
  pune: 8,
  chennai: 8.2,
  kolkata: 8,
  ahmedabad: 7.2,
  jaipur: 6.4,
  kochi: 6.1,
  chandigarh: 6,
  lucknow: 5.9
};

export type SearchActor = 'sender' | 'carrier';
export type SearchField = 'origin' | 'destination';

export interface MMISuggestion {
  placeName: string;
  placeAddress: string;
  eLoc: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  source?: string;
  matchType?: 'exact' | 'prefix' | 'token' | 'contains' | 'fuzzy' | 'provider';
  score?: number;
  queryClicks?: number;
  contextClicks?: number;
  globalClicks?: number;
  popularityHint?: string | null;
}

export interface SearchContext {
  actor?: SearchActor;
  field?: SearchField;
  limit?: number;
}

export interface SearchSuggestionsResponse {
  suggestions: MMISuggestion[];
  meta?: {
    normalizedQuery: string;
    strategy: string;
    actor?: SearchActor;
    field?: SearchField;
    region: string;
  };
}

export interface SearchSelectionPayload {
  query: string;
  region?: string;
  actor?: SearchActor;
  field?: SearchField;
  suggestion: MMISuggestion;
}

interface CandidateDocument extends MMISuggestion {
  city: string;
  state: string;
  source: string;
  sourceOrder: number;
  normalizedName: string;
  normalizedCity: string;
  normalizedAddress: string;
  normalizedSearchText: string;
  nameTokens: string[];
  cityTokens: string[];
  addressTokens: string[];
  searchTokens: string[];
}

type ClickSignals = {
  globalClicks: number;
  contextClicks: number;
  queryClicks: number;
};

function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeText(value: string | null | undefined): string[] {
  return (normalizeText(value).match(TOKEN_PATTERN) || []).filter((token) => token.length >= 2);
}

function buildCandidate(
  placeName: string,
  placeAddress: string,
  city: string,
  state: string,
  eLoc: string,
  latitude: number,
  longitude: number,
  sourceOrder: number,
  aliasTokens: string[] = []
): CandidateDocument {
  const searchParts = [placeName, city, state, placeAddress, eLoc, ...aliasTokens];
  return {
    placeName,
    placeAddress,
    eLoc,
    latitude,
    longitude,
    city,
    state,
    source: 'demo',
    sourceOrder,
    normalizedName: normalizeText(placeName),
    normalizedCity: normalizeText(city),
    normalizedAddress: normalizeText(placeAddress),
    normalizedSearchText: normalizeText(searchParts.join(' ')),
    nameTokens: tokenizeText(placeName),
    cityTokens: tokenizeText(city),
    addressTokens: tokenizeText(`${placeAddress} ${state}`),
    searchTokens: tokenizeText(searchParts.join(' '))
  };
}

const DEMO_CITIES: CandidateDocument[] = ALL_INDIAN_CITIES.map((city, index) =>
  buildCandidate(
    city.placeName,
    city.placeAddress,
    city.city,
    city.state,
    city.eLoc,
    city.latitude,
    city.longitude,
    index,
    city.aliases
  )
);

function useDemoMaps(): boolean {
  if (env.DEMO_MODE) {
    return true;
  }

  const clientId = (env.MMI_CLIENT_ID || '').toLowerCase();
  const clientSecret = (env.MMI_CLIENT_SECRET || '').toLowerCase();
  return !clientId || !clientSecret || clientId.includes('dummy') || clientSecret.includes('dummy');
}

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fallbackState(placeAddress: string): string {
  const parts = placeAddress
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return '';
  }

  const lastPart = parts[parts.length - 1]?.toLowerCase() || '';
  if (parts.length >= 2 && ['india', 'ind'].includes(lastPart)) {
    return parts[parts.length - 2] || '';
  }

  return parts[parts.length - 1] || '';
}

function providerCacheKey(query: string, region: string) {
  return `cache:search:provider:${region.toUpperCase()}:${query}`;
}

function selectionMetadataKey(placeId: string) {
  return `search:selection:meta:${placeId}`;
}

function globalClickKey(region: string) {
  return `search:clicks:global:${region.toUpperCase()}`;
}

function contextClickKey(region: string, actor?: SearchActor, field?: SearchField) {
  return `search:clicks:context:${region.toUpperCase()}:${actor || 'all'}:${field || 'all'}`;
}

function queryClickKey(region: string, query: string) {
  return `search:clicks:query:${region.toUpperCase()}:${query}`;
}

function contextClickKeys(region: string, actor?: SearchActor, field?: SearchField): string[] {
  return [...new Set([
    contextClickKey(region),
    actor ? contextClickKey(region, actor) : undefined,
    field ? contextClickKey(region, undefined, field) : undefined,
    actor || field ? contextClickKey(region, actor, field) : undefined
  ].filter((value): value is string => Boolean(value)))];
}

function prefixCoverage(queryTokens: string[], candidateTokens: string[]): number {
  if (!queryTokens.length || !candidateTokens.length) {
    return 0;
  }

  let matched = 0;
  for (const queryToken of queryTokens) {
    if (candidateTokens.some((candidateToken) => candidateToken.startsWith(queryToken))) {
      matched += 1;
    }
  }

  return matched / queryTokens.length;
}

function exactCoverage(queryTokens: string[], candidateTokens: string[]): number {
  if (!queryTokens.length || !candidateTokens.length) {
    return 0;
  }

  let matched = 0;
  for (const queryToken of queryTokens) {
    if (candidateTokens.includes(queryToken)) {
      matched += 1;
    }
  }

  return matched / queryTokens.length;
}

function similarity(query: string, candidateText: string): number {
  if (!query || !candidateText) {
    return 0;
  }

  if (candidateText.includes(query)) {
    return Math.max(query.length / candidateText.length, 0.7);
  }

  const queryTokens = tokenizeText(query);
  const candidateTokens = tokenizeText(candidateText);
  if (!queryTokens.length || !candidateTokens.length) {
    return 0;
  }

  const overlap = queryTokens.filter((token) => candidateTokens.some((candidate) => candidate.startsWith(token))).length;
  return overlap / Math.max(queryTokens.length, candidateTokens.length);
}

function parseCandidate(entry: Record<string, unknown>, sourceOrder: number, source: string): CandidateDocument {
  const placeName = String(entry.placeName || '').trim();
  const placeAddress = String(entry.placeAddress || '').trim();
  const city = String(entry.city || placeName).trim() || placeName;
  const state = String(entry.state || fallbackState(placeAddress)).trim();
  const locality = String(entry.locality || entry.district || '').trim();
  const subLocality = String(entry.subLocality || entry.subDistrict || '').trim();
  const searchParts = [placeName, city, state, locality, subLocality, placeAddress, String(entry.eLoc || '').trim()];

  return {
    placeName,
    placeAddress,
    eLoc: String(entry.eLoc || '').trim(),
    latitude: safeNumber(entry.latitude),
    longitude: safeNumber(entry.longitude),
    city,
    state,
    source,
    sourceOrder,
    normalizedName: normalizeText(placeName),
    normalizedCity: normalizeText(city),
    normalizedAddress: normalizeText(placeAddress),
    normalizedSearchText: normalizeText(searchParts.join(' ')),
    nameTokens: tokenizeText(placeName),
    cityTokens: tokenizeText(city),
    addressTokens: tokenizeText([placeAddress, state, locality, subLocality].join(' ')),
    searchTokens: tokenizeText(searchParts.join(' '))
  };
}

function dedupeCandidates(candidates: CandidateDocument[]): CandidateDocument[] {
  const deduped = new Map<string, CandidateDocument>();

  for (const candidate of candidates) {
    const dedupeKey =
      candidate.eLoc ||
      `${candidate.normalizedName}:${candidate.normalizedCity}:${candidate.latitude}:${candidate.longitude}`;
    const existing = deduped.get(dedupeKey);
    if (!existing || candidate.sourceOrder < existing.sourceOrder) {
      deduped.set(dedupeKey, candidate);
    }
  }

  return [...deduped.values()];
}

async function loadProviderCandidates(query: string, region: string): Promise<CandidateDocument[]> {
  const normalizedQuery = normalizeText(query);
  const cached = await cacheRedis.get(providerCacheKey(normalizedQuery, region));
  let payload: Array<Record<string, unknown>> = [];

  if (cached) {
    try {
      payload = JSON.parse(cached) as Array<Record<string, unknown>>;
    } catch {
      payload = [];
    }
  } else {
    try {
      const token = await getMMIToken();
      const res = await axios.get(`${MAPMYINDIA_ATLAS}/api/places/search/json`, {
        params: {
          query,
          region,
          pod: 'CITY'
        },
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 4000
      });

      payload = res.data?.suggestedLocations || [];
      if (payload.length > 0) {
        await cacheRedis.setex(providerCacheKey(normalizedQuery, region), PROVIDER_CACHE_TTL_SECONDS, JSON.stringify(payload));
      }
    } catch (_err) {
      payload = [];
    }
  }

  const providerCandidates = dedupeCandidates(
    payload
      .filter((entry) => entry.placeName && entry.eLoc)
      .map((entry, index) => parseCandidate(entry, index, 'mapmyindia'))
  );

  return providerCandidates.length > 0 ? providerCandidates : DEMO_CITIES;
}

async function loadClickSignals(
  candidates: CandidateDocument[],
  normalizedQuery: string,
  region: string,
  actor?: SearchActor,
  field?: SearchField
): Promise<Record<string, ClickSignals>> {
  if (!candidates.length || normalizedQuery.length < 2) {
    return {};
  }

  const contextKeys = contextClickKeys(region, actor, field);
  const pipeline = cacheRedis.multi();

  for (const candidate of candidates) {
    pipeline.zscore(globalClickKey(region), candidate.eLoc);
    for (const key of contextKeys) {
      pipeline.zscore(key, candidate.eLoc);
    }
    pipeline.zscore(queryClickKey(region, normalizedQuery), candidate.eLoc);
  }

  const responses = (await pipeline.exec()) || [];
  const signals: Record<string, ClickSignals> = {};
  let index = 0;

  for (const candidate of candidates) {
    const globalClicks = Number(responses[index]?.[1] || 0);
    index += 1;

    let contextClicks = 0;
    for (let contextIndex = 0; contextIndex < contextKeys.length; contextIndex += 1) {
      contextClicks += Number(responses[index]?.[1] || 0);
      index += 1;
    }

    const queryClicks = Number(responses[index]?.[1] || 0);
    index += 1;

    signals[candidate.eLoc] = {
      globalClicks,
      contextClicks,
      queryClicks
    };
  }

  return signals;
}

function scoreCandidate(
  candidate: CandidateDocument,
  normalizedQuery: string,
  queryTokens: string[],
  clickSignals: ClickSignals
) {
  const exactMatch = normalizedQuery === candidate.normalizedName || normalizedQuery === candidate.normalizedCity;
  const prefixName = candidate.normalizedName.startsWith(normalizedQuery);
  const prefixCity = candidate.normalizedCity.startsWith(normalizedQuery);
  const containsMatch = candidate.normalizedSearchText.includes(normalizedQuery);
  const namePrefixCoverage = prefixCoverage(queryTokens, candidate.nameTokens);
  const cityPrefixCoverage = prefixCoverage(queryTokens, candidate.cityTokens);
  const addressPrefixCoverage = prefixCoverage(queryTokens, candidate.addressTokens);
  const lexicalCoverage = prefixCoverage(queryTokens, candidate.searchTokens);
  const exactTokenCoverage = exactCoverage(queryTokens, candidate.searchTokens);
  const fuzzySimilarity = Math.max(
    similarity(normalizedQuery, candidate.normalizedName),
    similarity(normalizedQuery, candidate.normalizedCity),
    similarity(normalizedQuery, candidate.normalizedAddress)
  );

  const isRelevant =
    exactMatch ||
    prefixName ||
    prefixCity ||
    containsMatch ||
    lexicalCoverage > 0 ||
    fuzzySimilarity >= 0.64 ||
    clickSignals.queryClicks > 0;

  let score = 0;
  score += exactMatch ? 120 : 0;
  score += prefixName ? 82 : 0;
  score += prefixCity ? 70 : 0;
  score += 42 * namePrefixCoverage;
  score += 36 * cityPrefixCoverage;
  score += 28 * lexicalCoverage;
  score += 14 * exactTokenCoverage;
  score += 10 * addressPrefixCoverage;
  score += containsMatch ? 12 : 0;
  score += fuzzySimilarity >= 0.52 ? fuzzySimilarity * 24 : 0;

  const popularityPrior = CITY_POPULARITY_PRIORS[candidate.normalizedCity] || CITY_POPULARITY_PRIORS[candidate.normalizedName] || 0;
  const providerBonus = Math.max(0, 14 - candidate.sourceOrder * 1.1);
  score += popularityPrior;
  score += providerBonus;
  score += Math.min(Math.log1p(clickSignals.globalClicks) * 2.4 + clickSignals.globalClicks * 0.4, 10);
  score += Math.min(Math.log1p(clickSignals.contextClicks) * 6.2 + clickSignals.contextClicks * 0.9, 28);
  score += Math.min(Math.log1p(clickSignals.queryClicks) * 8.4 + clickSignals.queryClicks * 2.8, 24);

  let matchType: MMISuggestion['matchType'] = 'provider';
  if (exactMatch) {
    matchType = 'exact';
  } else if (prefixName || prefixCity) {
    matchType = 'prefix';
  } else if (lexicalCoverage >= 1) {
    matchType = 'token';
  } else if (containsMatch) {
    matchType = 'contains';
  } else if (fuzzySimilarity >= 0.64) {
    matchType = 'fuzzy';
  }

  let popularityHint: string | null = null;
  if (clickSignals.queryClicks >= 2) {
    popularityHint = 'Frequently selected for this query';
  } else if (clickSignals.contextClicks >= 2) {
    popularityHint = 'Popular with similar trips';
  } else if (popularityPrior >= 8) {
    popularityHint = 'Popular city';
  }

  return {
    isRelevant,
    suggestion: {
      placeName: candidate.placeName,
      placeAddress: candidate.placeAddress,
      eLoc: candidate.eLoc,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      city: candidate.city,
      state: candidate.state,
      source: candidate.source,
      matchType,
      score: Math.round(score * 1000) / 1000,
      queryClicks: Math.trunc(clickSignals.queryClicks),
      contextClicks: Math.trunc(clickSignals.contextClicks),
      globalClicks: Math.trunc(clickSignals.globalClicks),
      popularityHint
    },
    sourceOrder: candidate.sourceOrder
  };
}

function haversineKm(origin: [number, number], dest: [number, number]) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const [lng1, lat1] = origin;
  const [lng2, lat2] = dest;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export async function geocode(query: string) {
  if (useDemoMaps()) {
    const result = await suggestCities(query, 'IND', { limit: 1 });
    return result.suggestions[0] || null;
  }

  try {
    const token = await getMMIToken();
    const res = await axios.get(`${MAPMYINDIA_BASE}/atlas/places`, {
      params: { query, region: 'IND' },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 4000
    });

    return res.data.suggestedLocations?.[0] || null;
  } catch (_err) {
    const result = await suggestCities(query, 'IND', { limit: 1 });
    return result.suggestions[0] || null;
  }
}

export async function getRouteDistance(origin: [number, number], dest: [number, number]) {
  const fallback = () => {
    const distanceKm = haversineKm(origin, dest);
    const etaMinutes = (distanceKm / 55) * 60;
    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      etaMinutes: Math.round(etaMinutes)
    };
  };

  if (useDemoMaps()) {
    return fallback();
  }

  try {
    const key = env.MMI_REST_API_KEY || env.MMI_CLIENT_ID;
    const res = await axios.get(`${MAPMYINDIA_BASE}/advancedmaps/v1/${key}/route_eta/driving/`, {
      params: {
        origin: `${origin[1]},${origin[0]}`,
        destination: `${dest[1]},${dest[0]}`
      },
      timeout: 5000
    });

    return {
      distanceKm: (res.data.routes?.[0]?.distance || 0) / 1000,
      etaMinutes: (res.data.routes?.[0]?.duration || 0) / 60
    };
  } catch (_error) {
    return fallback();
  }
}

export async function suggestCities(query: string, region = 'IND', context: SearchContext = {}): Promise<SearchSuggestionsResponse> {
  const normalized = normalizeText(query);
  const limit = Math.max(1, Math.min(context.limit ?? 10, 12));
  const meta = {
    normalizedQuery: normalized,
    strategy: 'hybrid_lexical_ctr_rerank',
    actor: context.actor,
    field: context.field,
    region
  };

  const proxied = await callRoutingSearch<SearchSuggestionsResponse>('/internal/v1/search/locations', {
    query,
    region,
    limit,
    actor: context.actor,
    field: context.field
  });
  if (proxied) {
    return proxied;
  }

  if (normalized.length < 2) {
    return { suggestions: [], meta };
  }

  let candidates: CandidateDocument[] = [];
  if (useDemoMaps()) {
    candidates = DEMO_CITIES;
  } else {
    try {
      candidates = await loadProviderCandidates(query, region);
      if (!candidates.length) {
        candidates = DEMO_CITIES;
      }
    } catch (_err) {
      candidates = DEMO_CITIES;
    }
  }
  const clickSignals = await loadClickSignals(candidates, normalized, region, context.actor, context.field);
  const queryTokens = tokenizeText(normalized);

  const ranked = candidates
    .map((candidate) => scoreCandidate(candidate, normalized, queryTokens, clickSignals[candidate.eLoc] || { globalClicks: 0, contextClicks: 0, queryClicks: 0 }))
    .filter((candidate) => candidate.isRelevant)
    .sort((left, right) => {
      const scoreDiff = (right.suggestion.score || 0) - (left.suggestion.score || 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const queryClicksDiff = (right.suggestion.queryClicks || 0) - (left.suggestion.queryClicks || 0);
      if (queryClicksDiff !== 0) {
        return queryClicksDiff;
      }

      const contextClicksDiff = (right.suggestion.contextClicks || 0) - (left.suggestion.contextClicks || 0);
      if (contextClicksDiff !== 0) {
        return contextClicksDiff;
      }

      return left.sourceOrder - right.sourceOrder;
    })
    .slice(0, limit)
    .map((candidate) => candidate.suggestion);

  if (ranked.length === 0 && normalized.length >= 2) {
    const formatted = query
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    ranked.push({
      placeName: formatted,
      placeAddress: `${formatted}, India`,
      city: formatted,
      state: 'India',
      eLoc: `LOC_${formatted.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
      latitude: 20.5937,
      longitude: 78.9629,
      matchType: 'fuzzy',
      source: 'fallback',
      score: 10,
      queryClicks: 0,
      contextClicks: 0,
      globalClicks: 0,
      popularityHint: null
    });
  }

  return {
    suggestions: ranked,
    meta
  };
}

export async function recordSuggestionSelection(payload: SearchSelectionPayload): Promise<{ accepted: boolean }> {
  const region = payload.region || 'IND';
  const normalizedQuery = normalizeText(payload.query);
  const placeId = payload.suggestion.eLoc?.trim();

  const proxied = await callRoutingSearch<{ accepted: boolean }>('/internal/v1/search/feedback/select', {
    query: payload.query,
    region,
    actor: payload.actor,
    field: payload.field,
    place_id: payload.suggestion.eLoc,
    place_name: payload.suggestion.placeName,
    place_address: payload.suggestion.placeAddress,
    city: payload.suggestion.city,
    state: payload.suggestion.state
  });
  if (proxied) {
    return proxied;
  }

  if (normalizedQuery.length < 2 || !placeId) {
    return { accepted: false };
  }

  const contextKeys = contextClickKeys(region, payload.actor, payload.field);
  const pipeline = cacheRedis.multi();
  pipeline.zincrby(globalClickKey(region), 1, placeId);
  for (const key of contextKeys) {
    pipeline.zincrby(key, 1, placeId);
    pipeline.expire(key, QUERY_CLICK_TTL_SECONDS);
  }
  pipeline.zincrby(queryClickKey(region, normalizedQuery), 1, placeId);
  pipeline.expire(queryClickKey(region, normalizedQuery), QUERY_CLICK_TTL_SECONDS);
  pipeline.hset(selectionMetadataKey(placeId), {
    place_name: payload.suggestion.placeName || '',
    place_address: payload.suggestion.placeAddress || '',
    city: payload.suggestion.city || '',
    state: payload.suggestion.state || ''
  });
  await pipeline.exec();

  return { accepted: true };
}

export async function getRouteGeometry(params: {
  originLng: number;
  originLat: number;
  destLng: number;
  destLat: number;
}) {
  const proxied = await callRoutingSearch<{
    distanceKm: number;
    durationHours: number;
    geometry: { type: string; coordinates: number[][] };
  }>('/internal/v1/route-geometry', {
    origin_lng: params.originLng,
    origin_lat: params.originLat,
    dest_lng: params.destLng,
    dest_lat: params.destLat
  });
  if (proxied) {
    return proxied;
  }

  const { originLng, originLat, destLng, destLat } = params;

  const fallbackGeometry = () => {
    const origin: [number, number] = [originLng, originLat];
    const destination: [number, number] = [destLng, destLat];
    const distanceKm = haversineKm(origin, destination);
    const durationHours = distanceKm / 55;
    const midLng = (originLng + destLng) / 2;
    const midLat = (originLat + destLat) / 2 + 0.35;

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationHours: Math.round(durationHours * 10) / 10,
      geometry: {
        type: 'LineString',
        coordinates: [
          [originLng, originLat],
          [midLng, midLat],
          [destLng, destLat]
        ]
      }
    };
  };

  if (useDemoMaps()) {
    return fallbackGeometry();
  }

  const cacheKey = `cache:route:${originLng},${originLat}:${destLng},${destLat}`;
  const cached = await cacheRedis.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  try {
    const token = await getMMIToken();
    const res = await axios.get(
      `${MAPMYINDIA_BASE}/advancedmaps/v1/${env.MMI_CLIENT_ID}/route_adv/driving/${originLng},${originLat};${destLng},${destLat}`,
      {
        params: {
          geometries: 'geojson',
          overview: 'full'
        },
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 4000
      }
    );

    const route = res.data?.routes?.[0];
    const result = {
      distanceKm: Math.round(((route?.distance || 0) / 1000) * 10) / 10,
      durationHours: Math.round(((route?.duration || 0) / 3600) * 10) / 10,
      geometry: route?.geometry || { type: 'LineString', coordinates: [] }
    };

    await cacheRedis.setex(cacheKey, 86400, JSON.stringify(result));
    return result;
  } catch (_err) {
    return fallbackGeometry();
  }
}

async function getMMIToken(): Promise<string> {
  const cached = await cacheRedis.get('mmi:token');
  if (cached) {
    return cached;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.MMI_CLIENT_ID,
    client_secret: env.MMI_CLIENT_SECRET
  });

  const res = await axios.post('https://outpost.mapmyindia.com/api/security/oauth/token', body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  await cacheRedis.setex('mmi:token', Math.max((res.data.expires_in || 3600) - 60, 60), res.data.access_token);
  return res.data.access_token;
}
