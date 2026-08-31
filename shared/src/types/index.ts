export interface IUser {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  role: string[];
  rating?: { average: number; count: number };
}

export interface ITrip {
  _id: string;
  carrier: string | IUser;
  origin: { city: string; placeId?: string; coordinates?: { type: 'Point'; coordinates: [number, number] } };
  destination: { city: string; placeId?: string; coordinates?: { type: 'Point'; coordinates: [number, number] } };
  departureTime: string;
  modeOfTransport: 'bus' | 'train' | 'car' | 'bike' | 'flight' | 'other';
  pricePerKg: number;
  status: string;
}

export interface IDelivery {
  _id: string;
  sender: string | IUser;
  origin: { city: string };
  destination: { city: string };
  package?: {
    description?: string;
    category?: string;
    weightKg?: number;
    isFragile?: boolean;
    declaredValue?: number;
  };
  status: string;
  paymentStatus: string;
  quotedPrice?: number;
  platformFee?: number;
  totalCharge?: number;
}

export interface IMatch {
  _id: string;
  trip: string | ITrip;
  deliveryRequest: string | IDelivery;
  carrier: string | IUser;
  sender: string | IUser;
  status: string;
  timeline: Array<{ event: string; timestamp: string }>;
  agreedPrice?: number;
  payoutToCarrier?: number;
  financials?: {
    payoutToCarrier: number;
    totalCharge: number;
    platformFee: number;
    payoutPerKg: number;
    packageWeightKg: number;
  };
}

export interface ITransaction {
  _id: string;
  user: string | IUser;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}
