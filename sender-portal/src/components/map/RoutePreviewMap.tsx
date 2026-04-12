import { RoutePreviewMap as SharedRoutePreviewMap } from 'hopdrop-shared';
import { api } from '../../api/client';

interface RoutePreviewMapProps {
  origin: { coords: [number, number]; city: string };
  destination: { coords: [number, number]; city: string };
  onDistanceFetched?: (km: number, hours: number) => void;
}

export function RoutePreviewMap({ origin, destination, onDistanceFetched }: RoutePreviewMapProps) {
  return (
    <SharedRoutePreviewMap
      origin={origin}
      destination={destination}
      onDistanceFetched={onDistanceFetched}
      fetchRouteGeometry={async (params) => {
        const res = await api.get('/maps/route', { params });
        return res.data.data;
      }}
    />
  );
}
