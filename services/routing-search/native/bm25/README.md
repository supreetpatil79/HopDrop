# Native BM25 Module

This directory is reserved for the C++ lexical retrieval engine used by `routing-search`.

Recommended implementation:
- `pybind11` bindings
- `CMake`
- one module for tokenization and indexing
- one module for ranked retrieval

## Planned files
```text
native/bm25/
  CMakeLists.txt
  bindings.cpp
  bm25_index.cpp
  bm25_index.h
  tokenizer.cpp
  tokenizer.h
  tests/
```

## Retrieval role
Use BM25 for:
- place alias retrieval
- address fallback search
- trip lexical search after geospatial prefiltering

Do not rely on BM25 alone for route matching. Pair it with H3 corridor filtering in Python before reranking.
