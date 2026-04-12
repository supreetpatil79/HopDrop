import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Spinner } from '../ui';

const RECENT_SELECTION_LIMIT = 5;

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

export interface RouteAutocompleteProps {
  label: string;
  value: string;
  onChange: (city: string, placeId: string, coords: [number, number]) => void;
  onInputChange?: (value: string) => void;
  fetchSuggestions: (query: string) => Promise<MMISuggestion[]>;
  onSuggestionSelected?: (suggestion: MMISuggestion, meta: { query: string }) => Promise<void> | void;
  context?: {
    actor?: SearchActor;
    field?: SearchField;
  };
  placeholder?: string;
}

function recentStorageKey(context?: { actor?: SearchActor; field?: SearchField }) {
  return `hopdrop:route-search:recent:${context?.actor || 'all'}:${context?.field || 'all'}`;
}

function loadRecentSuggestions(context?: { actor?: SearchActor; field?: SearchField }): MMISuggestion[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(recentStorageKey(context));
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as MMISuggestion[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSuggestion(suggestion: MMISuggestion, context?: { actor?: SearchActor; field?: SearchField }) {
  if (typeof window === 'undefined') {
    return loadRecentSuggestions(context);
  }

  const next = [
    suggestion,
    ...loadRecentSuggestions(context).filter((entry) => entry.eLoc !== suggestion.eLoc)
  ].slice(0, RECENT_SELECTION_LIMIT);

  window.localStorage.setItem(recentStorageKey(context), JSON.stringify(next));
  return next;
}

function highlightMatch(text: string, query: string): ReactNode {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    return text;
  }

  const matchIndex = text.toLowerCase().indexOf(normalizedQuery);
  if (matchIndex < 0) {
    return text;
  }

  return (
    <>
      {text.slice(0, matchIndex)}
      <span className="rounded bg-primary/10 px-0.5 text-primary">
        {text.slice(matchIndex, matchIndex + normalizedQuery.length)}
      </span>
      {text.slice(matchIndex + normalizedQuery.length)}
    </>
  );
}

export function RouteAutocomplete({
  label,
  value,
  onChange,
  onInputChange,
  fetchSuggestions,
  onSuggestionSelected,
  context,
  placeholder
}: RouteAutocompleteProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<MMISuggestion[]>([]);
  const [recentSuggestions, setRecentSuggestions] = useState<MMISuggestion[]>(() => loadRecentSuggestions(context));
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    setRecentSuggestions(loadRecentSuggestions(context));
  }, [context?.actor, context?.field]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const visibleSuggestions = query.trim().length >= 2 ? suggestions : recentSuggestions;
  const showingRecent = query.trim().length < 2;

  const search = async (nextQuery: string) => {
    const normalizedQuery = nextQuery.trim();
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (normalizedQuery.length < 2) {
      setLoading(false);
      setErrorMessage(null);
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const nextSuggestions = await fetchSuggestions(normalizedQuery);
      if (requestRef.current !== requestId) {
        return;
      }

      setSuggestions(nextSuggestions);
      setIsOpen(true);
      setActiveIndex(nextSuggestions.length ? 0 : -1);
    } catch (_error) {
      if (requestRef.current !== requestId) {
        return;
      }

      setSuggestions([]);
      setActiveIndex(-1);
      setIsOpen(true);
      setErrorMessage('Search is temporarily unavailable. Please try again.');
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    requestRef.current += 1;
    setQuery(nextQuery);
    setIsOpen(true);
    setActiveIndex(-1);
    setErrorMessage(null);
    onInputChange?.(nextQuery);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (nextQuery.trim().length < 2) {
      setLoading(false);
      setSuggestions([]);
      setErrorMessage(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void search(nextQuery);
    }, 220);
  };

  const handleSelect = (suggestion: MMISuggestion) => {
    const selectionQuery = query.trim() || suggestion.placeName;
    setQuery(suggestion.placeName);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    setErrorMessage(null);
    setRecentSuggestions(saveRecentSuggestion(suggestion, context));
    onChange(suggestion.placeName, suggestion.eLoc, [suggestion.longitude, suggestion.latitude]);

    if (onSuggestionSelected) {
      void Promise.resolve(onSuggestionSelected(suggestion, { query: selectionQuery })).catch(() => undefined);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!visibleSuggestions.length) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current + 1 >= visibleSuggestions.length ? 0 : current + 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current <= 0 ? visibleSuggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      event.preventDefault();
      handleSelect(visibleSuggestions[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${isOpen ? 'z-50' : ''}`}>
      <label htmlFor={inputId} className="mb-1 block text-sm text-text-muted">{label}</label>
      <input
        id={inputId}
        value={query}
        onChange={handleInput}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-label={label}
        placeholder={placeholder || 'Type city name...'}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
      {loading ? (
        <div className="absolute right-3 top-9">
          <Spinner />
        </div>
      ) : null}
      {isOpen && (loading || visibleSuggestions.length > 0 || query.trim().length >= 2) ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-xl"
        >
          {visibleSuggestions.length > 0 ? (
            <>
              <div className="border-b border-border/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {showingRecent ? 'Recent selections' : 'Best matches'}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {visibleSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.eLoc}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(suggestion)}
                    className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                      index === activeIndex ? 'bg-primary/10' : 'hover:bg-primary/5'
                    } ${index < visibleSuggestions.length - 1 ? 'border-b border-border/60' : ''}`}
                  >
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="block truncate text-sm font-medium text-text">
                          {highlightMatch(suggestion.placeName, query)}
                        </span>
                        {showingRecent ? (
                          <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                            Recent
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-text-muted">
                        {highlightMatch(suggestion.placeAddress, query)}
                      </span>
                      {!showingRecent && suggestion.popularityHint ? (
                        <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {suggestion.popularityHint}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : errorMessage ? (
            <div className="px-3 py-4 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : !loading && query.trim().length >= 2 ? (
            <div className="px-3 py-4 text-sm text-text-muted">
              No strong city matches found. Keep typing a more complete city name.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
