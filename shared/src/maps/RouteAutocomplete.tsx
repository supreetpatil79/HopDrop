import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { Spinner } from '../ui';

const RECENT_SELECTION_LIMIT = 5;

export const POPULAR_INDIAN_CITIES: MMISuggestion[] = [
  { placeName: 'Bengaluru', placeAddress: 'Bengaluru, Karnataka, India', city: 'Bengaluru', state: 'Karnataka', eLoc: 'DEMO_BLR', latitude: 12.9716, longitude: 77.5946, matchType: 'exact' },
  { placeName: 'Mumbai', placeAddress: 'Mumbai, Maharashtra, India', city: 'Mumbai', state: 'Maharashtra', eLoc: 'DEMO_BOM', latitude: 19.076, longitude: 72.8777, matchType: 'exact' },
  { placeName: 'Delhi', placeAddress: 'New Delhi, Delhi, India', city: 'Delhi', state: 'Delhi', eLoc: 'DEMO_DEL', latitude: 28.6139, longitude: 77.209, matchType: 'exact' },
  { placeName: 'Hyderabad', placeAddress: 'Hyderabad, Telangana, India', city: 'Hyderabad', state: 'Telangana', eLoc: 'DEMO_HYD', latitude: 17.385, longitude: 78.4867, matchType: 'exact' },
  { placeName: 'Pune', placeAddress: 'Pune, Maharashtra, India', city: 'Pune', state: 'Maharashtra', eLoc: 'DEMO_PNQ', latitude: 18.5204, longitude: 73.8567, matchType: 'exact' },
  { placeName: 'Chennai', placeAddress: 'Chennai, Tamil Nadu, India', city: 'Chennai', state: 'Tamil Nadu', eLoc: 'DEMO_MAA', latitude: 13.0827, longitude: 80.2707, matchType: 'exact' },
  { placeName: 'Kolkata', placeAddress: 'Kolkata, West Bengal, India', city: 'Kolkata', state: 'West Bengal', eLoc: 'DEMO_CCU', latitude: 22.5726, longitude: 88.3639, matchType: 'exact' },
  { placeName: 'Ahmedabad', placeAddress: 'Ahmedabad, Gujarat, India', city: 'Ahmedabad', state: 'Gujarat', eLoc: 'DEMO_AMD', latitude: 23.0225, longitude: 72.5714, matchType: 'exact' },
  { placeName: 'Jaipur', placeAddress: 'Jaipur, Rajasthan, India', city: 'Jaipur', state: 'Rajasthan', eLoc: 'DEMO_JAI', latitude: 26.9124, longitude: 75.7873, matchType: 'exact' },
  { placeName: 'Kochi', placeAddress: 'Kochi, Kerala, India', city: 'Kochi', state: 'Kerala', eLoc: 'DEMO_COK', latitude: 9.9312, longitude: 76.2673, matchType: 'exact' },
  { placeName: 'Chandigarh', placeAddress: 'Chandigarh, Punjab/Haryana, India', city: 'Chandigarh', state: 'Chandigarh', eLoc: 'DEMO_IXC', latitude: 30.7333, longitude: 76.7794, matchType: 'exact' },
  { placeName: 'Lucknow', placeAddress: 'Lucknow, Uttar Pradesh, India', city: 'Lucknow', state: 'Uttar Pradesh', eLoc: 'DEMO_LKO', latitude: 26.8467, longitude: 80.9462, matchType: 'exact' },
  { placeName: 'Surat', placeAddress: 'Surat, Gujarat, India', city: 'Surat', state: 'Gujarat', eLoc: 'DEMO_STV', latitude: 21.1702, longitude: 72.8311, matchType: 'exact' },
  { placeName: 'Indore', placeAddress: 'Indore, Madhya Pradesh, India', city: 'Indore', state: 'Madhya Pradesh', eLoc: 'DEMO_IDR', latitude: 22.7196, longitude: 75.8577, matchType: 'exact' },
  { placeName: 'Bhopal', placeAddress: 'Bhopal, Madhya Pradesh, India', city: 'Bhopal', state: 'Madhya Pradesh', eLoc: 'DEMO_BHO', latitude: 23.2599, longitude: 77.4126, matchType: 'exact' },
  { placeName: 'Nagpur', placeAddress: 'Nagpur, Maharashtra, India', city: 'Nagpur', state: 'Maharashtra', eLoc: 'DEMO_NAG', latitude: 21.1458, longitude: 79.0882, matchType: 'exact' },
  { placeName: 'Visakhapatnam', placeAddress: 'Visakhapatnam, Andhra Pradesh, India', city: 'Visakhapatnam', state: 'Andhra Pradesh', eLoc: 'DEMO_VTZ', latitude: 17.6868, longitude: 83.2185, matchType: 'exact' },
  { placeName: 'Patna', placeAddress: 'Patna, Bihar, India', city: 'Patna', state: 'Bihar', eLoc: 'DEMO_PAT', latitude: 25.5941, longitude: 85.1376, matchType: 'exact' },
  { placeName: 'Vadodara', placeAddress: 'Vadodara, Gujarat, India', city: 'Vadodara', state: 'Gujarat', eLoc: 'DEMO_BDQ', latitude: 22.3072, longitude: 73.1812, matchType: 'exact' },
  { placeName: 'Ludhiana', placeAddress: 'Ludhiana, Punjab, India', city: 'Ludhiana', state: 'Punjab', eLoc: 'DEMO_LUH', latitude: 30.9010, longitude: 75.8573, matchType: 'exact' },
  { placeName: 'Agra', placeAddress: 'Agra, Uttar Pradesh, India', city: 'Agra', state: 'Uttar Pradesh', eLoc: 'DEMO_AGR', latitude: 27.1767, longitude: 78.0081, matchType: 'exact' },
  { placeName: 'Nashik', placeAddress: 'Nashik, Maharashtra, India', city: 'Nashik', state: 'Maharashtra', eLoc: 'DEMO_ISK', latitude: 19.9975, longitude: 73.7898, matchType: 'exact' },
  { placeName: 'Varanasi', placeAddress: 'Varanasi, Uttar Pradesh, India', city: 'Varanasi', state: 'Uttar Pradesh', eLoc: 'DEMO_VNS', latitude: 25.3176, longitude: 82.9739, matchType: 'exact' },
  { placeName: 'Amritsar', placeAddress: 'Amritsar, Punjab, India', city: 'Amritsar', state: 'Punjab', eLoc: 'DEMO_ATQ', latitude: 31.6340, longitude: 74.8723, matchType: 'exact' },
  { placeName: 'Coimbatore', placeAddress: 'Coimbatore, Tamil Nadu, India', city: 'Coimbatore', state: 'Tamil Nadu', eLoc: 'DEMO_CJB', latitude: 11.0168, longitude: 76.9558, matchType: 'exact' },
  { placeName: 'Madurai', placeAddress: 'Madurai, Tamil Nadu, India', city: 'Madurai', state: 'Tamil Nadu', eLoc: 'DEMO_IXM', latitude: 9.9252, longitude: 78.1198, matchType: 'exact' },
  { placeName: 'Mysuru', placeAddress: 'Mysuru, Karnataka, India', city: 'Mysuru', state: 'Karnataka', eLoc: 'DEMO_MYQ', latitude: 12.2958, longitude: 76.6394, matchType: 'exact' },
  { placeName: 'Mangaluru', placeAddress: 'Mangaluru, Karnataka, India', city: 'Mangaluru', state: 'Karnataka', eLoc: 'DEMO_IXE', latitude: 12.9141, longitude: 74.8560, matchType: 'exact' },
  { placeName: 'Hubballi', placeAddress: 'Hubballi, Karnataka, India', city: 'Hubballi', state: 'Karnataka', eLoc: 'DEMO_HBX', latitude: 15.3647, longitude: 75.1240, matchType: 'exact' },
  { placeName: 'Goa (Panaji)', placeAddress: 'Panaji, Goa, India', city: 'Goa', state: 'Goa', eLoc: 'DEMO_GOI', latitude: 15.4909, longitude: 73.8278, matchType: 'exact' },
  { placeName: 'Thiruvananthapuram', placeAddress: 'Thiruvananthapuram, Kerala, India', city: 'Thiruvananthapuram', state: 'Kerala', eLoc: 'DEMO_TRV', latitude: 8.5241, longitude: 76.9366, matchType: 'exact' },
  { placeName: 'Kozhikode', placeAddress: 'Kozhikode, Kerala, India', city: 'Kozhikode', state: 'Kerala', eLoc: 'DEMO_CCJ', latitude: 11.2588, longitude: 75.7804, matchType: 'exact' },
  { placeName: 'Vijayawada', placeAddress: 'Vijayawada, Andhra Pradesh, India', city: 'Vijayawada', state: 'Andhra Pradesh', eLoc: 'DEMO_VGA', latitude: 16.5062, longitude: 80.6480, matchType: 'exact' },
  { placeName: 'Raipur', placeAddress: 'Raipur, Chhattisgarh, India', city: 'Raipur', state: 'Chhattisgarh', eLoc: 'DEMO_RPR', latitude: 21.2514, longitude: 81.6296, matchType: 'exact' },
  { placeName: 'Ranchi', placeAddress: 'Ranchi, Jharkhand, India', city: 'Ranchi', state: 'Jharkhand', eLoc: 'DEMO_IXR', latitude: 23.3441, longitude: 85.3096, matchType: 'exact' },
  { placeName: 'Bhubaneswar', placeAddress: 'Bhubaneswar, Odisha, India', city: 'Bhubaneswar', state: 'Odisha', eLoc: 'DEMO_BBI', latitude: 20.2961, longitude: 85.8245, matchType: 'exact' },
  { placeName: 'Guwahati', placeAddress: 'Guwahati, Assam, India', city: 'Guwahati', state: 'Assam', eLoc: 'DEMO_GAU', latitude: 26.1445, longitude: 91.7362, matchType: 'exact' },
  { placeName: 'Dehradun', placeAddress: 'Dehradun, Uttarakhand, India', city: 'Dehradun', state: 'Uttarakhand', eLoc: 'DEMO_DED', latitude: 30.3165, longitude: 78.0322, matchType: 'exact' },
  { placeName: 'Shimla', placeAddress: 'Shimla, Himachal Pradesh, India', city: 'Shimla', state: 'Himachal Pradesh', eLoc: 'DEMO_SLV', latitude: 31.1048, longitude: 77.1734, matchType: 'exact' },
  { placeName: 'Srinagar', placeAddress: 'Srinagar, Jammu and Kashmir, India', city: 'Srinagar', state: 'Jammu and Kashmir', eLoc: 'DEMO_SXR', latitude: 34.0837, longitude: 74.7973, matchType: 'exact' },
  { placeName: 'Jodhpur', placeAddress: 'Jodhpur, Rajasthan, India', city: 'Jodhpur', state: 'Rajasthan', eLoc: 'DEMO_JDH', latitude: 26.2389, longitude: 73.0243, matchType: 'exact' },
  { placeName: 'Udaipur', placeAddress: 'Udaipur, Rajasthan, India', city: 'Udaipur', state: 'Rajasthan', eLoc: 'DEMO_UDR', latitude: 24.5854, longitude: 73.7125, matchType: 'exact' },
  { placeName: 'Noida', placeAddress: 'Noida, Uttar Pradesh, India', city: 'Noida', state: 'Uttar Pradesh', eLoc: 'DEMO_NOI', latitude: 28.5355, longitude: 77.3910, matchType: 'exact' },
  { placeName: 'Gurugram', placeAddress: 'Gurugram, Haryana, India', city: 'Gurugram', state: 'Haryana', eLoc: 'DEMO_GUR', latitude: 28.4595, longitude: 77.0266, matchType: 'exact' },
  { placeName: 'Kanpur', placeAddress: 'Kanpur, Uttar Pradesh, India', city: 'Kanpur', state: 'Uttar Pradesh', eLoc: 'DEMO_KNU', latitude: 26.4499, longitude: 80.3319, matchType: 'exact' }
];

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
  helperText?: string;
  error?: string;
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

function suggestionHeadline(suggestion: MMISuggestion) {
  return suggestion.city || suggestion.placeName;
}

function suggestionRegion(suggestion: MMISuggestion) {
  const parts = [suggestion.state];
  const normalizedAddress = suggestion.placeAddress
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const country = normalizedAddress.find((segment) => segment.toLowerCase() === 'india') || 'India';
  parts.push(country);
  return Array.from(new Set(parts.filter(Boolean))).join(', ');
}

export function RouteAutocomplete({
  label,
  value,
  onChange,
  onInputChange,
  fetchSuggestions,
  onSuggestionSelected,
  context,
  placeholder,
  helperText,
  error
}: RouteAutocompleteProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
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
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

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

  useEffect(() => {
    if (!isOpen || activeIndex < 0) {
      return;
    }

    optionRefs.current[activeIndex]?.scrollIntoView({
      block: 'nearest'
    });
  }, [activeIndex, isOpen]);

  const fallbackCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return POPULAR_INDIAN_CITIES.slice(0, 5);
    }
    return POPULAR_INDIAN_CITIES.filter(
      (c) =>
        c.placeName.toLowerCase().includes(q) ||
        c.placeAddress.toLowerCase().includes(q) ||
        c.state?.toLowerCase().includes(q)
    );
  }, [query]);

  const visibleSuggestions =
    query.trim().length >= 2
      ? suggestions.length > 0
        ? suggestions
        : fallbackCities
      : recentSuggestions.length > 0
        ? recentSuggestions
        : fallbackCities;
  const showingRecent = query.trim().length < 2 && recentSuggestions.length > 0;

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

      if (nextSuggestions && nextSuggestions.length > 0) {
        setSuggestions(nextSuggestions);
      } else {
        const fallbacks = POPULAR_INDIAN_CITIES.filter(
          (c) =>
            c.placeName.toLowerCase().includes(normalizedQuery.toLowerCase()) ||
            c.placeAddress.toLowerCase().includes(normalizedQuery.toLowerCase()) ||
            c.state?.toLowerCase().includes(normalizedQuery.toLowerCase())
        );
        setSuggestions(fallbacks);
      }
      setIsOpen(true);
      setActiveIndex(0);
    } catch (_error) {
      if (requestRef.current !== requestId) {
        return;
      }

      const fallbacks = POPULAR_INDIAN_CITIES.filter(
        (c) =>
          c.placeName.toLowerCase().includes(normalizedQuery.toLowerCase()) ||
          c.placeAddress.toLowerCase().includes(normalizedQuery.toLowerCase()) ||
          c.state?.toLowerCase().includes(normalizedQuery.toLowerCase())
      );
      setSuggestions(fallbacks);
      setActiveIndex(fallbacks.length ? 0 : -1);
      setIsOpen(true);
      setErrorMessage(null);
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
    <div ref={containerRef} className={clsx('relative isolate', isOpen && 'z-[80]')}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold tracking-[-0.01em] text-text">
        {label}
      </label>
      <div
        className={clsx(
          'flex min-h-[52px] items-center gap-3 rounded-2xl border border-border/80 bg-white px-4 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.65)] transition duration-200',
          error
            ? 'border-red-300 bg-red-50/50 shadow-[0_0_0_4px_rgba(239,68,68,0.08)]'
            : 'focus-within:border-primary/60 focus-within:shadow-[0_0_0_4px_rgba(15,118,110,0.10),0_18px_42px_-26px_rgba(15,23,42,0.35)] hover:border-primary/25'
        )}
      >
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          City
        </span>
        <input
          id={inputId}
          value={query}
          onChange={handleInput}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          aria-activedescendant={isOpen && activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined}
          aria-label={label}
          aria-invalid={Boolean(error)}
          aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
          placeholder={placeholder || 'Type city name...'}
          className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[15px] text-text outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0"
        />
        {loading ? (
          <div className="shrink-0">
            <Spinner />
          </div>
        ) : null}
      </div>
      {loading ? (
        <div className="mt-2 text-xs text-text-muted" role="status" aria-live="polite">
          Searching verified route points...
        </div>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-2 text-xs leading-5 text-text-muted">
          {helperText}
        </p>
      ) : null}
      {isOpen && (loading || visibleSuggestions.length > 0 || query.trim().length >= 2) ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute left-0 right-0 top-[calc(100%+0.625rem)] z-[90] overflow-hidden rounded-[22px] border border-border/90 bg-white/95 shadow-[0_24px_70px_-26px_rgba(15,23,42,0.45)] backdrop-blur-sm"
        >
          {visibleSuggestions.length > 0 ? (
            <>
              <div className="border-b border-border/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {showingRecent ? 'Recent selections' : 'Best matches'}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {visibleSuggestions.map((suggestion: MMISuggestion, index: number) => (
                  <button
                    key={suggestion.eLoc}
                    id={`${inputId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(suggestion)}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    className={clsx(
                      'flex w-full items-start gap-3 px-4 py-3.5 text-left transition',
                      index === activeIndex ? 'bg-primary/10' : 'hover:bg-primary/5',
                      index < visibleSuggestions.length - 1 && 'border-b border-border/60'
                    )}
                  >
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                      {showingRecent ? 'R' : 'M'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-text">
                            {highlightMatch(suggestionHeadline(suggestion), query)}
                          </span>
                          <span className="mt-1 block truncate text-xs font-medium text-text-muted">
                            {suggestionRegion(suggestion)}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                          {showingRecent ? 'Recent' : suggestion.matchType || 'Match'}
                        </span>
                      </span>
                      <span className="mt-1.5 block truncate text-xs leading-5 text-text-muted">
                        {highlightMatch(suggestion.placeAddress, query)}
                      </span>
                      {!showingRecent && suggestion.popularityHint ? (
                        <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                          {suggestion.popularityHint}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : errorMessage ? (
            <div className="px-4 py-4 text-sm text-red-600" role="status" aria-live="polite">
              {errorMessage}
            </div>
          ) : !loading && query.trim().length >= 2 ? (
            <div className="px-4 py-4 text-sm text-text-muted" role="status" aria-live="polite">
              No strong city matches found. Keep typing a more complete city name.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
