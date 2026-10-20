import { container } from "./container.ts";
import { fmtMoney } from "@fluo/core";

export interface SuperAdminDashboardData {
  metrics: {
    totalGmvFormatted: string;
    fluoTotalRevenueFormatted: string;
    subscriptionMrrFormatted: string;
    activeEscrowFormatted: string;
    totalOrders: number;
    paidOrders: number;
    totalUsers: number;
    signupsToday: number;
    signups7d: number;
    signups30d: number;
    totalBusinesses: number;
    publishedBusinesses: number;
    draftBusinesses: number;
    totalProducts: number;
    totalPageviews: number;
    uniqueVisitors: number;
    visitorsToday: number;
    visitors7d: number;
  };
  geography: {
    campuses: { name: string; count: number; percent: number }[];
    cities: { name: string; region: string; count: number; percent: number }[];
    countries: { code: string; name: string; count: number; percent: number }[];
    devices: { device: string; count: number; percent: number }[];
  };
  topBusinesses: {
    id: string;
    name: string;
    slug: string;
    typeId: string;
    gmvFormatted: string;
    totalOrders: number;
    paidOrders: number;
    customersAcquired: number;
    plan: string;
    isPaidPlan: boolean;
    published: boolean;
    createdAt: string;
  }[];
  highestTransactions: {
    orderId: string;
    businessName: string;
    businessSlug: string;
    customerName: string;
    customerEmail: string;
    amountFormatted: string;
    currency: string;
    status: string;
    paymentMethod: string;
    dateFormatted: string;
  }[];
  recentTransactions: {
    orderId: string;
    businessName: string;
    businessSlug: string;
    customerName: string;
    customerEmail: string;
    amountFormatted: string;
    currency: string;
    status: string;
    paymentMethod: string;
    dateFormatted: string;
  }[];
  subscriptions: {
    starterCount: number;
    growthCount: number;
    businessCount: number;
    freeCount: number;
    mrrMinor: bigint;
    mrrFormatted: string;
    ticketFeesMinor: bigint;
    ticketFeesFormatted: string;
  };
  businessTypes: { typeId: string; count: number }[];
  recentSignups: { id: string; name: string; email: string; role: string; date: string }[];
}

export async function getSuperAdminDashboardData(): Promise<SuperAdminDashboardData> {
  const pool = container().pool;
  if (!pool) throw new Error("Database pool unavailable");

  // Run analytics and commerce aggregation queries concurrently
  const [
    pageviewsRes,
    campusesRes,
    citiesRes,
    countriesRes,
    devicesRes,
    usersRes,
    signupsRes,
    bizRes,
    bizTypesRes,
    productsRes,
    ordersRes,
    escrowRes,
    highestTxRes,
    recentTxRes,
    topBizRes,
    subRes,
    ticketFeeRes,
  ] = await Promise.all([
    // 1. Pageviews & Visitors
    pool.query(`
      SELECT 
        count(*) as total_pageviews,
        count(distinct visitor_id) as total_visitors,
        count(distinct case when created_at >= now() - interval '24 hours' then visitor_id end) as visitors_today,
        count(distinct case when created_at >= now() - interval '7 days' then visitor_id end) as visitors_7d
      FROM platform_pageviews
    `).catch(() => ({ rows: [{ total_pageviews: "0", total_visitors: "0", visitors_today: "0", visitors_7d: "0" }] })),

    // 2. Geography: Campuses
    pool.query(`
      SELECT campus as name, count(*) as count
      FROM platform_pageviews
      WHERE campus is not null and campus != ''
      GROUP BY campus
      ORDER BY count DESC
      LIMIT 12
    `).catch(() => ({ rows: [] })),

    // 3. Geography: Cities / States
    pool.query(`
      SELECT 
        coalesce(nullif(city, ''), 'Metropolis') as name,
        coalesce(nullif(region, ''), 'Region') as region,
        count(*) as count
      FROM platform_pageviews
      WHERE country = 'NG' or country is null
      GROUP BY city, region
      ORDER BY count DESC
      LIMIT 12
    `).catch(() => ({ rows: [] })),

    // 4. Geography: Countries
    pool.query(`
      SELECT country as code, count(*) as count
      FROM platform_pageviews
      WHERE country is not null and country != ''
      GROUP BY country
      ORDER BY count DESC
      LIMIT 8
    `).catch(() => ({ rows: [] })),

    // 5. Devices
    pool.query(`
      SELECT coalesce(device_type, 'mobile') as device, count(*) as count
      FROM platform_pageviews
      GROUP BY device_type
      ORDER BY count DESC
    `).catch(() => ({ rows: [] })),

    // 6. Users & Roles
    pool.query(`
      SELECT 
        count(*) as total_users,
        count(case when created_at >= now() - interval '24 hours' then 1 end) as signups_today,
        count(case when created_at >= now() - interval '7 days' then 1 end) as signups_7d,
        count(case when created_at >= now() - interval '30 days' then 1 end) as signups_30d
      FROM users
    `).catch(() => ({ rows: [{ total_users: "0", signups_today: "0", signups_7d: "0", signups_30d: "0" }] })),

    // 7. Recent user signups
    pool.query(`
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 12
    `).catch(() => ({ rows: [] })),

    // 8. Businesses overview
    pool.query(`
      SELECT 
        count(*) as total_businesses,
        count(case when published_at is not null then 1 end) as published_count,
        count(case when published_at is null then 1 end) as draft_count
      FROM businesses
    `).catch(() => ({ rows: [{ total_businesses: "0", published_count: "0", draft_count: "0" }] })),

    // 9. Business types breakdown
    pool.query(`
      SELECT type_id, count(*) as count
      FROM businesses
      GROUP BY type_id
      ORDER BY count DESC
    `).catch(() => ({ rows: [] })),

    // 10. Products count
    pool.query(`
      SELECT count(*) as total_products
      FROM products
      WHERE status = 'active'
    `).catch(() => ({ rows: [{ total_products: "0" }] })),

    // 11. Orders GMV & Totals
    pool.query(`
      SELECT 
        coalesce(sum(case when status in ('paid', 'completed', 'ready', 'in_production') then total_minor else 0 end), 0) as total_gmv_minor,
        count(*) as total_orders,
        count(case when status in ('paid', 'completed', 'ready', 'in_production') then 1 end) as paid_orders
      FROM orders
    `).catch(() => ({ rows: [{ total_gmv_minor: "0", total_orders: "0", paid_orders: "0" }] })),

    // 12. Escrow Active Volume
    pool.query(`
      SELECT coalesce(sum(amount_minor), 0) as total_escrow_minor
      FROM escrow_records
      WHERE status = 'held'
    `).catch(() => ({ rows: [{ total_escrow_minor: "0" }] })),

    // 13. Highest Transactions Leaderboard
    pool.query(`
      SELECT 
        o.id, o.business_id, b.name as business_name, b.slug as business_slug,
        o.total_minor, o.currency, o.status, o.created_at,
        coalesce(u.name, g.name, 'Customer') as customer_name,
        coalesce(u.email, g.email, '') as customer_email,
        p.method as payment_method
      FROM orders o
      JOIN businesses b ON o.business_id = b.id
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN guest_contacts g ON o.guest_id = g.id
      LEFT JOIN payments p ON p.subject_id = o.id
      WHERE o.status != 'cancelled'
      ORDER BY o.total_minor DESC
      LIMIT 15
    `).catch(() => ({ rows: [] })),

    // 14. Recent Live Transactions
    pool.query(`
      SELECT 
        o.id, o.business_id, b.name as business_name, b.slug as business_slug,
        o.total_minor, o.currency, o.status, o.created_at,
        coalesce(u.name, g.name, 'Customer') as customer_name,
        coalesce(u.email, g.email, '') as customer_email,
        p.method as payment_method
      FROM orders o
      JOIN businesses b ON o.business_id = b.id
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN guest_contacts g ON o.guest_id = g.id
      LEFT JOIN payments p ON p.subject_id = o.id
      ORDER BY o.created_at DESC
      LIMIT 50
    `).catch(() => ({ rows: [] })),

    // 15. Top Businesses Leaderboard
    pool.query(`
      SELECT 
        b.id, b.name, b.slug, b.type_id, b.published_at, b.created_at,
        coalesce(sum(case when o.status in ('paid', 'completed', 'ready', 'in_production') then o.total_minor else 0 end), 0) as gmv_minor,
        count(distinct o.id) as total_orders,
        count(distinct case when o.status in ('paid', 'completed', 'ready', 'in_production') then o.id end) as paid_orders,
        count(distinct coalesce(o.customer_id, o.guest_id)) as total_customers_acquired,
        s.plan_key as subscription_plan,
        s.paid_until as subscription_paid_until
      FROM businesses b
      LEFT JOIN orders o ON o.business_id = b.id
      LEFT JOIN subscriptions s ON s.business_id = b.id
      GROUP BY b.id, b.name, b.slug, b.type_id, b.published_at, b.created_at, s.plan_key, s.paid_until
      ORDER BY gmv_minor DESC, total_customers_acquired DESC
      LIMIT 25
    `).catch(() => ({ rows: [] })),

    // 16. Subscriptions count
    pool.query(`
      SELECT 
        count(case when plan_key = 'starter' and (paid_until is null or paid_until > now()) then 1 end) as starter_count,
        count(case when plan_key = 'growth' and (paid_until is null or paid_until > now()) then 1 end) as growth_count,
        count(case when plan_key = 'business' and (paid_until is null or paid_until > now()) then 1 end) as business_count,
        count(case when plan_key is null or plan_key = 'free' then 1 end) as free_count
      FROM subscriptions
    `).catch(() => ({ rows: [{ starter_count: "0", growth_count: "0", business_count: "0", free_count: "0" }] })),

    // 17. Ticket 2% platform fee
    pool.query(`
      SELECT coalesce(sum(platform_fee_minor), 0) as ticket_fees_minor
      FROM payments
      WHERE purpose = 'ticket' and status = 'succeeded'
    `).catch(() => ({ rows: [{ ticket_fees_minor: "0" }] })),
  ]);

  // Process numbers & minor units
  const pvRow = pageviewsRes.rows[0] || {};
  const totalPv = Number(pvRow.total_pageviews || 0);
  const totalVisitors = Number(pvRow.total_visitors || 0);
  const visitorsToday = Number(pvRow.visitors_today || 0);
  const visitors7d = Number(pvRow.visitors_7d || 0);

  const uRow = usersRes.rows[0] || {};
  const totalUsers = Number(uRow.total_users || 0);
  const signupsToday = Number(uRow.signups_today || 0);
  const signups7d = Number(uRow.signups_7d || 0);
  const signups30d = Number(uRow.signups_30d || 0);

  const bRow = bizRes.rows[0] || {};
  const totalBiz = Number(bRow.total_businesses || 0);
  const pubBiz = Number(bRow.published_count || 0);
  const draftBiz = Number(bRow.draft_count || 0);

  const prodRow = productsRes.rows[0] || {};
  const totalProds = Number(prodRow.total_products || 0);

  const oRow = ordersRes.rows[0] || {};
  const gmvMinor = BigInt(oRow.total_gmv_minor || 0);
  const totalOrders = Number(oRow.total_orders || 0);
  const paidOrders = Number(oRow.paid_orders || 0);

  const escRow = escrowRes.rows[0] || {};
  const escrowMinor = BigInt(escRow.total_escrow_minor || 0);

  const sRow = subRes.rows[0] || {};
  const starterCount = Number(sRow.starter_count || 0);
  const growthCount = Number(sRow.growth_count || 0);
  const businessCount = Number(sRow.business_count || 0);
  const freeCount = Number(sRow.free_count || 0);

  // Starter = N3,000, Growth = N10,000, Business = N25,000 (in kobo: * 100)
  const mrrMinor = BigInt((starterCount * 3000 + growthCount * 10000 + businessCount * 25000) * 100);

  const tfRow = ticketFeeRes.rows[0] || {};
  const ticketFeesMinor = BigInt(tfRow.ticket_fees_minor || 0);

  const fluoTotalRevMinor = mrrMinor + ticketFeesMinor;

  // Process geography & device percentages
  const totalCampusVisits = campusesRes.rows.reduce((sum: number, r: any) => sum + Number(r.count), 0) || 1;
  const campuses = campusesRes.rows.map((r: any) => ({
    name: r.name,
    count: Number(r.count),
    percent: Math.round((Number(r.count) / totalCampusVisits) * 100),
  }));

  const totalCityVisits = citiesRes.rows.reduce((sum: number, r: any) => sum + Number(r.count), 0) || 1;
  const cities = citiesRes.rows.map((r: any) => ({
    name: r.name,
    region: r.region,
    count: Number(r.count),
    percent: Math.round((Number(r.count) / totalCityVisits) * 100),
  }));

  const totalCountryVisits = countriesRes.rows.reduce((sum: number, r: any) => sum + Number(r.count), 0) || 1;
  const countries = countriesRes.rows.map((r: any) => ({
    code: r.code,
    name: r.code === "NG" ? "Nigeria" : r.code === "US" ? "United States" : r.code === "GB" ? "United Kingdom" : r.code === "GH" ? "Ghana" : r.code,
    count: Number(r.count),
    percent: Math.round((Number(r.count) / totalCountryVisits) * 100),
  }));

  const totalDeviceVisits = devicesRes.rows.reduce((sum: number, r: any) => sum + Number(r.count), 0) || 1;
  const devices = devicesRes.rows.map((r: any) => ({
    device: r.device.charAt(0).toUpperCase() + r.device.slice(1),
    count: Number(r.count),
    percent: Math.round((Number(r.count) / totalDeviceVisits) * 100),
  }));

  return {
    metrics: {
      totalGmvFormatted: fmtMoney(gmvMinor, "NGN"),
      fluoTotalRevenueFormatted: fmtMoney(fluoTotalRevMinor, "NGN"),
      subscriptionMrrFormatted: fmtMoney(mrrMinor, "NGN"),
      activeEscrowFormatted: fmtMoney(escrowMinor, "NGN"),
      totalOrders,
      paidOrders,
      totalUsers,
      signupsToday,
      signups7d,
      signups30d,
      totalBusinesses: totalBiz,
      publishedBusinesses: pubBiz,
      draftBusinesses: draftBiz,
      totalProducts: totalProds,
      totalPageviews: totalPv,
      uniqueVisitors: totalVisitors,
      visitorsToday,
      visitors7d,
    },
    geography: {
      campuses,
      cities,
      countries,
      devices,
    },
    topBusinesses: topBizRes.rows.map((r: any) => {
      const gmv = BigInt(r.gmv_minor || 0);
      const isPaid = r.subscription_plan && r.subscription_plan !== "free";
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        typeId: r.type_id,
        gmvFormatted: fmtMoney(gmv, "NGN"),
        totalOrders: Number(r.total_orders || 0),
        paidOrders: Number(r.paid_orders || 0),
        customersAcquired: Number(r.total_customers_acquired || 0),
        plan: r.subscription_plan ? r.subscription_plan.toUpperCase() : "FREE TRIAL",
        isPaidPlan: Boolean(isPaid),
        published: Boolean(r.published_at),
        createdAt: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };
    }),
    highestTransactions: highestTxRes.rows.map((r: any) => {
      const amt = BigInt(r.total_minor || 0);
      return {
        orderId: r.id,
        businessName: r.business_name,
        businessSlug: r.business_slug,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        amountFormatted: fmtMoney(amt, r.currency || "NGN"),
        currency: r.currency || "NGN",
        status: r.status,
        paymentMethod: r.payment_method === "provider" ? "Paystack" : r.payment_method === "bank_transfer" ? "Bank Transfer" : "Card",
        dateFormatted: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      };
    }),
    recentTransactions: recentTxRes.rows.map((r: any) => {
      const amt = BigInt(r.total_minor || 0);
      return {
        orderId: r.id,
        businessName: r.business_name,
        businessSlug: r.business_slug,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        amountFormatted: fmtMoney(amt, r.currency || "NGN"),
        currency: r.currency || "NGN",
        status: r.status,
        paymentMethod: r.payment_method === "provider" ? "Paystack" : r.payment_method === "bank_transfer" ? "Bank Transfer" : "Card",
        dateFormatted: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      };
    }),
    subscriptions: {
      starterCount,
      growthCount,
      businessCount,
      freeCount,
      mrrMinor,
      mrrFormatted: fmtMoney(mrrMinor, "NGN"),
      ticketFeesMinor,
      ticketFeesFormatted: fmtMoney(ticketFeesMinor, "NGN"),
    },
    businessTypes: bizTypesRes.rows.map((r: any) => ({
      typeId: r.type_id,
      count: Number(r.count),
    })),
    recentSignups: signupsRes.rows.map((r: any) => ({
      id: r.id,
      name: r.name || "User",
      email: r.email,
      role: r.role || "customer",
      date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    })),
  };
}
