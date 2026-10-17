import { type Capability, withDependencies } from "./capabilities.ts";

// A business type is versioned CONFIGURATION, not code. New types = new entries here (or DB rows later).
export type Regulation = "none" | "sensitive_data" | "licensed";
export type Tier = "mvp" | "launch" | "later";

export interface BusinessType {
  readonly id: string;
  readonly version: number;
  readonly group: string;
  readonly label: string;
  readonly defaults: readonly Capability[];
  readonly optional: readonly Capability[];
  readonly regulation: Regulation;
  readonly requiresVerification: boolean;
  readonly tier: Tier;
}

const base: Capability[] = ["customers", "messaging"];
function t(
  id: string, group: string, label: string, tier: Tier,
  defaults: Capability[], optional: Capability[] = [], regulation: Regulation = "none",
): BusinessType {
  return {
    id, version: 1, group, label, tier, regulation,
    requiresVerification: regulation !== "none",
    defaults: withDependencies([...base, ...defaults]),
    optional: optional,
  };
}

export const BUSINESS_TYPES: readonly BusinessType[] = [
  // Everyday retail & food (MVP)
  t("retail", "retail", "Retail shop", "mvp", ["catalogue", "inventory", "orders"], ["delivery", "promotions", "staff"]),
  t("restaurant", "food", "Restaurant / café", "mvp", ["catalogue", "orders"], ["resource_booking", "delivery", "staff", "promotions"]),
  t("bakery", "food", "Bakery / made-to-order food", "mvp", ["catalogue", "custom_orders"], ["delivery", "promotions"]),
  t("salon_barber", "beauty", "Barber / salon / beauty", "mvp", ["services", "bookings"], ["staff", "memberships", "promotions"]),
  t("technician", "home_services", "Repair / technician", "mvp", ["services", "job_cards", "quotes", "bookings"], ["catalogue", "inventory", "staff"]),
  t("event_organiser", "events", "Event organiser", "mvp", ["events_ticketing"], ["staff", "promotions"]),
  t("general", "general", "General business", "mvp", ["enquiries"], ["catalogue", "orders", "services", "bookings", "staff"]),
  // Food, groceries
  t("supermarket", "retail", "Supermarket / mini-mart", "launch", ["catalogue", "inventory", "orders", "delivery"], ["batch_expiry", "promotions", "staff"]),
  t("wholesaler", "retail", "Provision store / wholesaler", "launch", ["catalogue", "inventory", "orders", "wholesale_pricing"], ["delivery", "staff"]),
  t("fresh_produce", "retail", "Butcher / fish / fresh produce", "launch", ["catalogue", "orders"], ["delivery", "custom_orders"]),
  t("water_gas", "retail", "Water, gas & household essentials", "launch", ["catalogue", "orders", "delivery"], ["recurring_schedules"]),
  t("pharmacy", "health", "Pharmacy / health products", "later", ["catalogue", "inventory", "orders", "batch_expiry"], ["delivery"], "licensed"),
  t("caterer", "food", "Caterer", "launch", ["catalogue", "custom_orders", "quotes"], ["delivery"]),
  // Hospitality & accommodation
  t("hotel", "hospitality", "Hotel / resort", "launch", ["resource_booking", "housekeeping", "staff"], ["promotions", "documents"]),
  t("guest_house", "hospitality", "Guest house / lodge / inn", "launch", ["resource_booking", "housekeeping"], ["staff"]),
  t("short_let", "hospitality", "Short-let / serviced apartment", "launch", ["resource_booking"], ["housekeeping", "staff"]),
  t("hostel", "hospitality", "Hostel / student accommodation", "launch", ["resource_booking", "housekeeping"], ["documents", "staff"]),
  t("event_venue", "hospitality", "Event centre / hall / venue", "launch", ["resource_booking", "enquiries", "quotes"], ["documents", "staff"]),
  t("coworking", "hospitality", "Coworking / meeting rooms", "launch", ["resource_booking", "memberships"], ["staff"]),
  // Home, property, construction
  t("real_estate", "property", "Real estate / property manager", "launch", ["listings", "enquiries", "bookings"], ["documents", "staff"]),
  t("construction", "property", "Construction / contractor", "later", ["enquiries", "quotes", "documents"], ["job_cards", "staff"]),
  t("interior_furniture", "property", "Interior design / furniture maker", "later", ["catalogue", "custom_orders", "quotes"], ["documents"]),
  t("cleaning", "home_services", "Cleaning / fumigation", "launch", ["services", "bookings", "recurring_schedules"], ["staff", "quotes"]),
  t("security_facility", "home_services", "Security / facility management", "later", ["enquiries", "quotes", "documents", "staff"], [], "sensitive_data"),
  // Transport, rides & automotive
  t("keke_rider", "mobility", "Keke Rider / Operator", "mvp", ["mobility_rides"], ["promotions"]),
  t("bike_rider", "mobility", "Bike / Motorcycle Rider", "mvp", ["mobility_rides"], ["promotions"]),
  t("car_driver", "mobility", "Car Driver / Chauffeur", "mvp", ["mobility_rides"], ["promotions"]),
  t("delivery_rider", "mobility", "Delivery Rider / Courier", "mvp", ["mobility_rides"], ["promotions"]),
  t("transport_fleet", "mobility", "Transport Fleet & Logistics", "launch", ["mobility_rides", "staff"], ["promotions"]),
  t("car_dealer", "mobility", "Car dealer / used cars", "launch", ["listings", "enquiries", "bookings"], ["staff"]),
  t("car_rental", "mobility", "Car rental", "launch", ["resource_booking", "rentals", "documents"], ["staff"], "sensitive_data"),
  t("auto_repair", "mobility", "Mechanic / auto repair", "launch", ["services", "job_cards", "quotes", "bookings"], ["inventory", "catalogue", "staff"]),
  t("spare_parts", "mobility", "Spare-parts dealer", "launch", ["catalogue", "inventory", "orders"], ["wholesale_pricing", "delivery"]),
  t("courier", "mobility", "Logistics / courier", "launch", ["services", "dispatch", "quotes"], ["staff"]),
  t("driving_school", "mobility", "Driving school", "later", ["services", "bookings", "classes"], ["staff"]),
  t("bus_operator", "mobility", "Bus / travel operator", "later", ["seat_inventory", "events_ticketing"], ["staff"]),
  // Health & wellness
  t("clinic", "health", "Clinic / specialist practice", "later", ["services", "bookings", "staff"], [], "licensed"),
  t("lab", "health", "Laboratory / diagnostic centre", "later", ["services", "bookings", "staff"], [], "licensed"),
  t("dental_optical", "health", "Dental / optical", "later", ["services", "bookings", "staff"], [], "licensed"),
  t("gym", "wellness", "Gym / fitness centre", "launch", ["memberships", "classes", "bookings"], ["staff"]),
  t("studio", "wellness", "Yoga / dance / fitness studio", "launch", ["classes", "memberships", "bookings"], ["staff"]),
  t("spa", "beauty", "Massage / wellness spa", "launch", ["services", "bookings"], ["resource_booking", "staff"]),
  // Education & professional
  t("school", "education", "School / training centre", "later", ["enquiries", "classes", "events_ticketing"], ["documents", "staff"], "sensitive_data"),
  t("tutor", "education", "Tutor / music teacher", "launch", ["services", "bookings", "recurring_schedules"], []),
  t("consultant", "professional", "Consultant / freelancer", "launch", ["services", "bookings", "enquiries", "quotes"], ["documents"]),
  t("legal_accounting", "professional", "Lawyer / accounting firm", "later", ["services", "bookings", "enquiries", "documents"], ["quotes"], "licensed"),
  // Creative & entertainment
  t("entertainer", "creative", "Musician / DJ / entertainer", "launch", ["services", "enquiries", "quotes", "bookings"], []),
  t("event_planner", "creative", "Event planner / decorator", "launch", ["services", "enquiries", "quotes"], ["documents"]),
  t("attraction", "creative", "Cinema / recreation / attraction", "launch", ["events_ticketing", "bookings"], ["staff"]),
  t("rental_business", "creative", "Equipment / party rentals", "launch", ["resource_booking", "rentals", "catalogue"], ["inventory", "staff"]),
  t("photographer", "creative", "Photographer / videographer", "launch", ["services", "bookings", "enquiries", "quotes"], ["documents"]),
  // Agriculture, manufacturing, B2B
  t("farm", "agri_b2b", "Farm / produce seller", "launch", ["catalogue", "orders", "wholesale_pricing"], ["delivery"]),
  t("manufacturer", "agri_b2b", "Manufacturer / distributor", "launch", ["catalogue", "inventory", "orders", "wholesale_pricing"], ["delivery", "staff"]),
  t("printing", "agri_b2b", "Printing & branding", "launch", ["services", "quotes", "custom_orders", "documents"], ["delivery"]),
  t("laundry", "agri_b2b", "Laundry / dry cleaning", "launch", ["services", "orders", "delivery"], ["recurring_schedules"]),
  // Additional everyday
  t("tailor", "everyday", "Tailor / fashion designer", "launch", ["services", "custom_orders", "quotes"], ["catalogue"]),
  t("pet_care", "everyday", "Pet shop / pet care", "launch", ["catalogue", "orders", "services", "bookings"], ["inventory"]),
  t("veterinary", "health", "Veterinary practice", "later", ["services", "bookings", "staff"], [], "licensed"),
  t("car_wash", "mobility", "Car wash / detailing", "launch", ["services", "bookings"], ["memberships", "staff"]),
  t("travel_agency", "everyday", "Travel agency / tours", "launch", ["services", "enquiries", "quotes", "bookings"], ["events_ticketing"]),
  t("gifts_florist", "retail", "Gift shop / florist", "launch", ["catalogue", "orders", "custom_orders"], ["delivery"]),
  t("nonprofit", "community", "Nonprofit / community / religious", "launch", ["events_ticketing", "donations"], ["staff"]),
  t("digital_creator", "creative", "Digital creator / products", "launch", ["catalogue", "orders", "documents"], ["memberships"]),
  t("sports_facility", "wellness", "Sports facility / courts", "launch", ["resource_booking", "memberships"], ["staff"]),
  // Additional everyday businesses (completing the catalogue)
  t("phone_repair_retail", "everyday", "Phone / computer repair & sales", "mvp", ["services", "job_cards", "quotes", "bookings", "catalogue", "inventory", "orders"], ["staff"]),
  t("electronics_store", "retail", "Electronics & appliance store", "launch", ["catalogue", "inventory", "orders"], ["delivery", "job_cards"]),
  t("bookshop_stationery", "retail", "Bookshop / stationery", "launch", ["catalogue", "inventory", "orders"], ["delivery"]),
  t("art_craft", "retail", "Art gallery / craft seller", "launch", ["catalogue", "orders", "custom_orders"], ["events_ticketing"]),
  t("shoe_maker", "everyday", "Shoe maker / repairer", "launch", ["services", "custom_orders", "quotes"], ["catalogue"]),
  t("mobile_beauty", "beauty", "Mobile beauty professional", "launch", ["services", "bookings"], []),
  t("internet_cafe", "everyday", "Internet café", "launch", ["services", "resource_booking"], ["catalogue"]),
  t("business_centre", "everyday", "Photocopying / business centre", "launch", ["services", "orders", "catalogue"], ["quotes"]),
  t("funeral_services", "everyday", "Funeral & event service provider", "launch", ["services", "enquiries", "quotes", "bookings"], ["documents"]),
  t("subscription_service", "everyday", "Subscription-based local service", "launch", ["services", "memberships", "recurring_schedules"], ["delivery"]),
  t("food_delivery", "food", "Food delivery vendor", "launch", ["catalogue", "orders", "delivery"], ["dispatch"]),
  t("other_accommodation", "hospitality", "B&B / motel / campsite / co-living / holiday home", "launch", ["resource_booking"], ["housekeeping", "staff"]),
] as const;

const byId = new Map(BUSINESS_TYPES.map((b) => [b.id, b]));
export function getBusinessType(id: string): BusinessType {
  const bt = byId.get(id);
  if (!bt) throw new Error(`Unknown business type: ${id}`);
  return bt;
}

/** Capabilities for a new business: type defaults + chosen optionals (must be allowed) + dependencies. */
export function resolveCapabilities(typeId: string, chosenOptional: readonly Capability[] = []): Capability[] {
  const bt = getBusinessType(typeId);
  for (const c of chosenOptional) {
    if (!bt.optional.includes(c) && !bt.defaults.includes(c)) {
      throw new Error(`Capability ${c} is not available for business type ${typeId}`);
    }
  }
  return withDependencies([...bt.defaults, ...chosenOptional]);
}
