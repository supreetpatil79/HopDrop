from __future__ import annotations

from typing import Any

from app import maps_service


class FakePipeline:
    def __init__(self, redis: "FakeRedis"):
        self.redis = redis
        self.operations: list[tuple[str, tuple[Any, ...], dict[str, Any]]] = []

    def zscore(self, key: str, member: str):
        self.operations.append(("zscore", (key, member), {}))
        return self

    def zincrby(self, key: str, amount: float, member: str):
        self.operations.append(("zincrby", (key, amount, member), {}))
        return self

    def expire(self, key: str, ttl: int):
        self.operations.append(("expire", (key, ttl), {}))
        return self

    def hset(self, key: str, mapping: dict[str, str]):
        self.operations.append(("hset", (key,), {"mapping": mapping}))
        return self

    def execute(self):
        results: list[Any] = []
        for name, args, kwargs in self.operations:
            result = getattr(self.redis, name)(*args, **kwargs)
            results.append(result)
        self.operations.clear()
        return results


class FakeRedis:
    def __init__(self):
        self.values: dict[str, str] = {}
        self.sorted_sets: dict[str, dict[str, float]] = {}
        self.hashes: dict[str, dict[str, str]] = {}
        self.expirations: dict[str, int] = {}

    def get(self, key: str):
        return self.values.get(key)

    def setex(self, key: str, _ttl: int, value: str):
        self.values[key] = value
        return True

    def zscore(self, key: str, member: str):
        return self.sorted_sets.get(key, {}).get(member)

    def zincrby(self, key: str, amount: float, member: str):
        bucket = self.sorted_sets.setdefault(key, {})
        bucket[member] = bucket.get(member, 0.0) + amount
        return bucket[member]

    def hset(self, key: str, mapping: dict[str, str]):
        self.hashes[key] = mapping
        return 1

    def expire(self, key: str, ttl: int):
        self.expirations[key] = ttl
        return True

    def pipeline(self):
        return FakePipeline(self)


def test_suggest_cities_returns_ranked_city_results_with_meta(monkeypatch):
    fake_cache = FakeRedis()
    monkeypatch.setattr(maps_service, "get_cache", lambda: fake_cache)
    monkeypatch.setattr(maps_service, "use_demo_maps", lambda: True)

    result = maps_service.suggest_cities("ben", region="IND", limit=5, actor="sender", field="origin")

    assert result["meta"] == {
        "normalizedQuery": "ben",
        "strategy": "hybrid_lexical_ctr_rerank",
        "actor": "sender",
        "field": "origin",
        "region": "IND",
    }
    assert result["suggestions"][0]["placeName"] == "Bengaluru"
    assert result["suggestions"][0]["matchType"] == "prefix"
    assert result["suggestions"][0]["source"] == "demo"


def test_search_selection_feedback_reorders_results_within_context(monkeypatch):
    fake_cache = FakeRedis()
    monkeypatch.setattr(maps_service, "get_cache", lambda: fake_cache)
    monkeypatch.setattr(maps_service, "use_demo_maps", lambda: True)

    initial = maps_service.suggest_cities("de", region="IND", limit=5, actor="carrier", field="origin")
    assert initial["suggestions"][0]["placeName"] == "Delhi"

    for _ in range(2):
        recorded = maps_service.record_search_selection(
            query="de",
            region="IND",
            actor="carrier",
            field="origin",
            suggestion={
                "place_id": "DEMO_DDN",
                "place_name": "Dehradun",
                "place_address": "Uttarakhand, India",
                "city": "Dehradun",
                "state": "Uttarakhand",
            },
        )
        assert recorded == {"accepted": True}

    reranked = maps_service.suggest_cities("de", region="IND", limit=5, actor="carrier", field="origin")
    assert reranked["suggestions"][0]["placeName"] == "Dehradun"
    assert reranked["suggestions"][0]["queryClicks"] >= 2
    assert reranked["suggestions"][0]["contextClicks"] >= 4
