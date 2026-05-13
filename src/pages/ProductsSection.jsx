import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ShoppingCart, Check } from "lucide-react";
import logo from "../assets/delissa_Logo.png";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: "easeOut" },
  }),
};

const ProductCard = memo(function ProductCard({ product, onAdd, index }) {
  const [added, setAdded] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const getImage = () => {
    if (!product.img || imgErr) return "https://placehold.co/300x200?text=Sin+imagen";
    if (product.img.startsWith("http")) return product.img;
    return `http://localhost:8080${product.img}`;
  };

  const formatPrice = (value) => new Intl.NumberFormat("es-CO").format(value);
  const lowStock = product.stock !== undefined && product.stock <= 5;

  const handleAdd = () => {
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 600);
  };

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-all hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/40"
    >
      <div className="relative overflow-hidden rounded-xl bg-slate-100">
        <img
          src={getImage()}
          onError={() => setImgErr(true)}
          className="h-28 w-full object-cover transition duration-500 group-hover:scale-105"
          alt={product.name}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition group-hover:opacity-100" />
        {lowStock && (
          <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            Stock bajo
          </span>
        )}
      </div>

      <h3 className="mt-3 min-h-[2.5rem] text-center text-sm font-bold leading-tight text-slate-800">
        {product.name}
      </h3>

      <p className="mt-1 text-center text-base font-black text-[#FF4040]">
        ${formatPrice(product.price)}
      </p>

      <div className="mt-auto flex justify-center pt-3">
        <motion.button
          onClick={handleAdd}
          whileTap={{ scale: 0.92 }}
          className={`flex h-9 items-center gap-1.5 rounded-xl px-4 text-sm font-bold text-white shadow-sm transition ${
            added
              ? "bg-emerald-500"
              : "bg-gradient-to-r from-[#FF9F1C] to-[#FF4040] hover:shadow-md hover:shadow-orange-200"
          }`}
        >
          {added ? (
            <><Check size={15} /> Agregado</>
          ) : (
            <><ShoppingCart size={14} /> Agregar</>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
});

const sectionVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.25 } },
};

function ProductsSection({ products, productSearch, onSearchChange, openSections, onToggleSection, addToCart }) {
  const visibleProducts = products.filter(product => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return true;
    return [product.name, product.category, product.subCategory]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(query));
  });

  const groupedProducts = visibleProducts.reduce((acc, product) => {
    const category = product.category || "otros";
    const sub = product.subCategory || "general";
    if (!acc[category]) acc[category] = {};
    if (!acc[category][sub]) acc[category][sub] = [];
    acc[category][sub].push(product);
    return acc;
  }, {});

  const totalResults = visibleProducts.length;

  return (
    <div className="relative z-10">
      <header className="mb-6 grid gap-4 xl:grid-cols-[auto_1fr_320px] xl:items-center">
        <img src={logo} alt="logo" className="h-14 w-auto object-contain" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Delissa</p>
          <h1 className="m-0 mt-0.5 text-3xl font-black tracking-tight text-slate-950">MENÚ DE PRODUCTOS</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            placeholder="Buscar productos..."
            value={productSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
          {productSearch && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {productSearch && (
        <p className="mb-4 text-sm font-semibold text-slate-500">
          {totalResults} {totalResults === 1 ? "resultado" : "resultados"}
        </p>
      )}

      {Object.keys(groupedProducts).map((category) => (
        <div key={category} className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-1 flex-1 rounded-full bg-gradient-to-r from-[#FF9F1C] to-[#FF4040]" />
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-700">{category}</h2>
            <span className="h-1 flex-1 rounded-full bg-gradient-to-r from-[#FF9F1C] to-[#FF4040]" />
          </div>
          <div className="space-y-3">
            {Object.keys(groupedProducts[category]).map((sub) => (
              <div key={sub} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  onClick={() => onToggleSection(sub)}
                  className={`flex w-full items-center justify-between px-5 py-3.5 text-left font-bold capitalize tracking-wide transition-all duration-200 ${
                    (openSections[sub] ?? true)
                      ? "rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 text-slate-900"
                      : "rounded-2xl bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{sub}</span>
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold transition ${
                    (openSections[sub] ?? true)
                      ? "bg-white text-slate-700 shadow-sm"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {(openSections[sub] ?? true) ? "−" : "+"}
                  </span>
                </button>
                <AnimatePresence>
                  {(openSections[sub] ?? true) && (
                    <motion.div
                      key="content"
                      variants={sectionVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                        {groupedProducts[category][sub].map((p, i) => (
                          <ProductCard key={p.id} product={p} index={i} onAdd={addToCart} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      ))}
      {totalResults === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"
        >
          <Search size={40} className="text-slate-300" />
          <p className="text-lg font-bold text-slate-400">No hay resultados</p>
          <p className="text-sm text-slate-400">Intenta con otro término de búsqueda.</p>
        </motion.div>
      )}
    </div>
  );
}

export default memo(ProductsSection);
