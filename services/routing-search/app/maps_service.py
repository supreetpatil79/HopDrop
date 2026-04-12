import json
import math
import re
from difflib import SequenceMatcher
from functools import lru_cache
from typing import Any

import httpx
from redis import Redis

from app.config import settings

MAPMYINDIA_BASE = "https://apis.mapmyindia.com"
MAPMYINDIA_ATLAS = "https://atlas.mappls.com"
MAPMYINDIA_TOKEN_URL = "https://outpost.mapmyindia.com/api/security/oauth/token"
PROVIDER_CACHE_TTL_SECONDS = 3600
QUERY_CLICK_TTL_SECONDS = 60 * 60 * 24 * 30
TOKEN_PATTERN = re.compile(r"[a-z0-9]+")
WHITESPACE_PATTERN = re.compile(r"\s+")

CITY_POPULARITY_PRIORS = {
    "bengaluru": 9.5,
    "mumbai": 10.0,
    "delhi": 10.0,
    "hyderabad": 8.5,
    "pune": 8.0,
    "chennai": 8.2,
    "kolkata": 8.0,
    "ahmedabad": 7.2,
    "jaipur": 6.4,
    "kochi": 6.1,
    "chandigarh": 6.0,
    "lucknow": 5.9,
}

DEMO_CITIES = [
    {
        "placeName": "Bengaluru",
        "placeAddress": "Karnataka, India",
        "eLoc": "DEMO_BLR",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "city": "Bengaluru",
        "state": "Karnataka",
    },
    {
        "placeName": "Mumbai",
        "placeAddress": "Maharashtra, India",
        "eLoc": "DEMO_BOM",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "city": "Mumbai",
        "state": "Maharashtra",
    },
    {
        "placeName": "Delhi",
        "placeAddress": "Delhi, India",
        "eLoc": "DEMO_DEL",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "city": "Delhi",
        "state": "Delhi",
    },
    {
        "placeName": "Dehradun",
        "placeAddress": "Uttarakhand, India",
        "eLoc": "DEMO_DDN",
        "latitude": 30.3165,
        "longitude": 78.0322,
        "city": "Dehradun",
        "state": "Uttarakhand",
    },
    {
        "placeName": "Hyderabad",
        "placeAddress": "Telangana, India",
        "eLoc": "DEMO_HYD",
        "latitude": 17.3850,
        "longitude": 78.4867,
        "city": "Hyderabad",
        "state": "Telangana",
    },
    {
        "placeName": "Pune",
        "placeAddress": "Maharashtra, India",
        "eLoc": "DEMO_PNQ",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "city": "Pune",
        "state": "Maharashtra",
    },
    {
        "placeName": "Chennai",
        "placeAddress": "Tamil Nadu, India",
        "eLoc": "DEMO_MAA",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "city": "Chennai",
        "state": "Tamil Nadu",
    },
    {
        "placeName": "Chandigarh",
        "placeAddress": "Chandigarh, India",
        "eLoc": "DEMO_IXC",
        "latitude": 30.7333,
        "longitude": 76.7794,
        "city": "Chandigarh",
        "state": "Chandigarh",
    },
    {
        "placeName": "Kolkata",
        "placeAddress": "West Bengal, India",
        "eLoc": "DEMO_CCU",
        "latitude": 22.5726,
        "longitude": 88.3639,
        "city": "Kolkata",
        "state": "West Bengal",
    },
    {
        "placeName": "Ahmedabad",
        "placeAddress": "Gujarat, India",
        "eLoc": "DEMO_AMD",
        "latitude": 23.0225,
        "longitude": 72.5714,
        "city": "Ahmedabad",
        "state": "Gujarat",
    },
    {
        "placeName": "Jaipur",
        "placeAddress": "Rajasthan, India",
        "eLoc": "DEMO_JAI",
        "latitude": 26.9124,
        "longitude": 75.7873,
        "city": "Jaipur",
        "state": "Rajasthan",
    },
    {
        "placeName": "Kochi",
        "placeAddress": "Kerala, India",
        "eLoc": "DEMO_COK",
        "latitude": 9.9312,
        "longitude": 76.2673,
        "city": "Kochi",
        "state": "Kerala",
    },
]


@lru_cache(maxsize=1)
def get_cache() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


def use_demo_maps() -> bool:
    if not settings.demo_mode:
        return False

    client_id = settings.mapmyindia_client_id.lower()
    client_secret = settings.mapmyindia_client_secret.lower()
    return "dummy" in client_id or "dummy" in client_secret or not client_id or not client_secret


def haversine_km(origin: tuple[float, float], destination: tuple[float, float]) -> float:
    lng1, lat1 = origin
    lng2, lat2 = destination
    earth_radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_km * c


def _client() -> httpx.Client:
    return httpx.Client(timeout=settings.request_timeout_seconds)


def _get_mmi_token() -> str:
    cache = get_cache()
    cached = cache.get("mmi:token")
    if cached:
        return cached

    response = _client().post(
        MAPMYINDIA_TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": settings.mapmyindia_client_id,
            "client_secret": settings.mapmyindia_client_secret,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    response.raise_for_status()
    data = response.json()
    ttl = max(int(data.get("expires_in", 3600)) - 60, 60)
    token = data["access_token"]
    cache.setex("mmi:token", ttl, token)
    return token


def _normalize_text(value: str | None) -> str:
    if not value:
        return ""

    lowered = str(value).strip().lower()
    cleaned = re.sub(r"[^a-z0-9]+", " ", lowered)
    return WHITESPACE_PATTERN.sub(" ", cleaned).strip()


def _tokenize_text(value: str | None) -> list[str]:
    return [token for token in TOKEN_PATTERN.findall(_normalize_text(value)) if len(token) >= 2]


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _fallback_state(place_address: str) -> str:
    parts = [part.strip() for part in place_address.split(",") if part.strip()]
    if not parts:
        return ""

    if len(parts) >= 2 and parts[-1].lower() in {"india", "ind"}:
        return parts[-2]

    return parts[-1]


def _provider_cache_key(normalized_query: str, region: str) -> str:
    return f"cache:search:provider:{region.upper()}:{normalized_query}"


def _selection_metadata_key(place_id: str) -> str:
    return f"search:selection:meta:{place_id}"


def _global_click_key(region: str) -> str:
    return f"search:clicks:global:{region.upper()}"


def _context_click_key(region: str, actor: str | None, field: str | None) -> str:
    return f"search:clicks:context:{region.upper()}:{actor or 'all'}:{field or 'all'}"


def _query_click_key(region: str, normalized_query: str) -> str:
    return f"search:clicks:query:{region.upper()}:{normalized_query}"


def _context_click_keys(region: str, actor: str | None, field: str | None) -> list[str]:
    keys = [
        _context_click_key(region, None, None),
        _context_click_key(region, actor, None) if actor else None,
        _context_click_key(region, None, field) if field else None,
        _context_click_key(region, actor, field) if actor or field else None,
    ]
    deduped: list[str] = []
    seen: set[str] = set()
    for key in keys:
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(key)
    return deduped


def _parse_candidate(entry: dict[str, Any], source_order: int, source: str) -> dict[str, Any]:
    place_name = str(entry.get("placeName") or "").strip()
    place_address = str(entry.get("placeAddress") or "").strip()
    city = str(entry.get("city") or place_name).strip() or place_name
    state = str(entry.get("state") or _fallback_state(place_address)).strip()
    locality = str(entry.get("locality") or entry.get("district") or "").strip()
    sub_locality = str(entry.get("subLocality") or entry.get("subDistrict") or "").strip()
    search_parts = [
        place_name,
        city,
        state,
        locality,
        sub_locality,
        place_address,
        str(entry.get("eLoc") or "").strip(),
    ]
    normalized_name = _normalize_text(place_name)
    normalized_city = _normalize_text(city)
    normalized_address = _normalize_text(place_address)
    normalized_search_text = _normalize_text(" ".join(search_parts))

    return {
        "placeName": place_name,
        "placeAddress": place_address,
        "eLoc": str(entry.get("eLoc") or "").strip(),
        "latitude": _safe_float(entry.get("latitude")),
        "longitude": _safe_float(entry.get("longitude")),
        "city": city,
        "state": state,
        "source": source,
        "source_order": source_order,
        "normalized_name": normalized_name,
        "normalized_city": normalized_city,
        "normalized_address": normalized_address,
        "normalized_search_text": normalized_search_text,
        "name_tokens": _tokenize_text(place_name),
        "city_tokens": _tokenize_text(city),
        "address_tokens": _tokenize_text(" ".join([place_address, state, locality, sub_locality])),
        "search_tokens": _tokenize_text(" ".join(search_parts)),
    }


def _dedupe_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: dict[str, dict[str, Any]] = {}

    for candidate in candidates:
        dedupe_key = candidate["eLoc"] or (
            f"{candidate['normalized_name']}:{candidate['normalized_city']}:{candidate['latitude']}:{candidate['longitude']}"
        )
        existing = deduped.get(dedupe_key)
        if existing is None or candidate["source_order"] < existing["source_order"]:
            deduped[dedupe_key] = candidate

    return list(deduped.values())


def _load_provider_candidates(query: str, region: str) -> list[dict[str, Any]]:
    normalized_query = _normalize_text(query)
    cache = get_cache()
    cached = cache.get(_provider_cache_key(normalized_query, region))
    payload: list[dict[str, Any]]

    if cached:
        payload = json.loads(cached)
    else:
        token = _get_mmi_token()
        response = _client().get(
            f"{MAPMYINDIA_ATLAS}/api/places/search/json",
            params={"query": query, "region": region, "pod": "CITY"},
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
        payload = response.json().get("suggestedLocations", [])
        cache.setex(_provider_cache_key(normalized_query, region), PROVIDER_CACHE_TTL_SECONDS, json.dumps(payload))

    return _dedupe_candidates(
        [
            _parse_candidate(entry, source_order=index, source="mapmyindia")
            for index, entry in enumerate(payload)
            if entry.get("placeName") and entry.get("eLoc")
        ]
    )


def _load_demo_candidates() -> list[dict[str, Any]]:
    return [_parse_candidate(entry, source_order=index, source="demo") for index, entry in enumerate(DEMO_CITIES)]


def _prefix_coverage(query_tokens: list[str], candidate_tokens: list[str]) -> float:
    if not query_tokens or not candidate_tokens:
        return 0.0

    matched = 0
    for query_token in query_tokens:
        if any(candidate_token.startswith(query_token) for candidate_token in candidate_tokens):
            matched += 1

    return matched / len(query_tokens)


def _exact_coverage(query_tokens: list[str], candidate_tokens: list[str]) -> float:
    if not query_tokens or not candidate_tokens:
        return 0.0

    matched = sum(1 for query_token in query_tokens if query_token in candidate_tokens)
    return matched / len(query_tokens)


def _similarity(query: str, candidate_text: str) -> float:
    if not query or not candidate_text:
        return 0.0

    return SequenceMatcher(None, query, candidate_text).ratio()


def _load_click_signals(
    candidates: list[dict[str, Any]],
    normalized_query: str,
    region: str,
    actor: str | None,
    field: str | None,
) -> dict[str, dict[str, float]]:
    if not candidates or not normalized_query:
        return {}

    cache = get_cache()
    global_key = _global_click_key(region)
    query_key = _query_click_key(region, normalized_query)
    context_keys = _context_click_keys(region, actor, field)

    pipeline = cache.pipeline()
    for candidate in candidates:
        pipeline.zscore(global_key, candidate["eLoc"])
        for context_key in context_keys:
            pipeline.zscore(context_key, candidate["eLoc"])
        pipeline.zscore(query_key, candidate["eLoc"])

    raw_scores = pipeline.execute()
    index = 0
    scores: dict[str, dict[str, float]] = {}

    for candidate in candidates:
        place_id = candidate["eLoc"]
        global_clicks = float(raw_scores[index] or 0.0)
        index += 1

        context_clicks = 0.0
        for _ in context_keys:
            context_clicks += float(raw_scores[index] or 0.0)
            index += 1

        query_clicks = float(raw_scores[index] or 0.0)
        index += 1

        scores[place_id] = {
            "global_clicks": global_clicks,
            "context_clicks": context_clicks,
            "query_clicks": query_clicks,
        }

    return scores


def _rank_candidate(
    candidate: dict[str, Any],
    normalized_query: str,
    query_tokens: list[str],
    click_signals: dict[str, float],
) -> tuple[bool, dict[str, Any]]:
    normalized_name = candidate["normalized_name"]
    normalized_city = candidate["normalized_city"]
    normalized_address = candidate["normalized_address"]
    normalized_search_text = candidate["normalized_search_text"]

    exact_match = normalized_query in {normalized_name, normalized_city}
    prefix_name = normalized_name.startswith(normalized_query)
    prefix_city = normalized_city.startswith(normalized_query)
    contains_match = normalized_query in normalized_search_text

    name_prefix_coverage = _prefix_coverage(query_tokens, candidate["name_tokens"])
    city_prefix_coverage = _prefix_coverage(query_tokens, candidate["city_tokens"])
    address_prefix_coverage = _prefix_coverage(query_tokens, candidate["address_tokens"])
    lexical_coverage = _prefix_coverage(query_tokens, candidate["search_tokens"])
    exact_coverage = _exact_coverage(query_tokens, candidate["search_tokens"])

    fuzzy_similarity = max(
        _similarity(normalized_query, normalized_name),
        _similarity(normalized_query, normalized_city),
        _similarity(normalized_query, normalized_address),
    )

    query_clicks = click_signals.get("query_clicks", 0.0)
    context_clicks = click_signals.get("context_clicks", 0.0)
    global_clicks = click_signals.get("global_clicks", 0.0)

    is_relevant = any(
        (
            exact_match,
            prefix_name,
            prefix_city,
            contains_match,
            lexical_coverage > 0,
            fuzzy_similarity >= 0.64,
            query_clicks > 0,
        )
    )

    score = 0.0
    score += 120.0 if exact_match else 0.0
    score += 82.0 if prefix_name else 0.0
    score += 70.0 if prefix_city else 0.0
    score += 42.0 * name_prefix_coverage
    score += 36.0 * city_prefix_coverage
    score += 28.0 * lexical_coverage
    score += 14.0 * exact_coverage
    score += 10.0 * address_prefix_coverage
    score += 12.0 if contains_match else 0.0
    score += fuzzy_similarity * 24.0 if fuzzy_similarity >= 0.52 else 0.0

    popularity_prior = CITY_POPULARITY_PRIORS.get(candidate["normalized_city"]) or CITY_POPULARITY_PRIORS.get(
        candidate["normalized_name"], 0.0
    )
    provider_bonus = max(0.0, 14.0 - (candidate["source_order"] * 1.1))
    score += popularity_prior
    score += provider_bonus
    score += min((math.log1p(global_clicks) * 2.4) + (global_clicks * 0.4), 10.0)
    score += min((math.log1p(context_clicks) * 6.2) + (context_clicks * 0.9), 28.0)
    score += min((math.log1p(query_clicks) * 8.4) + (query_clicks * 2.8), 24.0)

    match_type = "provider"
    if exact_match:
        match_type = "exact"
    elif prefix_name or prefix_city:
        match_type = "prefix"
    elif lexical_coverage >= 1:
        match_type = "token"
    elif contains_match:
        match_type = "contains"
    elif fuzzy_similarity >= 0.64:
        match_type = "fuzzy"

    popularity_hint = None
    if query_clicks >= 2:
        popularity_hint = "Frequently selected for this query"
    elif context_clicks >= 2:
        popularity_hint = "Popular with similar trips"
    elif popularity_prior >= 8:
        popularity_hint = "Popular city"

    return is_relevant, {
        "placeName": candidate["placeName"],
        "placeAddress": candidate["placeAddress"],
        "eLoc": candidate["eLoc"],
        "latitude": candidate["latitude"],
        "longitude": candidate["longitude"],
        "city": candidate["city"],
        "state": candidate["state"],
        "source": candidate["source"],
        "matchType": match_type,
        "score": round(score, 3),
        "queryClicks": int(query_clicks),
        "contextClicks": int(context_clicks),
        "globalClicks": int(global_clicks),
        "popularityHint": popularity_hint,
        "sourceOrder": candidate["source_order"],
    }


def suggest_cities(
    query: str,
    region: str = "IND",
    limit: int = 10,
    actor: str | None = None,
    field: str | None = None,
) -> dict[str, Any]:
    normalized_query = _normalize_text(query)
    capped_limit = max(1, min(limit, 12))
    meta = {
        "normalizedQuery": normalized_query,
        "strategy": "hybrid_lexical_ctr_rerank",
        "actor": actor,
        "field": field,
        "region": region,
    }

    if len(normalized_query) < 2:
        return {"suggestions": [], "meta": meta}

    candidates = _load_demo_candidates() if use_demo_maps() else _load_provider_candidates(query, region)
    click_signals = _load_click_signals(candidates, normalized_query, region, actor, field)
    query_tokens = _tokenize_text(normalized_query)

    ranked: list[dict[str, Any]] = []
    for candidate in candidates:
        is_relevant, ranked_candidate = _rank_candidate(
            candidate,
            normalized_query=normalized_query,
            query_tokens=query_tokens,
            click_signals=click_signals.get(candidate["eLoc"], {}),
        )
        if is_relevant:
            ranked.append(ranked_candidate)

    ranked.sort(
        key=lambda item: (
            -item["score"],
            -item["queryClicks"],
            -item["contextClicks"],
            item["sourceOrder"],
            item["placeName"],
        )
    )

    suggestions = [
        {
            key: value
            for key, value in ranked_candidate.items()
            if key != "sourceOrder"
        }
        for ranked_candidate in ranked[:capped_limit]
    ]
    return {"suggestions": suggestions, "meta": meta}


def record_search_selection(
    query: str,
    region: str = "IND",
    actor: str | None = None,
    field: str | None = None,
    suggestion: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized_query = _normalize_text(query)
    payload = suggestion or {}
    place_id = str(payload.get("place_id") or "").strip()

    if len(normalized_query) < 2 or not place_id:
        return {"accepted": False}

    cache = get_cache()
    query_key = _query_click_key(region, normalized_query)
    context_keys = _context_click_keys(region, actor, field)
    selection_metadata = {
        "place_name": str(payload.get("place_name") or "").strip(),
        "place_address": str(payload.get("place_address") or "").strip(),
        "city": str(payload.get("city") or "").strip(),
        "state": str(payload.get("state") or "").strip(),
    }

    pipeline = cache.pipeline()
    pipeline.zincrby(_global_click_key(region), 1, place_id)
    for context_key in context_keys:
        pipeline.zincrby(context_key, 1, place_id)
        pipeline.expire(context_key, QUERY_CLICK_TTL_SECONDS)
    pipeline.zincrby(query_key, 1, place_id)
    pipeline.expire(query_key, QUERY_CLICK_TTL_SECONDS)
    pipeline.hset(_selection_metadata_key(place_id), mapping=selection_metadata)
    pipeline.execute()

    return {"accepted": True}


def resolve_address(query: str, region: str = "IND") -> dict[str, Any]:
    suggestions = suggest_cities(query, region=region, limit=1)["suggestions"]
    if not suggestions:
        return {
            "query": query,
            "normalized_query": query.strip().lower(),
            "result": None,
        }

    top = suggestions[0]
    return {
        "query": query,
        "normalized_query": query.strip().lower(),
        "result": {
            "place_id": top["eLoc"],
            "place_name": top["placeName"],
            "place_address": top["placeAddress"],
            "latitude": top["latitude"],
            "longitude": top["longitude"],
            "confidence": 0.95 if use_demo_maps() else 0.9,
            "source": "demo_cache" if use_demo_maps() else "provider_cache",
        },
    }


def route_geometry(origin_lng: float, origin_lat: float, dest_lng: float, dest_lat: float) -> dict[str, Any]:
    if use_demo_maps():
        origin = (origin_lng, origin_lat)
        destination = (dest_lng, dest_lat)
        distance_km = haversine_km(origin, destination)
        duration_hours = distance_km / 55
        mid_lng = (origin_lng + dest_lng) / 2
        mid_lat = (origin_lat + dest_lat) / 2 + 0.35
        return {
            "distanceKm": round(distance_km, 1),
            "durationHours": round(duration_hours, 1),
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [origin_lng, origin_lat],
                    [mid_lng, mid_lat],
                    [dest_lng, dest_lat],
                ],
            },
        }

    cache_key = f"cache:route:{origin_lng},{origin_lat}:{dest_lng},{dest_lat}"
    cache = get_cache()
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    token = _get_mmi_token()
    response = _client().get(
        (
            f"{MAPMYINDIA_BASE}/advancedmaps/v1/"
            f"{settings.mapmyindia_client_id}/route_adv/driving/"
            f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
        ),
        params={"geometries": "geojson", "overview": "full"},
        headers={"Authorization": f"Bearer {token}"},
    )
    response.raise_for_status()
    route = response.json().get("routes", [{}])[0]

    result = {
        "distanceKm": round((route.get("distance", 0) / 1000), 1),
        "durationHours": round((route.get("duration", 0) / 3600), 1),
        "geometry": route.get("geometry", {"type": "LineString", "coordinates": []}),
    }
    cache.setex(cache_key, 86400, json.dumps(result))
    return result
