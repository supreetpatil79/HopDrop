import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { env } from '../config/env';
import { DeliveryRequest } from '../models/DeliveryRequest';
import { Match } from '../models/Match';
import { Notification } from '../models/Notification';
import { Review } from '../models/Review';
import { Transaction } from '../models/Transaction';
import { Trip } from '../models/Trip';
import { User } from '../models/User';
import { findMatches } from '../services/matching.service';

async function seed() {
  await connectDB();

  await Promise.all([
    Match.deleteMany({}),
    DeliveryRequest.deleteMany({}),
    Trip.deleteMany({}),
    Transaction.deleteMany({}),
    Notification.deleteMany({}),
    Review.deleteMany({}),
    User.deleteMany({ phone: { $in: ['9876500011', '9876500022', '9876500033'] } })
  ]);

  const [arjun, priya, rahul] = await User.create([
    {
      name: 'Arjun Rao',
      email: 'arjun@hopdrop.test',
      phone: '9876500011',
      phoneVerified: true,
      role: ['carrier', 'sender'],
      wallet: { balance: 120000, escrowHeld: 50000 },
      rating: { average: 4.9, count: 42 },
      totalTripsAsCarrier: 26,
      totalDeliveries: 41
    },
    {
      name: 'Priya Nair',
      email: 'priya@hopdrop.test',
      phone: '9876500022',
      phoneVerified: true,
      role: ['sender'],
      wallet: { balance: 50000, escrowHeld: 0 },
      rating: { average: 4.8, count: 13 }
    },
    {
      name: 'Rahul Mehta',
      email: 'rahul@hopdrop.test',
      phone: '9876500033',
      phoneVerified: true,
      role: ['sender'],
      wallet: { balance: 70000, escrowHeld: 0 },
      rating: { average: 4.7, count: 10 }
    }
  ]);

  const now = new Date();
  const departure = new Date(now);
  departure.setHours(23, 30, 0, 0);
  const eta = new Date(departure.getTime() + 18 * 60 * 60 * 1000);

  const trip = await Trip.create({
    carrier: arjun._id,
    origin: { city: 'Bengaluru', state: 'Karnataka', fullAddress: 'Bengaluru City Railway Station' },
    destination: { city: 'Mumbai', state: 'Maharashtra', fullAddress: 'Mumbai Central' },
    departureTime: departure,
    estimatedArrivalTime: eta,
    modeOfTransport: 'train',
    transportDetails: {
      name: 'Rajdhani Express',
      pnr: 'PNR1234567',
      seatNumber: 'B2-31'
    },
    availableCapacity: {
      weightKg: 5,
      dimensionsCm: { length: 50, width: 40, height: 30 },
      allowedCategories: ['documents', 'medicine', 'electronics']
    },
    pricePerKg: 80,
    status: 'active',
    safetyDepositPaid: true,
    safetyDepositAmount: 50000,
    safetyDepositTransactionId: 'seed_deposit_payment_001',
    pickupInstructions: 'Platform 3 near coach B2',
    dropoffInstructions: 'Andheri East station exit'
  });

  const windowEarliest = new Date(departure.getTime() - 2 * 60 * 60 * 1000);
  const windowLatest = new Date(departure.getTime() + 30 * 60 * 1000);

  const [priyaReq, rahulReq] = await DeliveryRequest.create([
    {
      sender: priya._id,
      origin: { city: 'Bengaluru', state: 'Karnataka', fullAddress: 'Indiranagar' },
      destination: { city: 'Mumbai', state: 'Maharashtra', fullAddress: 'Andheri' },
      package: {
        description: 'Legal document envelope',
        category: 'documents',
        weightKg: 1.2,
        isFragile: false,
        declaredValue: 100000
      },
      recipient: {
        name: 'Amit Sharma',
        phone: '9988776655',
        address: 'Andheri East, Mumbai'
      },
      preferredDeliveryWindow: {
        earliest: windowEarliest,
        latest: windowLatest
      },
      status: 'pending',
      paymentStatus: 'paid',
      quotedPrice: 9600,
      platformFee: 1152,
      totalCharge: 10752,
      paymentOrderId: 'seed_order_priya',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
    },
    {
      sender: rahul._id,
      origin: { city: 'Bengaluru', state: 'Karnataka', fullAddress: 'HSR Layout' },
      destination: { city: 'Mumbai', state: 'Maharashtra', fullAddress: 'Powai' },
      package: {
        description: 'Prescription medicines',
        category: 'medicine',
        weightKg: 0.5,
        isFragile: false,
        declaredValue: 50000
      },
      recipient: {
        name: 'Neha Jain',
        phone: '9977665544',
        address: 'Powai, Mumbai'
      },
      preferredDeliveryWindow: {
        earliest: windowEarliest,
        latest: windowLatest
      },
      status: 'pending',
      paymentStatus: 'paid',
      quotedPrice: 4000,
      platformFee: 480,
      totalCharge: 4480,
      paymentOrderId: 'seed_order_rahul',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
    }
  ]);

  await Transaction.create([
    {
      user: arjun._id,
      type: 'safety_deposit',
      amount: 50000,
      status: 'completed',
      razorpayOrderId: 'seed_order_deposit_001',
      razorpayPaymentId: 'seed_deposit_payment_001',
      description: 'Seed safety deposit'
    },
    {
      user: priya._id,
      type: 'delivery_payment',
      amount: 10752,
      status: 'completed',
      razorpayOrderId: 'seed_order_priya',
      razorpayPaymentId: 'seed_payment_priya',
      description: 'Seed delivery payment Priya'
    },
    {
      user: rahul._id,
      type: 'delivery_payment',
      amount: 4480,
      status: 'completed',
      razorpayOrderId: 'seed_order_rahul',
      razorpayPaymentId: 'seed_payment_rahul',
      description: 'Seed delivery payment Rahul'
    }
  ]);

  const priyaMatches = await findMatches(priyaReq._id.toString());
  const rahulMatches = await findMatches(rahulReq._id.toString());

  const allMatches = [...priyaMatches, ...rahulMatches].filter((m) => m.trip.toString() === trip._id.toString());
  const ids = allMatches.map((m) => m._id);

  await Trip.findByIdAndUpdate(trip._id, { $addToSet: { matches: { $each: ids } } });

  // eslint-disable-next-line no-console
  console.log('Seed complete');
  // eslint-disable-next-line no-console
  console.log({
    users: { arjun: arjun._id.toString(), priya: priya._id.toString(), rahul: rahul._id.toString() },
    trip: trip._id.toString(),
    deliveryRequests: [priyaReq._id.toString(), rahulReq._id.toString()],
    matches: ids.map((id) => id.toString()),
    mongo: env.MONGODB_URI
  });
}

seed()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
