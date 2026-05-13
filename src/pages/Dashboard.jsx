import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SaleModal from "../pages/SaleModal";
import Stock from "../pages/Stock";
import Box_Money from "../pages/Box_Money";
import Invoices from "../pages/Invoices";
import Stats from "../pages/Stats";
import ProductsSection from "../pages/ProductsSection";
import {
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  LogOut,
  User,
  Palette,
  Settings,
  X,
  Wallet,
  LayoutDashboard,
  Package,
  BarChart3,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/delissa_Logo.png";

const BubbleBackground = React.memo(() => {
  return (
    <div className="menu-bubble-layer" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <span key={i} className={`menu-bubble bubble-${i}`} />
      ))}
    </div>
  );
});

export default function Dashboard() {
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState("ventas");
  const [openMenu, setOpenMenu] = useState(false);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [openSections, setOpenSections] = useState({
  entrada: true,
  hamburguesa: true,
  perro: true,
  carne: true,
  chorizo: true,
  bebida: true
  });
  const [openSaleModal, setOpenSaleModal] = useState(false);
  const [openCart, setOpenCart] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("delissaTheme") || "classic");
  

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const isAdmin = user?.rol === "admin";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("profile");
  const [managedUsers, setManagedUsers] = useState([]);
  const [profileForm, setProfileForm] = useState({
    nombre: user.nombre || "",
    cedula: user.cedula || "",
    correo: user.correo || "",
    rol: user.rol || "empleado",
    password: ""
  });
  const [qtyEdits, setQtyEdits] = useState({});
  const [ivaRate, setIvaRate] = useState(0.19);
  const [accountForm, setAccountForm] = useState({
    nombre: "",
    cedula: "",
    correo: "",
    password: "",
    rol: "empleado"
  });

  useEffect(() => {
    fetch("http://localhost:8080/products")
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    fetch("http://localhost:8080/config/iva_rate")
      .then(res => res.text())
      .then(rate => { if (rate) setIvaRate(parseFloat(rate)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("theme-minimal", theme === "minimal");
    localStorage.setItem("delissaTheme", theme);
  }, [theme]);

  useEffect(() => {
    if (!isAdmin && (activeTab === "stats" || activeTab === "dash")) {
      setActiveTab("ventas");
    }
  }, [activeTab, isAdmin]);

  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === product.id);
      if (exists)
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      return [...prev, { ...product, qty: 1 }];
    });
  }, []);

  const toggleSection = useCallback((section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const updateQty = (id, delta) => {
    setQtyEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
    setCart((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i
      )
    );
  };

  const setQty = (id, value) => {
    setQtyEdits(prev => ({ ...prev, [id]: value }));
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1) {
      setCart((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, qty: num } : i
        )
      );
    }
  };

  const removeFromCart = (id) => {
    setQtyEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const subtotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
  const iva = subtotal * ivaRate;
  const totalConIva = subtotal + iva;

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };


  const loadUsers = async () => {
    if (user?.rol !== "admin") return;
    try {
      const res = await fetch("http://localhost:8080/users");
      const data = await res.json();
      setManagedUsers(Array.isArray(data) ? data : []);
    } catch {
      setManagedUsers([]);
    }
  };

  const goProfile = () => {
    setSettingsTab("profile");
    setSettingsOpen(true);
    loadUsers();
  };

  const saveProfile = async () => {
    try {
      const res = await fetch(`http://localhost:8080/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });

      const data = await res.json();
      localStorage.setItem("user", JSON.stringify(data));
      alert("Perfil guardado");
    } catch {
      alert("Error guardando perfil");
    }
  };

  const createAccount = async () => {
    try {
      const res = await fetch("http://localhost:8080/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountForm)
      });

      if (!res.ok) throw new Error();

      setAccountForm({ nombre: "", cedula: "", correo: "", password: "", rol: "empleado" });
      await loadUsers();
      alert("Cuenta creada");
    } catch {
      alert("Error creando cuenta");
    }
  };

  const updateAccountRole = async (account, rol) => {
    try {
      const res = await fetch(`http://localhost:8080/users/${account.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...account, rol })
      });

      if (!res.ok) throw new Error();
      await loadUsers();
    } catch {
      alert("Error actualizando el rol");
    }
  };

  const deleteAccount = async (accountId) => {
    const shouldDelete = window.confirm("Â¿Quieres eliminar esta cuenta?");
    if (!shouldDelete) return;

    try {
      const res = await fetch(`http://localhost:8080/users/${accountId}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error();
      await loadUsers();
    } catch {
      alert("Error eliminando la cuenta");
    }
  };


  const formatCOP = (value) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleConfirmSale = async (modalData) => {
  try {
    const salePayload = {
      paymentMethod: modalData.paymentMethod,
      invoiceType: modalData.invoiceType,
        usuario: { id: user.id },

      details: cart.map(item => ({
        product: { id: item.id },
        quantity: item.qty
      })),

      clientInvoice: modalData.clientInvoice
    };

    console.log("ENVIANDO:", salePayload);

    const res = await fetch("http://localhost:8080/sales", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(salePayload)
    });

    const data = await res.json();

    console.log("RESPUESTA:", data);

    setCart([]);



  } catch (error) {
    console.error(error);
    alert("Error al procesar la venta");
  }
};

  const handleSearchChange = useCallback((value) => {
    setProductSearch(value);
  }, []);


  return (

  <div className="w-screen h-screen flex bg-white">
{activeTab === "ventas" && <BubbleBackground />}
    {/* SIDEBAR */}
    <nav className="group relative z-50 w-20 shrink-0 overflow-hidden bg-[#FF9F1C] py-8 text-white transition-all duration-300 hover:w-64">

      <div className="flex flex-col gap-4 w-full px-3">
        {isAdmin && <SidebarItem icon={<LayoutDashboard />} label="Dash" active={activeTab==="dash"} onClick={()=>setActiveTab("dash")} />}
        <SidebarItem icon={<ShoppingCart />} label="Ventas" active={activeTab==="ventas"} onClick={()=>setActiveTab("ventas")} />
        <SidebarItem icon={<Package />} label="Stock" active={activeTab==="stock"} onClick={()=>setActiveTab("stock")} />
        {isAdmin && <SidebarItem icon={<BarChart3 />} label="Stats" active={activeTab==="stats"} onClick={()=>setActiveTab("stats")} />}
        <SidebarItem icon={<FileText />} label="Facturas" active={activeTab==="facturas"} onClick={()=>setActiveTab("facturas")} />
        <SidebarItem icon={<Wallet />} label="Caja" active={activeTab==="boxMoney"} onClick={()=>setActiveTab("boxMoney")} />
        <div className="mt-auto w-full px-3 pt-6">

  <div className="mt-auto w-full px-3">

  <button
    className="flex items-center gap-3 p-3 rounded-xl w-full text-white hover:bg-white/20 transition-all duration-200"
  >

    {/* ICONO */}
    <User size={20} className="text-white" />

    {/* TEXTO */}
    <span className="hidden group-hover:block whitespace-nowrap">
      {user?.nombre || "Usuario"}
    </span>

  </button>

</div>

</div>

      </div>
    </nav>
    



    {/* PRODUCTOS */}
    <section
  className={`relative flex-1 overflow-y-auto overflow-hidden bg-white p-6 transition-all duration-300
  ${openCart ? "mr-[350px]" : "pr-0"}`}
  >


    {activeTab === "ventas" && (
      <ProductsSection
        products={products}
        productSearch={productSearch}
        onSearchChange={handleSearchChange}
        openSections={openSections}
        onToggleSection={toggleSection}
        addToCart={addToCart}
      />
    )}

    {activeTab === "stock" && <Stock user={user} />}
    {activeTab === "stats" && <Stats formatCOP={formatCOP} />}
    {activeTab === "facturas" && <Invoices formatCOP={formatCOP} user={user} />}
    {activeTab === "boxMoney" && <Box_Money formatCOP={formatCOP} />}

  </section>


<aside
  className={`fixed top-0 right-0 h-full w-[350px] bg-white border-l flex flex-col z-[9998] transition-all duration-300
  ${openCart ? "translate-x-0" : "translate-x-full"}`}
>

  {/* 🔴 HEADER */}
  <div className="p-6 bg-[#FF4040] text-white relative">

    <h2 className="flex items-center gap-2 font-extrabold text-2xl">
      <ShoppingCart size={20} />
      Orden
    </h2>

    <button
      onClick={() => setOpenCart(false)}
      aria-label="Cerrar carrito"
      className="absolute top-4 right-4 text-white hover:scale-110 transition"
    >
      <X size={20} />
    </button>

    {/* 🔢 CONTADOR */}
    {cart.length > 0 && (
      <span className="absolute top-4 right-12 bg-white text-[#FF4040] text-xs font-bold px-2 py-0.5 rounded-full shadow">
        {cart.length}
      </span>
    )}
  </div>

  <div className="flex-1 overflow-y-auto p-4 space-y-3">
    <AnimatePresence>
      {cart.map((item) => (
        <motion.div
          key={item.id}
          layout
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="flex justify-between items-center bg-gray-100 p-3 rounded-xl"
        >
          <div>
            <p className="font-bold text-sm">{item.name}</p>
            <p className="text-xs">
              {formatCOP(item.price * item.qty)}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => updateQty(item.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition hover:bg-slate-100">
              <Minus size={14} />
            </button>

            <input
              type="number"
              min="1"
              value={qtyEdits[item.id] !== undefined ? qtyEdits[item.id] : item.qty}
              onChange={(e) => setQty(item.id, e.target.value)}
              onBlur={() => setQtyEdits(prev => { const n = { ...prev }; delete n[item.id]; return n; })}
              className="h-7 w-12 rounded-lg border border-slate-200 bg-white text-center text-sm font-bold text-slate-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />

            <button onClick={() => updateQty(item.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition hover:bg-slate-100">
              <Plus size={14} />
            </button>

            <button onClick={() => removeFromCart(item.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-rose-500 shadow-sm transition hover:bg-rose-50">
              <Trash2 size={14} />
            </button>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>

  <div className="p-4 border-t">

    <h3 className="font-bold mb-1">
      Subtotal: {formatCOP(subtotal)}
    </h3>
    <h3 className="text-sm text-slate-500 mb-1">
      IVA ({Math.round(ivaRate * 100)}%): {formatCOP(iva)}
    </h3>
    <h3 className="font-bold text-lg text-[#FF4040] mb-3">
      Total: {formatCOP(totalConIva)}
    </h3>

    <button
      onClick={() => setOpenSaleModal(true)}
      className="w-full bg-gradient-to-r from-[#FF9F1C] to-[#FF4040] text-white py-3 rounded-xl shadow-md hover:opacity-90"
    >
      Finalizar Venta
    </button>

    <SaleModal
      open={openSaleModal}
      onClose={() => setOpenSaleModal(false)}
      onConfirm={handleConfirmSale}
      total={totalConIva}
      subtotal={subtotal}
      iva={iva}
      ivaRate={ivaRate}
        cart={cart}
      user={user}
    />

  </div>

</aside>

  {/* Carrito boton*/}
{!openCart && (
  <div className="fixed bottom-6 right-6 z-[9999]">

    <button
      onClick={() => setOpenCart(true)}
      className="relative w-14 h-14 bg-[#FF4040] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition"
    >
      <ShoppingCart size={22} />

      {cart.length > 0 && (
        <span className="absolute -top-2 -right-2 bg-white text-[#FF4040] text-xs font-bold px-2 py-0.5 rounded-full shadow">
          {cart.length}
        </span>
      )}
    </button>

  </div>
)}
    <div className="fixed bottom-6 left-6 z-[9999] flex items-center gap-3">

  <div>
    <AnimatePresence>
      {openMenu && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-16 left-0 flex flex-col gap-3 items-start"
          
        >
          <button
            onClick={goProfile}
            className="flex items-center gap-2 bg-white shadow-lg px-4 py-2 rounded-xl hover:bg-gray-100"
          >
            <User size={18} /> Perfil
          </button>

          <button
            onClick={() => setTheme((current) => current === "minimal" ? "classic" : "minimal")}
            className="flex items-center gap-2 bg-white shadow-lg px-4 py-2 rounded-xl hover:bg-gray-100"
          >
            <Palette size={18} /> {theme === "minimal" ? "Tema clasico" : "Tema minimal"}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500 text-white shadow-lg px-4 py-2 rounded-xl hover:bg-red-600"
          >
            <LogOut size={18} /> Cerrar sesión
          </button>
        </motion.div>
      )}
    </AnimatePresence>

    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setOpenMenu(!openMenu)}
      className="w-14 h-14 bg-[#f57c00] hover:bg-[#d35400] text-white rounded-full shadow-xl flex items-center justify-center text-xl transition"
    >
      <Settings size={22} className="text-white" />
    </motion.button>
  </div>

  <SettingsModal
    open={settingsOpen}
    onClose={() => setSettingsOpen(false)}
    tab={settingsTab}
    setTab={setSettingsTab}
    user={user}
    profileForm={profileForm}
    setProfileForm={setProfileForm}
    saveProfile={saveProfile}
    accountForm={accountForm}
    setAccountForm={setAccountForm}
    createAccount={createAccount}
    updateAccountRole={updateAccountRole}
    deleteAccount={deleteAccount}
    managedUsers={managedUsers}
  />




   </div> 
        
  </div> 
        
  
  
);

}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl w-full transition-all duration-300
      ${active 
        ? "bg-white text-[#FF9F1C]" 
        : "text-white/80 hover:bg-white/20"}
      `}
    >
      {/* ICONO (SIEMPRE VISIBLE) */}
      <div className="flex justify-center w-full group-hover:w-auto transition-all duration-300">
        {icon}
      </div>

      {/* TEXTO (SOLO EN HOVER) */}
      <span className="opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}
function SettingsModal({
  open,
  onClose,
  tab,
  setTab,
  user,
  profileForm,
  setProfileForm,
  saveProfile,
  accountForm,
  setAccountForm,
  createAccount,
  updateAccountRole,
  deleteAccount,
  managedUsers
}) {
  if (!open) return null;

  const isAdmin = user?.rol === "admin";
  const [ivaRateInput, setIvaRateInput] = useState("");
  const [loadingIva, setLoadingIva] = useState(false);

  useEffect(() => {
    if (open && isAdmin) {
      fetch("http://localhost:8080/config/iva_rate")
        .then(res => res.text())
        .then(rate => { if (rate) setIvaRateInput(rate); })
        .catch(() => {});
    }
  }, [open, isAdmin]);

  const saveIvaRate = async () => {
    setLoadingIva(true);
    try {
      await fetch("http://localhost:8080/config/iva_rate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: ivaRateInput })
      });
      alert("Tasa de IVA guardada. Reinicia la página para aplicar.");
    } catch {
      alert("Error guardando tasa de IVA");
    } finally {
      setLoadingIva(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#FF9F1C]">Ajustes</p>
            <h2 className="m-0 text-2xl font-bold text-slate-950">Perfil y cuentas</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-200" aria-label="Cerrar ajustes">
            <X size={20} />
          </button>
        </div>

        <div className="grid max-h-[78vh] overflow-y-auto lg:grid-cols-[220px_1fr]">
          <aside className="border-r border-slate-200 bg-slate-50 p-4">
            <button
              onClick={() => setTab("profile")}
              className={`mb-2 w-full rounded-xl px-4 py-3 text-left text-sm font-bold ${tab === "profile" ? "bg-[#FF9F1C] text-white" : "bg-white text-slate-700"}`}
            >
              Perfil
            </button>
            {isAdmin && (
              <button
                onClick={() => setTab("accounts")}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold ${tab === "accounts" ? "bg-[#FF4040] text-white" : "bg-white text-slate-700"}`}
              >
                Cuentas
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setTab("iva")}
                className={`mt-2 w-full rounded-xl px-4 py-3 text-left text-sm font-bold ${tab === "iva" ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}
              >
                IVA
              </button>
            )}
          </aside>

          <section className="p-5">
            {tab === "profile" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-bold text-slate-950">{user?.nombre || "Usuario"}</p>
                  <p className="text-sm font-semibold text-slate-600">{user?.correo}</p>
                  <p className="mt-2 inline-flex rounded-lg bg-white px-2 py-1 text-xs font-bold text-amber-800">{user?.rol}</p>
                </div>

                {isAdmin ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <SettingsField label="Nombre" value={profileForm.nombre} onChange={(value) => setProfileForm({ ...profileForm, nombre: value })} />
                      <SettingsField label="Cedula" value={profileForm.cedula} onChange={(value) => setProfileForm({ ...profileForm, cedula: value })} />
                      <SettingsField label="Correo" value={profileForm.correo} onChange={(value) => setProfileForm({ ...profileForm, correo: value })} />
                      <SettingsField label="Nueva clave" type="password" value={profileForm.password} onChange={(value) => setProfileForm({ ...profileForm, password: value })} placeholder="Opcional" />
                    </div>

                    <button onClick={saveProfile} className="h-11 rounded-xl bg-slate-950 px-5 font-bold text-white">
                      Guardar perfil
                    </button>
                  </>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <ReadOnlyField label="Nombre" value={user?.nombre || "Usuario"} />
                    <ReadOnlyField label="Cedula" value={user?.cedula || "Sin cedula"} />
                    <ReadOnlyField label="Correo" value={user?.correo || "Sin correo"} />
                    <ReadOnlyField label="Rol" value={user?.rol || "empleado"} />
                  </div>
                )}
              </div>
            )}

            {tab === "accounts" && isAdmin && (
              <div className="space-y-5">
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                  <h3 className="text-lg font-bold text-slate-950">Crear cuenta</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <SettingsField label="Nombre" value={accountForm.nombre} onChange={(value) => setAccountForm({ ...accountForm, nombre: value })} />
                    <SettingsField label="Cedula" value={accountForm.cedula} onChange={(value) => setAccountForm({ ...accountForm, cedula: value })} />
                    <SettingsField label="Correo" value={accountForm.correo} onChange={(value) => setAccountForm({ ...accountForm, correo: value })} />
                    <SettingsField label="Clave" type="password" value={accountForm.password} onChange={(value) => setAccountForm({ ...accountForm, password: value })} />
                    <label>
                      <span className="mb-1 block text-sm font-bold text-slate-600">Rol</span>
                      <select
                        value={accountForm.rol}
                        onChange={(event) => setAccountForm({ ...accountForm, rol: event.target.value })}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-semibold"
                      >
                        <option value="empleado">Empleado</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                  </div>
                  <button onClick={createAccount} className="mt-4 h-11 rounded-xl bg-[#FF4040] px-5 font-bold text-white">
                    Crear cuenta
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <h3 className="font-bold text-slate-950">Cuentas registradas</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {managedUsers.map((item) => (
                      <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[1fr_150px_auto] md:items-center">
                        <div>
                          <p className="font-bold text-slate-950">{item.nombre}</p>
                          <p className="text-sm font-semibold text-slate-500">{item.correo}</p>
                        </div>
                        <select
                          value={item.rol}
                          onChange={(event) => updateAccountRole(item, event.target.value)}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                        >
                          <option value="empleado">Empleado</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => deleteAccount(item.id)}
                          disabled={item.id === user?.id}
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-rose-50 px-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "iva" && isAdmin && (
              <div className="space-y-5">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <h3 className="text-lg font-bold text-slate-950">Configurar IVA</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Define el porcentaje de IVA aplicado a todas las ventas.
                  </p>
                  <div className="mt-4 flex items-end gap-3">
                    <label className="flex-1">
                      <span className="mb-1 block text-sm font-bold text-slate-600">Tasa de IVA (%)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={ivaRateInput}
                        onChange={(e) => setIvaRateInput(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      />
                    </label>
                    <button
                      onClick={saveIvaRate}
                      disabled={loadingIva}
                      className="h-11 rounded-xl bg-emerald-600 px-6 font-bold text-white disabled:opacity-50"
                    >
                      {loadingIva ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SettingsField({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-bold text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900 outline-none focus:border-[#FF9F1C] focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <span className="mb-1 block text-sm font-bold text-slate-600">{label}</span>
      <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-700">
        {value}
      </div>
    </div>
  );
}
