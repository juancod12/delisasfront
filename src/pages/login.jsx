import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import logo from "../assets/delissa_Logo.png";
const Login = () => {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
 

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const res = await fetch("http://localhost:8080/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        correo,
        password
      })
    });

    if (!res.ok) {
      alert("Credenciales incorrectas");
      return;
    }

    const data = await res.json();

    localStorage.setItem("user", JSON.stringify(data));
    alert(`Bienvenido ${data.nombre}`);
    navigate("/dashboard");

  } catch (error) {
    console.error(error);
    alert("Error en el servidor");
  }
};
  return (
    <div style={styles.pageContainer}>
      <div style={styles.gradientOverlay}>
        <div style={styles.loginCard}>
          
        <div style={styles.logoSection}>
            <img 
              src={logo}
              alt="Logo Delissa" 
              style={styles.logoImage}
            />
            <div style={styles.yellowDivider}></div>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <h2 style={styles.welcomeText}>¡Bienvenido!</h2>
            <p style={styles.subtitle}>Gestión de comidas con inteligencia</p>

            {/* CORREO */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Correo Electrónico</label>
              <input
                type="email"
                placeholder="usuario@delissa.com"
                style={styles.input}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>

            {/* CONTRASEÑA */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" style={styles.submitButton}>
              Iniciar Sesión
            </button>
          </form>

          <footer style={styles.cardFooter}>
            <p style={styles.copyright}>Delissa Software © 2026</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

// --- ESTILOS ---
const styles = {
  pageContainer: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    padding: 0,
    fontFamily: "'Inter', sans-serif",
    backgroundImage: 'url("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'fixed',
    top: 0,
    left: 0,
  },
  gradientOverlay: {
    height: '100%',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(245, 124, 0, 0.7) 0%, rgba(211, 47, 47, 0.7) 100%)',
  },
  loginCard: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '24px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
    textAlign: 'center',
  },
  logoSection: {
    marginBottom: '25px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoImage: { maxWidth: '160px', marginBottom: '10px' },
  yellowDivider: { height: '4px', width: '50px', backgroundColor: '#FFEB3B', borderRadius: '2px' },
  welcomeText: { fontSize: '1.8rem', color: '#333', margin: '0', fontWeight: '800' },
  subtitle: { color: '#777', fontSize: '0.9rem', marginBottom: '25px' },
  form: { textAlign: 'left' },
  inputGroup: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555', fontSize: '0.85rem' },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
  roleSwitcher: {
    display: 'flex',
    gap: '8px',
    backgroundColor: '#f5f5f5',
    padding: '5px',
    borderRadius: '10px',
  },
  roleButton: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: '0.3s',
  },
  activeRoleAdmin: { backgroundColor: '#D32F2F', color: 'white' },
  activeRoleEmpleado: { backgroundColor: '#F57C00', color: 'white' },
  inactiveRole: { backgroundColor: 'transparent', color: '#777' },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(90deg, #D32F2F 0%, #F57C00 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '15px',
    boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)',
  },
  cardFooter: { marginTop: '25px', fontSize: '0.8rem', color: '#bbb' },
};

export default Login;
