import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateDistanceKm,
  estimateTravelMinutes,
  suggestBenchmarkFare,
  canTransitionRide,
  createRideRequest,
  addCounterOffer,
  acceptCustomerOffer,
  acceptCounterOffer,
  createDeliveryDispatchRide,
  type VehicleDetails,
} from "./rides.ts";

test("distance calculation: Haversine distance between coordinates", () => {
  // New Haven (approx 6.4474, 7.5139) to Independence Layout (approx 6.4294, 7.5186) in Enugu
  const newHaven = { lat: 6.4474, lng: 7.5139, address: "New Haven, Enugu" };
  const independenceLayout = { lat: 6.4294, lng: 7.5186, address: "Independence Layout, Enugu" };

  const dist = estimateDistanceKm(newHaven, independenceLayout);
  assert.ok(dist >= 1.5 && dist <= 2.5, `Expected ~2km, got ${dist}`);

  const travelTime = estimateTravelMinutes(dist, "keke");
  assert.ok(travelTime >= 5 && travelTime <= 15);

  const fare = suggestBenchmarkFare(dist, "keke", "NGN");
  assert.equal(fare.currency, "NGN");
  assert.ok(fare.amountMinor > 0n);
});

test("ride state machine: valid transitions and illegal shortcuts", () => {
  assert.equal(canTransitionRide("requested", "matched"), true);
  assert.equal(canTransitionRide("requested", "counter_offered"), true);
  assert.equal(canTransitionRide("requested", "in_progress"), false); // cannot jump directly to trip

  assert.equal(canTransitionRide("matched", "en_route"), true);
  assert.equal(canTransitionRide("en_route", "arrived"), true);
  assert.equal(canTransitionRide("arrived", "in_progress"), true);
  assert.equal(canTransitionRide("in_progress", "completed"), true);
  assert.equal(canTransitionRide("completed", "in_progress"), false); // terminal
});

test("ride negotiation: customer offer, counter offer, and acceptance", () => {
  const pickup = { lat: 6.4474, lng: 7.5139, address: "New Haven" };
  const dest = { lat: 6.4294, lng: 7.5186, address: "Independence Layout" };
  const now = 100000;

  // 1. Customer creates request with offer of N2,500
  const ride = createRideRequest({
    id: "ride-1",
    businessId: "biz-1",
    customerUserId: "cust-1",
    customerContact: { name: "Amaka", phone: "08012345678" },
    vehicleKind: "keke",
    pickup,
    destination: dest,
    customerOfferMinor: 250000n, // N2,500
    currency: "NGN",
    nowMs: now,
  });

  assert.equal(ride.status, "requested");
  assert.equal(ride.customerOfferMinor, 250000n);

  const vehicle: VehicleDetails = {
    kind: "keke",
    registration: "ENU-123-AA",
    makeModel: "Bajaj RE",
    color: "Yellow",
    capacity: 3,
  };

  // 2. Rider Chinedu sends counter offer of N3,000
  const withCounter = addCounterOffer(
    ride,
    {
      operatorUserId: "rider-chinedu",
      operatorBusinessId: "biz-chinedu",
      operatorName: "Chinedu",
      operatorRating: 4.9,
      vehicle,
      counterFareMinor: 300000n, // N3,000
      note: "Traffic along Ogui road",
    },
    now + 5000
  );

  assert.equal(withCounter.status, "counter_offered");
  assert.equal(withCounter.counterOffers.length, 1);
  assert.equal(withCounter.counterOffers[0]?.counterFareMinor, 300000n);

  // 3. Customer accepts Chinedu's counter offer
  const matched = acceptCounterOffer(withCounter, "rider-chinedu", now + 10000);
  assert.equal(matched.status, "matched");
  assert.equal(matched.agreedFareMinor, 300000n);
  assert.equal(matched.operatorUserId, "rider-chinedu");
});

test("ride direct acceptance: rider accepts customer's proposed fare directly", () => {
  const pickup = { lat: 6.4474, lng: 7.5139, address: "New Haven" };
  const dest = { lat: 6.4294, lng: 7.5186, address: "Independence Layout" };
  const now = 100000;

  const ride = createRideRequest({
    id: "ride-2",
    businessId: "biz-1",
    customerUserId: "cust-2",
    customerContact: { name: "Ifeanyi", phone: "08099887766" },
    vehicleKind: "bike",
    pickup,
    destination: dest,
    customerOfferMinor: 150000n, // N1,500
    currency: "NGN",
    nowMs: now,
  });

  const matched = acceptCustomerOffer(
    ride,
    { userId: "rider-emeka", businessId: "biz-emeka" },
    now + 2000
  );

  assert.equal(matched.status, "matched");
  assert.equal(matched.agreedFareMinor, 150000n);
  assert.equal(matched.operatorUserId, "rider-emeka");
});

test("delivery bridge: store order creates delivery dispatch request for nearby riders", () => {
  const bakeryLocation = { lat: 6.45, lng: 7.51, address: "Frank Bakery, Campus Gate" };
  const dormLocation = { lat: 6.46, lng: 7.52, address: "Hall 3, Campus" };

  const dispatchRide = createDeliveryDispatchRide({
    rideId: "ride-delivery-1",
    storeBusinessId: "bakery-biz",
    orderId: "order-cake-123",
    storeLocation: bakeryLocation,
    customerLocation: dormLocation,
    customerContact: { name: "Ngozi", phone: "08011223344" },
    deliveryFeeMinor: 200000n, // N2,000 delivery fee
    currency: "NGN",
    preferredVehicle: "bike",
    nowMs: 120000,
  });

  assert.equal(dispatchRide.deliveryOrderId, "order-cake-123");
  assert.equal(dispatchRide.vehicleKind, "bike");
  assert.equal(dispatchRide.customerOfferMinor, 200000n);
  assert.equal(dispatchRide.status, "requested");
});
