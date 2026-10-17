import { money, type Money } from "../money.ts";

export type OperatorKind = "keke" | "bike" | "car" | "van" | "courier" | "private_driver";
export type OperatorStatus = "offline" | "available" | "on_trip";

export interface GeoLocation {
  readonly lat: number;
  readonly lng: number;
  readonly address: string;
}

export interface VehicleDetails {
  readonly kind: OperatorKind;
  readonly registration: string;
  readonly makeModel: string;
  readonly color: string;
  readonly capacity: number;
}

export interface MobilityOperatorRecord {
  readonly id: string;
  readonly businessId: string;
  readonly userId: string;
  readonly name: string;
  readonly phone: string;
  readonly kind: OperatorKind;
  readonly status: OperatorStatus;
  readonly rating: number;               // 0.0 to 5.0
  readonly completedTrips: number;
  readonly currentLocation: GeoLocation | null;
  readonly vehicle: VehicleDetails;
  readonly isVerified: boolean;
  readonly languages: readonly string[];
}

export type RideStatus =
  | "requested"        // Broadcasted, riders can see & accept/counter
  | "counter_offered"  // One or more riders sent counter-offers
  | "matched"          // Agreement reached on fare
  | "en_route"         // Rider is traveling to pickup
  | "arrived"          // Rider arrived at pickup location
  | "in_progress"      // Customer picked up / order in transit
  | "completed"        // Delivered / arrived at destination
  | "cancelled";       // Cancelled by customer or rider

export interface CounterOffer {
  readonly operatorUserId: string;
  readonly operatorBusinessId: string;
  readonly operatorName: string;
  readonly operatorRating: number;
  readonly vehicle: VehicleDetails;
  readonly counterFareMinor: bigint;
  readonly note?: string;
  readonly atMs: number;
}

export interface RideRecord {
  readonly id: string;
  readonly businessId: string;           // Operator or fleet business ID
  readonly customerUserId: string | null;
  readonly customerContact: { readonly name: string; readonly phone: string; readonly email?: string };
  readonly operatorUserId: string | null;
  readonly vehicleKind: OperatorKind;
  readonly pickup: GeoLocation;
  readonly destination: GeoLocation;
  readonly distanceKm: number;
  readonly customerOfferMinor: bigint;
  readonly currency: string;
  readonly agreedFareMinor: bigint | null;
  readonly counterOffers: readonly CounterOffer[];
  readonly status: RideStatus;
  readonly scheduledForMs: number | null; // null = instant ride
  readonly deliveryOrderId: string | null; // set if linked to a store order delivery dispatch
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

/**
 * Calculates straight-line distance in kilometers between two lat/lng coordinates (Haversine formula).
 */
export function estimateDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const cosLat1 = Math.cos((a.lat * Math.PI) / 180);
  const cosLat2 = Math.cos((b.lat * Math.PI) / 180);
  const h = sinLat * sinLat + cosLat1 * cosLat2 * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c * 10) / 10;
}

/**
 * Estimates driving travel time in minutes based on distance and vehicle type in typical urban traffic.
 */
export function estimateTravelMinutes(distanceKm: number, kind: OperatorKind = "keke"): number {
  // Approximate average speed including urban stops: Bike 25km/h, Keke 20km/h, Car 22km/h
  const kmh = kind === "bike" || kind === "courier" ? 25 : kind === "keke" ? 20 : 22;
  const minutes = Math.round((distanceKm / kmh) * 60) + 3; // +3 min buffer
  return Math.max(5, minutes);
}

/**
 * Suggested benchmark fare based on distance and vehicle kind (advisory, market negotiation still applies).
 */
export function suggestBenchmarkFare(distanceKm: number, kind: OperatorKind, currency = "NGN"): Money {
  // Configurable base + per km rates in NGN
  const rates: Record<OperatorKind, { baseMinor: bigint; perKmMinor: bigint }> = {
    bike: { baseMinor: 50000n, perKmMinor: 15000n },         // Base N500 + N150/km
    keke: { baseMinor: 60000n, perKmMinor: 20000n },         // Base N600 + N200/km
    car: { baseMinor: 150000n, perKmMinor: 40000n },         // Base N1,500 + N400/km
    van: { baseMinor: 250000n, perKmMinor: 60000n },         // Base N2,500 + N600/km
    private_driver: { baseMinor: 300000n, perKmMinor: 70000n },
    courier: { baseMinor: 50000n, perKmMinor: 15000n },
  };
  const cfg = rates[kind] ?? rates.keke;
  const kmCount = BigInt(Math.max(1, Math.ceil(distanceKm)));
  const totalMinor = cfg.baseMinor + kmCount * cfg.perKmMinor;
  return money(totalMinor, currency);
}

const ALLOWED_TRANSITIONS: Readonly<Record<RideStatus, readonly RideStatus[]>> = {
  requested: ["counter_offered", "matched", "cancelled"],
  counter_offered: ["counter_offered", "matched", "cancelled"],
  matched: ["en_route", "cancelled"],
  en_route: ["arrived", "cancelled"],
  arrived: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionRide(from: RideStatus, to: RideStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Creates an initial ride request.
 */
export function createRideRequest(input: {
  id: string;
  businessId: string;
  customerUserId: string | null;
  customerContact: { name: string; phone: string; email?: string };
  vehicleKind: OperatorKind;
  pickup: GeoLocation;
  destination: GeoLocation;
  customerOfferMinor: bigint;
  currency: string;
  scheduledForMs?: number | null;
  deliveryOrderId?: string | null;
  nowMs: number;
}): RideRecord {
  const dist = estimateDistanceKm(input.pickup, input.destination);
  return {
    id: input.id,
    businessId: input.businessId,
    customerUserId: input.customerUserId,
    customerContact: input.customerContact,
    operatorUserId: null,
    vehicleKind: input.vehicleKind,
    pickup: input.pickup,
    destination: input.destination,
    distanceKm: dist,
    customerOfferMinor: input.customerOfferMinor,
    currency: input.currency,
    agreedFareMinor: null,
    counterOffers: [],
    status: "requested",
    scheduledForMs: input.scheduledForMs ?? null,
    deliveryOrderId: input.deliveryOrderId ?? null,
    createdAtMs: input.nowMs,
    updatedAtMs: input.nowMs,
  };
}

/**
 * Adds an operator's counter-offer to a ride request.
 */
export function addCounterOffer(
  ride: RideRecord,
  offer: Omit<CounterOffer, "atMs">,
  nowMs: number
): RideRecord {
  if (ride.status !== "requested" && ride.status !== "counter_offered") {
    throw new Error("cannot_counter_offer");
  }
  const newOffer: CounterOffer = { ...offer, atMs: nowMs };
  // Replace previous counter offer from this same operator if any, else append
  const others = ride.counterOffers.filter((c) => c.operatorUserId !== offer.operatorUserId);
  return {
    ...ride,
    counterOffers: [...others, newOffer],
    status: "counter_offered",
    updatedAtMs: nowMs,
  };
}

/**
 * Operator accepts the customer's proposed fare directly.
 */
export function acceptCustomerOffer(
  ride: RideRecord,
  operator: { userId: string; businessId: string },
  nowMs: number
): RideRecord {
  if (ride.status !== "requested" && ride.status !== "counter_offered") {
    throw new Error("ride_not_available");
  }
  return {
    ...ride,
    operatorUserId: operator.userId,
    businessId: operator.businessId,
    agreedFareMinor: ride.customerOfferMinor,
    status: "matched",
    updatedAtMs: nowMs,
  };
}

/**
 * Customer accepts a specific rider's counter-offer.
 */
export function acceptCounterOffer(
  ride: RideRecord,
  operatorUserId: string,
  nowMs: number
): RideRecord {
  if (ride.status !== "counter_offered") {
    throw new Error("no_counter_offers");
  }
  const chosen = ride.counterOffers.find((c) => c.operatorUserId === operatorUserId);
  if (!chosen) throw new Error("counter_offer_not_found");

  return {
    ...ride,
    operatorUserId: chosen.operatorUserId,
    businessId: chosen.operatorBusinessId,
    agreedFareMinor: chosen.counterFareMinor,
    status: "matched",
    updatedAtMs: nowMs,
  };
}

/**
 * Creates a Delivery / Dispatch ride request for an existing store order (Bakery, Restaurant, Supermarket).
 */
export function createDeliveryDispatchRide(input: {
  rideId: string;
  storeBusinessId: string;
  orderId: string;
  storeLocation: GeoLocation;
  customerLocation: GeoLocation;
  customerContact: { name: string; phone: string; email?: string };
  deliveryFeeMinor: bigint;
  currency: string;
  preferredVehicle?: OperatorKind;
  nowMs: number;
}): RideRecord {
  return createRideRequest({
    id: input.rideId,
    businessId: input.storeBusinessId,
    customerUserId: null,
    customerContact: input.customerContact,
    vehicleKind: input.preferredVehicle ?? "courier",
    pickup: input.storeLocation,
    destination: input.customerLocation,
    customerOfferMinor: input.deliveryFeeMinor,
    currency: input.currency,
    deliveryOrderId: input.orderId,
    nowMs: input.nowMs,
  });
}
