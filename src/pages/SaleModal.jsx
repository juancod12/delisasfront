import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import logo from "../assets/delissa_Logo.png";


export default function SaleModal({ open, onClose, onConfirm, total, subtotal, iva, ivaRate, cart, user }) {

  const [step, setStep] = useState(1);
  const [type, setType] = useState(null);
  const [receiptData, setReceiptData] = useState(null);


  const [cashData, setCashData] = useState({
    received: ""
  });

  const formatCOP = (value) => {
  if (!value) return "0";
  return new Intl.NumberFormat("es-CO").format(value);
};

  const [form, setForm] = useState({
    paymentMethod: "CASH",
    clientName: "",
    nit: "",
    email: "",
    address: ""
  });

  const change = cashData.received
    ? Number(cashData.received) - Number(total)
    : 0;

  useEffect(() => {
  if (open) {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    
  } else {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }

  return () => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  };
}, [open]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectType = (selected) => {
    setType(selected);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setType(null);
  };

  const handleSubmit = () => {

  if (form.paymentMethod === "CASH") {
    if (!cashData.received || Number(cashData.received) < total) {
      alert("El dinero no es suficiente");
      return;
    }
  }

  onConfirm({
    invoiceType: type === "empresa" ? "EMPRESARIAL" : "NORMAL",
    paymentMethod: form.paymentMethod,
    clientInvoice:
      type === "empresa"
        ? {
            clientName: form.clientName,
            nit: form.nit,
            email: form.email,
            address: form.address
          }
        : null
  });

  setReceiptData({
  total,
  received: Number(cashData.received || 0),
  change: change >= 0 ? change : 0,
  paymentMethod: form.paymentMethod,
  items: cart
});
  setStep(3);
};

  return createPortal(
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99999] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        <motion.div
          className="fixed inset-0 z-[99999] flex items-start justify-center overflow-hidden py-10"
          initial={{ opacity: 0, scale: 0.8, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 40 }}
        >
          <div
  className={`bg-white text-black rounded-3xl shadow-2xl p-6 w-[400px] border border-gray-200 [color-scheme:light]
  ${
    (step === 2 && type === "empresa") || step === 3
      ? "max-h-[90vh] overflow-y-auto"
      : "overflow-hidden"
  }`}
>
<div className="flex items-center justify-between mb-6">

  {["Tipo", "Pago", "Recibo"].map((label, index) => {
    const current = index + 1;
    const isCompleted = step > current;
    const isActive = step === current;

    return (
      <div key={index} className="flex-1 flex items-center">

        <div className="flex flex-col items-center w-full">

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: isActive ? 1.1 : 1,
              opacity: 1
            }}
            transition={{ duration: 0.3 }}
            className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold
              ${
                isCompleted
                  ? "bg-green-500 text-white"
                  : isActive
                  ? "bg-gradient-to-r from-[#FF9F1C] to-[#FF4040] text-white"
                  : "bg-gray-200 text-gray-500"
              }
            `}
          >
            {isCompleted ? "✔" : current}
          </motion.div>

          <span
            className={`text-xs mt-1 ${
              isActive ? "text-black font-semibold" : "text-gray-500"
            }`}
          >
            {label}
          </span>
        </div>

        {index < 2 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: "100%",
              background:
                step > current
                  ? "linear-gradient(to right, #FF9F1C, #FF4040)"
                  : "#e5e7eb"
            }}
            transition={{ duration: 0.4 }}
            className="h-[3px] mx-2"
          />
        )}
      </div>
    );
  })}
</div>

            {step === 2 && (
              <button
                onClick={handleBack}
                className="text-sm text-gray-500 hover:text-black mb-3"
              >
                ← Volver
              </button>
            )}

            {step === 1 && (
              <>
                <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
                  Tipo de factura
                </h2>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleSelectType("normal")}
                    className="bg-gradient-to-r from-[#FF9F1C] to-[#FF4040] text-white py-3 rounded-xl shadow hover:scale-[1.02]"
                  >
                    Factura Normal
                  </button>

                  <button
                    onClick={() => handleSelectType("empresa")}
                    className="bg-gray-100 py-3 rounded-xl shadow hover:bg-gray-200"
                  >
                    Factura Empresarial
                  </button>
                </div>
              </>
            )}

            {step === 2 && type === "normal" && (
              <>
                <h2 className="text-lg font-bold mb-4 text-gray-800">
                  Método de pago
                </h2>

                <select
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl border border-gray-300 mb-4"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="NEQUI">Nequi</option>
                </select>

                {form.paymentMethod === "CASH" && (
                  <div className="bg-gray-50 p-4 rounded-xl border space-y-3 mb-4">

                    <div>
                      <label className="text-xs text-gray-500">Total</label>
                      <input
                        value={formatCOP(total)}
                        readOnly
                        className="w-full p-2 rounded bg-gray-200 mt-1 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-500">Recibido</label>
                      <input
                        type="text"
                        value={cashData.received ? formatCOP(cashData.received) : ""}
                        onChange={(e) =>
                          setCashData({ received: e.target.value.replace(/\D/g, "") })
                        }
                        className="w-full p-2 rounded border mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-500">Vueltas</label>
                      <input
                        value={formatCOP(change >= 0 ? change : 0)}
                        readOnly
                        className="w-full p-2 rounded bg-green-100 text-green-700 font-bold mt-1"
                      />
                    </div>

                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-[#FF9F1C] to-[#FF4040] text-white py-3 rounded-xl shadow"
                >
                  Finalizar venta
                </button>
              </>
            )}

            {step === 2 && type === "empresa" && (
              <>
                <h2 className="text-lg font-bold mb-4 text-gray-800">
                  Datos del cliente
                </h2>

                <div className="flex flex-col gap-3">

                  <input name="clientName" placeholder="Empresa" onChange={handleChange} className="p-3 rounded border"/>
                  <input name="nit" placeholder="NIT" onChange={handleChange} className="p-3 rounded border"/>
                  <input name="email" placeholder="Correo" onChange={handleChange} className="p-3 rounded border"/>
                  <input name="address" placeholder="Dirección" onChange={handleChange} className="p-3 rounded border"/>

                  <input
                    value={formatCOP(total)}
                    readOnly
                    className="w-full p-2 rounded bg-gray-200 mt-1"
                  />

                  <select
                    name="paymentMethod"
                    value={form.paymentMethod}
                    onChange={handleChange}
                    className="p-3 rounded border"
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="NEQUI">Nequi</option>
                  </select>

                  {form.paymentMethod === "CASH" && (
                    <div className="bg-gray-50 p-4 rounded-xl border space-y-3">

                      <input value={total} readOnly className="w-full p-2 rounded bg-gray-200"/>

                      <input
                        type="number"
                        value={cashData.received}
                        onChange={(e) =>
                          setCashData({ received: e.target.value })
                        }
                        className="w-full p-2 rounded border"
                      />

                      <input
                        value={change >= 0 ? change : 0}
                        readOnly
                        className="w-full p-2 rounded bg-green-100 text-green-700 font-bold"
                      />

                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    className="bg-gradient-to-r from-[#FF9F1C] to-[#FF4040] text-white py-3 rounded-xl shadow"
                  >
                    Finalizar venta
                  </button>

                </div>
              </>
            )}

            <button
              onClick={onClose}
              className="mt-4 text-sm text-gray-400 hover:text-black w-full"
            >
              Cancelar
            </button>

            {step === 3 && receiptData && (
              <>
                <div className="flex flex-col items-center">

                    <div
                      id="receipt"
                      className="bg-white w-[300px] p-4 text-[12px] font-mono text-black shadow-lg"
                    >

                      <div className="text-center mb-2">
                        <img src={logo} alt="logo" className="w-20 mb-2 mx-auto"/>
                        <p className="font-bold text-sm">DELISSA S.A.S</p>
                      </div>
                      <div className="text-left text-[11px]">
                        <p>NIT: 21.176.659</p>
                        <p>Villavicencio - Meta</p>
                        <p>Tel: 314 451 9180</p>
                        {user?.nombre && <p className="mt-1 text-[10px]">Vendedor: {user.nombre}</p>}
                      </div>

                      {type === "empresa" && form.clientName && (
                        <>
                          <hr className="border-dashed border-gray-400 my-2" />
                          <div className="mb-1">
                            <p className="font-bold text-[10px] uppercase">Cliente empresarial</p>
                            <p className="text-[11px]">{form.clientName}</p>
                            {form.nit && <p className="text-[11px]">NIT: {form.nit}</p>}
                            {form.email && <p className="text-[11px]">{form.email}</p>}
                            {form.address && <p className="text-[11px]">{form.address}</p>}
                          </div>
                        </>
                      )}

                      <hr className="border-dashed border-gray-400 my-2" />

                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Fecha:</span>
                          <span>{new Date().toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between">
                          <span>Pago:</span>
                          <span>{receiptData.paymentMethod}</span>
                        </div>
                      </div>

                      <hr className="border-dashed border-gray-400 my-2" />

                      <div>
                        <div className="flex justify-between font-bold text-[11px]">
                          <span>Producto</span>
                          <span>Total</span>
                        </div>

                        {receiptData.items.map((item, i) => (
                          <div key={i} className="mb-1">
                            <div className="flex justify-between">
                              <span>{item.name}</span>
                              <span>{formatCOP(item.price * item.qty)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500">
                              <span>{item.qty} x {formatCOP(item.price)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <hr className="border-dashed border-gray-400 my-2" />

                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>{formatCOP(subtotal || receiptData.total)}</span>
                        </div>

                        <div className="flex justify-between text-gray-600">
                          <span>IVA ({Math.round((ivaRate || 0) * 100)}%):</span>
                          <span>{formatCOP(iva || 0)}</span>
                        </div>

                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span>{formatCOP(receiptData.total)}</span>
                        </div>
                      </div>

                      {form.paymentMethod === "CASH" && (
                        <>
                          <hr className="border-dashed border-gray-400 my-2" />
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Recibido:</span>
                              <span>{formatCOP(receiptData.received)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                              <span>Cambio:</span>
                              <span>{formatCOP(receiptData.change)}</span>
                            </div>
                          </div>
                        </>
                      )}

                      <hr className="border-dashed border-gray-400 my-2" />

                      <div className="text-center text-[10px] mt-2">
                        <p>Gracias por tu compra</p>
                        <p className="mt-2 text-[9px] text-gray-400">Los productos no tienen cambio ni devolucion.</p>
                        <p className="text-[9px] text-gray-400">&copy; 2026 DELISSA S.A.S - Todos los derechos reservados.</p>
                      </div>

                  </div>

                  <div className="flex gap-3 mt-4 w-full">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 bg-black text-white py-2 rounded-xl"
                    >
                      Imprimir
                    </button>

                    <button
                      onClick={() => {
                        setStep(1);
                        setType(null);
                        setCashData({ received: "" });
                        onClose();
                      }}
                      className="flex-1 bg-gray-200 py-2 rounded-xl"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>,
  document.body
);
}
