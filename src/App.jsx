import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { createPortal } from "react-dom";

import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";

function App() {
  const [loading, setLoading] = useState(() => sessionStorage.getItem("delissaLoaderShown") !== "true");
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const nativeAlert = window.alert;

    window.alert = (message = "") => {
      const id = `${Date.now()}-${Math.random()}`;
      setAlerts((current) => [...current, { id, message: String(message) }]);
      window.setTimeout(() => {
        setAlerts((current) => current.filter((item) => item.id !== id));
      }, 3200);
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    setTimeout(() => {
      sessionStorage.setItem("delissaLoaderShown", "true");
      setLoading(false);
    }, 2500);
  }, [loading]);

  if (loading) {
    return (
      <div style={styles.loaderWrapper}>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.05); opacity: 1; }
              100% { transform: scale(1); opacity: 0.8; }
            }
            @keyframes bgGradient {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
          `}
        </style>

        <div style={styles.content}>
          <div style={styles.spinnerContainer}>
            <div style={styles.outerRing}></div>
            <div style={styles.innerRing}></div>
            <span style={styles.logoLetter}>D</span>
          </div>
          
          <h2 style={styles.loadingText}>Delissa</h2>
          <div style={styles.progressBarContainer}>
            <div style={styles.progressBarFill}></div>
          </div>
          <p style={styles.subText}>Preparando los mejores sabores...</p>
        </div>
      </div>
    );
  }

  // Rutas principales
  return (
    <BrowserRouter>
      <FloatingAlerts alerts={alerts} onDismiss={(id) => setAlerts((current) => current.filter((item) => item.id !== id))} />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

function FloatingAlerts({ alerts, onDismiss }) {
  if (!alerts.length) return null;

  return createPortal(
    <div className="fixed right-4 top-4 z-[200000] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      {alerts.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl ring-1 ring-slate-900/5"
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-600">Delissa</p>
              <p className="mt-1 text-sm font-semibold leading-5">{item.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar alerta"
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}

// --- ESTILOS ---
const styles = {
  loaderWrapper: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(-45deg, #d32f2f, #f57c00, #ffeb3b, #f57c00)",
    backgroundSize: "400% 400%",
    animation: "bgGradient 10s ease infinite",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 9999,
    fontFamily: "'Inter', sans-serif",
  },
  content: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  spinnerContainer: {
    position: "relative",
    width: "100px",
    height: "100px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "20px",
  },
  outerRing: {
    position: "absolute",
    width: "100%",
    height: "100%",
    border: "4px solid rgba(255, 255, 255, 0.2)",
    borderTop: "4px solid #ffffff",
    borderRadius: "50%",
    animation: "spin 1.5s linear infinite",
  },
  innerRing: {
    position: "absolute",
    width: "70%",
    height: "70%",
    border: "4px solid rgba(255, 255, 255, 0.1)",
    borderBottom: "4px solid #ffeb3b",
    borderRadius: "50%",
    animation: "spin 2s linear reverse infinite",
  },
  logoLetter: {
    color: "#ffffff",
    fontSize: "2rem",
    fontWeight: "bold",
    textShadow: "0 2px 10px rgba(0,0,0,0.2)",
  },
  loadingText: {
    color: "#ffffff",
    fontSize: "2.5rem",
    margin: "10px 0",
    letterSpacing: "3px",
    fontWeight: "800",
    textTransform: "uppercase",
    animation: "pulse 2s ease-in-out infinite",
  },
  progressBarContainer: {
    width: "200px",
    height: "4px",
    background: "rgba(255, 255, 255, 0.3)",
    borderRadius: "10px",
    overflow: "hidden",
    marginTop: "10px",
  },
  progressBarFill: {
    width: "60%",
    height: "100%",
    background: "#ffeb3b",
    borderRadius: "10px",
    animation: "pulse 1.5s infinite",
  },
  subText: {
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: "15px",
    fontSize: "0.9rem",
    fontWeight: "500",
    fontStyle: "italic",
  }
};

export default App;
