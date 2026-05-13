import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Eye,
  Image,
  Minus,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  X
} from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import InventoryModal from "./InventoryModal";

const API = "http://localhost:8080";
const LOW_STOCK_LIMIT = 5;

const emptyProduct = {
  name: "",
  price: "",
  category: "",
  subCategory: "",
  stock: 0,
  img: ""
};

const emptyProductionItem = {
  name: "",
  category: "",
  unit: "kg",
  stock: 0,
  minStock: 0,
  cost: "",
  supplier: "",
  supplierContact: "",
  packageName: "",
  unitsPerPackage: "",
  productLinks: [],
  notes: ""
};

export default function Stock({ user }) {
  const isAdmin = user?.rol === "admin";
  const [inventoryMode, setInventoryMode] = useState("local");
  const [products, setProducts] = useState([]);
  const [originalProducts, setOriginalProducts] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [date, setDate] = useState(new Date());
  const [history, setHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [openInventoryModal, setOpenInventoryModal] = useState(false);
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [stockPrintHtml, setStockPrintHtml] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      const res = await fetch(`${API}/products`);
      const data = await res.json();
      setProducts(data);
      setOriginalProducts(data);
      setDirty(false);
    };

    loadProducts();
  }, []);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const start = new Date();
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    try {
      const res = await fetch(
        `${API}/products/inventory?start=${toLocalDateTimeParam(start)}&end=${toLocalDateTimeParam(end)}`
      );
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : data.content || []);
    } catch {
      setHistory([]);
    }
  };

  const categories = useMemo(() => {
    const names = products.map(p => p.category).filter(Boolean);
    return ["all", ...new Set(names)];
  }, [products]);

  const modifiedCount = useMemo(() => {
    const originalById = new Map(originalProducts.map(product => [product.id, product.stock]));
    return products.filter(product => originalById.get(product.id) !== product.stock).length;
  }, [originalProducts, products]);

  const stockStats = useMemo(() => {
    const inventoryValue = products.reduce(
      (total, product) => total + Number(product.price || 0) * Number(product.stock || 0),
      0
    );
    const lowStock = products.filter(product => Number(product.stock) <= LOW_STOCK_LIMIT).length;
    const outOfStock = products.filter(product => Number(product.stock) <= 0).length;

    return [
      {
        label: "Productos",
        value: products.length,
        icon: Package,
        tone: "bg-slate-100 text-slate-700"
      },
      {
        label: "Stock bajo",
        value: lowStock,
        icon: AlertTriangle,
        tone: "bg-amber-50 text-amber-700"
      },
      {
        label: "Agotados",
        value: outOfStock,
        icon: Archive,
        tone: "bg-rose-50 text-rose-700"
      },
      {
        label: "Valor inventario",
        value: formatCOP(inventoryValue),
        icon: BarChart3,
        tone: "bg-emerald-50 text-emerald-700"
      }
    ];
  }, [products]);

  const filtered = useMemo(() => {
    return products
      .filter(product => {
        const matchesCategory = category === "all" || product.category === category;
        const matchesSearch = product.name?.toLowerCase().includes(search.toLowerCase());
        const matchesStock =
          stockFilter === "all" ||
          (stockFilter === "low" && Number(product.stock) <= LOW_STOCK_LIMIT) ||
          (stockFilter === "out" && Number(product.stock) <= 0);

        return matchesCategory && matchesSearch && matchesStock;
      })
      .sort((a, b) => {
        if (sortBy === "stock") return Number(a.stock) - Number(b.stock);
        if (sortBy === "price") return Number(b.price) - Number(a.price);
        return a.name.localeCompare(b.name);
      });
  }, [category, products, search, sortBy, stockFilter]);

  const filteredHistory = history.filter(item =>
    item.product?.name?.toLowerCase().includes(historySearch.toLowerCase())
  );

  const filteredHistoryByDate = useMemo(() => {
    return history.filter(m => {
      const d = new Date(m.lastUpdate);
      return d.toDateString() === date.toDateString();
    });
  }, [history, date]);

  const selectedProductHistory = selectedProduct
    ? history.filter(item => item.product?.id === selectedProduct.id)
    : [];

  const printDailySummaryLocal = () => {
    const summary = filteredHistoryByDate.reduce((acc, m) => {
      const name = m.product?.name || "Sin nombre";
      if (!acc[name]) {
        acc[name] = { incoming: 0, outgoing: 0, movements: [] };
      }
      if (m.quantity > 0) acc[name].incoming += m.quantity;
      else acc[name].outgoing += Math.abs(m.quantity);
      acc[name].movements.push(m);
      return acc;
    }, {});

    const cleanup = () => {
      document.body.classList.remove("stock-print-mode");
      window.removeEventListener("afterprint", cleanup);
    };

    setStockPrintHtml(`
      <h1>Resumen de Movimientos - Productos Local</h1>
      <p class="date">${date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      <table>
        <thead><tr><th>Producto</th><th>Entradas</th><th>Salidas</th><th>Hora</th><th>Usuario</th><th>Motivo</th></tr></thead>
        <tbody>
          ${Object.entries(summary).map(([name, data]) =>
            data.movements.map(m => `
              <tr class="summary-row">
                <td>${name}</td>
                <td class="in">${m.quantity > 0 ? `+${m.quantity}` : "-"}</td>
                <td class="out">${m.quantity < 0 ? `${m.quantity}` : "-"}</td>
                <td>${new Date(m.lastUpdate).toLocaleTimeString("es-CO")}</td>
                <td>${m.user?.nombre || "Sistema"}</td>
                <td>${m.reason || "-"}</td>
              </tr>
            `).join("")
          ).join("")}
        </tbody>
      </table>
    `);
    document.body.classList.add("stock-print-mode");
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 600);
    }, 80);
  };

  const deleteProduct = async (id) => {
    if (!isAdmin) return alert("Solo un administrador puede eliminar productos.");
    const shouldDelete = window.confirm("¿Quieres eliminar este producto del inventario?");
    if (!shouldDelete) return;

    await fetch(`${API}/products/${id}`, {
      method: "DELETE"
    });

    const res = await fetch(`${API}/products`);
    const data = await res.json();
    setProducts(data);
    setOriginalProducts(data);
    setSelectedProduct(prev => prev?.id === id ? null : prev);
    setDirty(false);
  };

  const saveInventory = async () => {
    const userIdParam = user?.id ? `?userId=${user.id}` : "";
    await fetch(`${API}/products/bulk-update${userIdParam}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products)
    });

    alert("Inventario guardado");
    setOriginalProducts(products);
    setDirty(false);

    loadHistory();
  };

  const createProduct = async () => {
    try {
      const res = await fetch(`${API}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProduct,
          price: Number(newProduct.price),
          stock: Number(newProduct.stock)
        })
      });

      const created = await res.json();

      setProducts(prev => [...prev, created]);
      setOriginalProducts(prev => [...prev, created]);
      localStorage.setItem("reloadProducts", Date.now());
      setNewProduct(emptyProduct);
      setOpenModal(false);
    } catch (err) {
      console.error(err);
      alert("Error creando producto");
    }
  };

  const updateProductDetails = async () => {
    if (!editProduct) return;

    try {
      const payload = {
        ...editProduct,
        price: Number(editProduct.price),
        stock: Number(editProduct.stock)
      };

      const res = await fetch(`${API}/products/${editProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const updated = await res.json();

      setProducts(prev =>
        prev.map(product => product.id === updated.id ? updated : product)
      );
      setOriginalProducts(prev =>
        prev.map(product => product.id === updated.id ? updated : product)
      );
      setSelectedProduct(prev => prev?.id === updated.id ? updated : prev);
      localStorage.setItem("reloadProducts", Date.now());
      setEditProduct(null);
    } catch (err) {
      console.error(err);
      alert("Error actualizando producto");
    }
  };

  const updateProductStock = (id, value) => {
    setDirty(true);
    setProducts(prev =>
      prev.map(product =>
        product.id === id
          ? { ...product, stock: Math.max(0, Number(value)) }
          : product
      )
    );
  };

  const adjustProductStock = (id, amount) => {
    setDirty(true);
    setProducts(prev =>
      prev.map(product =>
        product.id === id
          ? { ...product, stock: Math.max(0, Number(product.stock) + amount) }
          : product
      )
    );
  };

  const resetChanges = () => {
    setProducts(originalProducts);
    setDirty(false);
  };

  const formattedDate = date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  return (
    <div
      className="min-h-full text-slate-900"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <div className="mb-5 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => setInventoryMode("local")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
            inventoryMode === "local"
              ? "bg-[#FF9F1C] text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Productos local
        </button>
        <button
          onClick={() => setInventoryMode("production")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
            inventoryMode === "production"
              ? "bg-[#FF9F1C] text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Producción
        </button>
        <button
          onClick={() => setInventoryMode("suppliers")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
            inventoryMode === "suppliers"
              ? "bg-[#FF9F1C] text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Proveedores
        </button>
      </div>

      {inventoryMode === "production" ? (
        <ProductionInventoryView user={user} />
      ) : inventoryMode === "suppliers" ? (
        <SupplierView />
      ) : (
      <div className="grid min-h-full gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">
                <Package size={14} />
                Gestión de stock
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Inventario
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Controla existencias, revisa movimientos y actualiza productos desde una sola vista.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {dirty && (
                <button
                  onClick={resetChanges}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  <RefreshCcw size={16} />
                  Deshacer
                </button>
              )}

              <button
                disabled={!dirty}
                onClick={saveInventory}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                  dirty ? "bg-emerald-600 hover:bg-emerald-700" : "cursor-not-allowed bg-slate-300"
                }`}
              >
                <Save size={16} />
                Guardar {modifiedCount > 0 ? `(${modifiedCount})` : ""}
              </button>

              <button
                onClick={() => setOpenModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF9F1C] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e68900]"
              >
                <PackagePlus size={16} />
                Crear producto
              </button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stockStats.map(item => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                    <Icon size={19} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold leading-tight text-slate-950">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:w-[620px]">
                <SelectControl value={category} onChange={setCategory}>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item === "all" ? "Todas las categorías" : item}
                    </option>
                  ))}
                </SelectControl>

                <SelectControl value={stockFilter} onChange={setStockFilter}>
                  <option value="all">Todo el stock</option>
                  <option value="low">Stock bajo</option>
                  <option value="out">Agotados</option>
                </SelectControl>

                <SelectControl value={sortBy} onChange={setSortBy}>
                  <option value="name">Ordenar por nombre</option>
                  <option value="stock">Menor stock</option>
                  <option value="price">Mayor precio</option>
                </SelectControl>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <SlidersHorizontal size={15} />
              <span>{filtered.length} productos visibles</span>
              {dirty && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-100">
                  Hay cambios pendientes por guardar
                </span>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-[0_1px_0_#e2e8f0]">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold">Producto</th>
                    <th className="px-3 py-3 text-left font-semibold">Categoría</th>
                    <th className="px-3 py-3 text-left font-semibold">Subcategoría</th>
                    <th className="px-3 py-3 text-right font-semibold">Precio</th>
                    <th className="px-3 py-3 text-center font-semibold">Stock</th>
                    <th className="px-3 py-3 text-center font-semibold">Estado</th>
                    <th className="px-3 py-3 text-center font-semibold">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filtered.map(product => (
                    <tr key={product.id} className="transition hover:bg-amber-50/30">
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900">{product.name}</div>
                        <div className="text-xs text-slate-400">ID {product.id}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{product.category || "Sin categoría"}</td>
                      <td className="px-3 py-3 text-slate-600">{product.subCategory || "General"}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-800">
                        {formatCOP(product.price)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={product.stock}
                          onChange={(e) => updateProductStock(product.id, e.target.value)}
                          className={`h-9 w-16 rounded-xl border bg-white text-center font-bold outline-none transition focus:ring-4 ${
                            Number(product.stock) <= LOW_STOCK_LIMIT
                              ? "border-rose-200 text-rose-600 focus:ring-rose-100"
                              : "border-slate-200 text-slate-800 focus:border-amber-300 focus:ring-amber-100"
                          }`}
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StockBadge stock={product.stock} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <IconButton label="Ver detalle" tone="amber" onClick={() => setSelectedProduct(product)}>
                            <Eye size={15} />
                          </IconButton>
                          <IconButton label="Editar producto" tone="blue" onClick={() => setEditProduct({ ...emptyProduct, ...product })}>
                            <Pencil size={15} />
                          </IconButton>
                          <IconButton label="Restar stock" tone="rose" onClick={() => adjustProductStock(product.id, -1)}>
                            <Minus size={15} />
                          </IconButton>
                          <IconButton label="Sumar stock" tone="emerald" onClick={() => adjustProductStock(product.id, 1)}>
                            <Plus size={15} />
                          </IconButton>
                          {isAdmin && (
                            <IconButton label="Eliminar producto" tone="slate" onClick={() => deleteProduct(product.id)}>
                              <Trash2 size={15} />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        No hay productos que coincidan con los filtros actuales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        <aside className="sticky top-4 max-h-[calc(100vh-80px)] overflow-y-auto rounded-[24px] border border-slate-300 bg-[#e8edf3] p-4 shadow-[inset_1px_0_0_rgba(148,163,184,0.35)] sm:p-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-200/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 hover:[&::-webkit-scrollbar-thumb]:bg-slate-500">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Panel lateral
              </p>
              <h2 className="m-0 mt-1 text-lg font-bold text-slate-950">
                Control y seguimiento
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Consulta el calendario, historial y detalle del producto seleccionado.
              </p>
            </div>

            <ProductDetailPanel
              product={selectedProduct}
              movements={selectedProductHistory}
              onClose={() => setSelectedProduct(null)}
              onEdit={() => selectedProduct && setEditProduct({ ...emptyProduct, ...selectedProduct })}
            />

          <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 flex items-center gap-2 text-base font-bold text-slate-900">
                <CalendarDays size={18} className="text-amber-500" />
                Calendario
              </h2>
              <span className="text-xs font-semibold capitalize text-slate-400">{formattedDate}</span>
            </div>
            <div className="stock-calendar">
              <Calendar value={date} onChange={setDate} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
            <button
              onClick={() => setOpenInventoryModal(true)}
              className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF9F1C] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e68900]"
            >
              <BarChart3 size={17} />
              Ver inventario del día
            </button>

            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 flex items-center gap-2 text-base font-bold text-slate-900">
                <Clock3 size={18} className="text-amber-500" />
                Historial del día
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                {filteredHistoryByDate.length}
              </span>
            </div>

            <button
              onClick={printDailySummaryLocal}
              className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
            >
              <Printer size={15} />
              Imprimir resumen
            </button>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                placeholder="Buscar movimiento..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
              />
            </div>

            <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
              {filteredHistoryByDate.map(item => (
                <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-800">{item.product?.name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(item.lastUpdate).toLocaleTimeString("es-CO")}
                      </p>
                      {item.user?.nombre && (
                        <p className="text-xs font-semibold text-slate-500">
                          {item.user.nombre}
                        </p>
                      )}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      item.quantity > 0
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                        : "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                    }`}>
                      {item.quantity > 0 ? "+" : ""}
                      {item.quantity}
                    </span>
                  </div>
                </div>
              ))}

              {filteredHistoryByDate.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                  No hay movimientos para este día.
                </div>
              )}
            </div>
          </section>
          </div>
        </aside>
      </div>
      )}

      {openModal && (
        <ProductFormModal
          title="Crear producto"
          eyebrow="Nuevo producto"
          description="Agrega el producto al catálogo de inventario."
          product={newProduct}
          onChange={setNewProduct}
          onClose={() => setOpenModal(false)}
          onSubmit={createProduct}
          submitLabel="Crear"
          products={products}
        />
      )}

      {editProduct && (
        <ProductFormModal
          title="Editar producto"
          eyebrow="Datos del producto"
          description="Actualiza nombre, precio, categoría, subcategoría e imagen."
          product={editProduct}
          onChange={setEditProduct}
          onClose={() => setEditProduct(null)}
          onSubmit={updateProductDetails}
          submitLabel="Guardar cambios"
          lockStock
          products={products}
        />
      )}

      {openInventoryModal && (
        <InventoryModal
          date={date}
          onClose={() => setOpenInventoryModal(false)}
        />
      )}

      <section className="stock-print-summary hidden bg-white p-8 text-slate-950">
        <div dangerouslySetInnerHTML={{ __html: stockPrintHtml }} />
      </section>
    </div>
  );
}

function toLocalDateTimeParam(date) {
  const pad = (value, size = 2) => String(value).padStart(size, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function ProductionInventoryView({ user }) {
  const isAdmin = user?.rol === "admin";
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [formItem, setFormItem] = useState(null);
  const [date, setDate] = useState(new Date());
  const [stockPrintHtml, setStockPrintHtml] = useState("");

  async function loadMovements() {
    const start = new Date();
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const res = await fetch(
      `${API}/production-items/inventory?start=${start.toISOString()}&end=${end.toISOString()}`
    );
    const data = await res.json();
    setMovements(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    const loadInitial = async () => {
      const [itemsRes, productsRes] = await Promise.all([
        fetch(`${API}/production-items`),
        fetch(`${API}/products`)
      ]);

      const itemsData = await itemsRes.json();
      const productsData = await productsRes.json();

      setItems(Array.isArray(itemsData) ? itemsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    };

    loadInitial();
    loadMovements();
  }, [date]);

  const categories = useMemo(() => {
    const names = items.map(item => item.category).filter(Boolean);
    return ["all", ...new Set(names)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "all" || item.category === category;
      const stock = Number(item.stock || 0);
      const minStock = Number(item.minStock || 0);
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && stock <= minStock) ||
        (stockFilter === "out" && stock <= 0);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [category, items, search, stockFilter]);

  const stats = useMemo(() => {
    const lowStock = items.filter(item => Number(item.stock || 0) <= Number(item.minStock || 0)).length;
    const outOfStock = items.filter(item => Number(item.stock || 0) <= 0).length;
    const value = items.reduce(
      (total, item) => total + Number(item.stock || 0) * Number(item.cost || 0),
      0
    );

    return [
      { label: "Ingredientes", value: items.length, icon: Package, tone: "bg-slate-100 text-slate-700" },
      { label: "Stock bajo", value: lowStock, icon: AlertTriangle, tone: "bg-amber-50 text-amber-700" },
      { label: "Agotados", value: outOfStock, icon: Archive, tone: "bg-rose-50 text-rose-700" },
      { label: "Valor insumos", value: formatCOP(value), icon: BarChart3, tone: "bg-emerald-50 text-emerald-700" }
    ];
  }, [items]);

  const selectedMovements = selectedItem
    ? movements.filter(item => item.productionItem?.id === selectedItem.id)
    : [];

  const filteredMovementsByDate = useMemo(() => {
    return movements.filter(m => {
      const d = new Date(m.lastUpdate);
      return d.toDateString() === date.toDateString();
    });
  }, [movements, date]);

  const printDailySummary = () => {
    const summary = filteredMovementsByDate.reduce((acc, m) => {
      const name = m.productionItem?.name || "Sin nombre";
      if (!acc[name]) {
        acc[name] = { incoming: 0, outgoing: 0, movements: [] };
      }
      if (m.quantity > 0) acc[name].incoming += m.quantity;
      else acc[name].outgoing += Math.abs(m.quantity);
      acc[name].movements.push(m);
      return acc;
    }, {});

    const cleanup = () => {
      document.body.classList.remove("stock-print-mode");
      window.removeEventListener("afterprint", cleanup);
    };

    setStockPrintHtml(`
      <html><head><title>Resumen de Movimientos - ${date.toLocaleDateString("es-CO")}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { font-size: 20px; margin-bottom: 5px; }
        .date { color: #666; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; }
        .summary-row { background: #fafafa; }
        .total { font-weight: bold; background: #fff3e0; }
        .in { color: #16a34a; }
        .out { color: #dc2626; }
      </style></head><body>
      <h1>Resumen de Movimientos de Producción</h1>
      <p class="date">${date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      <table>
        <thead><tr><th>Ingrediente</th><th>Entradas</th><th>Salidas</th><th>Hora</th><th>Usuario</th><th>Motivo</th></tr></thead>
        <tbody>
          ${Object.entries(summary).map(([name, data]) =>
            data.movements.map(m => `
              <tr class="summary-row">
                <td>${name}</td>
                <td class="in">${m.quantity > 0 ? `+${formatQty(m.quantity)}` : "-"}</td>
                <td class="out">${m.quantity < 0 ? formatQty(m.quantity) : "-"}</td>
                <td>${new Date(m.lastUpdate).toLocaleTimeString("es-CO")}</td>
                <td>${m.user?.nombre || "Sistema"}</td>
                <td>${m.reason || "-"}</td>
              </tr>
            `).join("")
          ).join("")}
        </tbody>
      </table>
      </body></html>
    `);
    document.body.classList.add("stock-print-mode");
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 600);
    }, 80);
  };

  const saveItem = async () => {
    const isEdit = Boolean(formItem?.id);
    const payload = {
      ...formItem,
      stock: Number(formItem.stock || 0),
      minStock: Number(formItem.minStock || 0),
      cost: Number(formItem.cost || 0),
      unitsPerPackage: formItem.unitsPerPackage === "" ? null : Number(formItem.unitsPerPackage || 0),
      productLinks: (formItem.productLinks || [])
        .filter(link => link.product?.id)
        .map(link => ({
          id: link.id,
          product: { id: Number(link.product.id) },
          quantityPerProduct: Number(link.quantityPerProduct || 1)
        }))
    };

    const res = await fetch(`${API}/production-items${isEdit ? `/${formItem.id}` : ""}`, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const saved = await res.json();

    setItems(prev => isEdit
      ? prev.map(item => item.id === saved.id ? saved : item)
      : [...prev, saved]
    );
    setSelectedItem(prev => prev?.id === saved.id ? saved : prev);
    setFormItem(null);
  };

  const deleteItem = async (id) => {
    if (!isAdmin) return alert("Solo un administrador puede eliminar ingredientes.");
    const shouldDelete = window.confirm("¿Quieres eliminar este ingrediente?");
    if (!shouldDelete) return;

    await fetch(`${API}/production-items/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(item => item.id !== id));
    setSelectedItem(prev => prev?.id === id ? null : prev);
  };

  const adjustItem = async (item, quantity) => {
    const reason = quantity > 0 ? "Entrada manual" : "Salida manual";
    const type = quantity > 0 ? "IN" : "OUT";
    const params = new URLSearchParams({
      quantity: String(quantity),
      type,
      reason,
      ...(user?.id ? { userId: String(user.id) } : {})
    });

    const res = await fetch(`${API}/production-items/${item.id}/adjust?${params.toString()}`, {
      method: "PUT"
    });
    const updated = await res.json();
    setItems(prev => prev.map(current => current.id === updated.id ? updated : current));
    setSelectedItem(prev => prev?.id === updated.id ? updated : prev);
    loadMovements();
  };

  return (
    <div className="grid min-h-full gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <main className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
              <Archive size={14} />
              Inventario de producción
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Ingredientes e insumos
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Controla materias primas, cantidades mínimas, costos y movimientos del día.
            </p>
          </div>

          <button
            onClick={() => setFormItem(emptyProductionItem)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF9F1C] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e68900]"
          >
            <PackagePlus size={16} />
            Crear ingrediente
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                  <Icon size={19} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="mt-1 text-2xl font-bold leading-tight text-slate-950">{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                placeholder="Buscar ingrediente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[420px]">
              <SelectControl value={category} onChange={setCategory}>
                {categories.map(item => (
                  <option key={item} value={item}>
                    {item === "all" ? "Todas las categorías" : item}
                  </option>
                ))}
              </SelectControl>

              <SelectControl value={stockFilter} onChange={setStockFilter}>
                <option value="all">Todo el stock</option>
                <option value="low">Stock bajo</option>
                <option value="out">Agotados</option>
              </SelectControl>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-[0_1px_0_#e2e8f0]">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold">Ingrediente</th>
                  <th className="px-3 py-3 text-left font-semibold">Categoría</th>
                  <th className="px-3 py-3 text-center font-semibold">Unidad</th>
                  <th className="px-3 py-3 text-center font-semibold">Empaque</th>
                  <th className="px-3 py-3 text-center font-semibold">Cantidad</th>
                  <th className="px-3 py-3 text-center font-semibold">Mínimo</th>
                  <th className="px-3 py-3 text-right font-semibold">Costo</th>
                  <th className="px-3 py-3 text-center font-semibold">Estado</th>
                  <th className="px-3 py-3 text-center font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => (
                  <tr key={item.id} className="transition hover:bg-amber-50/30">
                    <td className="px-3 py-3">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.supplier || "Sin proveedor"}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{item.category || "General"}</td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-600">{item.unit || "und"}</td>
                    <td className="px-3 py-3 text-center text-slate-500">
                      {item.packageName || "Paquete"}
                      {item.unitsPerPackage ? ` (${formatQty(item.unitsPerPackage)} und)` : ""}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-900">{formatQty(item.stock)} {item.unit}</td>
                    <td className="px-3 py-3 text-center text-slate-500">{formatQty(item.minStock)} {item.unit}</td>
                    <td className="px-3 py-3 text-right font-bold text-slate-800">{formatCOP(item.cost)}</td>
                    <td className="px-3 py-3 text-center"><IngredientBadge item={item} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <IconButton label="Ver detalle" tone="amber" onClick={() => setSelectedItem(item)}>
                          <Eye size={15} />
                        </IconButton>
                        <IconButton label="Editar ingrediente" tone="blue" onClick={() => setFormItem({ ...emptyProductionItem, ...item })}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton label="Restar" tone="rose" onClick={() => adjustItem(item, -1)}>
                          <Minus size={15} />
                        </IconButton>
                        <IconButton label="Sumar" tone="emerald" onClick={() => adjustItem(item, 1)}>
                          <Plus size={15} />
                        </IconButton>
                        {isAdmin && (
                          <IconButton label="Eliminar" tone="slate" onClick={() => deleteItem(item.id)}>
                            <Trash2 size={15} />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      No hay ingredientes que coincidan con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <aside className="sticky top-4 max-h-[calc(100vh-80px)] overflow-y-auto rounded-[24px] border border-slate-300 bg-[#e8edf3] p-4 shadow-[inset_1px_0_0_rgba(148,163,184,0.35)] sm:p-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-200/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 hover:[&::-webkit-scrollbar-thumb]:bg-slate-500">
        <ProductionDetailPanel
          item={selectedItem}
          movements={selectedMovements}
          onClose={() => setSelectedItem(null)}
          onEdit={() => selectedItem && setFormItem({ ...emptyProductionItem, ...selectedItem })}
          date={date}
        />

        <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 flex items-center gap-2 text-base font-bold text-slate-900">
              <CalendarDays size={18} className="text-emerald-500" />
              Calendario
            </h2>
            <span className="text-xs font-semibold capitalize text-slate-400">{date.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}</span>
          </div>
          <div className="stock-calendar">
            <Calendar value={date} onChange={setDate} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="m-0 flex items-center gap-2 text-base font-bold text-slate-900">
              <Clock3 size={18} className="text-emerald-500" />
              Historial del día
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
              {filteredMovementsByDate.length}
            </span>
          </div>

          <button
            onClick={printDailySummary}
            className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF9F1C] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e68900]"
          >
            <Printer size={15} />
            Imprimir resumen
          </button>

          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
            {filteredMovementsByDate.map(item => (
              <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">{item.productionItem?.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(item.lastUpdate).toLocaleTimeString("es-CO")}
                    </p>
                    {item.user?.nombre && (
                      <p className="text-xs font-semibold text-slate-500">
                        {item.user.nombre}
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    item.quantity > 0
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                      : "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                  }`}>
                    {item.quantity > 0 ? "+" : ""}
                    {formatQty(item.quantity)}
                  </span>
                </div>
              </div>
            ))}

            {filteredMovementsByDate.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                No hay movimientos para este día.
              </div>
            )}
          </div>
        </section>
      </aside>

      {formItem && (
        <ProductionItemModal
          item={formItem}
          products={products}
          onChange={setFormItem}
          onClose={() => setFormItem(null)}
          onSubmit={saveItem}
        />
      )}

      <section className="stock-print-summary hidden bg-white p-8 text-slate-950">
        <div dangerouslySetInnerHTML={{ __html: stockPrintHtml }} />
      </section>
    </div>
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

function SupplierView() {
  const [items, setItems] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    fetch(`${API}/production-items`)
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data) ? data : []));
  }, []);

  const suppliers = useMemo(() => {
    const grouped = new Map();

    items.forEach(item => {
      if (!item.supplier) return;
      const key = `${item.supplier}|${item.supplierContact || ""}`;
      const current = grouped.get(key) || {
        name: item.supplier,
        contact: item.supplierContact || "Sin contacto",
        ingredients: []
      };
      current.ingredients.push(item.name);
      grouped.set(key, current);
    });

    return Array.from(grouped.values());
  }, [items]);

  return (
    <>
      <div className="min-h-full text-slate-900" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <main className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                <Archive size={14} />
                Proveedores
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Lista de proveedores
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Haz click en un proveedor para ver su informaci贸n detallada.
              </p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Archive size={19} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total proveedores</p>
              <p className="mt-1 text-2xl font-bold leading-tight text-slate-950">{suppliers.length}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {suppliers.map(supplier => (
              <button
                key={`${supplier.name}-${supplier.contact}`}
                type="button"
                onClick={() => setSelectedSupplier(supplier)}
                className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-emerald-100 bg-white p-4 text-left shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="text-lg font-bold text-slate-900">{supplier.name}</p>
                  <p className="text-sm font-semibold text-slate-500">{supplier.contact}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {supplier.ingredients.length} ingrediente{supplier.ingredients.length !== 1 ? "s" : ""}
                  </span>
                  <ChevronDown className="h-5 w-5 text-emerald-500" />
                </div>
              </button>
            ))}

            {suppliers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                No hay proveedores registrados. Agrega un proveedor al crear ingredientes de producci贸n.
              </div>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {selectedSupplier && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onClick={() => setSelectedSupplier(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/40"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Proveedor</p>
                  <h3 className="m-0 text-xl font-bold text-slate-900">{selectedSupplier.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSupplier(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-5">
                <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Contacto</p>
                  <p className="text-sm font-semibold text-slate-700">{selectedSupplier.contact}</p>
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Ingredientes suministrados ({selectedSupplier.ingredients.length})
                  </p>
                  <div className="flex flex-col gap-2">
                    {selectedSupplier.ingredients.map((ingredient, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {index + 1}
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{ingredient}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                <button
                  type="button"
                  onClick={() => setSelectedSupplier(null)}
                  className="w-full rounded-xl bg-gradient-to-r from-[#FF9F1C] to-[#FF4040] px-4 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function ProductionDetailPanel({ item, movements, onClose, onEdit, date }) {
  if (!item) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Archive size={19} />
        </div>
        <h2 className="m-0 text-base font-bold text-slate-900">Detalle de producción</h2>
        <p className="mt-1 text-sm text-slate-500">
          Selecciona un ingrediente para revisar su estado y movimientos.
        </p>
      </section>
    );
  }

  const value = Number(item.stock || 0) * Number(item.cost || 0);

  return (
    <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Ingrediente seleccionado</p>
          <h2 className="m-0 mt-1 text-lg font-bold text-slate-950">{item.name}</h2>
          <p className="text-sm text-slate-500">{item.category || "General"} · {item.unit || "und"}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="Cantidad" value={`${formatQty(item.stock)} ${item.unit || ""}`} />
        <MiniStat label="Mínimo" value={`${formatQty(item.minStock)} ${item.unit || ""}`} />
        <MiniStat label="Costo" value={formatCOP(item.cost)} />
        <MiniStat label="Valor" value={formatCOP(value)} />
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estado</p>
        <div className="mt-2">
          <IngredientBadge item={item} />
        </div>
      </div>

      {item.notes && (
        <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notas</p>
          <p className="mt-1 text-sm text-slate-600">{item.notes}</p>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Proveedor</p>
        <p className="mt-1 text-sm font-bold text-slate-700">{item.supplier || "Sin proveedor"}</p>
        <p className="text-xs text-slate-500">{item.supplierContact || "Sin contacto"}</p>
      </div>

      <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Productos asociados</p>
        <div className="mt-2 space-y-2">
          {(item.productLinks || []).map(link => (
            <div key={link.id || link.product?.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <span className="font-bold text-slate-700">{link.product?.name || "Producto"}</span>
              <span className="text-slate-500">{formatQty(link.quantityPerProduct || 1)} {item.unit || "und"} / venta</span>
            </div>
          ))}
          {(!item.productLinks || item.productLinks.length === 0) && (
            <p className="text-sm text-slate-400">Sin productos asociados.</p>
          )}
        </div>
      </div>

      <button
        onClick={onEdit}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        <Pencil size={16} />
        Editar ingrediente
      </button>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="m-0 text-sm font-bold text-slate-900">
            Movimientos de {date.toLocaleDateString("es-CO")}
          </h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
            {movements.length}
          </span>
        </div>

        <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          {movements.map(movement => (
            <div key={movement.id} className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">{movement.reason || "Movimiento"}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  movement.quantity > 0
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                    : "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                }`}>
                  {movement.quantity > 0 ? "+" : ""}
                  {formatQty(movement.quantity)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(movement.lastUpdate).toLocaleTimeString()}
              </p>
            </div>
          ))}

          {movements.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
              Sin movimientos para este ingrediente.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ProductionItemModal({ item, products = [], onChange, onClose, onSubmit }) {
  const canSave = item.name?.trim() && item.category?.trim() && item.unit?.trim();
  const selectedProductIds = new Set((item.productLinks || []).map(link => String(link.product?.id)));

  const addProductLink = (productId) => {
    if (!productId || selectedProductIds.has(String(productId))) return;
    const product = products.find(current => String(current.id) === String(productId));
    if (!product) return;
    onChange({
      ...item,
      productLinks: [...(item.productLinks || []), { product, quantityPerProduct: 1 }]
    });
  };

  const updateProductLink = (index, value) => {
    const links = [...(item.productLinks || [])];
    links[index] = { ...links[index], quantityPerProduct: value };
    onChange({ ...item, productLinks: links });
  };

  const removeProductLink = (index) => {
    onChange({
      ...item,
      productLinks: (item.productLinks || []).filter((_, currentIndex) => currentIndex !== index)
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        className="max-h-[92vh] w-full max-w-[720px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/40"
        style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
              <Archive size={14} />
              Producción
            </span>
            <h2 className="m-0 mt-3 text-2xl font-bold text-slate-950">
              {item.id ? "Editar ingrediente" : "Crear ingrediente"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Registra insumos, unidades, costos y cantidades mínimas.
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid max-h-[64vh] gap-3 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          <Field label="Ingrediente" value={item.name} onChange={(value) => onChange({ ...item, name: value })} />
          <Field label="Categoría" value={item.category} onChange={(value) => onChange({ ...item, category: value })} />
          <Field label="Unidad" value={item.unit} onChange={(value) => onChange({ ...item, unit: value })} />
          <Field label="Cantidad actual" type="number" value={item.stock} onChange={(value) => onChange({ ...item, stock: value })} />
          <Field label="Stock mínimo" type="number" value={item.minStock} onChange={(value) => onChange({ ...item, minStock: value })} />
          <Field label="Costo unitario" type="number" value={item.cost} onChange={(value) => onChange({ ...item, cost: value })} />
          <Field label="Proveedor" value={item.supplier} onChange={(value) => onChange({ ...item, supplier: value })} />
          <Field label="Contacto proveedor" value={item.supplierContact} onChange={(value) => onChange({ ...item, supplierContact: value })} />
          <Field label="Paquete" value={item.packageName} onChange={(value) => onChange({ ...item, packageName: value })} />
          <Field label="Unidades por paquete" type="number" value={item.unitsPerPackage} onChange={(value) => onChange({ ...item, unitsPerPackage: value })} />

          <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Productos asociados
            </span>
            <select
              value=""
              onChange={(event) => addProductLink(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
            >
              <option value="">Agregar producto existente...</option>
              {products.map(product => (
                <option key={product.id} value={product.id} disabled={selectedProductIds.has(String(product.id))}>
                  {product.name}
                </option>
              ))}
            </select>

            <div className="mt-3 space-y-2">
              {(item.productLinks || []).map((link, index) => (
                <div key={link.id || link.product?.id || index} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{link.product?.name || "Producto"}</p>
                    <p className="text-xs text-slate-400">Descuento por cada producto vendido</p>
                  </div>
                  <Field
                    label={`Cant. ${item.unit || "und"}`}
                    type="number"
                    value={link.quantityPerProduct}
                    onChange={(value) => updateProductLink(index, value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeProductLink(index)}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-rose-50 px-3 text-rose-600 transition hover:bg-rose-100"
                    aria-label="Quitar producto asociado"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Notas
            </span>
            <textarea
              value={item.notes || ""}
              onChange={(e) => onChange({ ...item, notes: e.target.value })}
              className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            disabled={!canSave}
            onClick={onSubmit}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
              canSave ? "bg-[#FF9F1C] hover:bg-[#e68900]" : "cursor-not-allowed bg-slate-300"
            }`}
          >
            <Check size={16} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function IngredientBadge({ item }) {
  const stock = Number(item.stock || 0);
  const minStock = Number(item.minStock || 0);

  if (stock <= 0) {
    return (
      <span className="inline-flex min-w-20 justify-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-100">
        Agotado
      </span>
    );
  }

  if (stock <= minStock) {
    return (
      <span className="inline-flex min-w-20 justify-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
        Bajo
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-20 justify-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
      Disponible
    </span>
  );
}

function StockBadge({ stock }) {
  const value = Number(stock);

  if (value <= 0) {
    return (
      <span className="inline-flex min-w-20 justify-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-100">
        Agotado
      </span>
    );
  }

  if (value <= LOW_STOCK_LIMIT) {
    return (
      <span className="inline-flex min-w-20 justify-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
        Bajo
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-20 justify-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
      Disponible
    </span>
  );
}

function IconButton({ label, tone, onClick, children }) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    blue: "bg-sky-50 text-sky-700 hover:bg-sky-100",
    rose: "bg-rose-50 text-rose-600 hover:bg-rose-100",
    emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    slate: "bg-slate-100 text-slate-600 hover:bg-slate-200"
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-xl transition ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function ProductDetailPanel({ product, movements, onClose, onEdit }) {
  if (!product) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Eye size={19} />
        </div>
        <h2 className="m-0 text-base font-bold text-slate-900">Detalle del producto</h2>
        <p className="mt-1 text-sm text-slate-500">
          Selecciona un producto para ver su valor, estado y movimientos del día.
        </p>
      </section>
    );
  }

  const value = Number(product.price || 0) * Number(product.stock || 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Producto seleccionado</p>
          <h2 className="m-0 mt-1 text-lg font-bold text-slate-950">{product.name}</h2>
          <p className="text-sm text-slate-500">{product.category || "Sin categoría"} · {product.subCategory || "General"}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="Precio" value={formatCOP(product.price)} />
        <MiniStat label="Stock" value={product.stock} />
        <MiniStat label="Valor" value={formatCOP(value)} />
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estado</p>
          <div className="mt-2">
            <StockBadge stock={product.stock} />
          </div>
        </div>
      </div>

      <button
        onClick={onEdit}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
      >
        <Pencil size={16} />
        Editar datos
      </button>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="m-0 text-sm font-bold text-slate-900">Movimientos del día</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
            {movements.length}
          </span>
        </div>

        <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          {movements.map(item => (
            <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
              <span className="text-slate-500">{new Date(item.lastUpdate).toLocaleTimeString()}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                item.quantity > 0
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                  : "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
              }`}>
                {item.quantity > 0 ? "+" : ""}
                {item.quantity}
              </span>
            </div>
          ))}

          {movements.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
              Sin movimientos en la fecha seleccionada.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ProductFormModal({ title, eyebrow, description, product, onChange, onClose, onSubmit, submitLabel, lockStock = false, products = [] }) {
  const canCreate = product.name?.trim() && product.price !== "" && product.category?.trim();

  const existingCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const existingSubCategories = product.category
    ? [...new Set(products.filter(p => p.category === product.category).map(p => p.subCategory).filter(Boolean))]
    : [];

  const catId = "cat-list-" + title.replace(/\s/g, "");
  const subId = "sub-list-" + title.replace(/\s/g, "");

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/40"
        style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">
              <PackagePlus size={14} />
              {eyebrow}
            </span>
            <h2 className="m-0 mt-3 text-2xl font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
          <Field label="Nombre" value={product.name} onChange={(value) => onChange({ ...product, name: value })} />
          <Field label="Precio" type="number" value={product.price} onChange={(value) => onChange({ ...product, price: value })} />
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Categoría</span>
            <input
              list={catId}
              value={product.category ?? ""}
              onChange={(e) => onChange({ ...product, category: e.target.value })}
              placeholder="Escribe o selecciona..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
            />
            <datalist id={catId}>
              {existingCategories.map(cat => <option key={cat} value={cat} />)}
            </datalist>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Subcategoría</span>
            <input
              list={subId}
              value={product.subCategory ?? ""}
              onChange={(e) => onChange({ ...product, subCategory: e.target.value })}
              placeholder="Escribe o selecciona..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
            />
            <datalist id={subId}>
              {existingSubCategories.map(sub => <option key={sub} value={sub} />)}
            </datalist>
          </label>
          <Field
            label={lockStock ? "Stock actual" : "Stock inicial"}
            type="number"
            value={product.stock}
            onChange={(value) => onChange({ ...product, stock: value })}
            disabled={lockStock}
          />

          <label className="sm:col-span-2">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Image size={14} />
              URL de la imagen
            </span>
            <input
              type="text"
              value={product.img || ""}
              onChange={(e) => onChange({ ...product, img: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            disabled={!canCreate}
            onClick={onSubmit}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
              canCreate ? "bg-[#FF9F1C] hover:bg-[#e68900]" : "cursor-not-allowed bg-slate-300"
            }`}
          >
            <Check size={16} />
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:text-slate-400"
      />
    </label>
  );
}

function formatCOP(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatQty(value) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}
