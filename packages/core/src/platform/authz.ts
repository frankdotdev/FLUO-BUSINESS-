// Authorisation is evaluated server-side from MEMBERSHIPS LOADED FOR THE AUTHENTICATED USER.
// Never from a client-supplied role, and never from knowing a business ID.
export type Role = "owner" | "admin" | "manager" | "staff" | "cashier";
export type Permission =
  | "business.manage" | "members.manage" | "billing.manage" | "audit.read"
  | "catalogue.write" | "orders.read" | "orders.write" | "bookings.manage"
  | "customers.read" | "payments.read" | "events.checkin" | "refunds.manage" | "events.manage";

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  owner: ["business.manage", "members.manage", "billing.manage", "audit.read", "catalogue.write", "orders.read", "orders.write", "bookings.manage", "customers.read", "payments.read", "events.checkin", "refunds.manage", "events.manage"],
  admin: ["business.manage", "members.manage", "audit.read", "catalogue.write", "orders.read", "orders.write", "bookings.manage", "customers.read", "payments.read", "events.checkin", "refunds.manage", "events.manage"],
  manager: ["catalogue.write", "orders.read", "orders.write", "bookings.manage", "customers.read", "events.checkin", "refunds.manage", "events.manage"],
  staff: ["orders.read", "orders.write", "bookings.manage", "events.checkin"],
  cashier: ["orders.read", "orders.write", "payments.read"],
};

export interface Membership {
  readonly userId: string;
  readonly businessId: string;
  readonly role: Role;
  readonly status: "active" | "suspended" | "removed";
}
export interface Decision { readonly allowed: boolean; readonly reason: string }

export function authorize(
  memberships: readonly Membership[], userId: string, businessId: string, permission: Permission,
): Decision {
  const m = memberships.find((x) => x.userId === userId && x.businessId === businessId);
  if (!m) return { allowed: false, reason: "no_membership" };
  if (m.status !== "active") return { allowed: false, reason: `membership_${m.status}` };
  return ROLE_PERMISSIONS[m.role].includes(permission)
    ? { allowed: true, reason: "ok" }
    : { allowed: false, reason: "permission_denied" };
}

/** Every tenant-owned record fetched by ID must still belong to the business the caller is acting in. */
export function assertSameTenant(resourceBusinessId: string, actingBusinessId: string): void {
  if (resourceBusinessId !== actingBusinessId) throw new Error("cross_tenant_access_denied");
}
