import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import logo from "../assets/delissa_Logo.png";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Pencil,
  Printer,
  ReceiptText,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  TrendingUp,
  X,
  XCircle
} from "lucide-react";

const API = "http://localhost:8080";

export default function Invoices({ formatCOP, user }) {
  const money = formatCOP || formatCurrency;
  const [sales, setSales] = useState([]);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [exactDate, setExactDate] = useState("");
  const [editedFilter, setEditedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editInvoice, setEditInvoice] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);

    try {
      const [salesRes, invoicesRes] = await Promise.all([
        fetch(`${API}/sales`),
        fetch(`${API}/invoices`)
      ]);

      const salesData = await salesRes.json();
      const invoicesData = invoicesRes.ok ? await invoicesRes.json() : [];

      setSales(Array.isArray(salesData) ? salesData : []);
      setClientInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (error) {
      console.error(error);
      setSales([]);
      setClientInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const invoiceRows = useMemo(() => {
    const invoiceBySaleId = new Map(
      clientInvoices
        .filter(invoice => invoice.sale?.id)
        .map(invoice => [invoice.sale.id, invoice])
    );

    const rows = sales.map(sale => normalizeInvoiceRow(sale, invoiceBySaleId.get(sale.id)));

    clientInvoices.forEach(invoice => {
      if (invoice.sale?.id && !sales.some(sale => sale.id === invoice.sale.id)) {
        rows.push(normalizeInvoiceRow(invoice.sale, invoice));
      }
    });

    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [clientInvoices, sales]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const today = startOfDay(new Date());

    return invoiceRows.filter(invoice => {
      const invoiceDate = new Date(invoice.date);
      const matchesSearch =
        !term ||
        invoice.number.toLowerCase().includes(term) ||
        invoice.clientName.toLowerCase().includes(term) ||
        invoice.nit.toLowerCase().includes(term) ||
        invoice.transactionId.toLowerCase().includes(term) ||
        invoice.items.some(item => item.productName?.toLowerCase().includes(term));

      const matchesType = typeFilter === "all" || invoice.type === typeFilter;
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      const matchesPayment = paymentFilter === "all" || invoice.paymentMethod === paymentFilter;
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "today" && sameDay(invoiceDate, today)) ||
        (dateFilter === "week" && diffDays(today, invoiceDate) <= 7) ||
        (dateFilter === "month" && diffDays(today, invoiceDate) <= 30) ||
        (dateFilter === "exact" && exactDate && sameDay(invoiceDate, new Date(`${exactDate}T00:00:00`)));

      const matchesEdited =
        editedFilter === "all" ||
        (editedFilter === "edited" && invoice.lastEditedAt) ||
        (editedFilter === "not-edited" && !invoice.lastEditedAt);

      return matchesSearch && matchesType && matchesStatus && matchesPayment && matchesDate && matchesEdited;
    });
  }, [dateFilter, exactDate, editedFilter, invoiceRows, paymentFilter, search, statusFilter, typeFilter]);

  useEffect(() => {
    if (!filteredRows.length) {
      setSelectedId(null);
      return;
    }

    if (!filteredRows.some(invoice => invoice.id === selectedId)) {
      setSelectedId(filteredRows[0].id);
    }
  }, [filteredRows, selectedId]);

  const selectedInvoice = filteredRows.find(invoice => invoice.id === selectedId) || filteredRows[0];

  const totals = useMemo(() => {
    const billed = filteredRows.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const paid = filteredRows.filter(invoice => invoice.status === "PAID").length;
    const cancelled = filteredRows.filter(invoice => invoice.status === "CANCELLED").length;
    const business = filteredRows.filter(invoice => invoice.type === "EMPRESARIAL").length;

    return { billed, paid, cancelled, business };
  }, [filteredRows]);

  const typeCounters = useMemo(() => ({
    all: invoiceRows.length,
    normal: invoiceRows.filter(invoice => invoice.type === "NORMAL").length,
    business: invoiceRows.filter(invoice => invoice.type === "EMPRESARIAL").length
  }), [invoiceRows]);

  const exportCsv = () => {
    const rows = [
      ["Factura", "Fecha", "Cliente", "NIT", "Tipo", "Estado", "Pago", "Subtotal", "Impuesto", "Total"],
      ...filteredRows.map(invoice => [
        invoice.number,
        formatDateTime(invoice.date),
        invoice.clientName,
        invoice.nit,
        typeLabel(invoice.type),
        statusLabel(invoice.status),
        paymentLabel(invoice.paymentMethod),
        invoice.subtotal,
        invoice.tax,
        invoice.total
      ])
    ];

    const csv = rows
      .map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `facturas-delissa-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printInvoice = () => {
    window.print();
  };

  const copyInvoice = async () => {
    if (!selectedInvoice) return;
    await navigator.clipboard.writeText(`${selectedInvoice.number} - ${selectedInvoice.clientName} - ${money(selectedInvoice.total)}`);
  };

  const cancelInvoice = async () => {
    if (!selectedInvoice) return;
    const shouldCancel = window.confirm("Se anulara la factura y se devolvera el stock vendido. ¿Continuar?");
    if (!shouldCancel) return;

    await fetch(`${API}/invoices/${selectedInvoice.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastEditedBy: user?.id ? { id: user.id } : null,
        lastEditReason: "Anulacion de factura"
      })
    });
    await loadInvoices();
  };

  const saveInvoice = async (draft) => {
    const original = invoiceRows.find(invoice => invoice.id === draft.id);
    const itemsChanged = original ? haveItemsChanged(original.items, draft.items) : true;
    const payload = {
      invoiceType: draft.type,
      paymentMethod: draft.paymentMethod,
      status: draft.status,
      clientInvoice: draft.type === "EMPRESARIAL"
        ? {
            clientName: draft.clientName,
            nit: draft.nit,
            email: draft.email,
            address: draft.address
          }
        : null,
      lastEditedBy: user?.id ? { id: user.id } : null,
      lastEditReason: draft.lastEditReason || "Edicion de factura",
      details: itemsChanged
        ? draft.items.map(item => ({
            quantity: Number(item.quantity || 0),
            product: { id: item.productId }
          }))
        : null
    };

    const res = await fetch(`${API}/invoices/${draft.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      alert("No se pudo guardar la factura. Revisa stock y cantidades.");
      return;
    }

    setEditInvoice(null);
    await loadInvoices();
  };

  return (
    <div
      className="min-h-full rounded-[28px] bg-slate-100 p-4 text-slate-900"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <section className="mb-5 overflow-hidden rounded-[24px] border border-orange-200 bg-gradient-to-r from-[#FF9F1C] via-[#ff7a1a] to-[#FF4040] px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1 xl:max-w-[430px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white ring-1 ring-white/35">
              <ReceiptText size={14} />
              Facturacion
            </span>
            <h1 className="m-0 mt-3 break-words text-3xl font-bold leading-tight tracking-tight text-white">Centro de facturas</h1>
            <p className="mt-1 max-w-3xl break-words text-sm font-semibold leading-relaxed text-white/90">
              Gestiona facturas normales y empresariales, edita datos y revierte inventario cuando una venta se anula.
            </p>
          </div>

          <div className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 gap-4 xl:max-w-[560px]">
            <HeaderMetric label="Facturado" value={money(totals.billed)} icon={TrendingUp} />
            <HeaderMetric label="Pagadas" value={totals.paid} icon={CheckCircle2} />
            <HeaderMetric label="Anuladas" value={totals.cancelled} icon={XCircle} />
            <HeaderMetric label="Empresariales" value={totals.business} icon={Building2} />
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-[24px] border border-slate-200 bg-[#f8fafc] p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3">
          <div className="w-fit rounded-2xl bg-gradient-to-r from-[#FF9F1C] to-[#FF4040] p-[1px] shadow-sm">
          <div className="inline-flex rounded-2xl bg-white p-1">
            <TypeButton label="Todas" count={typeCounters.all} active={typeFilter === "all"} onClick={() => setTypeFilter("all")} />
            <TypeButton label="Normales" count={typeCounters.normal} active={typeFilter === "NORMAL"} onClick={() => setTypeFilter("NORMAL")} />
            <TypeButton label="Empresariales" count={typeCounters.business} active={typeFilter === "EMPRESARIAL"} onClick={() => setTypeFilter("EMPRESARIAL")} />
          </div>
          </div>

          <div className="flex flex-wrap justify-between gap-3">
          <p className="m-0 text-sm font-semibold text-slate-500">
            Vista separada para facturas normales y empresariales.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadInvoices}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCcw size={16} />
              Actualizar
            </button>
            <button
              onClick={exportCsv}
              disabled={!filteredRows.length}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF9F1C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e68900] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Download size={16} />
              CSV
            </button>
          </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_180px_180px_180px_180px_180px]">
          <div className="relative rounded-2xl bg-gradient-to-r from-[#FF9F1C] to-[#FF4040] p-[1px] shadow-sm">
            <Search className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#FF9F1C]" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar factura, cliente, NIT, producto..."
              className="h-11 w-full rounded-2xl border-0 bg-white pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <SelectControl value={statusFilter} onChange={setStatusFilter}>
            <option value="all">Todos los estados</option>
            <option value="PAID">Pagadas</option>
            <option value="PENDING">Pendientes</option>
            <option value="CANCELLED">Anuladas</option>
          </SelectControl>

          <SelectControl value={paymentFilter} onChange={setPaymentFilter}>
            <option value="all">Todos los pagos</option>
            <option value="CASH">Efectivo</option>
            <option value="CARD">Tarjeta</option>
            <option value="NEQUI">Nequi</option>
          </SelectControl>

          <SelectControl value={dateFilter} onChange={setDateFilter}>
            <option value="all">Todo el tiempo</option>
            <option value="today">Hoy</option>
            <option value="week">Ultimos 7 dias</option>
            <option value="month">Ultimos 30 dias</option>
            <option value="exact">Fecha especifica</option>
          </SelectControl>

          {user?.rol === "admin" && (
            <SelectControl value={editedFilter} onChange={setEditedFilter}>
              <option value="all">Todas las facturas</option>
              <option value="edited">Editadas</option>
              <option value="not-edited">No editadas</option>
            </SelectControl>
          )}

          <input
            type="date"
            value={exactDate}
            onChange={(e) => {
              setExactDate(e.target.value);
              setDateFilter("exact");
            }}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
          />
        </div>
      </section>

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <main className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="m-0 text-base font-bold text-slate-950">Bandeja de facturas</h2>
              <p className="text-sm text-slate-500">{filteredRows.length} registros visibles {loading ? "cargando..." : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => selectedInvoice && setEditInvoice(cloneInvoiceForEdit(selectedInvoice))}
                disabled={!selectedInvoice}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF9F1C] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#e68900] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Pencil size={15} />
                Editar
              </button>
              <button
                onClick={cancelInvoice}
                disabled={!selectedInvoice || selectedInvoice.status === "CANCELLED"}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw size={15} />
                Anular stock
              </button>
              <CalendarDays size={20} className="text-slate-400" />
            </div>
          </div>

          <div className="overflow-hidden">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[19%]" />
                <col className="w-[19%]" />
                <col className="w-[14%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[6%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-[0_1px_0_#e2e8f0]">
                <tr>
                  <th className="px-4 py-3 text-left font-black">Factura</th>
                  <th className="px-4 py-3 text-left font-black">Cliente</th>
                  <th className="px-4 py-3 text-left font-black">NIT / Contacto</th>
                  <th className="px-4 py-3 text-left font-black">Fecha</th>
                  <th className="px-4 py-3 text-left font-black">Pago</th>
                  <th className="px-4 py-3 text-center font-black">Estado</th>
                  <th className="px-4 py-3 text-center font-black">Items</th>
                  <th className="px-4 py-3 text-right font-black">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map(invoice => (
                  <tr
                    key={invoice.id}
                    onClick={() => setSelectedId(invoice.id)}
                    className={`cursor-pointer transition hover:bg-orange-50/70 ${
                      selectedInvoice?.id === invoice.id ? "bg-orange-50" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="break-words font-black leading-snug text-slate-950">{invoice.number}</div>
                      <div className="break-words text-xs font-semibold text-orange-600">{typeLabel(invoice.type)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="break-words font-bold leading-snug text-slate-800">{invoice.clientName}</div>
                      <div className="break-all text-xs leading-snug text-slate-400">{shortId(invoice.transactionId)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="break-words font-semibold leading-snug text-slate-600">{invoice.nit || "Sin NIT"}</div>
                      <div className="break-words text-xs leading-snug text-slate-400">{invoice.email || invoice.address || "Sin contacto"}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600">{formatDateTime(invoice.date)}</td>
                    <td className="px-4 py-3 align-top"><PaymentBadge method={invoice.paymentMethod} /></td>
                    <td className="px-4 py-3 align-top text-center"><StatusBadge status={invoice.status} /></td>
                    <td className="px-4 py-3 align-top text-center">
                      <span className="inline-flex min-w-10 justify-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                        {invoice.items.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right font-black leading-snug text-slate-950">{money(invoice.total)}</td>
                  </tr>
                ))}

                {!filteredRows.length && (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center text-sm text-slate-400">
                      No hay facturas con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>

        <InvoiceDetail
          invoice={selectedInvoice}
          money={money}
          user={user}
          onCopy={copyInvoice}
          onPrint={printInvoice}
        />
      </div>

      {editInvoice && (
        <InvoiceEditModal
          invoice={editInvoice}
          money={money}
          onChange={setEditInvoice}
          onClose={() => setEditInvoice(null)}
          onSubmit={() => saveInvoice(editInvoice)}
        />
      )}
    </div>
  );
}

function InvoiceDetail({ invoice, money, user, onCopy, onPrint }) {
  if (!invoice) {
    return (
      <aside className="rounded-[24px] border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
        <FileText className="mx-auto mb-3 text-slate-400" size={28} />
        <h2 className="m-0 text-base font-bold text-slate-900">Selecciona una factura</h2>
        <p className="mt-1 text-sm text-slate-500">Aqui veras los datos del cliente, productos y acciones.</p>
      </aside>
    );
  }

  const plainFormat = (value) => {
    if (value === null || value === undefined) return "0";
    return new Intl.NumberFormat("es-CO").format(Number(value));
  };

  const ivaRate = invoice.subtotal > 0 ? Math.round((invoice.tax / invoice.subtotal) * 100) : 0;

  return (
    <>
      <aside
        id="invoice-print"
        className="sticky top-4 flex max-h-[calc(100vh-2rem)] min-h-[calc(100vh-2rem)] self-start overflow-hidden rounded-[24px] border border-slate-300 bg-[#e8edf3] p-5 shadow-sm"
      >
        <div className="flex min-h-0 w-full flex-col">
          <div className="shrink-0">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-700 ring-1 ring-orange-200">
                  {typeLabel(invoice.type)}
                </span>
                <h2 className="m-0 mt-3 text-2xl font-black tracking-tight text-slate-950">{invoice.number}</h2>
                <p className="text-sm text-slate-500">{formatDateTime(invoice.date)}</p>
              </div>
              <StatusBadge status={invoice.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Cliente" value={invoice.clientName} panel />
              <MiniStat label="NIT" value={invoice.nit || "No aplica"} panel />
              <MiniStat label="Pago" value={paymentLabel(invoice.paymentMethod)} panel />
              <MiniStat label="Transaccion" value={shortId(invoice.transactionId)} panel />
            </div>

            {invoice.lastEditedAt && (
              <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Ultima edicion</p>
                <p className="mt-1 font-bold text-slate-900">{invoice.lastEditedBy?.nombre || "Usuario no registrado"}</p>
                <p className="text-xs font-semibold text-slate-500">{formatDateTime(invoice.lastEditedAt)}</p>
                {invoice.lastEditReason && <p className="mt-2 text-sm font-semibold text-slate-600">{invoice.lastEditReason}</p>}
              </div>
            )}

            {(invoice.email || invoice.address) && (
              <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                {invoice.email && <p className="font-bold">{invoice.email}</p>}
                {invoice.address && <p>{invoice.address}</p>}
              </div>
            )}
          </div>

          <div className="mt-5 min-h-0 flex-1">
            <h3 className="m-0 mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Productos vendidos</h3>
            <div className="h-full space-y-2 overflow-y-auto pr-1">
              {invoice.items.map(item => (
                <div key={item.id || item.productName} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="m-0 break-words text-sm font-bold leading-snug text-slate-850">{item.productName || "Producto"}</p>
                      <p className="break-words text-xs leading-snug text-slate-400">{item.quantity} x {money(item.unitPrice)}</p>
                    </div>
                    <span className="shrink-0 font-black text-slate-950">{money(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 shrink-0">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <TotalLine label="Subtotal" value={money(invoice.subtotal)} />
              <TotalLine label="Impuesto" value={money(invoice.tax)} />
              <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-3">
                <span className="text-sm font-semibold text-white/70">Total</span>
                <span className="text-2xl font-black">{money(invoice.total)}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <ActionButton onClick={onPrint} icon={Printer} label="Imprimir" tone="dark" />
              <ActionButton onClick={onCopy} icon={Copy} label="Copiar" tone="light" />
            </div>
          </div>
        </div>
      </aside>

      {createPortal(
        <div
          id="receipt"
          className="receipt-print-hidden bg-white w-[300px] p-4 text-[12px] font-mono text-black"
        >
          <div className="text-center mb-2">
            <img src={logo} alt="logo" className="w-20 mb-2 mx-auto" />
            <p className="font-bold text-sm">DELISSA S.A.S</p>
          </div>

          <div className="text-left text-[11px]">
            <p>NIT: 21.176.659</p>
            <p>Villavicencio - Meta</p>
            <p>Tel: 314 451 9180</p>
            {user?.nombre && <p className="mt-1 text-[10px]">Vendedor: {user.nombre}</p>}
          </div>

          {invoice.type === "EMPRESARIAL" && invoice.clientName && (
            <>
              <hr className="border-dashed border-gray-400 my-2" />
              <div className="mb-1">
                <p className="font-bold text-[10px] uppercase">Cliente empresarial</p>
                <p className="text-[11px]">{invoice.clientName}</p>
                {invoice.nit && <p className="text-[11px]">NIT: {invoice.nit}</p>}
                {invoice.email && <p className="text-[11px]">{invoice.email}</p>}
                {invoice.address && <p className="text-[11px]">{invoice.address}</p>}
              </div>
            </>
          )}

          <hr className="border-dashed border-gray-400 my-2" />

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Factura:</span>
              <span>{invoice.number}</span>
            </div>
            <div className="flex justify-between">
              <span>Fecha:</span>
              <span>{formatDateTime(invoice.date)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pago:</span>
              <span>{paymentLabel(invoice.paymentMethod)}</span>
            </div>
          </div>

          <hr className="border-dashed border-gray-400 my-2" />

          <div>
            <div className="flex justify-between font-bold text-[11px]">
              <span>Producto</span>
              <span>Total</span>
            </div>

            {invoice.items.map((item, i) => (
              <div key={i} className="mb-1">
                <div className="flex justify-between">
                  <span>{item.productName}</span>
                  <span>{plainFormat(item.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>{item.quantity} x {plainFormat(item.unitPrice)}</span>
                </div>
              </div>
            ))}
          </div>

          <hr className="border-dashed border-gray-400 my-2" />

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{plainFormat(invoice.subtotal)}</span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>IVA ({ivaRate}%):</span>
              <span>{plainFormat(invoice.tax)}</span>
            </div>

            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{plainFormat(invoice.total)}</span>
            </div>
          </div>

          <hr className="border-dashed border-gray-400 my-2" />

          <div className="text-center text-[10px] mt-2">
            <p>Gracias por tu compra</p>
            <p className="mt-2 text-[9px] text-gray-400">Los productos no tienen cambio ni devolucion.</p>
            <p className="text-[9px] text-gray-400">&copy; 2026 DELISSA S.A.S - Todos los derechos reservados.</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function InvoiceEditModal({ invoice, money, onChange, onClose, onSubmit }) {
  const total = invoice.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);

  const updateItem = (index, value) => {
    const items = invoice.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, quantity: value } : item
    );
    onChange({ ...invoice, items });
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-[820px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">
              <Pencil size={14} />
              Editar factura
            </span>
            <h2 className="m-0 mt-3 text-2xl font-black text-slate-950">{invoice.number}</h2>
            <p className="text-sm text-slate-500">Al cambiar cantidades se revierte el stock anterior y se aplica el nuevo.</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-160px)] overflow-y-auto px-6 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            <FieldSelect label="Tipo" value={invoice.type} onChange={(value) => onChange({ ...invoice, type: value })}>
              <option value="NORMAL">Normal</option>
              <option value="EMPRESARIAL">Empresarial</option>
            </FieldSelect>
            <FieldSelect label="Pago" value={invoice.paymentMethod} onChange={(value) => onChange({ ...invoice, paymentMethod: value })}>
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta</option>
              <option value="NEQUI">Nequi</option>
            </FieldSelect>
            <FieldSelect label="Estado" value={invoice.status} onChange={(value) => onChange({ ...invoice, status: value })}>
              <option value="PAID">Pagada</option>
              <option value="PENDING">Pendiente</option>
              <option value="CANCELLED">Anulada</option>
            </FieldSelect>
          </div>

          {invoice.type === "EMPRESARIAL" && (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="Empresa" value={invoice.clientName} onChange={(value) => onChange({ ...invoice, clientName: value })} />
              <Field label="NIT" value={invoice.nit} onChange={(value) => onChange({ ...invoice, nit: value })} />
              <Field label="Correo" value={invoice.email} onChange={(value) => onChange({ ...invoice, email: value })} />
              <Field label="Direccion" value={invoice.address} onChange={(value) => onChange({ ...invoice, address: value })} />
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="m-0 text-sm font-black uppercase tracking-wide text-slate-500">Productos</h3>
              <span className="text-sm font-black text-slate-950">{money(total)}</span>
            </div>

            <div className="divide-y divide-slate-100">
              {invoice.items.map((item, index) => (
                <div key={item.id || item.productName} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_minmax(120px,140px)] md:items-center">
                  <div>
                    <p className="m-0 break-words text-sm font-bold leading-snug text-slate-900">{item.productName}</p>
                    <p className="break-words text-xs leading-snug text-slate-400">{money(item.unitPrice)} por unidad</p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-sm font-bold text-slate-700 outline-none focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                  <p className="break-words text-right text-sm font-black leading-snug text-slate-950">{money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</p>
                </div>
              ))}
            </div>
          </div>

          {invoice.status === "CANCELLED" && (
            <div className="mt-4 flex gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-100">
              <AlertTriangle size={18} className="shrink-0" />
              <p>Guardar como anulada devolvera el stock vendido si todavia no estaba anulada.</p>
            </div>
          )}

          <div className="mt-4">
            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Motivo de edicion</span>
              <textarea
                value={invoice.lastEditReason || ""}
                onChange={(e) => onChange({ ...invoice, lastEditReason: e.target.value })}
                rows={3}
                className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
                placeholder="Ej: correccion de cantidad, cambio de datos del cliente, anulacion solicitada..."
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={onSubmit} className="inline-flex items-center gap-2 rounded-xl bg-[#FF9F1C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e68900]">
            <Save size={16} />
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function HeaderMetric({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
      <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 text-xs font-bold uppercase leading-tight tracking-wide text-slate-400">
          {label}
        </span>
        <Icon size={17} className="shrink-0 text-[#FF9F1C]" />
      </div>
      <p className="m-0 whitespace-nowrap text-2xl font-black leading-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TypeButton({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
        active ? "bg-[#FF9F1C] text-white shadow-sm" : "text-slate-500 hover:bg-white"
      }`}
    >
      {label}
      <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>
        {count}
      </span>
    </button>
  );
}

function SelectControl({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
    >
      {children}
    </select>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

function FieldSelect({ label, value, onChange, children }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
      >
        {children}
      </select>
    </label>
  );
}

function ActionButton({ onClick, icon: Icon, label, tone, disabled = false }) {
  const tones = {
    amber: "bg-[#FF9F1C] text-white hover:bg-[#e68900]",
    dark: "bg-slate-950 text-white hover:bg-slate-800",
    light: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
    danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-100 hover:bg-rose-100"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-100"
  };

  return (
    <span className={`inline-flex min-w-24 items-center justify-center rounded-full px-2.5 py-1 text-center text-xs font-black leading-tight ring-1 ${styles[status] || styles.PENDING}`}>
      {statusLabel(status)}
    </span>
  );
}

function PaymentBadge({ method }) {
  return (
    <span className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black leading-tight text-slate-600">
      <Banknote size={13} />
      <span className="break-words">{paymentLabel(method)}</span>
    </span>
  );
}

function MiniStat({ label, value, panel = false }) {
  return (
    <div className={`rounded-2xl p-3 ${panel ? "bg-white ring-1 ring-slate-200" : "bg-slate-50"}`}>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function TotalLine({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/65">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function normalizeInvoiceRow(sale, clientInvoice) {
  const type = sale.invoiceType || (clientInvoice ? "EMPRESARIAL" : "NORMAL");

  return {
    id: sale.id,
    number: clientInvoice?.invoiceNumber || `REC-${String(sale.id || "0").padStart(5, "0")}`,
    date: sale.date,
    type,
    status: sale.status || "PAID",
    paymentMethod: sale.paymentMethod || "CASH",
    transactionId: sale.transactionId || "",
    clientName: clientInvoice?.clientName || "Consumidor final",
    nit: clientInvoice?.nit || "",
    email: clientInvoice?.email || "",
    address: clientInvoice?.address || "",
    subtotal: Number(sale.subtotal || 0),
    tax: Number(sale.tax || 0),
    total: Number(sale.total || 0),
    items: Array.isArray(sale.details)
      ? sale.details.map(item => ({
          ...item,
          productId: item.product?.id,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          subtotal: Number(item.subtotal || 0)
        }))
      : [],
    lastEditedAt: sale.lastEditedAt || null,
    lastEditReason: sale.lastEditReason || "",
    lastEditedBy: sale.lastEditedBy || null
  };
}

function cloneInvoiceForEdit(invoice) {
  if (!invoice) return null;
  return {
    ...invoice,
    items: invoice.items.map(item => ({ ...item }))
  };
}

function haveItemsChanged(originalItems, draftItems) {
  if (originalItems.length !== draftItems.length) return true;

  return draftItems.some((draftItem, index) => {
    const originalItem = originalItems[index];
    return (
      Number(originalItem?.quantity || 0) !== Number(draftItem.quantity || 0) ||
      Number(originalItem?.productId || 0) !== Number(draftItem.productId || 0)
    );
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function statusLabel(status) {
  const labels = {
    PAID: "Pagada",
    PENDING: "Pendiente",
    CANCELLED: "Anulada"
  };
  return labels[status] || "Pendiente";
}

function paymentLabel(method) {
  const labels = {
    CASH: "Efectivo",
    CARD: "Tarjeta",
    NEQUI: "Nequi"
  };
  return labels[method] || "Efectivo";
}

function typeLabel(type) {
  return type === "EMPRESARIAL" ? "Empresarial" : "Normal";
}

function shortId(value) {
  if (!value) return "N/A";
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function sameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function diffDays(a, b) {
  const day = 24 * 60 * 60 * 1000;
  return Math.abs(startOfDay(a) - startOfDay(b)) / day;
}
