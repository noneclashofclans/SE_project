import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useTheme from "../context/useTheme";

const apiUrl = import.meta.env.VITE_AUTH_API_URL || "http://localhost:5000";

const Register = () => {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null); 
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        navigate("/login");
      }, 2000); 

      return () => clearTimeout(timer); 
    }
  }, [successMessage, navigate]);

  const register_user = async (e) => {
    e.preventDefault();

    if (!password || !email) {
      alert("Please fill in all fields"); 
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        `${apiUrl}/api/auth/register`,
        {
          email,
          password,
        }
      );
      
      setSuccessMessage("✅ Registration successful! Redirecting to login...");

    } catch (error) {
      console.error("Registration error:", error);
      
      let errorMessage = "An unexpected error occurred during registration.";
      if (error.response?.status === 409) {
        errorMessage = "⚠️ This email is already registered. Redirecting to login.";
      }
      
      setSuccessMessage(errorMessage); 
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      
    } finally {
      setLoading(false); 
    }
  };

  const getMessageStyle = () => {
    if (!successMessage) return {};
    
    const isSuccess = successMessage.startsWith('✅');
    return {
      backgroundColor: isSuccess ? 'var(--success)' : 'var(--danger)',
      color: 'white',
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '20px',
      textAlign: 'center',
      fontWeight: 'bold',
      transition: 'opacity 0.3s ease',
    };
  };

  return (
    <div className={`cf-auth-container ${theme}`}> 
      <form className="cf-auth-form" onSubmit={register_user}>
        
        {/* Success/Error Message Display */}
        {successMessage && (
          <div style={getMessageStyle()}>
            {successMessage}
          </div>
        )}
        
        <h2 className="cf-main-title cf-form-title">Register</h2>
        
        <input
          className="cf-input"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading || !!successMessage}
        />
        <input
          className="cf-input"
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading || !!successMessage}
        />
        
        <button 
          type="submit" 
          className="cf-btn-primary cf-form-button"
          disabled={loading || !!successMessage} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid #fff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span>Processing...</span>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            "Submit"
          )}
        </button>
        
        <p className="cf-text cf-login-link-container">
          Existing user?
          <span className="cf-login-link" onClick={() => !loading && !successMessage && navigate("/login")}>
            Login
          </span>
        </p>
      </form>
    </div>
  );
};

export default Register;