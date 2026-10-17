"use client";

import { useState, useMemo } from "react";
import type { BusinessRecord, ProductRecord } from "@fluo/core";
import { IconBanknote, IconCreditCard, IconPrinter, IconZap } from "./icons.tsx";

interface CartLine {
  product: ProductRecord;
  quantity: number;
}

export function PosRegister({
  business,
  products,
}: {
  business: BusinessRecord;
  products: ProductRecord[];
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [tenderedStr, setTenderedStr] = useState("");
  const [lastReceipt, setLastReceipt] = useState<{
    id: string;
    items: { name: string; qty: number; totalMinor: bigint }[];
    totalMinor: bigint;
    tenderedMinor?: bigint;
    changeMinor?: bigint;
    method: string;
    timeMs: number;
  } | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const addToCart = (p: ProductRecord) => {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.product.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx]!, quantity: next[idx]!.quantity + 1 };
        return next;
      }
      return [...prev, { product: p, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.product.id === productId) {
            const nextQty = l.quantity + delta;
            return nextQty > 0 ? { ...l, quantity: nextQty } : null;
          }
          return l;
        })
        .filter((l): l is CartLine => l !== null)
    );
  };

  const clearCart = () => {
    setCart([]);
    setTenderedStr("");
  };

  const subtotalMinor = useMemo(() => {
    return cart.reduce((acc, l) => acc + l.product.priceMinor * BigInt(l.quantity), 0n);
  }, [cart]);

  const tenderedMinor = useMemo(() => {
    const parsed = Number(tenderedStr.replace(/[^0-9]/g, ""));
    return parsed > 0 ? BigInt(parsed) * 100n : 0n;
  }, [tenderedStr]);

  const changeMinor = tenderedMinor > subtotalMinor ? tenderedMinor - subtotalMinor : 0n;

  const fmt = (minor: bigint) => `₦${(Number(minor) / 100).toLocaleString()}`;

  const completeCashSale = () => {
    if (cart.length === 0) return;
    const receipt = {
      id: `POS-${Date.now().toString().slice(-6)}`,
      items: cart.map((l) => ({
        name: l.product.name,
        qty: l.quantity,
        totalMinor: l.product.priceMinor * BigInt(l.quantity),
      })),
      totalMinor: subtotalMinor,
      tenderedMinor: tenderedMinor > 0n ? tenderedMinor : subtotalMinor,
      changeMinor,
      method: "Cash",
      timeMs: Date.now(),
    };
    setLastReceipt(receipt);
    clearCart();
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="pos-container" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "20px" }}>
      {/* Printable receipt hidden from screen, shown when printing */}
      {lastReceipt && (
        <div className="print-only" style={{ display: "none" }}>
          <div style={{ width: "58mm", padding: "4mm", fontFamily: "monospace", fontSize: "11px", color: "#000" }}>
            <div style={{ textAlign: "center", marginBottom: "8px" }}>
              <h2 style={{ fontSize: "14px", margin: "0 0 2px" }}>{business.name.toUpperCase()}</h2>
              <div>Receipt #{lastReceipt.id}</div>
              <div>{new Date(lastReceipt.timeMs).toLocaleString()}</div>
            </div>
            <hr style={{ border: 0, borderTop: "1px dashed #000" }} />
            <div style={{ margin: "6px 0" }}>
              {lastReceipt.items.map((it, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{it.qty}x {it.name}</span>
                  <span>{fmt(it.totalMinor)}</span>
                </div>
              ))}
            </div>
            <hr style={{ border: 0, borderTop: "1px dashed #000" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
              <span>TOTAL PAID</span>
              <span>{fmt(lastReceipt.totalMinor)}</span>
            </div>
            {lastReceipt.tenderedMinor && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                <span>Cash Tendered</span>
                <span>{fmt(lastReceipt.tenderedMinor)}</span>
              </div>
            )}
            {lastReceipt.changeMinor !== undefined && lastReceipt.changeMinor > 0n && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                <span>Change</span>
                <span>{fmt(lastReceipt.changeMinor)}</span>
              </div>
            )}
            <hr style={{ border: 0, borderTop: "1px dashed #000" }} />
            <div style={{ textAlign: "center", marginTop: "8px", fontSize: "10px" }}>
              <div>Thank you for your business!</div>
              <div style={{ fontWeight: "bold", marginTop: "2px" }}>Powered by Fluo</div>
            </div>
          </div>
        </div>
      )}

      {/* Screen Left: Product Catalogue Grid */}
      <div className="screen-only">
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <input
            type="search"
            placeholder="Search products or scan barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: "16px", padding: "10px 14px", width: "100%" }}
            autoFocus
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px", maxHeight: "72vh", overflowY: "auto", paddingRight: "6px" }}>
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addToCart(p)}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "12px",
                border: "1px solid var(--color-border, #e0e0e0)",
                borderRadius: "8px",
                background: "var(--color-surface, #fff)",
                cursor: "pointer",
                textAlign: "left",
                minHeight: "90px",
              }}
            >
              <strong style={{ fontSize: "13px", lineHeight: "1.2", marginBottom: "6px" }}>{p.name}</strong>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#16a34a" }}>
                {fmt(p.priceMinor)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Screen Right: Register / Cart Drawer */}
      <div className="screen-only card" style={{ padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "75vh" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "18px" }}>Current Ticket</h2>
            {cart.length > 0 && (
              <button type="button" onClick={clearCart} className="btn" style={{ fontSize: "12px", padding: "4px 8px" }}>
                Clear
              </button>
            )}
          </div>

          <div style={{ maxHeight: "38vh", overflowY: "auto" }}>
            {cart.length === 0 ? (
              <p className="muted small" style={{ textAlign: "center", padding: "30px 0" }}>
                Tap items on the left to add to ticket.
              </p>
            ) : (
              cart.map((line) => (
                <div
                  key={line.product.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #f2f2f2",
                  }}
                >
                  <div style={{ maxWidth: "60%" }}>
                    <strong style={{ fontSize: "13px", display: "block" }}>{line.product.name}</strong>
                    <span className="muted small">{fmt(line.product.priceMinor)} each</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.product.id, -1)}
                      className="btn"
                      style={{ padding: "2px 8px", fontSize: "14px" }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: "20px", textAlign: "center", fontWeight: "bold" }}>
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.product.id, 1)}
                      className="btn"
                      style={{ padding: "2px 8px", fontSize: "14px" }}
                    >
                      +
                    </button>
                    <span style={{ minWidth: "60px", textAlign: "right", fontWeight: "600" }}>
                      {fmt(line.product.priceMinor * BigInt(line.quantity))}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Totals & Tender Controls */}
        <div style={{ borderTop: "2px solid #111", paddingTop: "12px", marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px", fontWeight: "bold", marginBottom: "12px" }}>
            <span>Total:</span>
            <span>{fmt(subtotalMinor)}</span>
          </div>

          {cart.length > 0 && (
            <>
              <div style={{ marginBottom: "10px" }}>
                <label className="small muted">Cash Tendered (₦)</label>
                <div style={{ display: "flex", gap: "6px", margin: "4px 0" }}>
                  <input
                    type="number"
                    placeholder="Enter amount..."
                    value={tenderedStr}
                    onChange={(e) => setTenderedStr(e.target.value)}
                    style={{ fontSize: "16px", padding: "6px 10px", width: "100%" }}
                  />
                  {[1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTenderedStr(String(amt))}
                      className="btn"
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
                {changeMinor > 0n && (
                  <p className="small" style={{ color: "#16a34a", fontWeight: "bold", margin: "4px 0" }}>
                    Change to return: {fmt(changeMinor)}
                  </p>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button
                  type="button"
                  onClick={completeCashSale}
                  className="btn btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", fontSize: "15px", fontWeight: "bold" }}
                >
                  <IconBanknote size={18} /> Cash Paid
                </button>
                <button
                  type="button"
                  onClick={completeCashSale}
                  className="btn"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", fontSize: "15px" }}
                >
                  <IconCreditCard size={18} /> Transfer / QR
                </button>
              </div>
            </>
          )}

          {lastReceipt && (
            <div style={{ marginTop: "12px", padding: "10px", background: "#f0fdf4", borderRadius: "6px", border: "1px solid #bbf7d0", textAlign: "center" }}>
              <strong style={{ fontSize: "13px", color: "#166534" }}>Receipt #{lastReceipt.id} Ready</strong>
              <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "6px" }}>
                <button type="button" onClick={printReceipt} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "12px", padding: "4px 10px" }}>
                  <IconPrinter size={14} /> Print Receipt
                </button>
                <button type="button" onClick={() => setLastReceipt(null)} className="btn" style={{ fontSize: "12px", padding: "4px 10px" }}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
