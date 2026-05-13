import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  PackageSearch,
  UserRound,
  X
} from "lucide-react";

export default function InventoryModal({ date, onClose }) {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState([]);

  useEffect(() => {
    const loadAll = async () => {
      const resProducts = await fetch("http://localhost:8080/products");
      const productsData = await resProducts.json();

      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const resMov = await fetch(
        `http://localhost:8080/products/inventory?start=${toLocalDateTimeParam(start)}&end=${toLocalDateTimeParam(end)}`
      );

      const movData = await resMov.json();
      const list = Array.isArray(movData) ? movData : movData.content || [];

      setProducts(productsData);
      setMovements(list);

      const grouped = {};

      list.forEach(item => {
        const id = item.product?.id;
        if (!grouped[id]) grouped[id] = 0;
        grouped[id] += item.quantity;
      });

      const result = productsData.map(p => ({
        name: p.name,
        change: grouped[p.id] || 0,
        finalStock: p.stock
      }));

      setSummary(result);
    };

    loadAll();
  }, [date]);

  const formattedDate = new Date(date).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const stats = useMemo(() => {
    const incoming = movements
      .filter(item => item.quantity > 0)
      .reduce((total, item) => total + item.quantity, 0);

    const outgoing = movements
      .filter(item => item.quantity < 0)
      .reduce((total, item) => total + Math.abs(item.quantity), 0);

    return [
      {
        label: "Productos",
        value: products.length,
        icon: Boxes,
        tone: "bg-slate-100 text-slate-700"
      },
      {
        label: "Entradas",
        value: incoming,
        icon: ArrowUpRight,
        tone: "bg-emerald-50 text-emerald-700"
      },
      {
        label: "Salidas",
        value: outgoing,
        icon: ArrowDownRight,
        tone: "bg-rose-50 text-rose-700"
      },
      {
        label: "Movimientos",
        value: movements.length,
        icon: ChartNoAxesColumnIncreasing,
        tone: "bg-amber-50 text-amber-700"
      }
    ];
  }, [movements, products.length]);

  const changeClass = (quantity) => {
    if (quantity > 0) return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    if (quantity < 0) return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
    return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:p-6">
      <div
        className="flex max-h-[96vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[20px] bg-[#f8fafc] shadow-2xl ring-1 ring-white/40"
        style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      >
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">
                <CalendarDays size={14} />
                {formattedDate}
              </div>

              <h2 className="m-0 text-2xl font-bold leading-tight text-slate-950">
                Reporte de inventario diario
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Resumen y trazabilidad de movimientos registrados para la fecha seleccionada.
              </p>
            </div>

            <button
              onClick={onClose}
              aria-label="Cerrar modal de inventario"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold leading-none text-slate-950">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:p-7">
          <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:min-h-[500px]">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h3 className="m-0 text-base font-bold text-slate-900">
                  Resumen del día
                </h3>
                <p className="text-xs text-slate-500">
                  Cambio acumulado y stock final por producto.
                </p>
              </div>
              <PackageSearch className="text-amber-500" size={20} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Producto</th>
                    <th className="px-4 py-3 text-center font-semibold">Cambio</th>
                    <th className="px-4 py-3 text-center font-semibold">Stock final</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {summary.map((item, i) => (
                    <tr key={i} className="transition hover:bg-amber-50/40">
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>

                      <td className="px-4 py-3 text-center font-bold">
                        <span className={`inline-flex min-w-14 justify-center rounded-full px-3 py-1 text-xs font-bold ${changeClass(item.change)}`}>
                          {item.change > 0 ? "+" : ""}
                          {item.change}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-slate-900">
                        {item.finalStock}
                      </td>
                    </tr>
                  ))}

                  {summary.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={3}>
                        No hay productos para mostrar en este reporte.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h3 className="m-0 text-base font-bold text-slate-900">
                  Movimientos del día
                </h3>
                <p className="text-xs text-slate-500">
                  Registro cronológico de entradas y salidas.
                </p>
              </div>
              <ChartNoAxesColumnIncreasing className="text-amber-500" size={20} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Producto</th>
                    <th className="px-4 py-3 text-center font-semibold">Cambio</th>
                    <th className="px-4 py-3 text-center font-semibold">Hora</th>
                    <th className="px-4 py-3 text-center font-semibold">Usuario</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {movements.map(item => (
                    <tr key={item.id} className="transition hover:bg-amber-50/40">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {item.product?.name}
                      </td>

                      <td className="px-4 py-3 text-center font-bold">
                        <span className={`inline-flex min-w-14 justify-center rounded-full px-3 py-1 text-xs font-bold ${changeClass(item.quantity)}`}>
                          {item.quantity > 0 ? "+" : ""}
                          {item.quantity}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center text-slate-500">
                        {new Date(item.lastUpdate).toLocaleTimeString()}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                          <UserRound size={13} />
                          {item.user?.nombre || "Admin"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {movements.length === 0 && (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-400" colSpan={4}>
                        No hay movimientos registrados para este día.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function toLocalDateTimeParam(date) {
  const pad = (value, size = 2) => String(value).padStart(size, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}
