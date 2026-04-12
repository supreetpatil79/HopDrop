import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { getRouteGeometry, recordSuggestionSelection, suggestCities } from '../services/maps.service';
import { mapRouteSchema, mapSelectSchema, mapSuggestSchema } from '../validators/maps.validators';

export async function suggestController(req: Request, res: Response) {
  const query = mapSuggestSchema.parse(req.query);
  const data = await suggestCities(query.q, query.region, {
    actor: query.actor,
    field: query.field,
    limit: query.limit
  });
  res.status(200).json(new ApiResponse('Suggestions fetched', data));
}

export async function selectSuggestionController(req: Request, res: Response) {
  const payload = mapSelectSchema.parse(req.body);
  const data = await recordSuggestionSelection(payload);
  res.status(200).json(new ApiResponse('Selection recorded', data));
}

export async function routeController(req: Request, res: Response) {
  const query = mapRouteSchema.parse(req.query);
  const data = await getRouteGeometry(query);
  res.status(200).json(new ApiResponse('Route fetched', data));
}
