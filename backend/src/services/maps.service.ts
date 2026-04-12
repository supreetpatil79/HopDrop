import axios from 'axios';
import { env } from '../config/env';
import { cacheRedis } from '../config/redis';
import { callRoutingSearch } from './routingSearch.service';

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

const DEMO_CITIES: CandidateDocument[] = [
  {
    placeName: 'Bengaluru',
    placeAddress: 'Karnataka, India',
    eLoc: 'DEMO_BLR',
    latitude: 12.9716,
    longitude: 77.5946,
    city: 'Bengaluru',
    state: 'Karnataka',
    source: 'demo',
    sourceOrder: 0,
    normalizedName: 'bengaluru',
    normalizedCity: 'bengaluru',
    normalizedAddress: 'karnataka india',
    normalizedSearchText: 'bengaluru bengaluru karnataka karnataka india demo blr',
    nameTokens: ['bengaluru'],
    cityTokens: ['bengaluru'],
    addressTokens: ['karnataka', 'india'],
    searchTokens: ['bengaluru', 'karnataka', 'india', 'demo', 'blr']
  },
  {
    placeName: 'Mumbai',
    placeAddress: 'Maharashtra, India',
    eLoc: 'DEMO_BOM',
    latitude: 19.076,
    longitude: 72.8777,
    city: 'Mumbai',
    state: 'Maharashtra',
    source: 'demo',
    sourceOrder: 1,
    normalizedName: 'mumbai',
    normalizedCity: 'mumbai',
    normalizedAddress: 'maharashtra india',
    normalizedSearchText: 'mumbai mumbai maharashtra maharashtra india demo bom',
    nameTokens: ['mumbai'],
    cityTokens: ['mumbai'],
    addressTokens: ['maharashtra', 'india'],
    searchTokens: ['mumbai', 'maharashtra', 'india', 'demo', 'bom']
  },
  {
    placeName: 'Delhi',
    placeAddress: 'Delhi, India',
    eLoc: 'DEMO_DEL',
    latitude: 28.6139,
    longitude: 77.209,
    city: 'Delhi',
    state: 'Delhi',
    source: 'demo',
    sourceOrder: 2,
    normalizedName: 'delhi',
    normalizedCity: 'delhi',
    normalizedAddress: 'delhi india',
    normalizedSearchText: 'delhi delhi delhi delhi india demo del',
    nameTokens: ['delhi'],
    cityTokens: ['delhi'],
    addressTokens: ['delhi', 'india'],
    searchTokens: ['delhi', 'india', 'demo']
  },
  {
    placeName: 'Dehradun',
    placeAddress: 'Uttarakhand, India',
    eLoc: 'DEMO_DDN',
    latitude: 30.3165,
    longitude: 78.0322,
    city: 'Dehradun',
    state: 'Uttarakhand',
    source: 'demo',
    sourceOrder: 3,
    normalizedName: 'dehradun',
    normalizedCity: 'dehradun',
    normalizedAddress: 'uttarakhand india',
    normalizedSearchText: 'dehradun dehradun uttarakhand uttarakhand india demo ddn',
    nameTokens: ['dehradun'],
    cityTokens: ['dehradun'],
    addressTokens: ['uttarakhand', 'india'],
    searchTokens: ['dehradun', 'uttarakhand', 'india', 'demo', 'ddn']
  },
  {
    placeName: 'Hyderabad',
    placeAddress: 'Telangana, India',
    eLoc: 'DEMO_HYD',
    latitude: 17.385,
    longitude: 78.4867,
    city: 'Hyderabad',
    state: 'Telangana',
    source: 'demo',
    sourceOrder: 4,
    normalizedName: 'hyderabad',
    normalizedCity: 'hyderabad',
    normalizedAddress: 'telangana india',
    normalizedSearchText: 'hyderabad hyderabad telangana telangana india demo hyd',
    nameTokens: ['hyderabad'],
    cityTokens: ['hyderabad'],
    addressTokens: ['telangana', 'india'],
    searchTokens: ['hyderabad', 'telangana', 'india', 'demo', 'hyd']
  },
  {
    placeName: 'Pune',
    placeAddress: 'Maharashtra, India',
    eLoc: 'DEMO_PNQ',
    latitude: 18.5204,
    longitude: 73.8567,
    city: 'Pune',
    state: 'Maharashtra',
    source: 'demo',
    sourceOrder: 5,
    normalizedName: 'pune',
    normalizedCity: 'pune',
    normalizedAddress: 'maharashtra india',
    normalizedSearchText: 'pune pune maharashtra maharashtra india demo pnq',
    nameTokens: ['pune'],
    cityTokens: ['pune'],
    addressTokens: ['maharashtra', 'india'],
    searchTokens: ['pune', 'maharashtra', 'india', 'demo', 'pnq']
  },
  {
    placeName: 'Chennai',
    placeAddress: 'Tamil Nadu, India',
    eLoc: 'DEMO_MAA',
    latitude: 13.0827,
    longitude: 80.2707,
    city: 'Chennai',
    state: 'Tamil Nadu',
    source: 'demo',
    sourceOrder: 6,
    normalizedName: 'chennai',
    normalizedCity: 'chennai',
    normalizedAddress: 'tamil nadu india',
    normalizedSearchText: 'chennai chennai tamil nadu tamil nadu india demo maa',
    nameTokens: ['chennai'],
    cityTokens: ['chennai'],
    addressTokens: ['tamil', 'nadu', 'india'],
    searchTokens: ['chennai', 'tamil', 'nadu', 'india', 'demo', 'maa']
  },
  {
    placeName: 'Chandigarh',
    placeAddress: 'Chandigarh, India',
    eLoc: 'DEMO_IXC',
    latitude: 30.7333,
    longitude: 76.7794,
    city: 'Chandigarh',
    state: 'Chandigarh',
    source: 'demo',
    sourceOrder: 7,
    normalizedName: 'chandigarh',
    normalizedCity: 'chandigarh',
    normalizedAddress: 'chandigarh india',
    normalizedSearchText: 'chandigarh chandigarh chandigarh chandigarh india demo ixc',
    nameTokens: ['chandigarh'],
    cityTokens: ['chandigarh'],
    addressTokens: ['chandigarh', 'india'],
    searchTokens: ['chandigarh', 'india', 'demo', 'ixc']
  },
  {
    placeName: 'Kolkata',
    placeAddress: 'West Bengal, India',
    eLoc: 'DEMO_CCU',
    latitude: 22.5726,
    longitude: 88.3639,
    city: 'Kolkata',
    state: 'West Bengal',
    source: 'demo',
    sourceOrder: 8,
    normalizedName: 'kolkata',
    normalizedCity: 'kolkata',
    normalizedAddress: 'west bengal india',
    normalizedSearchText: 'kolkata kolkata west bengal west bengal india demo ccu',
    nameTokens: ['kolkata'],
    cityTokens: ['kolkata'],
    addressTokens: ['west', 'bengal', 'india'],
    searchTokens: ['kolkata', 'west', 'bengal', 'india', 'demo', 'ccu']
  },
  {
    placeName: 'Ahmedabad',
    placeAddress: 'Gujarat, India',
    eLoc: 'DEMO_AMD',
    latitude: 23.0225,
    longitude: 72.5714,
    city: 'Ahmedabad',
    state: 'Gujarat',
    source: 'demo',
    sourceOrder: 9,
    normalizedName: 'ahmedabad',
    normalizedCity: 'ahmedabad',
    normalizedAddress: 'gujarat india',
    normalizedSearchText: 'ahmedabad ahmedabad gujarat gujarat india demo amd',
    nameTokens: ['ahmedabad'],
    cityTokens: ['ahmedabad'],
    addressTokens: ['gujarat', 'india'],
    searchTokens: ['ahmedabad', 'gujarat', 'india', 'demo', 'amd']
  },
  {
    placeName: 'Jaipur',
    placeAddress: 'Rajasthan, India',
    eLoc: 'DEMO_JAI',
    latitude: 26.9124,
    longitude: 75.7873,
    city: 'Jaipur',
    state: 'Rajasthan',
    source: 'demo',
    sourceOrder: 10,
    normalizedName: 'jaipur',
    normalizedCity: 'jaipur',
    normalizedAddress: 'rajasthan india',
    normalizedSearchText: 'jaipur jaipur rajasthan rajasthan india demo jai',
    nameTokens: ['jaipur'],
    cityTokens: ['jaipur'],
    addressTokens: ['rajasthan', 'india'],
    searchTokens: ['jaipur', 'rajasthan', 'india', 'demo', 'jai']
  },
  {
    placeName: 'Kochi',
    placeAddress: 'Kerala, India',
    eLoc: 'DEMO_COK',
    latitude: 9.9312,
    longitude: 76.2673,
    city: 'Kochi',
    state: 'Kerala',
    source: 'demo',
    sourceOrder: 11,
    normalizedName: 'kochi',
    normalizedCity: 'kochi',
    normalizedAddress: 'kerala india',
    normalizedSearchText: 'kochi kochi kerala kerala india demo cok',
    nameTokens: ['kochi'],
    cityTokens: ['kochi'],
    addressTokens: ['kerala', 'india'],
    searchTokens: ['kochi', 'kerala', 'india', 'demo', 'cok']
  }
];

function useDemoMaps(): boolean {
  if (!env.DEMO_MODE) {
    return false;
  }

  const clientId = env.MMI_CLIENT_ID.toLowerCase();
  const clientSecret = env.MMI_CLIENT_SECRET.toLowerCase();
  return clientId.includes('dummy') || clientSecret.includes('dummy') || !clientId || !clientSecret;
}

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
  let payload: Array<Record<string, unknown>>;

  if (cached) {
    payload = JSON.parse(cached) as Array<Record<string, unknown>>;
  } else {
    const token = await getMMIToken();
    const res = await axios.get(`${MAPMYINDIA_ATLAS}/api/places/search/json`, {
      params: {
        query,
        region,
        pod: 'CITY'
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    payload = res.data?.suggestedLocations || [];
    await cacheRedis.setex(providerCacheKey(normalizedQuery, region), PROVIDER_CACHE_TTL_SECONDS, JSON.stringify(payload));
  }

  return dedupeCandidates(
    payload
      .filter((entry) => entry.placeName && entry.eLoc)
      .map((entry, index) => parseCandidate(entry, index, 'mapmyindia'))
  );
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

  const res = await axios.get(`${MAPMYINDIA_BASE}/atlas/places`, {
    params: { query, region: 'IND' },
    headers: { Authorization: `Bearer ${await getMMIToken()}` }
  });

  return res.data.suggestedLocations?.[0];
}

export async function getRouteDistance(origin: [number, number], dest: [number, number]) {
  if (useDemoMaps()) {
    const distanceKm = haversineKm(origin, dest);
    const etaMinutes = (distanceKm / 55) * 60;
    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      etaMinutes: Math.round(etaMinutes)
    };
  }

  const key = env.MMI_REST_API_KEY || env.MMI_CLIENT_ID;
  const res = await axios.get(`${MAPMYINDIA_BASE}/advancedmaps/v1/${key}/route_eta/driving/`, {
    params: {
      origin: `${origin[1]},${origin[0]}`,
      destination: `${dest[1]},${dest[0]}`
    }
  });

  return {
    distanceKm: (res.data.routes?.[0]?.distance || 0) / 1000,
    etaMinutes: (res.data.routes?.[0]?.duration || 0) / 60
  };
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

  const candidates = useDemoMaps() ? DEMO_CITIES : await loadProviderCandidates(query, region);
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

  if (useDemoMaps()) {
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
  }

  const cacheKey = `cache:route:${originLng},${originLat}:${destLng},${destLat}`;
  const cached = await cacheRedis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

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
      }
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
