import React, { useEffect, useMemo, useRef, useState } from "react";
import Calendar from "react-calendar";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  FileDown,
  Gauge,
  LineChart,
  Package,
  PieChart,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import "react-calendar/dist/Calendar.css";

const API = "http://localhost:8080";
const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS = { day: "Dia", week: "Semana", year: "Ano" };
const PAYMENT_FILTERS = {
  ALL: { label: "Todos", color: "#2563eb" },
  CASH: { label: "Efectivo", color: "#ff8a00" },
  NEQUI: { label: "Nequi", color: "#ef4444" },
  CARD: { label: "Tarjeta", color: "#0b1220" },
};
const PERIOD_CAPTION = {
  day: "Analisis por horas del dia seleccionado",
  week: "Analisis por dias de la semana seleccionada",
  year: "Analisis mensual del ano seleccionado",
};

export default function Stats({ formatCOP = (value) => value }) {
  const reportRef = useRef(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [compactHeader, setCompactHeader] = useState(false);
  const compactHeaderRef = useRef(false);
  const [period, setPeriod] = useState("day");
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const [compareMode, setCompareMode] = useState("previous");
  const [compareDate, setCompareDate] = useState(toInputDate(new Date(Date.now() - DAY_MS)));
  const [chartMode, setChartMode] = useState("mix");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [statsSection, setStatsSection] = useState("sales");
  const [openPanels, setOpenPanels] = useState({
    timeline: true,
    products: true,
    projections: true,
    payment: true,
  });

  const loadSales = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API}/sales`);
      const data = await res.json();
      setSales(Array.isArray(data) ? data.filter((sale) => sale.status !== "CANCELLED") : []);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    const scrollParent = getScrollParent(reportRef.current);
    const handleScroll = () => {
      const scrollTop = scrollParent?.scrollTop || window.scrollY || 0;

      if (!compactHeaderRef.current && scrollTop > 180) {
        compactHeaderRef.current = true;
        setCompactHeader(true);
      }

      if (compactHeaderRef.current && scrollTop < 70) {
        compactHeaderRef.current = false;
        setCompactHeader(false);
      }
    };

    handleScroll();
    scrollParent?.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollParent?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const selectedAnchor = useMemo(() => parseInputDate(selectedDate), [selectedDate]);
  const compareAnchor = useMemo(() => parseInputDate(compareDate), [compareDate]);
  const stats = useMemo(
    () => buildStats(sales, period, selectedAnchor, compareMode, compareAnchor, paymentFilter),
    [sales, period, selectedAnchor, compareMode, compareAnchor, paymentFilter]
  );
  const printStats = useMemo(
    () => ({
      CASH: buildStats(sales, period, selectedAnchor, compareMode, compareAnchor, "CASH"),
      NEQUI: buildStats(sales, period, selectedAnchor, compareMode, compareAnchor, "NEQUI"),
      CARD: buildStats(sales, period, selectedAnchor, compareMode, compareAnchor, "CARD"),
    }),
    [sales, period, selectedAnchor, compareMode, compareAnchor]
  );

  const maxTimeline = Math.max(...stats.timeline.map((item) => item.total), ...stats.comparisonTimeline.map((item) => item.total), 1);
  const maxProductQty = Math.max(...stats.products.map((item) => item.qty), 1);

  const togglePanel = (key) => {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="min-h-full bg-slate-50 text-slate-900"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <div id="stats-report" ref={reportRef} className="stats-report">
        <header className={`sticky top-0 z-30 border-b border-slate-200 bg-slate-50/95 px-4 shadow-sm backdrop-blur transition-all md:px-6 ${compactHeader ? "py-2" : "py-4"}`}>
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100 transition-all ${compactHeader ? "h-9 w-9" : "h-12 w-12"}`}>
                <BarChart3 size={compactHeader ? 18 : 24} />
              </div>
              <div>
                <p className={`font-semibold uppercase tracking-wide text-amber-700 transition-all ${compactHeader ? "text-[10px]" : "text-xs"}`}>Analitica Delissa</p>
                <h1 className={`m-0 font-bold tracking-tight text-slate-950 transition-all ${compactHeader ? "text-xl" : "text-2xl md:text-3xl"}`}>Reporte de ventas</h1>
              </div>
            </div>

            <div className={`stats-controls flex flex-wrap items-center gap-2 transition-all ${compactHeader ? "scale-[0.94] origin-right opacity-95" : ""}`}>
              <SegmentedControl value={period} onChange={setPeriod} options={PERIODS} />
              <SegmentedControl value={statsSection} onChange={setStatsSection} options={{ sales: "Ventas", products: "Productos" }} />
              <CalendarDropdown label={period === "year" ? "Ano base" : "Fecha base"} value={selectedDate} onChange={setSelectedDate} />
              <CompareControl mode={compareMode} onModeChange={setCompareMode} date={compareDate} onDateChange={setCompareDate} />
              <PaymentFilter value={paymentFilter} onChange={setPaymentFilter} />
              <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <IconMode icon={<BarChart3 size={16} />} active={chartMode === "bars"} onClick={() => setChartMode("bars")} label="Barras" />
                <IconMode icon={<LineChart size={16} />} active={chartMode === "line"} onClick={() => setChartMode("line")} label="Linea" />
                <IconMode icon={<PieChart size={16} />} active={chartMode === "mix"} onClick={() => setChartMode("mix")} label="Comparado" />
              </div>
              <button
                onClick={handlePrint}
                className="flex h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                <FileDown size={16} />
                PDF
              </button>
              <button
                onClick={loadSales}
                className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Actualizar
              </button>
            </div>
          </div>

          <section className={`overflow-hidden rounded-2xl border border-slate-800 bg-[#0f172a] text-white shadow-sm transition-all duration-300 ${compactHeader ? "mt-0 max-h-0 border-0 p-0 opacity-0" : "mt-4 max-h-48 p-4 opacity-100"}`}>
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
              <div>
                <p className={`font-semibold uppercase tracking-wide text-amber-300 ${compactHeader ? "text-[10px]" : "text-xs"}`}>{PERIODS[period]} seleccionado</p>
                <h2 className={`m-0 font-bold tracking-tight text-white transition-all ${compactHeader ? "mt-1 text-lg md:text-xl" : "mt-2 text-2xl md:text-3xl"}`}>{stats.rangeLabel}</h2>
                <p className={`mt-2 text-sm font-medium text-slate-300 ${compactHeader ? "hidden xl:block" : ""}`}>
                  {PERIOD_CAPTION[period]} · Vista: {statsSection === "sales" ? PAYMENT_FILTERS[paymentFilter].label : "Productos vendidos"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <HeroNumber label="Periodo actual" value={formatCOP(stats.totalSales)} />
                <HeroNumber label="Comparativo" value={formatCOP(stats.comparisonTotal)} />
              </div>
            </div>
          </section>
        </header>

        <main className="space-y-5 p-4 md:p-6">
          {statsSection === "sales" && (
          <>
          <section className="stats-screen-only grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Wallet size={18} />} label={`Ventas ${PERIODS[period].toLowerCase()}`} value={formatCOP(stats.totalSales)} hint={`${stats.salesCount} transacciones`} tone="orange" />
            <MetricCard icon={<Activity size={18} />} label="Ticket promedio" value={formatCOP(stats.avgTicket)} hint={`${stats.itemsSold} productos vendidos`} tone="red" />
            <MetricCard icon={stats.growth >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />} label="Variacion" value={`${formatPercent(stats.growth)}%`} hint={`vs ${stats.comparisonLabel}`} tone={stats.growth >= 0 ? "blue" : "red"} />
            <MetricCard icon={<Gauge size={18} />} label="Ritmo proyectado" value={formatCOP(stats.projectedPeriodTotal)} hint="cierre estimado del rango" tone="dark" />
          </section>

          <section className="stats-screen-only grid grid-cols-1 gap-5 2xl:grid-cols-[1.55fr_0.95fr]">
            <CollapsiblePanel
              title="Ventas por tiempo"
              caption={`${stats.rangeLabel} comparado con ${stats.comparisonLabel}`}
              open={openPanels.timeline}
              onToggle={() => togglePanel("timeline")}
              action={<Badge>{chartMode === "bars" ? "Barras" : chartMode === "line" ? "Linea" : "Comparativo"}</Badge>}
              tone="blue"
            >
              <TimelineChart
                data={stats.timeline}
                comparisonData={stats.comparisonTimeline}
                max={maxTimeline}
                mode={chartMode}
                paymentFilter={paymentFilter}
                formatCOP={formatCOP}
              />
            </CollapsiblePanel>

            <CollapsiblePanel
              title="Metodos de pago"
              caption="Distribucion por caja"
              open={openPanels.payment}
              onToggle={() => togglePanel("payment")}
              action={<Badge>{formatCOP(stats.totalSales)}</Badge>}
              tone="orange"
            >
              <PaymentBreakdown payments={stats.payments} total={stats.totalSales} formatCOP={formatCOP} />
            </CollapsiblePanel>
          </section>

          <section className="stats-screen-only grid grid-cols-1 gap-5 2xl:grid-cols-[1.1fr_1.2fr]">
            <CollapsiblePanel
              title="Productos mas vendidos"
              caption={`Top ${Math.min(stats.products.length, 8)} por ${PERIODS[period].toLowerCase()}`}
              open={openPanels.products}
              onToggle={() => togglePanel("products")}
              action={<Badge>{stats.itemsSold} uds</Badge>}
              tone="red"
            >
              <ProductRanking products={stats.products} maxQty={maxProductQty} formatCOP={formatCOP} />
            </CollapsiblePanel>

            <CollapsiblePanel
              title="Proyecciones y comparativos"
              caption="Estimacion calculada con ventas reales"
              open={openPanels.projections}
              onToggle={() => togglePanel("projections")}
              action={<Badge>Forecast</Badge>}
              tone="dark"
            >
              <ProjectionBoard stats={stats} formatCOP={formatCOP} />
            </CollapsiblePanel>
          </section>
          </>
          )}

          {statsSection === "products" && (
          <>
          <section className="stats-screen-only grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Package size={18} />} label="Unidades vendidas" value={stats.itemsSold} hint={`${stats.products.length} productos con venta`} tone="orange" />
            <MetricCard icon={<Wallet size={18} />} label="Venta productos" value={formatCOP(stats.totalSales)} hint="solo productos facturados" tone="blue" />
            <MetricCard icon={<TrendingUp size={18} />} label="Producto lider" value={stats.bestProduct} hint="mayor cantidad vendida" tone="dark" />
            <MetricCard icon={<Activity size={18} />} label="Promedio por producto" value={formatCOP(stats.products.length ? stats.totalSales / stats.products.length : 0)} hint="venta media por referencia" tone="red" />
          </section>

          <section className="stats-screen-only grid grid-cols-1 gap-5 2xl:grid-cols-[1.25fr_0.9fr]">
            <CollapsiblePanel
              title="Ventas por producto"
              caption="Unidades y valor vendido por referencia"
              open
              onToggle={() => {}}
              action={<Badge>{stats.itemsSold} uds</Badge>}
              tone="orange"
            >
              <ProductSalesChart products={stats.products} maxQty={maxProductQty} formatCOP={formatCOP} />
            </CollapsiblePanel>

            <CollapsiblePanel
              title="Participacion por producto"
              caption="Grafica de torta por unidades vendidas"
              open
              onToggle={() => {}}
              action={<Badge>Torta</Badge>}
              tone="blue"
            >
              <ProductPieChart products={stats.products} />
            </CollapsiblePanel>
          </section>

          <section className="stats-screen-only grid grid-cols-1 gap-5 2xl:grid-cols-[0.95fr_1.15fr]">
            <CollapsiblePanel
              title="Ranking de productos"
              caption={`Top ${Math.min(stats.products.length, 8)} por ${PERIODS[period].toLowerCase()}`}
              open
              onToggle={() => {}}
              action={<Badge>{stats.products.length} refs</Badge>}
              tone="red"
            >
              <ProductRanking products={stats.products} maxQty={maxProductQty} formatCOP={formatCOP} />
            </CollapsiblePanel>

            <CollapsiblePanel
              title="Comparativo de productos"
              caption="Periodo actual frente al comparativo"
              open
              onToggle={() => {}}
              action={<Badge>Actual vs anterior</Badge>}
              tone="dark"
            >
              <ProductComparisonTable products={stats.products} comparisonProducts={stats.comparisonProducts} formatCOP={formatCOP} />
            </CollapsiblePanel>
          </section>
          </>
          )}

          <section className="stats-print-only hidden space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d97706]">Reporte ejecutivo</p>
              <h2 className="m-0 mt-2 text-3xl font-semibold text-slate-900">{stats.rangeLabel}</h2>
              <p className="mt-2 text-sm font-bold text-slate-600">
                Comparativo: {stats.comparisonLabel} Â· Vista general de ventas, pagos, productos y proyecciones.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <PrintMetric label="Ventas" value={formatCOP(stats.totalSales)} />
              <PrintMetric label="Comparativo" value={formatCOP(stats.comparisonTotal)} />
              <PrintMetric label="Variacion" value={`${formatPercent(stats.growth)}%`} />
              <PrintMetric label="Ticket promedio" value={formatCOP(stats.avgTicket)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="m-0 mb-3 text-lg font-semibold text-slate-900">Metodos de pago</h3>
                <PaymentBreakdown payments={stats.payments} total={stats.totalSales} formatCOP={formatCOP} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="m-0 mb-3 text-lg font-semibold text-slate-900">Productos mas vendidos</h3>
                <ProductRanking products={stats.products} maxQty={maxProductQty} formatCOP={formatCOP} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="m-0 mb-3 text-lg font-semibold text-slate-900">Proyecciones</h3>
              <ProjectionBoard stats={stats} formatCOP={formatCOP} />
            </div>

            <div className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="m-0 text-xl font-semibold text-slate-900">Ventas por tiempo</h3>
                <p className="text-sm font-semibold text-slate-600">{stats.rangeLabel}</p>
              </div>
              <TimelineChart
                data={stats.timeline}
                comparisonData={stats.comparisonTimeline}
                max={maxTimeline}
                mode="mix"
                paymentFilter={paymentFilter}
                formatCOP={formatCOP}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="m-0 mb-3 text-lg font-semibold text-slate-900">Ventas por producto</h3>
                <ProductSalesChart products={stats.products} maxQty={maxProductQty} formatCOP={formatCOP} />
              </div>
              <div className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="m-0 mb-3 text-lg font-semibold text-slate-900">Participacion por producto</h3>
                <ProductPieChart products={stats.products} />
              </div>
            </div>

            <div className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="m-0 mb-3 text-lg font-semibold text-slate-900">Comparativo de productos</h3>
              <ProductComparisonTable products={stats.products} comparisonProducts={stats.comparisonProducts} formatCOP={formatCOP} />
            </div>

            <h2 className="m-0 pt-2 text-2xl font-semibold text-slate-900">Graficas por metodo de pago</h2>
            {["CASH", "NEQUI", "CARD"].map((key) => {
              const itemStats = printStats[key];
              const printMax = Math.max(...itemStats.timeline.map((item) => item.total), ...itemStats.comparisonTimeline.map((item) => item.total), 1);

              return (
                <div key={key} className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="m-0 text-xl font-semibold text-slate-900">{PAYMENT_FILTERS[key].label}</h3>
                    <p className="text-sm font-semibold text-slate-600">{formatCOP(itemStats.totalSales)}</p>
                  </div>
                  <TimelineChart
                    data={itemStats.timeline}
                    comparisonData={itemStats.comparisonTimeline}
                    max={printMax}
                    mode="mix"
                    paymentFilter={key}
                    formatCOP={formatCOP}
                  />
                </div>
              );
            })}
          </section>
        </main>
      </div>
    </div>
  );
}

function buildStats(sales, period, anchor, compareMode, compareAnchor, paymentFilter) {
  const currentRange = getRange(period, anchor, 0);
  const comparisonRange = compareMode === "custom" ? getRange(period, compareAnchor, 0) : getRange(period, anchor, 1);
  const currentSales = sales.filter((sale) => saleMatchesView(sale, paymentFilter) && isInRange(parseDate(sale.date), currentRange.start, currentRange.end));
  const comparisonSales = sales.filter((sale) => saleMatchesView(sale, paymentFilter) && isInRange(parseDate(sale.date), comparisonRange.start, comparisonRange.end));
  const totalSales = sumSales(currentSales);
  const comparisonTotal = sumSales(comparisonSales);
  const salesCount = currentSales.length;
  const avgTicket = salesCount ? totalSales / salesCount : 0;
  const products = rankProducts(currentSales);
  const comparisonProducts = rankProducts(comparisonSales);
  const itemsSold = products.reduce((acc, item) => acc + item.qty, 0);
  const payments = buildPayments(currentSales);
  const timeline = buildTimeline(currentSales, period, currentRange.start, currentRange.end);
  const comparisonTimeline = buildTimeline(comparisonSales, period, comparisonRange.start, comparisonRange.end);
  const growth = comparisonTotal > 0 ? ((totalSales - comparisonTotal) / comparisonTotal) * 100 : totalSales > 0 ? 100 : 0;
  const progress = getPeriodProgress(period, anchor);
  const projectedPeriodTotal = progress > 0 ? totalSales / progress : totalSales;
  const bestProduct = products[0]?.name || "Sin ventas";
  const nextWeekProjection = period === "day" ? totalSales * 7 : projectedPeriodTotal;
  const yearProjection = period === "year" ? projectedPeriodTotal : getYearProjection(sales, anchor);

  return {
    avgTicket,
    bestProduct,
    comparisonLabel: comparisonRange.label,
    comparisonProducts,
    comparisonSales,
    comparisonTimeline,
    comparisonTotal,
    currentSales,
    growth,
    itemsSold,
    payments,
    products,
    projectedPeriodTotal,
    rangeLabel: currentRange.label,
    salesCount,
    timeline,
    totalSales,
    nextWeekProjection,
    yearProjection,
  };
}

function getRange(period, anchor, offset) {
  const current = new Date(anchor);

  if (period === "day") {
    current.setDate(current.getDate() - offset);
    const start = startOfDay(current);
    const end = endOfDay(current);
    return { start, end, label: formatDateLabel(current) };
  }

  if (period === "week") {
    current.setDate(current.getDate() - offset * 7);
    const day = current.getDay() || 7;
    const start = startOfDay(new Date(current.getTime() - (day - 1) * DAY_MS));
    const end = endOfDay(new Date(start.getTime() + 6 * DAY_MS));
    return { start, end, label: `${formatShortDate(start)} - ${formatShortDate(end)}` };
  }

  const year = current.getFullYear() - offset;
  return {
    start: new Date(year, 0, 1, 0, 0, 0),
    end: new Date(year, 11, 31, 23, 59, 59),
    label: `${year}`,
  };
}

function buildTimeline(sales, period, start, end) {
  if (period === "day") {
    return Array.from({ length: 14 }, (_, index) => {
      const hour = 7 + index;
      const bucketSales = sales.filter((sale) => parseDate(sale.date).getHours() === hour);
      return summarizeBucket(`${hour}:00`, bucketSales);
    });
  }

  if (period === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start.getTime() + index * DAY_MS);
      const bucketSales = sales.filter((sale) => sameDay(parseDate(sale.date), day));
      return summarizeBucket(["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"][index], bucketSales);
    });
  }

  return Array.from({ length: 12 }, (_, index) => {
    const bucketSales = sales.filter((sale) => {
      const date = parseDate(sale.date);
      return date >= start && date <= end && date.getMonth() === index;
    });

    return summarizeBucket(["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][index], bucketSales);
  });
}

function TimelineChart({ data, comparisonData, max, mode, paymentFilter, formatCOP }) {
  const axisMax = getNiceMax(max);
  const currentPoints = getChartPoints(data, axisMax);
  const comparePoints = getChartPoints(comparisonData, axisMax);
  const activeColor = paymentFilter === "ALL" ? "#ef4444" : PAYMENT_FILTERS[paymentFilter].color;
  const barGradient = getBarGradient(paymentFilter);
  const axisLabels = [axisMax, axisMax * 0.75, axisMax * 0.5, axisMax * 0.25, 0];
  const xAxisLabel = data.length === 12 ? "meses" : data.length === 7 ? "dias" : "horas";

  return (
    <div className="min-h-[340px]">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
        <Legend color={activeColor} label={`Periodo actual Â· ${PAYMENT_FILTERS[paymentFilter].label}`} />
        <Legend color="#64748b" label="Comparativo" />
        {paymentFilter === "ALL" && (
          <>
            <Legend color="#ff8a00" label="Efectivo" />
            <Legend color="#ef4444" label="Nequi" />
            <Legend color="#0b1220" label="Tarjeta" />
          </>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Eje Y: valor vendido</p>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Eje X: {xAxisLabel}</p>
        </div>

        <div className="grid h-80 grid-cols-[4.5rem_1fr] grid-rows-[1fr_1.5rem] gap-x-3">
          <div className="row-start-1 flex h-full flex-col justify-between py-1 text-right text-[11px] font-semibold text-slate-500">
            {axisLabels.map((label) => (
              <span key={label}>{formatAxisValue(label)}</span>
            ))}
          </div>

          <div className="relative row-start-1 overflow-hidden rounded-md border border-slate-200 bg-white px-3 pt-4">
            <div className="absolute inset-x-3 top-4 bottom-7 flex flex-col justify-between">
              {axisLabels.map((label) => (
                <span key={label} className="border-t border-dashed border-slate-200" />
              ))}
            </div>

            {(mode === "line" || mode === "mix") && (
              <svg className="pointer-events-none absolute inset-x-3 top-4 bottom-7 z-10 h-[calc(100%-2.75rem)] w-[calc(100%-1.5rem)]" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline fill="none" stroke="#64748b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" strokeDasharray="4 4" points={comparePoints.join(" ")} />
                <polyline fill="none" stroke={activeColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" points={currentPoints.join(" ")} />
              </svg>
            )}

            <div className="relative z-0 grid h-full items-end gap-2 pb-7" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
              {data.map((item, index) => {
                const currentHeight = `${Math.max((item.total / axisMax) * 94, item.total ? 4 : 1)}%`;
                const compareHeight = `${Math.max(((comparisonData[index]?.total || 0) / axisMax) * 94, comparisonData[index]?.total ? 4 : 1)}%`;

                return (
                  <div key={item.label} className="group relative flex h-full min-w-0 flex-col justify-end gap-2">
                    <div className="relative flex h-full items-end gap-1 rounded-md px-1">
                      {mode !== "line" && (
                        <>
                          <div className="w-full rounded-t-md bg-slate-300/80" style={{ height: compareHeight }} />
                          {paymentFilter === "ALL" ? (
                            <StackedPaymentBar item={item} height={currentHeight} />
                          ) : (
                            <div className={`w-full rounded-t-md ${barGradient}`} style={{ height: currentHeight }} />
                          )}
                        </>
                      )}
                      <div className="pointer-events-none absolute left-1/2 top-2 hidden w-max -translate-x-1/2 rounded-md bg-slate-950 px-2 py-1 text-xs font-bold text-white shadow-lg group-hover:block">
                        {formatCOP(item.total)}
                      </div>
                    </div>
                    <span className="absolute bottom-0 left-0 right-0 truncate text-center text-[11px] font-semibold text-slate-500">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-start-2 row-start-2 flex items-end justify-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Tiempo
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <MiniStat label="Mayor pico" value={formatCOP(Math.max(...data.map((item) => item.total), 0))} />
        <MiniStat label="Movimientos" value={data.reduce((acc, item) => acc + item.count, 0)} />
        <MiniStat label="Promedio" value={formatCOP(data.reduce((acc, item) => acc + item.total, 0) / Math.max(data.length, 1))} />
      </div>
    </div>
  );
}

function StackedPaymentBar({ item, height }) {
  const total = item.total || 0;

  if (!total) {
    return <div className="w-full rounded-t-md bg-slate-200" style={{ height }} />;
  }

  return (
    <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-md" style={{ height }}>
      {["CASH", "NEQUI", "CARD"].map((key) => {
        const value = item.byPayment[key] || 0;
        if (!value) return null;

        return (
          <span
            key={key}
            className="w-full"
            style={{
              height: `${(value / total) * 100}%`,
              background: PAYMENT_FILTERS[key].color,
            }}
          />
        );
      })}
    </div>
  );
}

function ProductRanking({ products, maxQty, formatCOP }) {
  if (!products.length) return <EmptyState text="Aun no hay productos vendidos en este periodo." />;

  return (
    <div className="space-y-3">
      {products.slice(0, 8).map((product, index) => (
        <div key={product.name} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-sm font-semibold text-amber-700 ring-1 ring-amber-100">{index + 1}</span>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
              <p className="shrink-0 text-xs font-bold text-slate-500">{formatCOP(product.total)}</p>
            </div>
            <div className="mt-2 h-2 rounded-full bg-orange-100">
              <div className="h-full rounded-full bg-gradient-to-r from-[#ff8a00] to-[#ef4444]" style={{ width: `${Math.max((product.qty / maxQty) * 100, 5)}%` }} />
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{product.qty} uds</span>
        </div>
      ))}
    </div>
  );
}

function ProductSalesChart({ products, maxQty, formatCOP }) {
  if (!products.length) return <EmptyState text="Aun no hay productos vendidos en este periodo." />;

  const visible = products.slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Eje Y: productos</span>
          <span>Eje X: unidades vendidas</span>
        </div>
        <div className="space-y-3">
          {visible.map((product) => {
            const width = `${Math.max((product.qty / maxQty) * 100, 4)}%`;

            return (
              <div key={product.name} className="grid grid-cols-[minmax(120px,0.8fr)_1.5fr_auto] items-center gap-3">
                <p className="truncate text-sm font-semibold text-slate-700">{product.name}</p>
                <div className="h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ff8a00] to-[#ef4444]" style={{ width }} />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{product.qty}</p>
                  <p className="text-[11px] font-medium text-slate-500">{formatCOP(product.total)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProductPieChart({ products }) {
  if (!products.length) return <EmptyState text="No hay datos para la grafica de torta." />;

  const colors = ["#ff8a00", "#ef4444", "#0f172a", "#2563eb", "#fbbf24", "#94a3b8"];
  const visible = products.slice(0, 5);
  const otherQty = products.slice(5).reduce((acc, product) => acc + product.qty, 0);
  const slices = otherQty > 0 ? [...visible, { name: "Otros", qty: otherQty, total: 0 }] : visible;
  const total = slices.reduce((acc, item) => acc + item.qty, 0);
  let cumulative = 0;

  const gradient = slices.map((item, index) => {
    const start = (cumulative / total) * 100;
    cumulative += item.qty;
    const end = (cumulative / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  }).join(", ");

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
      <div className="mx-auto h-52 w-52 rounded-full border border-slate-200 shadow-inner" style={{ background: `conic-gradient(${gradient})` }} />
      <div className="space-y-2">
        {slices.map((item, index) => {
          const percent = total ? (item.qty / total) * 100 : 0;

          return (
            <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: colors[index % colors.length] }} />
                <span className="truncate text-sm font-semibold text-slate-700">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{formatPercent(percent)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductComparisonTable({ products, comparisonProducts, formatCOP }) {
  const previousByName = new Map(comparisonProducts.map((product) => [product.name, product]));
  const names = Array.from(new Set([...products.map((p) => p.name), ...comparisonProducts.map((p) => p.name)]));
  const rows = names
    .map((name) => {
      const current = products.find((product) => product.name === name) || { name, qty: 0, total: 0 };
      const previous = previousByName.get(name) || { qty: 0, total: 0 };
      return {
        name,
        qty: current.qty,
        previousQty: previous.qty,
        total: current.total,
        delta: current.qty - previous.qty,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.qty - a.qty)
    .slice(0, 8);

  if (!rows.length) return <EmptyState text="No hay productos para comparar." />;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-3 text-left font-semibold">Producto</th>
            <th className="px-3 py-3 text-right font-semibold">Actual</th>
            <th className="px-3 py-3 text-right font-semibold">Antes</th>
            <th className="px-3 py-3 text-right font-semibold">Dif.</th>
            <th className="px-3 py-3 text-right font-semibold">Venta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.name}>
              <td className="px-3 py-3 font-semibold text-slate-800">{row.name}</td>
              <td className="px-3 py-3 text-right text-slate-600">{row.qty}</td>
              <td className="px-3 py-3 text-right text-slate-600">{row.previousQty}</td>
              <td className={`px-3 py-3 text-right font-bold ${row.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {row.delta > 0 ? "+" : ""}{row.delta}
              </td>
              <td className="px-3 py-3 text-right font-semibold text-slate-800">{formatCOP(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentBreakdown({ payments, total, formatCOP }) {
  return (
    <div className="space-y-4">
      <div className="flex h-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        {payments.map((payment) => {
          const width = total ? (payment.total / total) * 100 : 0;
          return <div key={payment.key} className="h-full" style={{ width: `${width}%`, background: payment.color }} title={payment.label} />;
        })}
      </div>

      <div className="space-y-3">
        {payments.map((payment) => {
          const percent = total ? (payment.total / total) * 100 : 0;
          return (
            <div key={payment.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: payment.color }} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{payment.label}</p>
                  <p className="text-xs font-bold text-slate-500">{payment.count} ventas</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCOP(payment.total)}</p>
                <p className="text-xs font-bold text-slate-500">{formatPercent(percent)}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectionBoard({ stats, formatCOP }) {
  const comparisonGap = stats.totalSales - stats.comparisonTotal;
  const projectionRows = [
    { label: "Diferencia comparativa", value: formatCOP(comparisonGap), icon: <Scale size={16} /> },
    { label: "Cierre del periodo", value: formatCOP(stats.projectedPeriodTotal), icon: <ArrowUpRight size={16} /> },
    { label: "Proyeccion semanal", value: formatCOP(stats.nextWeekProjection), icon: <CalendarDays size={16} /> },
    { label: "Proyeccion anual", value: formatCOP(stats.yearProjection), icon: <TrendingUp size={16} /> },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <div className="grid gap-3 sm:grid-cols-2">
        {projectionRows.map((row) => (
          <div key={row.label} className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              <span className="text-[#ea580c]">{row.icon}</span>
              {row.label}
            </div>
            <p className="mt-3 truncate text-lg font-semibold text-slate-900">{row.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-amber-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Lectura ejecutiva</p>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{stats.bestProduct}</h3>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          Producto lider del periodo. La variacion es {formatPercent(stats.growth)}% frente al comparativo,
          con ticket promedio de {formatCOP(stats.avgTicket)}.
        </p>
      </div>
    </div>
  );
}

function CollapsiblePanel({ title, caption, action, children, open, onToggle, tone }) {
  const tones = {
    orange: "border-amber-100",
    red: "border-rose-100",
    blue: "border-sky-100",
    dark: "border-slate-200",
  };

  return (
    <section className={`rounded-2xl border bg-white ${tones[tone] || tones.dark} shadow-sm`}>
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left">
        <span>
          <span className="block text-base font-bold text-slate-900">{title}</span>
          <span className="block text-xs font-medium text-slate-500">{caption}</span>
        </span>
        <span className="flex items-center gap-2">
          {action}
          <ChevronDown size={18} className={`text-slate-500 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CompareControl({ mode, onModeChange, date, onDateChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <button
        onClick={() => onModeChange("previous")}
        className={`h-8 rounded-md px-3 text-xs font-semibold transition ${mode === "previous" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        Periodo anterior
      </button>
      <button
        onClick={() => onModeChange("custom")}
        className={`h-8 rounded-md px-3 text-xs font-semibold transition ${mode === "custom" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        Comparar fecha
      </button>
      {mode === "custom" && <CalendarDropdown label="Comparar" value={date} onChange={onDateChange} compact />}
    </div>
  );
}

function CalendarDropdown({ label, value, onChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const selected = parseInputDate(value);

  const handleChange = (date) => {
    onChange(toInputDate(date));
    setOpen(false);
  };

  return (
    <div className={`relative ${compact ? "w-44" : "w-56"}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left shadow-sm"
        title={label}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays size={15} className="shrink-0 text-slate-500" />
          <span className="truncate text-sm font-semibold text-slate-700">{formatCompactDate(selected)}</span>
        </span>
        <ChevronDown size={15} className={`shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="stats-calendar absolute right-0 top-12 z-50 w-[310px] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">
              Cerrar
            </button>
          </div>
          <Calendar
            onChange={handleChange}
            value={selected}
            locale="es-CO"
            maxDetail="month"
            prev2Label={null}
            next2Label={null}
          />
        </div>
      )}
    </div>
  );
}

function PaymentFilter({ value, onChange }) {
  return (
    <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {Object.entries(PAYMENT_FILTERS).map(([key, option]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${value === key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          title={`Ver ${option.label}`}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: option.color }} />
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({ icon, label, value, hint, tone }) {
  const tones = {
    orange: "border-[#fed7aa] bg-[#fff7ed] text-[#7c2d12]",
    red: "border-[#fecdd3] bg-[#fff1f2] text-[#881337]",
    blue: "border-[#bfdbfe] bg-[#eff6ff] text-[#0f172a]",
    dark: "border-slate-200 bg-[#f8fafc] text-slate-900",
  };

  return (
    <div className={`rounded-xl border ${tones[tone]} p-4 shadow-sm`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold opacity-80">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">{icon}</span>
      </div>
      <p className="mt-4 truncate text-2xl font-semibold tracking-normal">{value}</p>
      <p className="mt-1 text-xs font-bold opacity-75">{hint}</p>
    </div>
  );
}

function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {Object.entries(options).map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`h-8 rounded-md px-3 text-sm font-semibold transition ${value === key ? "bg-[#ff8a00] text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function IconMode({ icon, active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-9 items-center justify-center rounded-md transition ${active ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"}`}
    >
      {icon}
    </button>
  );
}

function HeroNumber({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 truncate text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function PrintMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Badge({ children }) {
  return <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm">{children}</span>;
}

function EmptyState({ text }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-[#f8fafc] p-6 text-center text-sm font-bold text-slate-500">{text}</div>;
}

function rankProducts(sales) {
  const map = new Map();

  sales.forEach((sale) => {
    sale.details?.forEach((detail) => {
      const name = detail.productName || detail.product?.name || "Producto";
      const qty = Number(detail.quantity || 0);
      const total = Number(detail.subtotal || detail.unitPrice * qty || 0);
      const current = map.get(name) || { name, qty: 0, total: 0 };
      current.qty += qty;
      current.total += total;
      map.set(name, current);
    });
  });

  return Array.from(map.values()).sort((a, b) => b.qty - a.qty || b.total - a.total);
}

function buildPayments(sales) {
  const labels = { CASH: "Efectivo", NEQUI: "Nequi", CARD: "Tarjeta" };
  const tones = { CASH: "#ff8a00", NEQUI: "#ef4444", CARD: "#0b1220" };
  const map = new Map(Object.keys(labels).map((key) => [key, { key, label: labels[key], total: 0, count: 0, color: tones[key] }]));

  sales.forEach((sale) => {
    const key = sale.paymentMethod || "CASH";
    const current = map.get(key) || { key, label: key, total: 0, count: 0, color: "#2563eb" };
    current.total += Number(sale.total || 0);
    current.count += 1;
    map.set(key, current);
  });

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function summarizeBucket(label, bucketSales) {
  const byPayment = { CASH: 0, NEQUI: 0, CARD: 0 };

  bucketSales.forEach((sale) => {
    const key = byPayment[sale.paymentMethod] !== undefined ? sale.paymentMethod : "CASH";
    byPayment[key] += Number(sale.total || 0);
  });

  return {
    label,
    total: sumSales(bucketSales),
    count: bucketSales.length,
    byPayment,
  };
}

function saleMatchesView(sale, paymentFilter) {
  return paymentFilter === "ALL" || sale.paymentMethod === paymentFilter;
}

function getBarGradient(paymentFilter) {
  if (paymentFilter === "CASH") return "bg-gradient-to-t from-[#c2410c] to-[#ff8a00]";
  if (paymentFilter === "NEQUI") return "bg-gradient-to-t from-[#991b1b] to-[#ef4444]";
  if (paymentFilter === "CARD") return "bg-gradient-to-t from-[#020617] to-[#0b1220]";
  return "bg-gradient-to-t from-[#ef4444] via-[#ff8a00] to-[#2563eb]";
}

function getChartPoints(data, max) {
  return data.map((item, index) => {
    const x = data.length === 1 ? 50 : 4 + (index / (data.length - 1)) * 92;
    const y = 92 - (item.total / max) * 78;
    return `${x},${clamp(y, 8, 92)}`;
  });
}

function getNiceMax(value) {
  if (!value || value <= 0) return 100000;

  const exponent = Math.floor(Math.log10(value));
  const base = Math.pow(10, exponent);
  const normalized = value / base;
  const rounded = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return rounded * base;
}

function formatAxisValue(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${Math.round(value)}`;
}

function getScrollParent(element) {
  let parent = element?.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;

    if (/(auto|scroll)/.test(overflowY) && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return document.scrollingElement || document.documentElement;
}

function getPeriodProgress(period, anchor) {
  const now = new Date();
  const isCurrentDay = sameDay(anchor, now);

  if (period === "day") {
    if (!isCurrentDay) return 1;
    const openHour = 7;
    const closeHour = 21;
    const current = now.getHours() + now.getMinutes() / 60;
    return clamp((current - openHour) / (closeHour - openHour), 0.08, 1);
  }

  if (period === "week") {
    const currentWeek = getRange("week", now, 0);
    const selectedWeek = getRange("week", anchor, 0);
    if (!sameDay(currentWeek.start, selectedWeek.start)) return 1;
    const day = now.getDay() || 7;
    return clamp((day - 1 + (now.getHours() + 1) / 24) / 7, 0.08, 1);
  }

  if (anchor.getFullYear() !== now.getFullYear()) return 1;
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  return clamp((now - start) / (end - start), 0.08, 1);
}

function getYearProjection(sales, anchor) {
  const range = getRange("year", anchor, 0);
  const yearSales = sales.filter((sale) => isInRange(parseDate(sale.date), range.start, range.end));
  return sumSales(yearSales) / getPeriodProgress("year", anchor);
}

function sumSales(sales) {
  return sales.reduce((acc, sale) => acc + Number(sale.total || 0), 0);
}

function parseDate(value) {
  return value ? new Date(value) : new Date(0);
}

function parseInputDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day || 1);
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isInRange(date, start, end) {
  return date >= start && date <= end;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function formatPercent(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatShortDate(date) {
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function formatDateLabel(date) {
  return date.toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function formatCompactDate(date) {
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}




