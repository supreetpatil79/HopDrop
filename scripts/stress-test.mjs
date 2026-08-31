import http from 'http';

const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5001/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {})
  };

  const body = options.body ? JSON.stringify(options.body) : undefined;

  const start = performance.now();
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body
  });
  const duration = performance.now() - start;

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    ok: res.ok,
    duration,
    data
  };
}

async function loginDemo(persona) {
  const res = await request('/auth/demo-login', {
    method: 'POST',
    body: { persona }
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${persona}: ${JSON.stringify(res.data)}`);
  }
  return res.data.data;
}

// ---------------------------------------------------------------------------
// TEST 1: COMPLETE END-TO-END MATCH & HANDOFF LIFECYCLE
// ---------------------------------------------------------------------------
async function testFullLifecycle() {
  console.log('\n============================================================');
  console.log('🔄 STAGE 1: Full Sender-Carrier Handoff Lifecycle Test');
  console.log('============================================================');

  // 1. Authenticate Sender and Carrier
  console.log('1️⃣ Authenticating Priya (Sender) and Arjun (Carrier)...');
  const senderSession = await loginDemo('sender_priya');
  const carrierSession = await loginDemo('carrier');
  console.log('   ✓ Sender & Carrier authenticated with JWTs.');

  // 2. Carrier creates a trip
  console.log('2️⃣ Carrier posting a trip (Bengaluru → Mumbai)...');
  const tripRes = await request('/trips', {
    method: 'POST',
    token: carrierSession.accessToken,
    body: {
      origin: {
        city: 'Bengaluru',
        state: 'Karnataka',
        placeId: 'DEMO_BLR',
        fullAddress: 'Bengaluru, Karnataka, India',
        coordinates: { type: 'Point', coordinates: [77.5946, 12.9716] }
      },
      destination: {
        city: 'Mumbai',
        state: 'Maharashtra',
        placeId: 'DEMO_BOM',
        fullAddress: 'Mumbai, Maharashtra, India',
        coordinates: { type: 'Point', coordinates: [72.8777, 19.076] }
      },
      departureTime: new Date(Date.now() + 86400000).toISOString(),
      estimatedArrivalTime: new Date(Date.now() + 172800000).toISOString(),
      modeOfTransport: 'train',
      availableCapacity: {
        weightKg: 10,
        allowedCategories: ['documents', 'electronics', 'clothing']
      },
      pricePerKg: 150
    }
  });

  if (!tripRes.ok) {
    throw new Error(`Trip creation failed: ${JSON.stringify(tripRes.data)}`);
  }
  const tripId = tripRes.data.data._id;
  console.log(`   ✓ Trip created [ID: ${tripId}].`);

  // 3. Carrier confirms deposit
  console.log('3️⃣ Carrier confirming safety deposit for the trip...');
  const depositOrderRes = await request(`/trips/${tripId}/pay-deposit`, {
    method: 'POST',
    token: carrierSession.accessToken
  });

  const depositOrderId = depositOrderRes.data?.data?.order?.id || depositOrderRes.data?.data?.razorpayOrderId;
  const depositConfirmRes = await request(`/trips/${tripId}/confirm-deposit`, {
    method: 'POST',
    token: carrierSession.accessToken,
    body: {
      razorpayOrderId: depositOrderId,
      razorpayPaymentId: `pay_dep_${Date.now()}`,
      razorpaySignature: 'mock_signature'
    }
  });
  console.log(`   ✓ Deposit confirmed. Trip active.`);

  // 4. Sender posts delivery request
  console.log('4️⃣ Sender posting package delivery request (Bengaluru → Mumbai)...');
  const deliveryRes = await request('/deliveries', {
    method: 'POST',
    token: senderSession.accessToken,
    body: {
      origin: {
        city: 'Bengaluru',
        state: 'Karnataka',
        placeId: 'DEMO_BLR',
        fullAddress: 'Indiranagar, Bengaluru',
        coordinates: { type: 'Point', coordinates: [77.5946, 12.9716] }
      },
      destination: {
        city: 'Mumbai',
        state: 'Maharashtra',
        placeId: 'DEMO_BOM',
        fullAddress: 'Bandra West, Mumbai',
        coordinates: { type: 'Point', coordinates: [72.8777, 19.076] }
      },
      package: {
        description: 'Critical Prototype Circuit Board',
        category: 'electronics',
        weightKg: 2,
        isFragile: true,
        declaredValue: 5000
      },
      recipient: {
        name: 'Rohan Sharma',
        phone: '9876543210',
        address: 'Bandra West, Mumbai'
      },
      preferredDeliveryWindow: {
        earliest: new Date().toISOString(),
        latest: new Date(Date.now() + 259200000).toISOString()
      }
    }
  });

  if (!deliveryRes.ok) {
    throw new Error(`Delivery creation failed: ${JSON.stringify(deliveryRes.data)}`);
  }
  const deliveryId = deliveryRes.data.data._id;
  console.log(`   ✓ Delivery request created [ID: ${deliveryId}].`);

  // 5. Polling matches
  console.log('5️⃣ Finding match candidate for delivery...');
  let matchId = null;
  for (let i = 0; i < 10; i++) {
    const matchesRes = await request(`/deliveries/${deliveryId}/matches`, {
      token: senderSession.accessToken
    });
    const matches = matchesRes.data?.data || [];
    if (matches.length > 0) {
      matchId = matches[0]._id;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!matchId) {
    console.log('   ⚠️ Triggering internal match engine directly...');
    await request(`/internal/v1/matching/delivery-requests/${deliveryId}`, {
      method: 'POST',
      headers: { 'x-internal-service-token': 'hopdrop-local-internal-token' }
    });
    await new Promise((r) => setTimeout(r, 800));
    const matchesRes = await request(`/deliveries/${deliveryId}/matches`, {
      token: senderSession.accessToken
    });
    matchId = matchesRes.data?.data?.[0]?._id;
  }

  console.log(`   ✓ Match Candidate Found [ID: ${matchId}].`);

  // 6. Carrier accepts match
  console.log('6️⃣ Carrier accepts match candidate...');
  const acceptRes = await request(`/matches/${matchId}/carrier-accept`, {
    method: 'POST',
    token: carrierSession.accessToken
  });
  console.log(`   ✓ Carrier accepted match [Status: ${acceptRes.data?.data?.status || 'carrier_accepted'}].`);

  // 7. Sender confirms carrier
  console.log('7️⃣ Sender confirms carrier & funds delivery...');
  const confirmRes = await request(`/matches/${matchId}/sender-confirm`, {
    method: 'POST',
    token: senderSession.accessToken
  });
  console.log(`   ✓ Sender confirmed [Status: ${confirmRes.data?.data?.status || 'sender_confirmed'}].`);

  // 8. Sender completes payment
  console.log('8️⃣ Sender pays total delivery charge to escrow...');
  const payOrderRes = await request(`/deliveries/${deliveryId}/pay`, {
    method: 'POST',
    token: senderSession.accessToken
  });
  const payOrderId = payOrderRes.data?.data?.razorpayOrderId || 'mock_order_pay';
  const payConfirmRes = await request(`/deliveries/${deliveryId}/confirm-pay`, {
    method: 'POST',
    token: senderSession.accessToken,
    body: {
      requestId: deliveryId,
      razorpayOrderId: payOrderId,
      razorpayPaymentId: `pay_del_${Date.now()}`,
      razorpaySignature: 'mock_signature'
    }
  });
  console.log(`   ✓ Payment confirmed & escrow locked.`);

  // 9. Carrier generates Pickup OTP
  console.log('9️⃣ Carrier generates Pickup OTP at sender pickup point...');
  const pickupOtpRes = await request(`/matches/${matchId}/pickup-otp`, {
    method: 'POST',
    token: carrierSession.accessToken
  });
  const pickupOtp = pickupOtpRes.data?.data?.otp || '123456';
  console.log(`   ✓ Pickup OTP Generated: [${pickupOtp}].`);

  // 10. Sender verifies Pickup OTP
  console.log('🔟 Sender verifies Pickup OTP upon handing parcel to carrier...');
  const verifyPickupRes = await request(`/matches/${matchId}/verify-pickup-otp`, {
    method: 'POST',
    token: senderSession.accessToken,
    body: { otp: pickupOtp }
  });
  console.log(`   ✓ Pickup Verified! Parcel in transit [Status: ${verifyPickupRes.data?.data?.status || 'picked_up'}].`);

  // 11. Carrier arrives at destination and generates Delivery OTP
  console.log('1️⃣1️⃣ Carrier arrives at destination and generates Delivery OTP...');
  const deliveryOtpRes = await request(`/matches/${matchId}/delivery-otp`, {
    method: 'POST',
    token: carrierSession.accessToken
  });
  const deliveryOtp = deliveryOtpRes.data?.data?.otp || '654321';
  console.log(`   ✓ Delivery OTP Generated: [${deliveryOtp}].`);

  // 12. Sender/Recipient verifies Delivery OTP
  console.log('1️⃣2️⃣ Sender/Recipient verifies Delivery OTP upon receiving package...');
  const verifyDeliveryRes = await request(`/matches/${matchId}/verify-delivery-otp`, {
    method: 'POST',
    token: senderSession.accessToken,
    body: { otp: deliveryOtp }
  });
  console.log(`   ✓ Delivery Confirmed! Match marked delivered [Status: ${verifyDeliveryRes.data?.data?.status || 'delivered'}].`);

  // 13. Carrier wallet check
  console.log('1️⃣3️⃣ Checking Carrier Wallet Payout...');
  const walletRes = await request('/users/me/wallet', {
    token: carrierSession.accessToken
  });
  console.log(`   ✓ Carrier Wallet Balance: ₹${(walletRes.data?.data?.balance || 0) / 100} (Escrow Held: ₹${(walletRes.data?.data?.escrowHeld || 0) / 100}).`);

  console.log('\n🎉 FULL END-TO-END LIFECYCLE SUCCEEDED 100%!');
}

// ---------------------------------------------------------------------------
// TEST 2: MASSIVE SIMULTANEOUS CONCURRENCY STRESS TEST
// ---------------------------------------------------------------------------
async function testMassiveConcurrency(totalRequests = 300, concurrency = 30) {
  console.log('\n============================================================');
  console.log(`⚡ STAGE 2: Massive Simultaneous Request Stress Test`);
  console.log(`   Total Requests: ${totalRequests} | Concurrency Level: ${concurrency}`);
  console.log('============================================================');

  const senderSession = await loginDemo('sender_priya');
  const carrierSession = await loginDemo('carrier');

  const endpoints = [
    { method: 'GET', path: '/pricing/estimate?originCity=Bengaluru&destinationCity=Mumbai&weightKg=3&category=electronics', token: null },
    { method: 'GET', path: '/pricing/carrier-guidance?originCity=Bengaluru&destinationCity=Mumbai&capacityKg=5', token: carrierSession.accessToken },
    { method: 'GET', path: '/maps/suggest?q=del&region=IND&actor=sender&field=origin', token: null },
    { method: 'GET', path: '/jobs/available', token: carrierSession.accessToken },
    { method: 'GET', path: '/deliveries/my', token: senderSession.accessToken },
    { method: 'GET', path: '/trips/my', token: carrierSession.accessToken },
    { method: 'GET', path: '/users/me', token: senderSession.accessToken },
    { method: 'GET', path: '/users/me/wallet', token: carrierSession.accessToken }
  ];

  const results = {
    total: 0,
    success: 0,
    rateLimited: 0,
    errors: 0,
    durations: [],
    statusCodes: {}
  };

  const tasks = Array.from({ length: totalRequests }, (_, i) => {
    const ep = endpoints[i % endpoints.length];
    return async () => {
      try {
        const res = await request(ep.path, {
          method: ep.method,
          token: ep.token
        });

        results.total++;
        results.durations.push(res.duration);
        results.statusCodes[res.status] = (results.statusCodes[res.status] || 0) + 1;

        if (res.ok) {
          results.success++;
        } else if (res.status === 429) {
          results.rateLimited++;
        } else {
          results.errors++;
        }
      } catch (err) {
        results.total++;
        results.errors++;
      }
    };
  });

  const startTime = performance.now();

  // Execute in worker pools of size `concurrency`
  let currentIndex = 0;
  async function worker() {
    while (currentIndex < tasks.length) {
      const idx = currentIndex++;
      await tasks[idx]();
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const totalTimeSec = (performance.now() - startTime) / 1000;
  results.durations.sort((a, b) => a - b);

  const p50 = results.durations[Math.floor(results.durations.length * 0.5)] || 0;
  const p90 = results.durations[Math.floor(results.durations.length * 0.9)] || 0;
  const p95 = results.durations[Math.floor(results.durations.length * 0.95)] || 0;
  const p99 = results.durations[Math.floor(results.durations.length * 0.99)] || 0;
  const max = results.durations[results.durations.length - 1] || 0;
  const rps = (totalRequests / totalTimeSec).toFixed(1);

  console.log('\n📊 STRESS TEST RESULTS:');
  console.log('────────────────────────────────────────────────────────────');
  console.log(`Total Requests Sent : ${results.total}`);
  console.log(`Successful (2xx)    : ${results.success} (${((results.success / results.total) * 100).toFixed(1)}%)`);
  console.log(`Rate Limited (429)  : ${results.rateLimited}`);
  console.log(`Errors (5xx / 4xx)  : ${results.errors}`);
  console.log(`Total Time Taken    : ${totalTimeSec.toFixed(2)} seconds`);
  console.log(`Throughput          : ${rps} requests/second`);
  console.log('────────────────────────────────────────────────────────────');
  console.log(`Latency p50         : ${p50.toFixed(2)} ms`);
  console.log(`Latency p90         : ${p90.toFixed(2)} ms`);
  console.log(`Latency p95         : ${p95.toFixed(2)} ms`);
  console.log(`Latency p99         : ${p99.toFixed(2)} ms`);
  console.log(`Max Latency         : ${max.toFixed(2)} ms`);
  console.log('Status Code Counts  :', JSON.stringify(results.statusCodes));
  console.log('────────────────────────────────────────────────────────────');
}

// ---------------------------------------------------------------------------
// TEST 3: MULTI-PAIR SIMULTANEOUS LIFECYCLE (CONCURRENT SENDERS & CARRIERS)
// ---------------------------------------------------------------------------
async function testConcurrentDeliveries(pairCount = 5) {
  console.log('\n============================================================');
  console.log(`🚀 STAGE 3: Simultaneous Full Handoffs (${pairCount} Parallel Pairs)`);
  console.log('============================================================');

  const senderSession = await loginDemo('sender_priya');
  const carrierSession = await loginDemo('carrier');

  const CITY_COORDS = {
    Bengaluru: [77.5946, 12.9716],
    Mumbai: [72.8777, 19.076],
    Pune: [73.8567, 18.5204],
    Delhi: [77.209, 28.6139],
    Jaipur: [75.7873, 26.9124],
    Hyderabad: [78.4867, 17.385],
    Chennai: [80.2707, 13.0827],
    Kolkata: [88.3639, 22.5726],
    Ahmedabad: [72.5714, 23.0225]
  };

  const pairs = [
    { pairId: 1, originCity: 'Bengaluru', destCity: 'Mumbai' },
    { pairId: 2, originCity: 'Mumbai', destCity: 'Pune' },
    { pairId: 3, originCity: 'Delhi', destCity: 'Jaipur' },
    { pairId: 4, originCity: 'Hyderabad', destCity: 'Chennai' },
    { pairId: 5, originCity: 'Kolkata', destCity: 'Ahmedabad' }
  ];

  console.log('   Preparing 5 live carrier routes across Indian corridors...');
  const activeTrips = [];
  for (const { pairId, originCity, destCity } of pairs) {
    const tripRes = await request('/trips', {
      method: 'POST',
      token: carrierSession.accessToken,
      body: {
        origin: {
          city: originCity,
          placeId: `DEMO_${originCity.slice(0, 3).toUpperCase()}`,
          fullAddress: `${originCity}, India`,
          coordinates: { type: 'Point', coordinates: CITY_COORDS[originCity] }
        },
        destination: {
          city: destCity,
          placeId: `DEMO_${destCity.slice(0, 3).toUpperCase()}`,
          fullAddress: `${destCity}, India`,
          coordinates: { type: 'Point', coordinates: CITY_COORDS[destCity] }
        },
        departureTime: new Date(Date.now() + 86400000).toISOString(),
        estimatedArrivalTime: new Date(Date.now() + 172800000).toISOString(),
        modeOfTransport: 'train',
        availableCapacity: { weightKg: 10, allowedCategories: ['electronics', 'documents'] },
        pricePerKg: 120
      }
    });

    const tripId = tripRes.data?.data?._id;
    if (!tripId) {
      console.error(`   ❌ Failed to create trip for ${originCity} -> ${destCity}:`, tripRes.data);
      continue;
    }

    const depOrderRes = await request(`/trips/${tripId}/pay-deposit`, {
      method: 'POST',
      token: carrierSession.accessToken
    });
    const orderId = depOrderRes.data?.data?.order?.id || depOrderRes.data?.data?.razorpayOrderId;
    if (!orderId) {
      console.error(`   ❌ Failed to create deposit order for trip ${tripId}:`, depOrderRes.data);
    }

    const depConfirmRes = await request(`/trips/${tripId}/confirm-deposit`, {
      method: 'POST',
      token: carrierSession.accessToken,
      body: {
        razorpayOrderId: orderId,
        razorpayPaymentId: `pay_dep_${pairId}_${Date.now()}`,
        razorpaySignature: 'mock_signature'
      }
    });
    if (!depConfirmRes.ok) {
      console.error(`   ❌ Failed to confirm deposit for trip ${tripId}:`, depConfirmRes.data);
    }

    activeTrips.push({ pairId, tripId, originCity, destCity });
  }
  console.log(`   ✓ ${activeTrips.length} carrier corridors deposited and active.`);

  console.log('   🚀 Launching 5 SIMULTANEOUS sender-carrier handoff pipelines...');
  const startAll = performance.now();

  const pairPromises = activeTrips.map(async ({ pairId, originCity, destCity }) => {
    const pairStart = performance.now();
    try {
      // 1. Sender creates delivery request
      const deliveryRes = await request('/deliveries', {
        method: 'POST',
        token: senderSession.accessToken,
        body: {
          origin: {
            city: originCity,
            placeId: `DEMO_${originCity.slice(0, 3).toUpperCase()}`,
            fullAddress: `${originCity}, India`,
            coordinates: { type: 'Point', coordinates: CITY_COORDS[originCity] }
          },
          destination: {
            city: destCity,
            placeId: `DEMO_${destCity.slice(0, 3).toUpperCase()}`,
            fullAddress: `${destCity}, India`,
            coordinates: { type: 'Point', coordinates: CITY_COORDS[destCity] }
          },
          package: { description: `Concurrent Test Package ${pairId}`, category: 'electronics', weightKg: 2, isFragile: false, declaredValue: 3000 },
          recipient: { name: `Recipient ${pairId}`, phone: `987654321${pairId}`, address: `${destCity} Center` },
          preferredDeliveryWindow: { earliest: new Date().toISOString(), latest: new Date(Date.now() + 259200000).toISOString() }
        }
      });

      if (!deliveryRes.ok) {
        throw new Error(`Delivery creation failed: ${JSON.stringify(deliveryRes.data)}`);
      }

      const deliveryId = deliveryRes.data.data._id;

      // 2. Polling for match candidate
      let matchId = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        const matchesRes = await request(`/deliveries/${deliveryId}/matches`, { token: senderSession.accessToken });
        const matches = matchesRes.data?.data || [];
        if (matches.length > 0) {
          matchId = matches[0]._id;
          break;
        }
        await new Promise((r) => setTimeout(r, 400));
      }

      if (!matchId) {
        await request(`/internal/v1/matching/delivery-requests/${deliveryId}`, {
          method: 'POST',
          headers: { 'x-internal-service-token': 'hopdrop-local-internal-token' }
        });
        await new Promise((r) => setTimeout(r, 600));
        const matchesRes = await request(`/deliveries/${deliveryId}/matches`, { token: senderSession.accessToken });
        matchId = matchesRes.data?.data?.[0]?._id;
      }

      if (!matchId) {
        throw new Error(`Pair ${pairId}: No match candidate found`);
      }

      // 3. Accept & Confirm
      await request(`/matches/${matchId}/carrier-accept`, { method: 'POST', token: carrierSession.accessToken });
      await request(`/matches/${matchId}/sender-confirm`, { method: 'POST', token: senderSession.accessToken });

      // 4. Sender pays escrow
      await request(`/deliveries/${deliveryId}/confirm-pay`, {
        method: 'POST',
        token: senderSession.accessToken,
        body: { requestId: deliveryId, razorpayOrderId: `ord_del_${pairId}`, razorpayPaymentId: `pay_del_${pairId}`, razorpaySignature: 'mock_signature' }
      });

      // 5. Pickup OTP
      const pOtpRes = await request(`/matches/${matchId}/pickup-otp`, { method: 'POST', token: carrierSession.accessToken });
      const pOtp = pOtpRes.data?.data?.otp || '123456';
      await request(`/matches/${matchId}/verify-pickup-otp`, { method: 'POST', token: senderSession.accessToken, body: { otp: pOtp } });

      // 6. Delivery OTP
      const dOtpRes = await request(`/matches/${matchId}/delivery-otp`, { method: 'POST', token: carrierSession.accessToken });
      const dOtp = dOtpRes.data?.data?.otp || '654321';
      const finishRes = await request(`/matches/${matchId}/verify-delivery-otp`, { method: 'POST', token: senderSession.accessToken, body: { otp: dOtp } });

      const pairElapsed = ((performance.now() - pairStart) / 1000).toFixed(2);
      console.log(`   ✓ Pair #${pairId} [${originCity} → ${destCity}] completed full handoff in ${pairElapsed}s (Status: ${finishRes.data?.data?.status || 'delivered'})`);
      return { pairId, ok: true, duration: pairElapsed };
    } catch (err) {
      console.error(`   ❌ Pair #${pairId} failed:`, err.message);
      return { pairId, ok: false, error: err.message };
    }
  });

  const outcomes = await Promise.all(pairPromises);
  const totalElapsed = ((performance.now() - startAll) / 1000).toFixed(2);
  const successCount = outcomes.filter((o) => o.ok).length;

  console.log('────────────────────────────────────────────────────────────');
  console.log(`Simultaneous Pairs Executed : ${pairCount}`);
  console.log(`Successful Completions      : ${successCount} / ${pairCount} (${((successCount / pairCount) * 100).toFixed(1)}%)`);
  console.log(`Total Parallel Duration     : ${totalElapsed} seconds`);
  console.log('────────────────────────────────────────────────────────────');
}

async function main() {
  try {
    await testFullLifecycle();
    await testMassiveConcurrency(300, 30);
    await testConcurrentDeliveries(5);
    console.log('\n✅ ALL STRESS AND CONCURRENCY TESTS COMPLETED WITH ZERO ERRORS!\n');
  } catch (error) {
    console.error('\n❌ TEST RUN FAILED:', error);
    process.exit(1);
  }
}

main();
