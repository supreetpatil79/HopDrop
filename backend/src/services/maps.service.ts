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

const DEMO_CITIES: CandidateDocument[] = [
  buildCandidate('Bengaluru', 'Bengaluru, Karnataka, India', 'Bengaluru', 'Karnataka', 'DEMO_BLR', 12.9716, 77.5946, 0, ['bangalore', 'sbc', 'smvt', 'ypr', 'majestic', 'kempegowda', 'airport', 'blr']),
  buildCandidate('Mumbai', 'Mumbai, Maharashtra, India', 'Mumbai', 'Maharashtra', 'DEMO_BOM', 19.076, 72.8777, 1, ['bombay', 'csmt', 'cst', 'bct', 'mumbai central', 'bandra', 'ltt', 'dadar', 'thane', 'airport', 'bom']),
  buildCandidate('Delhi', 'New Delhi, Delhi, India', 'Delhi', 'Delhi', 'DEMO_DEL', 28.6139, 77.209, 2, ['new delhi', 'ndls', 'dli', 'old delhi', 'nzm', 'hazrat nizamuddin', 'anvt', 'anand vihar', 'igi', 'airport', 'del']),
  buildCandidate('Hyderabad', 'Hyderabad, Telangana, India', 'Hyderabad', 'Telangana', 'DEMO_HYD', 17.385, 78.4867, 3, ['secunderabad', 'sc', 'rgia', 'shamshabad', 'hyd']),
  buildCandidate('Pune', 'Pune, Maharashtra, India', 'Pune', 'Maharashtra', 'DEMO_PNQ', 18.5204, 73.8567, 4, ['poona', 'shivajinagar', 'pnq']),
  buildCandidate('Chennai', 'Chennai, Tamil Nadu, India', 'Chennai', 'Tamil Nadu', 'DEMO_MAA', 13.0827, 80.2707, 5, ['madras', 'mas', 'ms', 'central', 'egmore', 'maa']),
  buildCandidate('Kolkata', 'Kolkata, West Bengal, India', 'Kolkata', 'West Bengal', 'DEMO_CCU', 22.5726, 88.3639, 6, ['calcutta', 'howrah', 'hwh', 'sealdah', 'sda', 'dumdum', 'ccu']),
  buildCandidate('Ahmedabad', 'Ahmedabad, Gujarat, India', 'Ahmedabad', 'Gujarat', 'DEMO_AMD', 23.0225, 72.5714, 7, ['adi', 'sabarmati', 'gandhinagar', 'amd']),
  buildCandidate('Jaipur', 'Jaipur, Rajasthan, India', 'Jaipur', 'Rajasthan', 'DEMO_JAI', 26.9124, 75.7873, 8, ['pink city', 'jp', 'jai']),
  buildCandidate('Kochi', 'Kochi, Kerala, India', 'Kochi', 'Kerala', 'DEMO_COK', 9.9312, 76.2673, 9, ['cochin', 'ernakulam', 'ers', 'cok']),
  buildCandidate('Chandigarh', 'Chandigarh, Punjab/Haryana, India', 'Chandigarh', 'Chandigarh', 'DEMO_IXC', 30.7333, 76.7794, 10, ['mohali', 'panchkula', 'ixc']),
  buildCandidate('Lucknow', 'Lucknow, Uttar Pradesh, India', 'Lucknow', 'Uttar Pradesh', 'DEMO_LKO', 26.8467, 80.9462, 11, ['charbagh', 'lko']),
  buildCandidate('Surat', 'Surat, Gujarat, India', 'Surat', 'Gujarat', 'DEMO_STV', 21.1702, 72.8311, 12, ['stv']),
  buildCandidate('Indore', 'Indore, Madhya Pradesh, India', 'Indore', 'Madhya Pradesh', 'DEMO_IDR', 22.7196, 75.8577, 13, ['idr']),
  buildCandidate('Bhopal', 'Bhopal, Madhya Pradesh, India', 'Bhopal', 'Madhya Pradesh', 'DEMO_BHO', 23.2599, 77.4126, 14, ['habibganj', 'rani kamlapati', 'bho']),
  buildCandidate('Nagpur', 'Nagpur, Maharashtra, India', 'Nagpur', 'Maharashtra', 'DEMO_NAG', 21.1458, 79.0882, 15, ['nag']),
  buildCandidate('Visakhapatnam', 'Visakhapatnam, Andhra Pradesh, India', 'Visakhapatnam', 'Andhra Pradesh', 'DEMO_VTZ', 17.6868, 83.2185, 16, ['vizag', 'vtz']),
  buildCandidate('Patna', 'Patna, Bihar, India', 'Patna', 'Bihar', 'DEMO_PAT', 25.5941, 85.1376, 17, ['pnbe', 'pat']),
  buildCandidate('Vadodara', 'Vadodara, Gujarat, India', 'Vadodara', 'Gujarat', 'DEMO_BDQ', 22.3072, 73.1812, 18, ['baroda', 'brc', 'bdq']),
  buildCandidate('Ludhiana', 'Ludhiana, Punjab, India', 'Ludhiana', 'Punjab', 'DEMO_LUH', 30.901, 75.8573, 19, ['ldh', 'luh']),
  buildCandidate('Agra', 'Agra, Uttar Pradesh, India', 'Agra', 'Uttar Pradesh', 'DEMO_AGR', 27.1767, 78.0081, 20, ['taj', 'agc', 'agr']),
  buildCandidate('Nashik', 'Nashik, Maharashtra, India', 'Nashik', 'Maharashtra', 'DEMO_ISK', 19.9975, 73.7898, 21, ['nasik', 'nk', 'isk']),
  buildCandidate('Varanasi', 'Varanasi, Uttar Pradesh, India', 'Varanasi', 'Uttar Pradesh', 'DEMO_VNS', 25.3176, 82.9739, 22, ['banaras', 'kashi', 'bsb', 'vns']),
  buildCandidate('Amritsar', 'Amritsar, Punjab, India', 'Amritsar', 'Punjab', 'DEMO_ATQ', 31.634, 74.8723, 23, ['golden temple', 'asr', 'atq']),
  buildCandidate('Coimbatore', 'Coimbatore, Tamil Nadu, India', 'Coimbatore', 'Tamil Nadu', 'DEMO_CJB', 11.0168, 76.9558, 24, ['kovai', 'cbe', 'cjb']),
  buildCandidate('Madurai', 'Madurai, Tamil Nadu, India', 'Madurai', 'Tamil Nadu', 'DEMO_IXM', 9.9252, 78.1198, 25, ['mdu', 'ixm']),
  buildCandidate('Mysuru', 'Mysuru, Karnataka, India', 'Mysuru', 'Karnataka', 'DEMO_MYQ', 12.2958, 76.6394, 26, ['mysore', 'mys', 'myq']),
  buildCandidate('Mangaluru', 'Mangaluru, Karnataka, India', 'Mangaluru', 'Karnataka', 'DEMO_IXE', 12.9141, 74.856, 27, ['mangalore', 'maq', 'ixe']),
  buildCandidate('Hubballi', 'Hubballi, Karnataka, India', 'Hubballi', 'Karnataka', 'DEMO_HBX', 15.3647, 75.124, 28, ['hubli', 'dharwad', 'ubl', 'hbx']),
  buildCandidate('Goa (Panaji)', 'Panaji, Goa, India', 'Goa', 'Goa', 'DEMO_GOI', 15.4909, 73.8278, 29, ['panjim', 'madgaon', 'vasco', 'mopa', 'goi']),
  buildCandidate('Thiruvananthapuram', 'Thiruvananthapuram, Kerala, India', 'Thiruvananthapuram', 'Kerala', 'DEMO_TRV', 8.5241, 76.9366, 30, ['trivandrum', 'tvc', 'trv']),
  buildCandidate('Kozhikode', 'Kozhikode, Kerala, India', 'Kozhikode', 'Kerala', 'DEMO_CCJ', 11.2588, 75.7804, 31, ['calicut', 'clt', 'ccj']),
  buildCandidate('Vijayawada', 'Vijayawada, Andhra Pradesh, India', 'Vijayawada', 'Andhra Pradesh', 'DEMO_VGA', 16.5062, 80.648, 32, ['bza', 'vga']),
  buildCandidate('Raipur', 'Raipur, Chhattisgarh, India', 'Raipur', 'Chhattisgarh', 'DEMO_RPR', 21.2514, 81.6296, 33, ['rpr']),
  buildCandidate('Ranchi', 'Ranchi, Jharkhand, India', 'Ranchi', 'Jharkhand', 'DEMO_IXR', 23.3441, 85.3096, 34, ['rnc', 'ixr']),
  buildCandidate('Bhubaneswar', 'Bhubaneswar, Odisha, India', 'Bhubaneswar', 'Odisha', 'DEMO_BBI', 20.2961, 85.8245, 35, ['bbs', 'bbi']),
  buildCandidate('Guwahati', 'Guwahati, Assam, India', 'Guwahati', 'Assam', 'DEMO_GAU', 26.1445, 91.7362, 36, ['ghy', 'gau']),
  buildCandidate('Dehradun', 'Dehradun, Uttarakhand, India', 'Dehradun', 'Uttarakhand', 'DEMO_DED', 30.3165, 78.0322, 37, ['ddn', 'ded']),
  buildCandidate('Shimla', 'Shimla, Himachal Pradesh, India', 'Shimla', 'Himachal Pradesh', 'DEMO_SLV', 31.1048, 77.1734, 38, ['sml', 'slv']),
  buildCandidate('Srinagar', 'Srinagar, Jammu and Kashmir, India', 'Srinagar', 'Jammu and Kashmir', 'DEMO_SXR', 34.0837, 74.7973, 39, ['sxr']),
  buildCandidate('Jodhpur', 'Jodhpur, Rajasthan, India', 'Jodhpur', 'Rajasthan', 'DEMO_JDH', 26.2389, 73.0243, 40, ['ju', 'jdh']),
  buildCandidate('Udaipur', 'Udaipur, Rajasthan, India', 'Udaipur', 'Rajasthan', 'DEMO_UDR', 24.5854, 73.7125, 41, ['udz', 'udr']),
  buildCandidate('Noida', 'Noida, Uttar Pradesh, India', 'Noida', 'Uttar Pradesh', 'DEMO_NOI', 28.5355, 77.391, 42, ['greater noida', 'noi']),
  buildCandidate('Gurugram', 'Gurugram, Haryana, India', 'Gurugram', 'Haryana', 'DEMO_GUR', 28.4595, 77.0266, 43, ['gurgaon', 'gur']),
  buildCandidate('Kanpur', 'Kanpur, Uttar Pradesh, India', 'Kanpur', 'Uttar Pradesh', 'DEMO_KNU', 26.4499, 80.3319, 44, ['cnb', 'knu'])
];

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
