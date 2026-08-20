import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, MapPin, IndianRupee, Send, Store, Share2, MessageCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { MARKET, LISTING } from "@/constants/testIds";
import { shareContent, buildListingShareText } from "@/lib/share";

const MARKET_IMG = "https://images.pexels.com/photos/37321079/pexels-photo-37321079.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function MarketPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLang();
  const [meta, setMeta] = useState({ crops: [], regions: [] });
  const [crop, setCrop] = useState(params.get("crop") || "Tomato");
  const [region, setRegion] = useState(params.get("region") || "");
  const [days, setDays] = useState(30);  const [prices, setPrices] = useState([]);
  const [trend, setTrend] = useState([]);
  const [pricesSource, setPricesSource] = useState("mock");
  const [trendSource, setTrendSource] = useState("mock");
  const [listings, setListings] = useState([]);
  const [listingForm, setListingForm] = useState({ crop: "Tomato", quantity_kg: 100, asking_price_per_kg: 20, region: "Maharashtra", contact: "", notes: "" });

  useEffect(() => {
    client.get("/market/crops").then((r) => {
      setMeta(r.data);
      if (!r.data.crops.includes(crop)) setCrop(r.data.crops[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = new URLSearchParams();
    if (crop) q.set("crop", crop);
    if (region) q.set("region", region);
    client.get(`/market/prices?${q.toString()}`).then((r) => { setPrices(r.data.prices); setPricesSource(r.data.source || "mock"); });
  }, [crop, region]);

  useEffect(() => {
    if (!crop) return;
    const q = new URLSearchParams({ crop, days: String(days) });
    if (region) q.set("region", region);
    client.get(`/market/trend?${q.toString()}`).then((r) => { setTrend(r.data.trend); setTrendSource(r.data.source || "mock"); });
  }, [crop, region, days]);

  const loadListings = () => {
    const q = new URLSearchParams();
    if (crop) q.set("crop", crop);
    if (region) q.set("region", region);
    client.get(`/market/listings?${q.toString()}`).then((r) => setListings(r.data));
  };
  useEffect(loadListings, [crop, region]);

  const trackListing = (id, kind) => {
    client.post(`/market/listings/${id}/track?kind=${kind}`).catch(() => {});
    setListings((prev) => prev.map((l) => l.listing_id === id ? { ...l, [`${kind}_count`]: (l[`${kind}_count`] || 0) + 1 } : l));
  };

  const trendCards = useMemo(() => {
    if (!trend.length) return { last: 0, delta: 0 };
    const last = trend[trend.length - 1].price_modal;
    const first = trend[0].price_modal;
    return { last, delta: last - first, pct: ((last - first) / first) * 100 };
  }, [trend]);

  const submitListing = async (e) => {
    e.preventDefault();
    if (!user) { toast.error(t.marketPage.loginToList); return; }
    try {
      await client.post("/market/listings", listingForm);
      toast.success("Listing posted");
      loadListings();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not post listing");
    }
  };

  // Pre-computed strings so visual-edits doesn't inject <span> inside <option>
  const allLabel = t.marketPage.all;

  return (
    <div data-testid={MARKET.page} className="max-w-7xl mx-auto px-5 sm:px-8 py-10 fade-in">
      <div className="relative overflow-hidden rounded-3xl mb-8">
        <img src={MARKET_IMG} alt="" className="w-full h-40 sm:h-52 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 text-primary-foreground">
          <span className="label-eyebrow text-primary-foreground/80">
            {pricesSource === "agmarknet" ? "Agmarknet · Live" : "Demo data"}
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight mt-2">{t.marketPage.title}</h1>
          <p className="text-sm mt-1 max-w-xl">{t.marketPage.subtitle}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3 mb-6">
        <div className="card-soft p-3 md:col-span-2 flex items-center gap-3">
          <label className="label-eyebrow text-muted-foreground w-16 shrink-0">{t.marketPage.filterCrop}</label>
          <select data-testid={MARKET.cropFilter} value={crop} onChange={(e) => setCrop(e.target.value)} className="flex-1 border-none outline-none bg-transparent text-sm font-medium">
            {meta.crops.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
        <div className="card-soft p-3 md:col-span-2 flex items-center gap-3">
          <label className="label-eyebrow text-muted-foreground w-16 shrink-0">{t.marketPage.filterRegion}</label>
          <select data-testid={MARKET.regionFilter} value={region} onChange={(e) => setRegion(e.target.value)} className="flex-1 border-none outline-none bg-transparent text-sm font-medium">
            <option value="">{allLabel}</option>
            {meta.regions.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div data-testid={MARKET.trendChart} className="lg:col-span-2 card-soft p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-eyebrow text-muted-foreground">{t.marketPage.trend}</span>
              <h3 className="font-heading text-2xl font-semibold mt-1 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-primary" />{trendCards.last?.toLocaleString("en-IN") || 0} <span className="text-sm text-muted-foreground">/quintal</span>
              </h3>
              <p className={`text-xs mt-1 ${trendCards.delta >= 0 ? "text-secondary" : "text-accent"}`}>
                {trendCards.delta >= 0 ? "▲" : "▼"} {Math.abs(trendCards.delta || 0).toLocaleString("en-IN")} ({(trendCards.pct || 0).toFixed(1)}%) over {days} days
              </p>
            </div>
            <div className="flex gap-1 bg-muted rounded-full p-1">
              {[
                { d: 7, tid: MARKET.trend7, label: t.marketPage.last7 },
                { d: 30, tid: MARKET.trend30, label: t.marketPage.last30 },
                { d: 90, tid: MARKET.trend90, label: t.marketPage.last90 },
              ].map((o) => (
                <button key={o.d} data-testid={o.tid} onClick={() => setDays(o.d)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${days === o.d ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#244834" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#244834" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5B6B60" }} axisLine={false} tickLine={false} minTickGap={30} />
                <YAxis tick={{ fontSize: 10, fill: "#5B6B60" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E8E9E4" }} labelStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="price_modal" stroke="#244834" fill="url(#gPrice)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div data-testid={MARKET.priceTable} className="card-soft p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Today's prices</h3>
            <span data-testid="market-source-badge" className={`chip text-[10px] ${pricesSource === "agmarknet" ? "bg-secondary/15 text-secondary border-secondary/40" : "bg-muted text-muted-foreground"}`}>
              {pricesSource === "agmarknet" ? "LIVE · Agmarknet" : "DEMO"}
            </span>
          </div>
          <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
            {prices.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                <div>
                  <div className="text-sm font-semibold">{p.crop}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.market}, {p.region}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">₹{p.price_modal.toLocaleString("en-IN")}</div>
                  <div className="text-[11px] text-muted-foreground">₹{p.price_min}–₹{p.price_max}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 grid lg:grid-cols-5 gap-6">
        <form data-testid={MARKET.listingForm} onSubmit={submitListing} className="lg:col-span-2 card-soft p-6">
          <h3 className="font-heading text-lg font-semibold flex items-center gap-2"><Store className="w-4 h-4 text-primary" /> {t.marketPage.sell}</h3>
          {!user && <p className="text-xs text-muted-foreground mt-1">{t.marketPage.loginToList}</p>}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label-eyebrow text-muted-foreground">{t.marketPage.filterCrop}</label>
              <select data-testid={MARKET.listingCrop} value={listingForm.crop} onChange={(e) => setListingForm((f) => ({ ...f, crop: e.target.value }))} className="mt-2 w-full border border-border rounded-xl px-3 py-2 bg-white text-sm">
                {meta.crops.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div>
              <label className="label-eyebrow text-muted-foreground">{t.marketPage.quantity}</label>
              <input data-testid={MARKET.listingQty} type="number" min={1} value={listingForm.quantity_kg} onChange={(e) => setListingForm((f) => ({ ...f, quantity_kg: Number(e.target.value) }))} className="mt-2 w-full border border-border rounded-xl px-3 py-2 bg-white text-sm" />
            </div>
            <div>
              <label className="label-eyebrow text-muted-foreground">{t.marketPage.askingPrice}</label>
              <input data-testid={MARKET.listingPrice} type="number" min={1} value={listingForm.asking_price_per_kg} onChange={(e) => setListingForm((f) => ({ ...f, asking_price_per_kg: Number(e.target.value) }))} className="mt-2 w-full border border-border rounded-xl px-3 py-2 bg-white text-sm" />
            </div>
            <div className="col-span-2">
              <label className="label-eyebrow text-muted-foreground">{t.marketPage.filterRegion}</label>
              <select data-testid={MARKET.listingRegion} value={listingForm.region} onChange={(e) => setListingForm((f) => ({ ...f, region: e.target.value }))} className="mt-2 w-full border border-border rounded-xl px-3 py-2 bg-white text-sm">
                {meta.regions.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label-eyebrow text-muted-foreground">{t.marketPage.contact}</label>
              <input data-testid={MARKET.listingContact} value={listingForm.contact} onChange={(e) => setListingForm((f) => ({ ...f, contact: e.target.value }))} placeholder="+91…" className="mt-2 w-full border border-border rounded-xl px-3 py-2 bg-white text-sm" />
            </div>
            <div className="col-span-2">
              <label className="label-eyebrow text-muted-foreground">{t.marketPage.notes}</label>
              <textarea value={listingForm.notes} onChange={(e) => setListingForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="mt-2 w-full border border-border rounded-xl px-3 py-2 bg-white text-sm" />
            </div>
          </div>
          <button data-testid={MARKET.listingSubmit} disabled={!user} type="submit" className="btn-primary mt-4 w-full inline-flex justify-center items-center gap-2 disabled:opacity-60">
            <Send className="w-4 h-4" /> {t.marketPage.list}
          </button>
        </form>

        <div data-testid={MARKET.listingsList} className="lg:col-span-3 card-soft p-6">
          <h3 className="font-heading text-lg font-semibold">{t.marketPage.listings}</h3>
          <div className="mt-4 space-y-3">
            {listings.length === 0 && <div className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6 text-center">{t.marketPage.noListings}</div>}
            {listings.map((l) => {
              const phone = (l.contact || "").replace(/[^0-9+]/g, "");
              const waHref = phone.length >= 7
                ? `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(`Namaste ${l.farmer_name}, I saw your ${l.crop} listing (${l.quantity_kg} kg @ ₹${l.asking_price_per_kg}/kg) on AgriScan. Is it still available?`)}`
                : null;
              const contactCount = l.contact_count || 0;
              const shareCount = l.share_count || 0;
              return (
                <div key={l.listing_id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-white gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{l.crop} · {l.quantity_kg} kg</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {l.region} · by {l.farmer_name}</div>
                    {l.notes && <div className="text-xs text-muted-foreground mt-1">{l.notes}</div>}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {waHref ? (
                        <a
                          data-testid="listing-contact-button"
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackListing(l.listing_id, "contact")}
                          className="chip inline-flex items-center gap-1 bg-secondary/15 text-secondary border-secondary/40 hover:bg-secondary/25"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Contact on WhatsApp
                        </a>
                      ) : (
                        l.contact && <span className="text-[11px] text-primary font-medium">{l.contact}</span>
                      )}
                      {(contactCount > 0 || shareCount > 0) && (
                        <span data-testid="listing-engagement" className="chip text-[10px] text-muted-foreground inline-flex items-center gap-2">
                          {contactCount > 0 && (<span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {contactCount}</span>)}
                          {shareCount > 0 && (<span className="inline-flex items-center gap-1"><Share2 className="w-3 h-3" /> {shareCount}</span>)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2 shrink-0">
                    <div>
                      <div className="font-heading text-lg font-semibold">₹{l.asking_price_per_kg}/kg</div>
                    </div>
                    <button
                      type="button"
                      data-testid={LISTING.share}
                      onClick={() => { trackListing(l.listing_id, "share"); shareContent({ title: "Produce for sale", text: buildListingShareText(l) }); }}
                      title="Share on WhatsApp"
                      className="w-9 h-9 grid place-items-center rounded-full border border-border bg-white text-primary hover:bg-primary/8 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
