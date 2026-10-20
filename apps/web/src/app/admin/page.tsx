import Link from "next/link";
import { requirePlatformAdmin } from "@/server/session.ts";
import { getSuperAdminDashboardData } from "@/server/super-admin.ts";
import {
  IconShield,
  IconReceipt,
  IconStore,
  IconUsers,
  IconArrowRight,
  IconSparkles,
  IconCalendar,
  IconCheck,
  IconAlertTriangle,
} from "@/components/icons.tsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Founder Admin — Fluo Platform", robots: { index: false, follow: false } };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requirePlatformAdmin();
  const sp = await searchParams;
  const tab = sp.tab || "overview";
  const data = await getSuperAdminDashboardData();
  const m = data.metrics;

  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "28px 20px 100px" }}>
      {/* Platform Header */}
      <div style={{
        background: "linear-gradient(135deg, #172126 0%, #1e2c33 100%)",
        color: "#ffffff",
        borderRadius: 24,
        padding: "clamp(24px, 4vw, 36px)",
        marginBottom: 32,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 14px 40px rgba(23, 33, 38, 0.12)",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{
                background: "rgba(240, 120, 102, 0.2)",
                color: "#f07866",
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.5px",
                border: "1px solid rgba(240, 120, 102, 0.35)",
              }}>
                ⚡ FLUO FOUNDER PLATFORM
              </span>
              <span style={{ color: "#8da0a8", fontSize: 12 }}>
                Admin: {user.email}
              </span>
            </div>
            <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, margin: 0, letterSpacing: "-1px" }}>
              Fluo Marketplace Engine
            </h1>
            <p style={{ color: "#9db0b7", margin: "6px 0 0", fontSize: 14 }}>
              Real-time platform metrics, GMV, subscriptions, traffic geography, and merchant performance.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              href="/"
              className="primary-button"
              style={{
                background: "#ffffff",
                color: "var(--ink)",
                border: "none",
                fontWeight: 700,
              }}
            >
              Public Marketplace <span>↗</span>
            </Link>
          </div>
        </div>

        {/* High-Level KPI Strip */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 16,
          marginTop: 28,
          paddingTop: 24,
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        }}>
          <div>
            <span style={{ color: "#8da0a8", fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>PLATFORM GMV</span>
            <strong style={{ display: "block", fontSize: 24, fontWeight: 800, color: "#ffffff", marginTop: 4, fontFamily: "Manrope, sans-serif" }}>
              {m.totalGmvFormatted}
            </strong>
            <small style={{ color: "#4ade80", fontSize: 11, fontWeight: 600 }}>
              ✓ {m.paidOrders} paid orders
            </small>
          </div>

          <div>
            <span style={{ color: "#8da0a8", fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>FLUO NET REVENUE</span>
            <strong style={{ display: "block", fontSize: 24, fontWeight: 800, color: "#f07866", marginTop: 4, fontFamily: "Manrope, sans-serif" }}>
              {m.fluoTotalRevenueFormatted}
            </strong>
            <small style={{ color: "#9db0b7", fontSize: 11 }}>
              MRR: {m.subscriptionMrrFormatted}
            </small>
          </div>

          <div>
            <span style={{ color: "#8da0a8", fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>TOTAL REGISTERED USERS</span>
            <strong style={{ display: "block", fontSize: 24, fontWeight: 800, color: "#ffffff", marginTop: 4, fontFamily: "Manrope, sans-serif" }}>
              {m.totalUsers}
            </strong>
            <small style={{ color: "#4ade80", fontSize: 11, fontWeight: 600 }}>
              +{m.signups7d} past 7 days
            </small>
          </div>

          <div>
            <span style={{ color: "#8da0a8", fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>ACTIVE BUSINESSES</span>
            <strong style={{ display: "block", fontSize: 24, fontWeight: 800, color: "#ffffff", marginTop: 4, fontFamily: "Manrope, sans-serif" }}>
              {m.totalBusinesses}
            </strong>
            <small style={{ color: "#9db0b7", fontSize: 11 }}>
              {m.publishedBusinesses} published · {m.draftBusinesses} drafts
            </small>
          </div>

          <div>
            <span style={{ color: "#8da0a8", fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>ESCROW PROTECTION HELD</span>
            <strong style={{ display: "block", fontSize: 24, fontWeight: 800, color: "#4ade80", marginTop: 4, fontFamily: "Manrope, sans-serif" }}>
              {m.activeEscrowFormatted}
            </strong>
            <small style={{ color: "#9db0b7", fontSize: 11 }}>
              100% secured before delivery
            </small>
          </div>

          <div>
            <span style={{ color: "#8da0a8", fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>VISITS &amp; VISITORS</span>
            <strong style={{ display: "block", fontSize: 24, fontWeight: 800, color: "#ffffff", marginTop: 4, fontFamily: "Manrope, sans-serif" }}>
              {m.totalPageviews}
            </strong>
            <small style={{ color: "#9db0b7", fontSize: 11 }}>
              {m.uniqueVisitors} unique · {m.visitorsToday} today
            </small>
          </div>
        </div>
      </div>

      {/* Admin Nav Tabs */}
      <div style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 4,
        marginBottom: 28,
        borderBottom: "1px solid var(--line)",
        scrollbarWidth: "none",
      }}>
        {[
          { id: "overview", label: "Overview & Economics" },
          { id: "businesses", label: `Top Businesses (${data.topBusinesses.length})` },
          { id: "transactions", label: `Transactions & Orders (${m.totalOrders})` },
          { id: "geography", label: "Geography & Campus Breakdown" },
          { id: "users", label: `Users & Signups (${m.totalUsers})` },
        ].map((t) => {
          const active = tab === t.id;
          return (
            <Link
              key={t.id}
              href={`/admin?tab=${t.id}`}
              style={{
                padding: "10px 18px",
                borderRadius: "12px 12px 0 0",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
                color: active ? "var(--coral-dark)" : "var(--muted)",
                background: active ? "#ffffff" : "transparent",
                borderBottom: active ? "2.5px solid var(--coral)" : "2.5px solid transparent",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & ECONOMICS */}
      {tab === "overview" && (
        <div style={{ display: "grid", gap: 28 }}>
          {/* Revenue Breakdown & Platform Unit Economics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            <div style={{
              background: "#ffffff",
              border: "1px solid var(--line)",
              borderRadius: 20,
              padding: 24,
              boxShadow: "var(--shadow)",
            }}>
              <span className="section-kicker">MONEY FLUO IS MAKING</span>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "6px 0 18px", color: "var(--ink)", fontFamily: "Manrope, sans-serif" }}>
                Platform Revenue Model
              </h2>

              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--surface)", borderRadius: 12 }}>
                  <div>
                    <strong style={{ display: "block", fontSize: 14, color: "var(--ink)" }}>Subscription MRR</strong>
                    <small style={{ color: "var(--muted)", fontSize: 11 }}>Starter ₦3k, Growth ₦10k, Business ₦25k</small>
                  </div>
                  <strong style={{ fontSize: 16, fontWeight: 800, color: "var(--coral-dark)" }}>
                    {data.subscriptions.mrrFormatted}/mo
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--surface)", borderRadius: 12 }}>
                  <div>
                    <strong style={{ display: "block", fontSize: 14, color: "var(--ink)" }}>Ticket Processing Fees (2%)</strong>
                    <small style={{ color: "var(--muted)", fontSize: 11 }}>Charged automatically at ticket checkout</small>
                  </div>
                  <strong style={{ fontSize: 16, fontWeight: 800, color: "var(--green)" }}>
                    {data.subscriptions.ticketFeesFormatted}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--surface)", borderRadius: 12 }}>
                  <div>
                    <strong style={{ display: "block", fontSize: 14, color: "var(--ink)" }}>Protected Escrow Volume</strong>
                    <small style={{ color: "var(--muted)", fontSize: 11 }}>Customer inspection held funds</small>
                  </div>
                  <strong style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>
                    {m.activeEscrowFormatted}
                  </strong>
                </div>
              </div>
            </div>

            {/* Subscriptions Tier Distribution */}
            <div style={{
              background: "#ffffff",
              border: "1px solid var(--line)",
              borderRadius: 20,
              padding: 24,
              boxShadow: "var(--shadow)",
            }}>
              <span className="section-kicker">SUBSCRIPTION TIERS</span>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "6px 0 18px", color: "var(--ink)", fontFamily: "Manrope, sans-serif" }}>
                Active Merchant Plans
              </h2>

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f07866" }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Business Tier (₦25,000/mo)</span>
                  </div>
                  <strong style={{ fontSize: 14 }}>{data.subscriptions.businessCount} stores</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80" }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Growth Tier (₦10,000/mo)</span>
                  </div>
                  <strong style={{ fontSize: 14 }}>{data.subscriptions.growthCount} stores</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#38bdf8" }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Starter Tier (₦3,000/mo)</span>
                  </div>
                  <strong style={{ fontSize: 14 }}>{data.subscriptions.starterCount} stores</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#94a3b8" }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>30-Day Free Trial</span>
                  </div>
                  <strong style={{ fontSize: 14 }}>{data.subscriptions.freeCount} stores</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Snapshot: Top Businesses & Highest Transactions */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
            {/* Top Businesses Snippet */}
            <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: 20, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <span className="section-kicker">LEADERBOARD</span>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Top Stores by GMV</h3>
                </div>
                <Link href="/admin?tab=businesses" style={{ fontSize: 12, fontWeight: 700, color: "var(--coral-dark)", textDecoration: "none" }}>
                  View All ({data.topBusinesses.length}) ↗
                </Link>
              </div>

              {data.topBusinesses.slice(0, 5).map((b, i) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--surface)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, color: "var(--muted)" }}>
                      {i + 1}
                    </span>
                    <div>
                      <strong style={{ fontSize: 13, display: "block" }}>{b.name}</strong>
                      <small style={{ color: "var(--muted)", fontSize: 11 }}>{b.customersAcquired} customers acquired</small>
                    </div>
                  </div>
                  <strong style={{ fontSize: 14, fontFamily: "Manrope, sans-serif" }}>{b.gmvFormatted}</strong>
                </div>
              ))}
            </div>

            {/* Highest Transactions Snippet */}
            <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: 20, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <span className="section-kicker">BIGGEST SALES</span>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Highest Value Transactions</h3>
                </div>
                <Link href="/admin?tab=transactions" style={{ fontSize: 12, fontWeight: 700, color: "var(--coral-dark)", textDecoration: "none" }}>
                  View All ({data.highestTransactions.length}) ↗
                </Link>
              </div>

              {data.highestTransactions.slice(0, 5).map((tx) => (
                <div key={tx.orderId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div>
                    <strong style={{ fontSize: 13, display: "block" }}>{tx.amountFormatted}</strong>
                    <small style={{ color: "var(--muted)", fontSize: 11 }}>
                      {tx.businessName} · {tx.customerName}
                    </small>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 8,
                    background: tx.status === "paid" || tx.status === "completed" ? "var(--green-soft)" : "var(--surface)",
                    color: tx.status === "paid" || tx.status === "completed" ? "var(--green)" : "var(--muted)",
                  }}>
                    {tx.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOP BUSINESSES LEADERBOARD */}
      {tab === "businesses" && (
        <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: 20, padding: 24, boxShadow: "var(--shadow)" }}>
          <div style={{ marginBottom: 20 }}>
            <span className="section-kicker">MERCHANT PERFORMANCE</span>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 8px", fontFamily: "Manrope, sans-serif" }}>
              Businesses Driving the Most Sales &amp; Customers
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              Ranked by transaction volume processed and customer acquisition (both paying customers and inquiries).
            </p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--line)", color: "var(--muted)", fontSize: 11, letterSpacing: "0.5px" }}>
                  <th style={{ padding: "12px 14px" }}>BUSINESS</th>
                  <th style={{ padding: "12px 14px" }}>GMV PROCESSED</th>
                  <th style={{ padding: "12px 14px" }}>PAID / TOTAL ORDERS</th>
                  <th style={{ padding: "12px 14px" }}>CUSTOMERS ACQUIRED</th>
                  <th style={{ padding: "12px 14px" }}>SUBSCRIPTION PLAN</th>
                  <th style={{ padding: "12px 14px" }}>STATUS</th>
                  <th style={{ padding: "12px 14px" }}>STOREFRONT</th>
                </tr>
              </thead>
              <tbody>
                {data.topBusinesses.map((b, i) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--surface)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>
                          {i + 1}
                        </span>
                        <div>
                          <strong style={{ display: "block", color: "var(--ink)" }}>{b.name}</strong>
                          <small style={{ color: "var(--muted)", fontSize: 11 }}>Created {b.createdAt}</small>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px", fontWeight: 800, fontFamily: "Manrope, sans-serif", fontSize: 14 }}>
                      {b.gmvFormatted}
                    </td>
                    <td style={{ padding: "14px" }}>
                      <strong>{b.paidOrders}</strong> <span style={{ color: "var(--muted)" }}>/ {b.totalOrders}</span>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <span style={{
                        padding: "3px 10px",
                        background: "var(--coral-soft)",
                        color: "var(--coral-dark)",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                        {b.customersAcquired} customers
                      </span>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 800,
                        background: b.isPaidPlan ? "var(--green-soft)" : "var(--surface)",
                        color: b.isPaidPlan ? "var(--green)" : "var(--muted)",
                      }}>
                        {b.plan}
                      </span>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <span style={{ fontSize: 12, color: b.published ? "var(--green)" : "var(--muted)", fontWeight: 600 }}>
                        {b.published ? "● Live" : "○ Draft"}
                      </span>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <Link
                        href={`/b/${b.slug}`}
                        target="_blank"
                        style={{ color: "var(--coral-dark)", fontWeight: 700, textDecoration: "none", fontSize: 12 }}
                      >
                        Visit Store ↗
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTIONS & ORDERS */}
      {tab === "transactions" && (
        <div style={{ display: "grid", gap: 32 }}>
          {/* Highest Value Transactions */}
          <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: 20, padding: 24, boxShadow: "var(--shadow)" }}>
            <span className="section-kicker">ALL TIME RECORDS</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 16px", fontFamily: "Manrope, sans-serif" }}>
              Highest Value Transactions Ever Processed
            </h2>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--line)", color: "var(--muted)", fontSize: 11 }}>
                    <th style={{ padding: "10px 12px" }}>AMOUNT</th>
                    <th style={{ padding: "10px 12px" }}>STORE / MERCHANT</th>
                    <th style={{ padding: "10px 12px" }}>CUSTOMER</th>
                    <th style={{ padding: "10px 12px" }}>PAYMENT METHOD</th>
                    <th style={{ padding: "10px 12px" }}>STATUS</th>
                    <th style={{ padding: "10px 12px" }}>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {data.highestTransactions.map((tx) => (
                    <tr key={tx.orderId} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "12px", fontFamily: "Manrope, sans-serif", fontSize: 15, fontWeight: 800, color: "var(--coral-dark)" }}>
                        {tx.amountFormatted}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <Link href={`/b/${tx.businessSlug}`} target="_blank" style={{ color: "var(--ink)", fontWeight: 700, textDecoration: "none" }}>
                          {tx.businessName}
                        </Link>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <strong>{tx.customerName}</strong>
                        {tx.customerEmail && <small style={{ display: "block", color: "var(--muted)", fontSize: 11 }}>{tx.customerEmail}</small>}
                      </td>
                      <td style={{ padding: "12px", fontSize: 12 }}>{tx.paymentMethod}</td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          background: tx.status === "paid" || tx.status === "completed" ? "var(--green-soft)" : "var(--surface)",
                          color: tx.status === "paid" || tx.status === "completed" ? "var(--green)" : "var(--muted)",
                        }}>
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px", fontSize: 12, color: "var(--muted)" }}>{tx.dateFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Live Transactions */}
          <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: 20, padding: 24, boxShadow: "var(--shadow)" }}>
            <span className="section-kicker">LIVE PLATFORM FEED</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 16px", fontFamily: "Manrope, sans-serif" }}>
              Recent Orders &amp; Activity
            </h2>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--line)", color: "var(--muted)", fontSize: 11 }}>
                    <th style={{ padding: "10px 12px" }}>AMOUNT</th>
                    <th style={{ padding: "10px 12px" }}>BUSINESS</th>
                    <th style={{ padding: "10px 12px" }}>CUSTOMER</th>
                    <th style={{ padding: "10px 12px" }}>CHANNEL</th>
                    <th style={{ padding: "10px 12px" }}>STATUS</th>
                    <th style={{ padding: "10px 12px" }}>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTransactions.map((tx) => (
                    <tr key={tx.orderId} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "12px", fontFamily: "Manrope, sans-serif", fontWeight: 700 }}>
                        {tx.amountFormatted}
                      </td>
                      <td style={{ padding: "12px", fontWeight: 600 }}>{tx.businessName}</td>
                      <td style={{ padding: "12px" }}>
                        <div>{tx.customerName}</div>
                        <small style={{ color: "var(--muted)", fontSize: 11 }}>{tx.customerEmail}</small>
                      </td>
                      <td style={{ padding: "12px", fontSize: 12 }}>{tx.paymentMethod}</td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          background: tx.status === "paid" || tx.status === "completed" ? "var(--green-soft)" : "var(--surface)",
                          color: tx.status === "paid" || tx.status === "completed" ? "var(--green)" : "var(--muted)",
                        }}>
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px", fontSize: 12, color: "var(--muted)" }}>{tx.dateFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GEOGRAPHY & CAMPUS BREAKDOWN */}
      {tab === "geography" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
          {/* Campuses & Educational Hubs */}
          <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: 20, padding: 24, boxShadow: "var(--shadow)" }}>
            <span className="section-kicker">CAMPUSES &amp; LANDMARKS</span>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "4px 0 16px", fontFamily: "Manrope, sans-serif" }}>
              University Hotspots
            </h2>

            {data.geography.campuses.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>No campus visit logs recorded yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {data.geography.campuses.map((c) => (
                  <div key={c.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong style={{ color: "var(--ink)" }}>{c.name}</strong>
                      <span style={{ fontWeight: 700, color: "var(--coral-dark)" }}>{c.count} visits ({c.percent}%)</span>
                    </div>
                    <div style={{ width: "100%", height: 6, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(c.percent, 100)}%`, height: "100%", background: "var(--coral)" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nigerian Cities & States */}
          <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: 20, padding: 24, boxShadow: "var(--shadow)" }}>
            <span className="section-kicker">COMMERCIAL CITIES</span>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "4px 0 16px", fontFamily: "Manrope, sans-serif" }}>
              Nigerian Cities &amp; States
            </h2>

            {data.geography.cities.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>No city traffic logged yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {data.geography.cities.map((city) => (
                  <div key={`${city.name}-${city.region}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <div>
                        <strong style={{ color: "var(--ink)" }}>{city.name}</strong>
                        {city.region && <small style={{ color: "var(--muted)", marginLeft: 6 }}>({city.region})</small>}
                      </div>
                      <span style={{ fontWeight: 700, color: "var(--green)" }}>{city.count} visits ({city.percent}%)</span>
                    </div>
                    <div style={{ width: "100%", height: 6, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(city.percent, 100)}%`, height: "100%", background: "var(--green)" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Countries & Devices */}
          <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: 20, padding: 24, boxShadow: "var(--shadow)" }}>
            <span className="section-kicker">GLOBAL &amp; DEVICES</span>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "4px 0 16px", fontFamily: "Manrope, sans-serif" }}>
              Country &amp; Device Breakdown
            </h2>

            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>COUNTRIES</h4>
              <div style={{ display: "grid", gap: 10 }}>
                {data.geography.countries.map((c) => (
                  <div key={c.code} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>{c.name} ({c.code})</span>
                    <strong>{c.count} ({c.percent}%)</strong>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>DEVICES</h4>
              <div style={{ display: "grid", gap: 10 }}>
                {data.geography.devices.map((d) => (
                  <div key={d.device} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>{d.device}</span>
                    <strong>{d.count} ({d.percent}%)</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: USERS & SIGNUPS */}
      {tab === "users" && (
        <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: 20, padding: 24, boxShadow: "var(--shadow)" }}>
          <div style={{ marginBottom: 20 }}>
            <span className="section-kicker">USER DIRECTORY</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 8px", fontFamily: "Manrope, sans-serif" }}>
              Total Registered Users ({m.totalUsers})
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              +{m.signupsToday} today · +{m.signups7d} past 7 days · +{m.signups30d} past 30 days
            </p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--line)", color: "var(--muted)", fontSize: 11 }}>
                  <th style={{ padding: "10px 12px" }}>USER</th>
                  <th style={{ padding: "10px 12px" }}>EMAIL</th>
                  <th style={{ padding: "10px 12px" }}>ROLE</th>
                  <th style={{ padding: "10px 12px" }}>SIGNUP DATE</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSignups.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px", fontWeight: 700 }}>{u.name}</td>
                    <td style={{ padding: "12px" }}>{u.email}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        background: u.role === "admin" ? "var(--coral-soft)" : "var(--surface)",
                        color: u.role === "admin" ? "var(--coral-dark)" : "var(--ink)",
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: "var(--muted)" }}>{u.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
