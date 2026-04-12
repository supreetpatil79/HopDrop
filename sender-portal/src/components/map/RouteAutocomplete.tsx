import { RouteAutocomplete as SharedRouteAutocomplete, type SearchField } from 'hopdrop-shared';
import { api } from '../../api/client';

interface RouteAutocompleteProps {
  label: string;
  value: string;
  onChange: (city: string, placeId: string, coords: [number, number]) => void;
  onInputChange?: (value: string) => void;
  field: SearchField;
  placeholder?: string;
}

export function RouteAutocomplete({ label, value, onChange, onInputChange, field, placeholder }: RouteAutocompleteProps) {
  return (
    <SharedRouteAutocomplete
      label={label}
      value={value}
      onChange={onChange}
      onInputChange={onInputChange}
      placeholder={placeholder}
      context={{ actor: 'sender', field }}
      fetchSuggestions={async (q) => {
        const res = await api.get('/maps/suggest', { params: { q, region: 'IND', actor: 'sender', field } });
        return res.data?.data?.suggestions || [];
      }}
      onSuggestionSelected={async (suggestion, meta) => {
        await api.post('/maps/select', {
          query: meta.query,
          region: 'IND',
          actor: 'sender',
          field,
          suggestion
        });
      }}
    />
  );
}
