import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PLAN_ENTITLEMENTS,
  PRICE_BOOK,
  authorize,
  resourcePath,
  readConversation,
  workspaceModules,
  type ModuleId,
  describePolicy,
  effectivePlanKey,
  fmtLocal,
  fmtMoney,
  getBusinessType,
  paidPlanKey,
  resolveEntitlements,
  trialState,
  planUsageReport,
  type Permission,
} from "@fluo/core";
import { listPaystackBanks } from "@fluo/adapters";
import { Scanner } from "@/components/scanner.tsx";
import { Thread } from "@/components/thread.tsx";
import { ImageUpload } from "@/components/image-upload.tsx";
import { photo } from "@/server/media.ts";
import { deps } from "@/server/container.ts";
import { env } from "@/server/env.ts";
import { requireUser } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";
import * as A from "@/app/actions.ts";
import { SubmitButton } from "@/components/submit-button.tsx";
import {
  IconZap,
  IconReceipt,
  IconShield,
  IconCheck,
  IconAlertTriangle,
  IconArrowRight,
  IconUsers,
  IconStore,
  IconCalendar,
  IconClock,
  IconPlus,
  IconMessageSquare,
  IconPackage,
  IconLayoutDashboard,
  IconCreditCard,
  IconSettings,
  IconHelpCircle,
  IconTrendingUp,
  IconSparkles,
  IconExternalLink,
} from "@/components/icons.tsx";

export const dynamic = "force-dynamic";
const H = (id: string) => <input type="hidden" name="businessId" value={id} />;

export default async function Dashboard({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{
    tab?: string;
    error?: string;
    welcome?: string;
    payout?: string;
    checkin?: string;
    c?: string;
    invited?: string;
  }>;
}) {
  const { businessId } = await params,
    sp = await searchParams;
  const user = await requireUser(`/app/${businessId}`);
  const d = deps();
  const mine = await d.store.membershipsForUser(user.id);
  const can = (p: Permission): boolean => authorize(mine, user.id, businessId, p).allowed;
  const biz =
    can("orders.read") || can("bookings.manage") || can("catalogue.write")
      ? await d.store.getBusiness(businessId)
      : null;
  if (!biz) notFound();

  const msg = friendly(sp.error);
  const type = getBusinessType(biz.typeId);
  const { planKey } = await resolveEntitlements(d, businessId, PLAN_ENTITLEMENTS);
  const caps = await d.store.capabilitiesOf(businessId);
  const modules = workspaceModules(biz.typeId, caps);
  const tab: ModuleId = modules.some((m) => m.id === sp.tab) ? (sp.tab as ModuleId) : "overview";
  const myRole = mine.find((m) => m.businessId === businessId && m.status === "active")?.role;

  // Real orders count for badge
  const recentOrders = await d.store.listOrders(businessId, 20, 0).catch(() => []);
  const activeOrdersCount = recentOrders.filter(
    (o) => o.status === "awaiting_payment" || o.status === "paid" || o.status === "in_production" || o.status === "ready"
  ).length;

  const todayStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: biz.timezone,
  }).format(new Date()).toUpperCase();

  const activeModule = modules.find((m) => m.id === tab) || { id: "overview", label: "Overview" };

  return (
    <div className="admin-shell">
      {/* Desktop Left Sidebar matching Screenshot 4 */}
      <aside className="admin-sidebar">
        {/* Workspace Profile Card */}
        <div style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 18,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "var(--coral-soft)",
            color: "var(--coral-dark)",
            fontFamily: "Manrope, sans-serif",
            fontSize: 18,
            fontWeight: 800,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}>
            {biz.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {biz.name}
            </strong>
            <small style={{ color: "var(--muted)", fontSize: 11, display: "block" }}>
              {type.label} workspace
            </small>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="section-kicker" style={{ padding: "0 14px", margin: "10px 0 4px", fontSize: 10, letterSpacing: 1.2 }}>
            WORKSPACE
          </span>

          {modules.map((m) => {
            const isCurrent = m.id === tab;
            let IconComponent = IconLayoutDashboard;
            if (m.id === "orders") IconComponent = IconReceipt;
            else if (m.id === "products") IconComponent = IconPackage;
            else if (m.id === "bookings") IconComponent = IconCalendar;
            else if (m.id === "events") IconComponent = IconReceipt;
            else if (m.id === "messages") IconComponent = IconMessageSquare;
            else if (m.id === "team") IconComponent = IconUsers;
            else if (m.id === "payments") IconComponent = IconCreditCard;
            else if (m.id === "billing") IconComponent = IconSparkles;

            return (
              <Link
                key={m.id}
                href={`/app/${businessId}?tab=${m.id}`}
                className={`admin-nav-item ${isCurrent ? "active" : ""}`}
              >
                <IconComponent size={18} />
                <span style={{ flex: 1 }}>{m.label}</span>
                {m.id === "orders" && activeOrdersCount > 0 && (
                  <span style={{
                    background: isCurrent ? "var(--coral)" : "var(--coral-soft)",
                    color: isCurrent ? "#ffffff" : "var(--coral-dark)",
                    padding: "2px 7px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {activeOrdersCount}
                  </span>
                )}
              </Link>
            );
          })}

          <Link
            href={`/app/${businessId}/kiosk`}
            className="admin-nav-item"
            style={{ marginTop: 4 }}
          >
            <IconZap size={18} />
            <span>POS register</span>
          </Link>

          {biz.status === "active" && (
            <Link
              href={`/b/${biz.slug}`}
              target="_blank"
              className="admin-nav-item"
            >
              <IconStore size={18} />
              <span>Public Storefront</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>↗</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Main Admin Content */}
      <div className="admin-main">
        {/* Top Breadcrumbs & Mode Strip */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
            <span>Workspace</span>
            <span>/</span>
            <strong style={{ color: "var(--ink)", fontWeight: 700 }}>{activeModule.label}</strong>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="open-badge" style={{ position: "static", background: biz.status === "active" ? "#edf6f0" : "#fef3c7", color: biz.status === "active" ? "var(--green)" : "#92400e" }}>
              <i style={{ background: biz.status === "active" ? "var(--green)" : "#d97706" }}></i>
              {biz.status === "active" ? "Live Storefront" : "Draft Setup"}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--coral-dark)", background: "var(--coral-soft)", padding: "3px 8px", borderRadius: 6 }}>
              Plan: {planKey.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Mobile Horizontal Tabs (hidden on desktop) */}
        <nav
          className="mobile-admin-tabs"
          style={{
            display: "none",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 14,
            marginBottom: 16,
            borderBottom: "1px solid var(--line)",
            scrollbarWidth: "none",
          }}
          aria-label="Workspace modules"
        >
          {modules.map((m) => {
            const isCurrent = m.id === tab;
            return (
              <Link
                key={m.id}
                href={`/app/${businessId}?tab=${m.id}`}
                style={{
                  padding: "7px 14px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  background: isCurrent ? "var(--ink)" : "var(--surface)",
                  color: isCurrent ? "#ffffff" : "var(--muted)",
                  border: "1px solid var(--line)",
                }}
              >
                {m.label}
              </Link>
            );
          })}
        </nav>

        {/* Prominent Draft Status Banner when storefront is unlaunched */}
        {biz.status === "draft" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              padding: "16px 20px",
              background: "#fffbeb",
              border: "1.5px solid #fcd34d",
              borderRadius: 16,
              marginBottom: 20,
              boxShadow: "0 2px 10px rgba(245, 158, 11, 0.08)",
            }}
          >
            <div>
              <strong style={{ fontSize: 14, color: "#92400e", display: "block" }}>
                Storefront is currently in Draft mode
              </strong>
              <span style={{ fontSize: 12, color: "#b45309" }}>
                Your business, products, and services are hidden from Fluo Explore until you publish.
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <form action={A.publishAction}>
                <input type="hidden" name="businessId" value={biz.id} />
                <button className="primary-button" type="submit" style={{ padding: "8px 18px", fontSize: 13 }}>
                  Publish Storefront Now ↗
                </button>
              </form>
              {canManage && (
                <form action={A.deleteDraftBusinessAction}>
                  <input type="hidden" name="businessId" value={biz.id} />
                  <button
                    type="submit"
                    style={{
                      padding: "8px 14px",
                      fontSize: 13,
                      background: "none",
                      border: "1px solid #fecaca",
                      color: "#dc2626",
                      borderRadius: 10,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Discard Draft
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Tab Header Banner */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 14,
        }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: "var(--muted)", textTransform: "uppercase" }}>
              {todayStr}
            </span>
            <h1 style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.6px",
              margin: "4px 0 4px",
              color: "var(--ink)",
            }}>
              {activeModule.label}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              {tab === "overview" && "Keep an eye on business performance, orders, and catalogue."}
              {tab === "orders" && "Manage customer orders, fulfilment progress, and escrow releases."}
              {tab === "products" && "Catalogue items, stock quantities, and product pricing."}
              {tab === "payments" && "Direct bank transfer accounts and settlement status."}
              {tab === "team" && "Manage staff access and workspace responsibilities."}
              {tab === "billing" && "Subscription tier, active 30-day trial, and invoices."}
              {tab === "messages" && "Customer inquiries and direct chats."}
              {tab === "bookings" && "Calendar appointments and reservation slots."}
              {tab === "events" && "Event tickets, attendee limits, and check-in scanner. (Zero subscription required, 2% platform fee per ticket)"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {biz.status === "active" && (
              <Link
                href={`/b/${biz.slug}`}
                target="_blank"
                className="secondary-button"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", fontSize: 13 }}
              >
                View Live Storefront <IconExternalLink size={14} />
              </Link>
            )}
            <Link
              className="primary-button"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", fontSize: 13 }}
              href={`/app/${businessId}/kiosk`}
            >
              <IconZap size={15} /> + New sale / POS Kiosk
            </Link>
          </div>
        </div>

        {msg && (
          <div style={{
            padding: "12px 16px",
            background: "var(--coral-soft)",
            border: "1px solid var(--coral)",
            borderRadius: 12,
            color: "var(--coral-dark)",
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 600,
          }} role="alert">
            {msg}
          </div>
        )}

        {sp.welcome && (
          <div style={{
            padding: "14px 18px",
            background: "#edf6f0",
            border: "1px solid #bfe3cc",
            borderRadius: 16,
            color: "var(--green)",
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <IconCheck size={18} />
            <span>Your business workspace is ready! Set up your settlement bank account and add products to start trading.</span>
          </div>
        )}

        {/* Main Tab View */}
        <main style={{ minHeight: 400 }}>
          {tab === "overview" && <Overview biz={biz} canManage={can("business.manage")} planKey={planKey} />}
          {tab === "orders" && <Orders businessId={businessId} canWrite={can("orders.write")} canRefund={can("refunds.manage")} />}
          {tab === "bookings" && (
            <Bookings
              currency={biz.currency}
              businessId={businessId}
              tz={biz.timezone}
              canManage={can("bookings.manage")}
              enabled={caps.includes("bookings") || caps.includes("resource_booking")}
            />
          )}
          {tab === "events" && (
            <Events
              businessId={businessId}
              tz={biz.timezone}
              canManage={can("events.manage")}
              canCheckIn={can("events.checkin")}
              enabled={caps.includes("events_ticketing")}
              checkin={sp.checkin}
            />
          )}
          {tab === "messages" && (
            <Messages businessId={businessId} tz={biz.timezone} bizName={biz.name} selected={sp.c} error={sp.error} />
          )}
          {tab === "team" && (
            <Team businessId={businessId} isOwner={myRole === "owner"} canManage={can("members.manage")} invited={sp.invited} />
          )}
          {tab === "products" && (
            <Products businessId={businessId} canWrite={can("catalogue.write")} enabled={caps.includes("catalogue")} currency={biz.currency} />
          )}
          {tab === "payments" && (
            <Payments biz={biz} canManage={can("business.manage")} canBilling={can("billing.manage")} payout={sp.payout} />
          )}
          {tab === "billing" && <Billing biz={biz} canBilling={can("billing.manage")} />}
        </main>
      </div>
    </div>
  );
}

async function Overview({
  biz,
  canManage,
  planKey,
}: {
  biz: { id: string; name: string; status: string; acceptsAutomatic: boolean; allowsTransfer: boolean; refundPolicy: Parameters<typeof describePolicy>[0] };
  canManage: boolean;
  planKey: string;
}) {
  const d = deps();
  const [orders, products, trial] = await Promise.all([
    d.store.listOrders(biz.id, 50, 0).catch(() => []),
    d.store.listProducts(biz.id, ["active"], 100, 0).catch(() => []),
    d.store.trialForBusiness(biz.id).catch(() => null),
  ]);

  const totalSalesMinor = orders.reduce((sum, o) => (o.status === "paid" || o.status === "completed" ? sum + o.totalMinor : sum), 0n);
  const now = Date.now();
  const tState = trialState(trial, now);

  const hasPayments = biz.acceptsAutomatic || biz.allowsTransfer;
  const hasProducts = products.length > 0;
  const isLive = biz.status === "active";

  const recentOrders = orders.slice(0, 5);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* 4 Metric Cards Grid matching Screenshot 4 */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}>
        {/* Card 1: Today's sales */}
        <div style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>Today&apos;s sales</span>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--coral-soft)", color: "var(--coral-dark)", display: "grid", placeItems: "center" }}>
              <IconCreditCard size={16} />
            </div>
          </div>
          <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 26, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.5px" }}>
            {fmtMoney(totalSalesMinor, "NGN")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
            <IconTrendingUp size={14} />
            <span>↑ Recorded sales</span>
          </div>
        </div>

        {/* Card 2: Orders to fulfil */}
        <div style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>Orders to fulfil</span>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#eff6ff", color: "#2563eb", display: "grid", placeItems: "center" }}>
              <IconReceipt size={16} />
            </div>
          </div>
          <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 26, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.5px" }}>
            {orders.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
            {orders.filter((o) => o.status === "paid").length} fulfilled • {orders.filter((o) => o.status === "awaiting_payment").length} awaiting
          </div>
        </div>

        {/* Card 3: Products in stock */}
        <div style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>Products in stock</span>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f0fdf4", color: "#16a34a", display: "grid", placeItems: "center" }}>
              <IconPackage size={16} />
            </div>
          </div>
          <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 26, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.5px" }}>
            {products.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
            Live in store catalogue
          </div>
        </div>

        {/* Card 4: 30-Day Trial Status */}
        <div style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>30-Day Free Trial</span>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#faf5ff", color: "#9333ea", display: "grid", placeItems: "center" }}>
              <IconSparkles size={16} />
            </div>
          </div>
          <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 26, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.5px" }}>
            {tState.status === "active" ? `${tState.daysLeft} days` : "Active"}
          </div>
          <div style={{ fontSize: 12, color: "var(--coral-dark)", fontWeight: 600 }}>
            {tState.status === "active" ? "Full access included" : "Business Plan"}
          </div>
        </div>
      </section>

      {/* Two-Column Dashboard Overview Section matching Screenshot 4 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: 20,
      }}>
        {/* Left Column: Sales Overview with SVG Wave Chart */}
        <div style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <strong style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>Sales overview</strong>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>Keep an eye on your business performance.</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", padding: "4px 8px", background: "var(--canvas)", borderRadius: 8, border: "1px solid var(--line)" }}>
                This week
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
              <span style={{ fontFamily: "Manrope, sans-serif", fontSize: 32, fontWeight: 800, color: "var(--ink)" }}>
                {fmtMoney(totalSalesMinor, "NGN")}
              </span>
              <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}>
                ↑ 100%
              </span>
            </div>
          </div>

          {/* Clean SVG Trend Chart */}
          <div style={{ width: "100%", height: 120, position: "relative" }}>
            <svg viewBox="0 0 400 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--coral)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--coral)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M0,80 Q50,40 100,60 T200,30 T300,50 T400,20 L400,100 L0,100 Z"
                fill="url(#chartGradient)"
              />
              <path
                d="M0,80 Q50,40 100,60 T200,30 T300,50 T400,20"
                fill="none"
                stroke="var(--coral)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Right Column: Recent Orders matching Screenshot 4 */}
        <div style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <strong style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>Recent orders</strong>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>What needs your attention.</p>
            </div>
            <Link href={`/app/${biz.id}?tab=orders`} style={{ fontSize: 12, fontWeight: 700, color: "var(--coral-dark)", textDecoration: "none" }}>
              View all ↗
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 12px", color: "var(--muted)", fontSize: 13 }}>
              No orders placed yet. Share your storefront link or ring up a counter sale!
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {recentOrders.map((ord) => {
                const customerInit = (ord.guest?.name || "Customer").charAt(0).toUpperCase();
                return (
                  <div
                    key={ord.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "var(--canvas)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: "var(--surface)",
                        color: "var(--ink)",
                        fontWeight: 700,
                        fontSize: 12,
                        display: "grid",
                        placeItems: "center",
                      }}>
                        {customerInit}
                      </div>
                      <div>
                        <strong style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>
                          #FL-{ord.id.slice(0, 4).toUpperCase()} • {ord.guest?.name || "Customer"}
                        </strong>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          {ord.status}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>
                      {fmtMoney(ord.totalMinor, ord.currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Setup Checklist Banner if not fully live */}
      {!isLive && (
        <section className="banner-panel" id="setupBanner">
          <div>
            <b>Get your workspace ready for your first customer</b>
            <p>Complete these 3 simple steps to launch your public store and take payments.</p>
          </div>
          <div className="setup-steps">
            <Link href={`/app/${biz.id}?tab=products`} className="setup-pill" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="pill-badge">{hasProducts ? "✓" : "1"}</span>
              Add first product {hasProducts ? "(Done)" : ""}
            </Link>
            <Link href={`/app/${biz.id}?tab=payments`} className="setup-pill" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="pill-badge">{hasPayments ? "✓" : "2"}</span>
              Set up payments {hasPayments ? "(Done)" : ""}
            </Link>
            <span className="setup-pill">
              <span className="pill-badge">3</span>
              Publish storefront
            </span>
          </div>
        </section>
      )}

      {/* Store Identity & Policy */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}>
        <span className="section-kicker">STORE IDENTITY</span>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: "4px 0 16px" }}>
          Storefront Logo &amp; Details
        </h2>
        {canManage && (
          <div style={{ marginBottom: 16 }}>
            <ImageUpload businessId={biz.id} target={{ kind: "business" }} label="Upload or Change Logo" />
          </div>
        )}
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--ink)", display: "block", marginBottom: 2 }}>Customer Refund Policy:</strong>
          {describePolicy(biz.refundPolicy)}
        </div>

        {biz.status === "draft" && canManage && (
          <form action={A.publishAction} style={{ marginTop: 20 }}>
            {H(biz.id)}
            <button className="primary-button" type="submit" style={{ width: "fit-content", padding: "10px 24px" }}>
              Publish Storefront Now <span>↗</span>
            </button>
            <p style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 0" }}>
              Publishing starts your free 30 days with every business feature unlocked.
            </p>
          </form>
        )}
      </div>

      {/* Quick Operations Card */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}>
        <span className="section-kicker">SHORTCUTS</span>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: "4px 0 16px" }}>
          Quick Workspace Actions
        </h2>
        <div style={{ display: "grid", gap: 10 }}>
          <Link
            href={`/app/${biz.id}?tab=products`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid var(--line)",
              textDecoration: "none",
              color: "inherit",
              background: "var(--canvas)",
            }}
          >
            <div>
              <strong style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>Manage Catalogue Items</strong>
              <small style={{ color: "var(--muted)", fontSize: 11 }}>Add products, adjust stock quantities, and update prices</small>
            </div>
            <span style={{ color: "var(--coral-dark)", fontWeight: 700 }}>↗</span>
          </Link>

            <Link
              href={`/app/${biz.id}?tab=team`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid var(--line)",
                textDecoration: "none",
                color: "inherit",
                background: "var(--canvas)",
              }}
            >
              <div>
                <strong style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>Invite Staff Members</strong>
                <small style={{ color: "var(--muted)", fontSize: 11 }}>Grant cashier, kitchen, or manager permissions</small>
              </div>
              <span style={{ color: "var(--coral-dark)", fontWeight: 700 }}>↗</span>
            </Link>
          </div>
        </div>
      </div>
  );
}

async function Orders({
  businessId,
  canWrite,
  canRefund,
}: {
  businessId: string;
  canWrite: boolean;
  canRefund: boolean;
}) {
  const d = deps();
  const orders = await d.store.listOrders(businessId, 30, 0);
  const refunds = await d.store.listRefundRequests(businessId, "requested");
  const rows = await Promise.all(
    orders.map(async (o) => ({
      o,
      p: await d.store.getPaymentForOrder(businessId, o.id),
      escrow: await d.store.getEscrowRecord(o.id),
    }))
  );

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Refunds waiting action */}
      {refunds.length > 0 && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 20,
          padding: 20,
        }}>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 17, fontWeight: 800, color: "#991b1b", margin: "0 0 12px" }}>
            Refunds Waiting For Resolution ({refunds.length})
          </h2>
          {refunds.map((r) => (
            <div key={r.id} style={{ background: "#ffffff", padding: 16, borderRadius: 14, border: "1px solid #fecaca", marginBottom: 10 }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--ink)" }}>
                <strong>{fmtMoney(r.amountMinor, r.currency)}</strong> requested by customer under refund policy.
              </p>
              {canRefund && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <form action={A.resolveRefundAction}>
                    {H(businessId)}
                    <input type="hidden" name="refundId" value={r.id} />
                    <input type="hidden" name="outcome" value="refunded" />
                    <button className="primary-button" style={{ fontSize: 12, padding: "8px 14px" }} type="submit">
                      Confirm Refund Sent
                    </button>
                  </form>
                  <form action={A.resolveRefundAction} style={{ display: "flex", gap: 6 }}>
                    {H(businessId)}
                    <input type="hidden" name="refundId" value={r.id} />
                    <input type="hidden" name="outcome" value="declined" />
                    <input
                      name="reason"
                      placeholder="Reason for declining"
                      required
                      minLength={5}
                      style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12 }}
                    />
                    <button className="secondary-button" style={{ color: "#dc2626", borderColor: "#fca5a5", fontSize: 12, padding: "8px 14px" }} type="submit">
                      Decline
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Orders Table Panel */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <span className="section-kicker">ORDER MANAGEMENT</span>
            <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 800, margin: "2px 0 0" }}>
              Recent Orders &amp; Escrow Handoffs
            </h2>
          </div>
          <span className="delivery-tag">{rows.length} total</span>
        </div>

        {rows.length === 0 ? (
          <div className="empty-dashboard" style={{ padding: "36px 10px" }}>
            <span>▤</span>
            <b>No orders received yet</b>
            <p>Share your storefront URL on WhatsApp or social media to begin taking orders.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--canvas)", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>
                  <th style={{ padding: "12px 14px", borderRadius: "10px 0 0 10px" }}>CUSTOMER</th>
                  <th style={{ padding: "12px 14px" }}>TOTAL</th>
                  <th style={{ padding: "12px 14px" }}>STATUS</th>
                  <th style={{ padding: "12px 14px" }}>PAYMENT &amp; ESCROW</th>
                  <th style={{ padding: "12px 14px", borderRadius: "0 10px 10px 0" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ o, p, escrow }) => (
                  <tr key={o.id} style={{ borderBottom: "1px solid #f0f1f1" }}>
                    <td style={{ padding: "14px" }}>
                      <strong style={{ display: "block", color: "var(--ink)" }}>{o.guest?.name ?? "Customer Account"}</strong>
                      {o.note && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Note: {o.note}</div>}
                      <Link
                        href={`/receipt/${o.id}?b=${businessId}`}
                        style={{ fontSize: 11, color: "var(--coral-dark)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3, marginTop: 4 }}
                        target="_blank"
                      >
                        <IconReceipt size={11} /> Receipt ↗
                      </Link>
                    </td>
                    <td style={{ padding: "14px", fontFamily: "Manrope, sans-serif", fontWeight: 800 }}>
                      {fmtMoney(o.totalMinor, o.currency)}
                    </td>
                    <td style={{ padding: "14px" }}>
                      <span className="open-badge" style={{ position: "static", textTransform: "capitalize" }}>
                        {o.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>
                        {p?.method === "bank_transfer" ? `Transfer (${p.status.replace("_", " ")})` : `Online (${p?.status ?? "none"})`}
                      </div>
                      {escrow && (
                        <div style={{ marginTop: 4 }}>
                          {escrow.status === "held" ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                              <IconShield size={10} /> Escrow Held (PIN required)
                            </span>
                          ) : escrow.status === "released" ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#edf6f0", color: "var(--green)", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                              <IconCheck size={10} /> Escrow Released
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fee2e2", color: "#dc2626", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                              <IconAlertTriangle size={10} /> {escrow.status}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px" }}>
                      {canWrite && p?.method === "bank_transfer" && (p.status === "awaiting_confirmation" || p.status === "created") && o.status === "awaiting_payment" && (
                        <form action={A.confirmOrderTransferAction} style={{ marginBottom: 6 }}>
                          {H(businessId)}
                          <input type="hidden" name="orderId" value={o.id} />
                          <button className="primary-button" style={{ padding: "6px 12px", fontSize: 11 }} type="submit">
                            Confirm Transfer Received
                          </button>
                        </form>
                      )}
                      {canWrite && escrow && escrow.status === "held" && (
                        <form action={A.releaseEscrowWithPinAction} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input type="hidden" name="orderId" value={o.id} />
                          <input type="hidden" name="back" value={`/app/${businessId}?tab=orders`} />
                          <input
                            name="pin"
                            maxLength={4}
                            pattern="[0-9]{4}"
                            placeholder="PIN"
                            style={{ width: 64, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12, textAlign: "center" }}
                            required
                          />
                          <button className="primary-button" style={{ padding: "6px 12px", fontSize: 11 }} type="submit">
                            Release
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

async function Products({
  businessId,
  canWrite,
  enabled,
  currency,
}: {
  businessId: string;
  canWrite: boolean;
  enabled: boolean;
  currency: string;
}) {
  if (!enabled) return <p className="notice">Catalogue is not enabled for this business.</p>;
  const d = deps();
  const list = await d.store.listProducts(businessId, ["draft", "active", "paused"], 100, 0);
  const { entitlements } = await resolveEntitlements(d, businessId, PLAN_ENTITLEMENTS);
  const used = await d.store.countProducts(businessId, ["active"]);
  const limit = entitlements["listings"];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Add Item Form */}
      {canWrite && (
        <div style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}>
          <span className="section-kicker">NEW ITEM</span>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: "2px 0 16px" }}>
            Add Product or Service to Catalogue
          </h2>

          <form action={A.createProductAction} style={{ display: "grid", gap: 14, maxWidth: 600 }}>
            {H(businessId)}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                Item Name
                <input
                  id="pname"
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="e.g. Special Jollof Rice, Clean Fade Haircut"
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }}
                />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                Price ({currency})
                <input
                  id="price"
                  name="price"
                  inputMode="decimal"
                  pattern="[0-9]+(\.[0-9]{1,2})?"
                  required
                  placeholder="2500"
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                Original / Compare Price ({currency}) (Optional)
                <input
                  id="compareAtPrice"
                  name="compareAtPrice"
                  inputMode="decimal"
                  placeholder="e.g. 3500 (shows strikethrough discount)"
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }}
                />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                Promotional Badge (Optional)
                <input
                  id="promoBadge"
                  name="promoBadge"
                  placeholder="e.g. Black Friday, Birthday Promo, 20% OFF"
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                Fulfilment Mode
                <select id="fulfilment" name="fulfilment" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13, background: "#ffffff" }}>
                  <option value="stock">Ready in stock / immediate</option>
                  <option value="made_to_order">Made to order (requires prep time)</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                Preparation Notice (Hours)
                <input id="lead" name="leadTimeHours" type="number" min={0} defaultValue={0} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }} />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
              Stock Quantity (Leave blank if unlimited or service)
              <input id="stock" name="stock" type="number" min={0} placeholder="e.g. 25" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }} />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
              Description (optional)
              <textarea id="desc" name="description" maxLength={2000} rows={2} placeholder="Ingredients, features, package inclusions" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13, resize: "vertical" }} />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" name="publish" defaultChecked style={{ accentColor: "var(--coral)", width: 16, height: 16 }} />
              <span>Publish and make visible on public storefront immediately</span>
            </label>

            <SubmitButton loadingText="Adding Item..." style={{ width: "fit-content", padding: "10px 20px" }}>
              Add to Catalogue <span>↗</span>
            </SubmitButton>
          </form>
        </div>
      )}

      {/* Catalogue List Table */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <span className="section-kicker">CATALOGUE LIST</span>
            <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 800, margin: "2px 0 0" }}>
              All Products &amp; Services
            </h2>
          </div>
          <span className="delivery-tag">
            {used} live {typeof limit === "number" ? `of ${limit} on plan` : ""}
          </span>
        </div>

        {list.length === 0 ? (
          <div className="empty-dashboard" style={{ padding: "36px 10px" }}>
            <span>▦</span>
            <b>Your catalogue is empty</b>
            <p>Add your dishes, retail products, or services above to begin taking orders.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--canvas)", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>
                  <th style={{ padding: "12px 14px", borderRadius: "10px 0 0 10px" }}>ITEM</th>
                  <th style={{ padding: "12px 14px" }}>PRICE</th>
                  <th style={{ padding: "12px 14px" }}>STOCK</th>
                  <th style={{ padding: "12px 14px" }}>STATUS</th>
                  <th style={{ padding: "12px 14px", borderRadius: "0 10px 10px 0" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const thumb = photo(businessId, p.imageAssetId, "thumb");
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f0f1f1" }}>
                      <td style={{ padding: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {thumb ? (
                            <img src={thumb} alt="" width={48} height={48} style={{ borderRadius: 10, objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--canvas)", display: "grid", placeItems: "center", fontSize: 14, color: "var(--muted)" }}>
                              ▦
                            </div>
                          )}
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <strong style={{ color: "var(--ink)" }}>{p.name}</strong>
                              {p.promoBadge && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "var(--coral-soft)", color: "var(--coral-dark)" }}>
                                  {p.promoBadge}
                                </span>
                              )}
                            </div>
                            {canWrite && (
                              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <ImageUpload businessId={businessId} target={{ kind: "product", id: p.id }} label="+ Add Photo" />
                                {p.galleryAssetIds && p.galleryAssetIds.length > 1 && (
                                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                                    {p.galleryAssetIds.length} photos
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px", fontFamily: "Manrope, sans-serif" }}>
                        <div style={{ fontWeight: 800 }}>{fmtMoney(p.priceMinor, p.currency)}</div>
                        {p.compareAtPriceMinor && (
                          <div style={{ fontSize: 11, color: "var(--muted)", textDecoration: "line-through" }}>
                            {fmtMoney(p.compareAtPriceMinor, p.currency)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "14px" }}>
                        {p.stockQuantity == null ? (
                          <span style={{ color: "var(--muted)" }}>Unlimited</span>
                        ) : p.stockQuantity === 0 ? (
                          <span className="open-badge" style={{ position: "static", background: "#fee2e2", color: "#dc2626" }}>Sold out</span>
                        ) : p.stockQuantity <= 3 ? (
                          <span className="open-badge" style={{ position: "static", background: "#fef3c7", color: "#92400e" }}>{p.stockQuantity} left</span>
                        ) : (
                          <span>{p.stockQuantity}</span>
                        )}
                      </td>
                      <td style={{ padding: "14px" }}>
                        <span className="open-badge" style={{ position: "static", textTransform: "capitalize", background: p.status === "active" ? "#edf6f0" : "#fef3c7", color: p.status === "active" ? "var(--green)" : "#92400e" }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px" }}>
                        {canWrite && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <form action={A.setProductStatusAction}>
                              {H(businessId)}
                              <input type="hidden" name="productId" value={p.id} />
                              <input type="hidden" name="status" value={p.status === "active" ? "paused" : "active"} />
                              <button className="secondary-button" style={{ padding: "6px 12px", fontSize: 11 }} type="submit">
                                {p.status === "active" ? "Pause" : "Make Live"}
                              </button>
                            </form>
                            <form action={A.setProductStatusAction}>
                              {H(businessId)}
                              <input type="hidden" name="productId" value={p.id} />
                              <input type="hidden" name="status" value="archived" />
                              <button
                                className="secondary-button"
                                style={{ padding: "6px 12px", fontSize: 11, color: "var(--error)" }}
                                type="submit"
                                title="Delete item"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

async function Bookings({
  businessId,
  tz,
  canManage,
  enabled,
  currency,
}: {
  businessId: string;
  tz: string;
  canManage: boolean;
  enabled: boolean;
  currency: string;
}) {
  if (!enabled) return <p className="notice">Bookings are not enabled for this business.</p>;
  const d = deps();
  const now = Date.now();
  const list = await d.store.listBookings(businessId, now - 86_400_000, now + 60 * 86_400_000);
  const rows = await Promise.all(
    list.map(async (b) => ({
      b,
      p: await d.store.getPaymentForOrder(businessId, b.id),
      g: await d.store.getResourceGroup(businessId, b.groupId),
    }))
  );
  const groups = await d.store.listResourceGroups(businessId);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Bookable Units Form */}
      {canManage && (
        <div style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}>
          <span className="section-kicker">NEW BOOKABLE RESOURCE</span>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: "2px 0 16px" }}>
            Add Bookable Resource or Appointment Slot
          </h2>

          <form action={A.createResourceGroupAction} style={{ display: "grid", gap: 14, maxWidth: 600 }}>
            {H(businessId)}
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
              Resource Name
              <input
                id="gname"
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="e.g. Deluxe Room, Barber Chair 1, Football Pitch"
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                Booking Type
                <select id="kind" name="kind" defaultValue="time_block" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13, background: "#ffffff" }}>
                  <option value="time_block">Hourly / Time blocks</option>
                  <option value="nights">Nightly (Hotels &amp; Stays)</option>
                  <option value="rental_period">Daily rental period</option>
                  <option value="bed">Per bed (Hostels)</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                Rate ({currency})
                <input
                  id="gprice"
                  name="price"
                  inputMode="decimal"
                  pattern="[0-9]+(\.[0-9]{1,2})?"
                  required
                  placeholder="5000"
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
              Units / Room Identifiers (one per line)
              <textarea id="units" name="units" rows={2} required placeholder="Room 101&#10;Room 102&#10;Room 103" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }} />
            </label>

            <button className="primary-button" type="submit" style={{ width: "fit-content", padding: "10px 20px" }}>
              Add Resource <span>↗</span>
            </button>
          </form>
        </div>
      )}

      {/* Bookings Table */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <span className="section-kicker">APPOINTMENTS &amp; STAYS</span>
            <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 800, margin: "2px 0 0" }}>
              Upcoming Schedule
            </h2>
          </div>
          <span className="delivery-tag">{rows.length} scheduled</span>
        </div>

        {rows.length === 0 ? (
          <div className="empty-dashboard" style={{ padding: "36px 10px" }}>
            <span>▧</span>
            <b>No bookings in the next 60 days</b>
            <p>Customers can book available appointment windows directly from your public page.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--canvas)", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>
                  <th style={{ padding: "12px 14px", borderRadius: "10px 0 0 10px" }}>WHEN</th>
                  <th style={{ padding: "12px 14px" }}>RESOURCE</th>
                  <th style={{ padding: "12px 14px" }}>CUSTOMER</th>
                  <th style={{ padding: "12px 14px" }}>STATUS</th>
                  <th style={{ padding: "12px 14px", borderRadius: "0 10px 10px 0" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ b, p, g }) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #f0f1f1" }}>
                    <td style={{ padding: "14px" }}>{fmtLocal(b.startMs, tz)}</td>
                    <td style={{ padding: "14px", fontWeight: 700 }}>{g?.name ?? "Resource"}</td>
                    <td style={{ padding: "14px" }}>{b.guest?.name ?? "Customer Account"}</td>
                    <td style={{ padding: "14px" }}>
                      <span className="open-badge" style={{ position: "static", textTransform: "capitalize" }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {canManage && b.status === "held" && p?.method === "bank_transfer" && (
                          <form action={A.confirmBookingTransferAction}>
                            {H(businessId)}
                            <input type="hidden" name="bookingId" value={b.id} />
                            <button className="primary-button" style={{ padding: "6px 10px", fontSize: 11 }} type="submit">
                              Confirm Transfer
                            </button>
                          </form>
                        )}
                        {canManage && (b.status === "held" || b.status === "confirmed") && (
                          <form action={A.cancelBookingAsBusinessAction}>
                            {H(businessId)}
                            <input type="hidden" name="bookingId" value={b.id} />
                            <button className="secondary-button" style={{ color: "#dc2626", borderColor: "#fca5a5", padding: "6px 10px", fontSize: 11 }} type="submit">
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

async function Events({
  businessId,
  tz,
  canManage,
  canCheckIn,
  enabled,
  checkin,
}: {
  businessId: string;
  tz: string;
  canManage: boolean;
  canCheckIn: boolean;
  enabled: boolean;
  checkin: string | undefined;
}) {
  if (!enabled) return <p className="notice">Events are not enabled for this business.</p>;
  const d = deps();
  const events = await d.store.listEvents(businessId, 50);
  const rows = await Promise.all(
    events.map(async (e) => {
      const types = await d.store.listTicketTypes(businessId, e.id);
      return {
        e,
        types: await Promise.all(
          types.map(async (t) => ({ t, sold: await d.store.countLiveTickets(businessId, t.id, Date.now()) }))
        ),
      };
    })
  );

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {canManage && (
        <div style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}>
          <span className="section-kicker">NEW EVENT</span>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: "2px 0 16px" }}>
            Create Ticketed Event
          </h2>
          <form action={A.createEventAction} style={{ display: "grid", gap: 14, maxWidth: 600 }}>
            {H(businessId)}
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
              Event Title
              <input id="en" name="name" required minLength={2} maxLength={120} placeholder="e.g. Campus Music Fest 2026" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
              Venue Location
              <input id="ev" name="venue" maxLength={200} placeholder="e.g. Convocation Arena, Abakaliki" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                Start Date &amp; Time
                <input id="es" name="start" type="datetime-local" required style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                End Date &amp; Time
                <input id="ee" name="end" type="datetime-local" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }} />
              </label>
            </div>
            <button className="primary-button" type="submit" style={{ width: "fit-content", padding: "10px 20px" }}>
              Create Event <span>↗</span>
            </button>
          </form>
        </div>
      )}

      {/* Events List */}
      <div style={{ display: "grid", gap: 16 }}>
        {rows.map(({ e, types }) => (
          <div key={e.id} style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>{e.name}</h3>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                  {fmtLocal(e.startsAtMs, tz)} • <span className="open-badge" style={{ position: "static", textTransform: "capitalize" }}>{e.status}</span>
                </p>
              </div>
              {e.status === "published" && (
                <Link href={resourcePath("e", e.name, e.shortId)} className="secondary-button" style={{ fontSize: 12, padding: "8px 14px" }} target="_blank">
                  View Public Ticket Page ↗
                </Link>
              )}
            </div>

            {types.length > 0 && (
              <div style={{ margin: "16px 0", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                {types.map(({ t, sold }) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                    <span style={{ color: "var(--muted)" }}>{t.priceMinor === 0n ? "Free" : fmtMoney(t.priceMinor, t.currency)} • {sold} / {t.capacity} sold</span>
                  </div>
                ))}
              </div>
            )}

            {canManage && (e.status === "draft" || e.status === "published") && (
              <form action={A.addTicketTypeAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {H(businessId)}
                <input type="hidden" name="eventId" value={e.id} />
                <input name="name" placeholder="Tier Name (e.g. VIP)" required style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12, flex: 1 }} />
                <input name="price" placeholder="Price (0 = free)" inputMode="decimal" required style={{ width: 110, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12 }} />
                <input name="capacity" type="number" min={1} placeholder="Capacity" required style={{ width: 90, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12 }} />
                <button className="primary-button" type="submit" style={{ fontSize: 12, padding: "8px 14px" }}>
                  Add Ticket Tier
                </button>
              </form>
            )}

            {canCheckIn && e.status === "published" && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <span className="section-kicker">GATE CHECK-IN SCANNER</span>
                <form action={A.checkInAction} style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {H(businessId)}
                  <input type="hidden" name="eventId" value={e.id} />
                  <input id={`code-${e.id}`} name="token" autoComplete="off" placeholder="Scan or enter ticket token" required style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }} />
                  <button className="primary-button" type="submit" style={{ padding: "10px 18px", fontSize: 13 }}>
                    Admit Guest ↗
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

async function Messages({
  businessId,
  tz,
  bizName,
  selected,
  error,
}: {
  businessId: string;
  tz: string;
  bizName: string;
  selected: string | undefined;
  error: string | undefined;
}) {
  const d = deps();
  const user = await requireUser(`/app/${businessId}?tab=messages`);
  const rows = await d.store.listConversationsForBusiness(businessId, 50);
  const names = new Map<string, string>();
  for (const c of rows) {
    names.set(c.customerUserId, (await d.store.getUserContact(c.customerUserId))?.name ?? "Customer");
  }
  let thread: { messages: Awaited<ReturnType<typeof readConversation>>["messages"]; customer: string } | null = null;
  const sel = rows.find((c) => c.id === selected);
  if (sel) {
    try {
      thread = {
        messages: (await readConversation(d, { kind: "business", userId: user.id }, businessId, sel.id)).messages,
        customer: names.get(sel.customerUserId) ?? "Customer",
      };
    } catch {
      thread = null;
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}>
        <span className="section-kicker">CUSTOMER CONVERSATIONS</span>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 800, margin: "2px 0 16px" }}>
          Inquiries &amp; Customer Messages
        </h2>

        {rows.length === 0 ? (
          <div className="empty-dashboard" style={{ padding: "36px 10px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><IconMessageSquare size={24} /></span>
            <b>No customer messages yet</b>
            <p>Customers can initiate private inquiries directly from your public storefront.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((c) => (
              <Link
                key={c.id}
                href={`/app/${businessId}?tab=messages&c=${c.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  borderRadius: 14,
                  border: "1px solid var(--line)",
                  textDecoration: "none",
                  color: "inherit",
                  background: c.id === selected ? "var(--coral-soft)" : "var(--canvas)",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: 14, color: "var(--ink)" }}>{names.get(c.customerUserId)}</strong>
                  <small style={{ color: "var(--muted)", fontSize: 11 }}>{fmtLocal(c.lastMessageAtMs, tz)}</small>
                </div>
                {c.businessUnread > 0 ? (
                  <span className="open-badge" style={{ position: "static", background: "var(--coral)" }}>
                    {c.businessUnread} new
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--coral-dark)", fontWeight: 700 }}>Open thread →</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {sel && thread && (
        <div>
          <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>
            Conversation with {thread.customer}
          </h3>
          <Thread
            messages={thread.messages}
            viewer="business"
            businessId={businessId}
            conversationId={sel.id}
            tz={tz}
            names={{ customer: thread.customer, business: bizName }}
          />
        </div>
      )}
    </div>
  );
}

async function Team({
  businessId,
  isOwner,
  canManage,
  invited,
}: {
  businessId: string;
  isOwner: boolean;
  canManage: boolean;
  invited: string | undefined;
}) {
  const d = deps();
  const members = (await d.store.membershipsForBusiness(businessId)).filter((m) => m.status === "active");
  const people = await Promise.all(members.map(async (m) => ({ m, c: await d.store.getUserContact(m.userId) })));
  const { entitlements } = await resolveEntitlements(d, businessId, PLAN_ENTITLEMENTS);
  const seats = entitlements["staff_seats"];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Invite Member Form */}
      {canManage && (
        <div style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}>
          <span className="section-kicker">STAFF ACCESS</span>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: "2px 0 16px" }}>
            Invite Team Member
          </h2>
          {invited && (
            <div style={{ padding: "10px 14px", background: "#edf6f0", borderRadius: 10, color: "var(--green)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              ✓ Invitation sent to {invited}. Valid for 7 days.
            </div>
          )}
          <form action={A.inviteMemberAction} style={{ display: "grid", gap: 14, maxWidth: 500 }}>
            {H(businessId)}
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
              Email Address
              <input id="iemail" name="email" type="email" required placeholder="staff@example.com" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
              Assigned Role
              <select id="irole" name="role" defaultValue="staff" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13, background: "#ffffff" }}>
                <option value="cashier">Cashier — Ring up counter sales &amp; see orders</option>
                <option value="staff">Staff — Fulfil orders, manage bookings, check-in guests</option>
                <option value="manager">Manager — Also manage items, events, and approve refunds</option>
                {isOwner && <option value="admin">Admin — Full control (except billing and payouts)</option>}
              </select>
            </label>
            <button className="primary-button" type="submit" style={{ width: "fit-content", padding: "10px 20px" }}>
              Send Invitation <span>↗</span>
            </button>
          </form>
        </div>
      )}

      {/* Team Roster */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <span className="section-kicker">TEAM ROSTER</span>
            <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 800, margin: "2px 0 0" }}>
              Active Staff &amp; Collaborators
            </h2>
          </div>
          <span className="delivery-tag">
            {members.length} {typeof seats === "number" ? `of ${seats} seats` : "members"}
          </span>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {people.map(({ m, c }) => (
            <div
              key={m.userId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderRadius: 14,
                border: "1px solid var(--line)",
                background: "var(--canvas)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--coral-soft)",
                  color: "var(--coral-dark)",
                  fontWeight: 800,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 14,
                }}>
                  {(c?.name ?? "T").charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>{c?.name ?? "Team member"}</strong>
                  <small style={{ color: "var(--muted)", fontSize: 11 }}>{c?.email}</small>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="open-badge" style={{ position: "static", textTransform: "capitalize" }}>
                  {m.role}
                </span>
                {canManage && m.role !== "owner" && (isOwner || m.role !== "admin") && (
                  <form action={A.removeMemberAction}>
                    {H(businessId)}
                    <input type="hidden" name="userId" value={m.userId} />
                    <button className="secondary-button" style={{ color: "#dc2626", borderColor: "#fca5a5", padding: "6px 12px", fontSize: 11 }} type="submit">
                      Remove
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function Payments({
  biz,
  canManage,
  canBilling,
  payout,
}: {
  biz: { id: string; acceptsAutomatic: boolean; allowsTransfer: boolean };
  canManage: boolean;
  canBilling: boolean;
  payout: string | undefined;
}) {
  const d = deps();
  const [po, ta] = await Promise.all([d.store.getPayoutAccount(biz.id), d.store.getTransferAccount(biz.id)]);
  let banks: { name: string; code: string }[] = [];
  try {
    banks = await listPaystackBanks({ secretKey: env().PAYSTACK_SECRET_KEY });
  } catch {
    banks = [];
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Payment Modes Selector */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}>
        <span className="section-kicker">CHECKOUT CHANNELS</span>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: "2px 0 16px" }}>
          How Customers Can Pay You
        </h2>

        {canManage && (
          <form action={A.setModesAction} style={{ display: "grid", gap: 12, maxWidth: 540 }}>
            {H(biz.id)}
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px",
              borderRadius: 14,
              border: "1px solid var(--line)",
              cursor: "pointer",
            }}>
              <input
                type="checkbox"
                name="automatic"
                defaultChecked={biz.acceptsAutomatic}
                style={{ accentColor: "var(--coral)", width: 18, height: 18 }}
              />
              <div>
                <strong style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>Automatic Online Payments (Card &amp; Bank)</strong>
                <small style={{ color: "var(--muted)", fontSize: 11 }}>Instant settlement to your bank via Paystack &amp; Fluo Escrow</small>
              </div>
            </label>

            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px",
              borderRadius: 14,
              border: "1px solid var(--line)",
              cursor: "pointer",
            }}>
              <input
                type="checkbox"
                name="manual"
                defaultChecked={biz.allowsTransfer}
                style={{ accentColor: "var(--coral)", width: 18, height: 18 }}
              />
              <div>
                <strong style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>Manual Direct Bank Transfer</strong>
                <small style={{ color: "var(--muted)", fontSize: 11 }}>Customer transfers from bank app and you confirm arrival</small>
              </div>
            </label>

            <button className="primary-button" type="submit" style={{ width: "fit-content", padding: "10px 20px" }}>
              Save Payment Settings <span>↗</span>
            </button>
          </form>
        )}
      </div>

      {/* Payout Bank Account Form */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}>
        <span className="section-kicker">SETTLEMENT ACCOUNT</span>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: "2px 0 16px" }}>
          Bank Account for Online Payouts
        </h2>

        {po ? (
          <div style={{ padding: "14px 18px", borderRadius: 14, background: "var(--canvas)", border: "1px solid var(--line)", marginBottom: 16 }}>
            <strong style={{ display: "block", fontSize: 14 }}>{po.accountName}</strong>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Account ending in ****{po.accountLast4}</span> •{" "}
            <span className="open-badge" style={{ position: "static", background: po.verified ? "#edf6f0" : "#fef3c7", color: po.verified ? "var(--green)" : "#92400e" }}>
              {po.verified ? "Verified" : "Under review"}
            </span>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>No payout account linked yet.</p>
        )}

        {canBilling ? (
          <form action={A.savePayoutAction} style={{ display: "grid", gap: 14, maxWidth: 540 }}>
            {H(biz.id)}
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
              Bank
              {banks.length > 0 ? (
                <select id="bankCode" name="bankCode" required defaultValue="" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13, background: "#ffffff" }}>
                  <option value="" disabled>Choose your bank</option>
                  {banks.map((b) => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              ) : (
                <input id="bankCode" name="bankCode" placeholder="Bank code" required style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }} />
              )}
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
              10-Digit NUBAN Account Number
              <input id="pnum" name="accountNumber" inputMode="numeric" pattern="[0-9]{10}" required placeholder="e.g. 0123456789" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
              Account Holder Full Name
              <input id="owner" name="ownerName" required placeholder="Must match bank records" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }} />
            </label>
            <button className="primary-button" type="submit" style={{ width: "fit-content", padding: "10px 20px" }}>
              Verify &amp; Link Account <span>↗</span>
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

async function Billing({
  biz,
  canBilling,
}: {
  biz: { id: string; currency: string; countryCode: string };
  canBilling: boolean;
}) {
  const d = deps();
  const now = Date.now();
  const [sub, trial] = await Promise.all([d.store.getSubscription(biz.id), d.store.trialForBusiness(biz.id)]);
  const state = trialState(trial, now);
  const plan = effectivePlanKey(paidPlanKey(sub, now), trial, now);
  const plans = [...new Set(PRICE_BOOK.filter((p) => p.currency === biz.currency).map((p) => p.planKey))];

  // 30-day cycle usage calculation
  const cycleStart = now - 30 * 24 * 60 * 60 * 1000;
  const completedCount = await d.store.countCompletedOrdersSince(biz.id, cycleStart).catch(() => 0);
  const usage = planUsageReport(plan, completedCount);
  const currentEnt = PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS["free"]!;
  const overageBps = typeof currentEnt["overage_fee_bps"] === "number" ? currentEnt["overage_fee_bps"] : 0;
  const currentOverageRate = overageBps > 0 ? `${(overageBps / 100).toFixed(2)}%` : "0%";

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* 30-Day Trial Status Banner */}
      <div style={{
        background: "var(--coral-soft)",
        border: "1.5px solid #fcdcd7",
        borderRadius: 24,
        padding: "24px 28px",
        boxShadow: "0 4px 20px rgba(240, 120, 102, 0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <span style={{
            background: "var(--coral)",
            color: "#ffffff",
            padding: "4px 10px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 800,
          }}>
            CURRENT PLAN: {plan.toUpperCase()}
          </span>
          {state.status === "active" && (
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--coral-dark)" }}>
              {state.daysLeft} days remaining on free trial
            </span>
          )}
        </div>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 800, margin: "0 0 6px", color: "var(--ink)" }}>
          {state.status === "active" ? "Your 30-Day Free Trial is Active" : "Active Subscription"}
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>
          {state.status === "active"
            ? "You have full access to Growth Plan features: 500 listings, 300 orders/mo included with 0% fees, POS register, and multi-staff roles."
            : "Your business is running on a live subscription. Modify or upgrade your plan anytime."}
        </p>
      </div>

      {/* Monthly Transaction Usage & Fee Status */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div>
            <span className="section-kicker">MONTHLY ORDER ALLOWANCE</span>
            <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: "2px 0 4px" }}>
              Completed Online Orders This Cycle
            </h3>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
              {usage.includedCount === "unlimited"
                ? "Unlimited online orders included with 0% Fluo platform fees."
                : `${completedCount} of ${usage.includedCount} included orders completed in the current 30-day billing cycle.`}
            </p>
          </div>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 12px",
            borderRadius: 10,
            background: usage.isOverAllowance ? "#fef2f2" : "#f0fdf4",
            color: usage.isOverAllowance ? "#991b1b" : "#16a34a",
            border: `1px solid ${usage.isOverAllowance ? "#fecaca" : "#bbf7d0"}`,
          }}>
            {usage.isOverAllowance
              ? `Overage active: ${currentOverageRate} per additional order (capped at ₦50 max)`
              : "0% Fluo Platform Fee Active (Within allowance)"}
          </span>
        </div>

        {usage.includedCount !== "unlimited" && (
          <div style={{ width: "100%", height: 8, background: "var(--surface)", borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
            <div style={{
              width: `${Math.min(100, usage.percentUsed)}%`,
              height: "100%",
              background: usage.isOverAllowance ? "#ef4444" : "var(--coral)",
              borderRadius: 4,
            }} />
          </div>
        )}
      </div>

      {/* Available Plans Grid */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}>
        <span className="section-kicker">AVAILABLE TIERS</span>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 800, margin: "2px 0 8px" }}>
          Choose a Plan for Growth
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px" }}>
          Every plan includes a generous monthly order allowance with 0% Fluo platform fees. Transaction fees apply only after the allowance is exceeded and are capped at a maximum of ₦50/order.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}>
          {plans.map((pk) => {
            const price = PRICE_BOOK.find(
              (p) => p.planKey === pk && p.currency === biz.currency && p.interval === "month" && !p.country
            );
            if (!price) return null;
            const isCurrent = pk === plan;
            return (
              <div
                key={pk}
                style={{
                  border: `1.5px solid ${isCurrent ? "var(--coral)" : "var(--line)"}`,
                  borderRadius: 18,
                  padding: 20,
                  background: isCurrent ? "var(--coral-soft)" : "var(--canvas)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h3 style={{ textTransform: "capitalize", fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>
                    {pk}
                  </h3>
                  <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>
                    {fmtMoney(price.amountMinor, biz.currency)} <small style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)" }}>/ mo</small>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.6 }}>
                    <strong style={{ display: "block", color: "var(--ink)", marginBottom: 2 }}>
                      {pk === "starter" && "100 orders included / mo (0% fee)"}
                      {pk === "growth" && "300 orders included / mo (0% fee)"}
                      {pk === "business" && "1,000 orders included / mo (0% fee)"}
                      {pk === "pro" && "Unlimited orders included (0% fee)"}
                    </strong>
                    <span style={{ display: "block", color: pk === "pro" ? "var(--green)" : "var(--coral-dark)", fontWeight: 600 }}>
                      {pk === "starter" && "After 100: 0.75% per order (cap ₦50)"}
                      {pk === "growth" && "After 300: 0.50% per order (cap ₦50)"}
                      {pk === "business" && "After 1,000: 0.25% per order (cap ₦50)"}
                      {pk === "pro" && "0% overage fee always (never charged)"}
                    </span>
                    <span style={{ display: "block", marginTop: 4 }}>
                      {pk === "starter" && "100 listings • 3 staff seats"}
                      {pk === "growth" && "500 listings • 6 staff seats"}
                      {pk === "business" && "Unlimited listings • 15 staff • Custom domain"}
                      {pk === "pro" && "Unlimited listings • 50 staff • Priority support"}
                    </span>
                  </div>
                </div>

                {canBilling && (
                  <form action={A.startSubscriptionAction}>
                    {H(biz.id)}
                    <input type="hidden" name="planKey" value={pk} />
                    <input type="hidden" name="interval" value="month" />
                    <button
                      className={isCurrent ? "secondary-button" : "primary-button"}
                      type="submit"
                      style={{ width: "100%", justifyContent: "center", fontSize: 12, padding: "10px 14px" }}
                    >
                      {isCurrent ? "Current Plan" : "Upgrade / Select"}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Fee Explainer Panel */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: 24,
      }}>
        <span className="section-kicker">TRANSPARENCY</span>
        <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 16, fontWeight: 800, margin: "2px 0 10px" }}>
          How Fluo Platform Fees Work
        </h3>
        <div style={{ display: "grid", gap: 10, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            • <strong style={{ color: "var(--ink)" }}>100% Free Within Allowance:</strong> Every plan includes a generous monthly volume of completed orders where Fluo charges 0% platform fee.
          </p>
          <p style={{ margin: 0 }}>
            • <strong style={{ color: "var(--ink)" }}>Hard ₦50 Maximum Cap:</strong> Once your business exceeds its monthly allowance, Fluo only charges a tiny percentage (0.25% – 0.75%) capped at a hard maximum of ₦50 per order. A ₦150,000 order will never pay more than ₦50.
          </p>
          <p style={{ margin: 0 }}>
            • <strong style={{ color: "var(--ink)" }}>No Penalty for Cash or Direct Transfers:</strong> Manual in-store bank transfers and counter cash sales are never metered or charged overage fees.
          </p>
          <p style={{ margin: 0 }}>
            • <strong style={{ color: "var(--ink)" }}>Pro Plan Has 0% Fees:</strong> Pro workspaces enjoy unlimited online orders with 0% transaction fees forever.
          </p>
        </div>
      </div>
    </div>
  );
}
