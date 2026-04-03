import axios from 'axios';
import { env } from '../config/env';

export async function bookRapido(matchId: string, pickupCoords: [number, number], dropAddress: string) {
  const res = await axios.post(
    'https://api.rapido.bike/v1/bookings',
    {
      pickup: { lat: pickupCoords[1], lng: pickupCoords[0] },
      drop: { address: dropAddress },
      vehicleType: 'auto',
      metadata: { hopdrop_match_id: matchId }
    },
    {
      headers: { 'X-Api-Key': env.RAPIDO_API_KEY }
    }
  );

  return res.data;
}

export async function getRapidoStatus(bookingId: string) {
  return axios.get(`https://api.rapido.bike/v1/bookings/${bookingId}`, {
    headers: { 'X-Api-Key': env.RAPIDO_API_KEY }
  });
}
