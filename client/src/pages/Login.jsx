import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";
import useTheme from "../context/useTheme"; 

const apiUrl = import.meta.env.VITE_AUTH_API_URL || "http://localhost:5000";

const Login = ({ setUser }) => {
  const [email, setemail] = useState("");
  const [password, setpassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState(null); 
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    if (loginMessage && loginMessage.startsWith('✅')) {
      const timer = setTimeout(() => {
        navigate("/home");
      }, 2000); 

      return () => clearTimeout(timer); 
    }
  }, [loginMessage, navigate]);

  const login_user = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${apiUrl}/api/auth/login`,
        {
          email,
          password,
        }
      );
      
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      setUser(response.data.user);
      
      setLoginMessage(`✅ Login successful! Welcome ${response.data.user.email}. Redirecting...`);

    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "An error occurred. Please try again later.";
      if (error.response?.status === 400) {
        errorMessage = "❌ Invalid email or password.";
      }
      setLoginMessage(errorMessage);
      
      setTimeout(() => setLoginMessage(null), 3000);
      
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user.email;
      const userName = result.user.displayName; 

      localStorage.setItem("user", JSON.stringify({ email: userEmail, displayName: userName }));
      
      setUser({ email: userEmail, displayName: userName });
      
      setLoginMessage(`✅ Login successful! Welcome ${userName || userEmail}. Redirecting...`);

    } catch (error) {
      console.error("Google sign-in error:", error);
      setLoginMessage("❌ Failed to sign in with Google.");
      setTimeout(() => setLoginMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };
  
  const getMessageStyle = () => {
    if (!loginMessage) return {};
    
    const isSuccess = loginMessage.startsWith('✅');
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
      <form className="cf-auth-form" onSubmit={login_user}>
        
        {loginMessage && (
          <div style={getMessageStyle()}>
            {loginMessage}
          </div>
        )}
        
        <h3 className="cf-main-title cf-form-title">User Login</h3>
        <input
          className="cf-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setemail(e.target.value)}
          required
          disabled={loading || !!loginMessage}
        />
        <input
          className="cf-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setpassword(e.target.value)}
          required
          disabled={loading || !!loginMessage}
        />
        
        <button 
          type="submit" 
          className="cf-btn-primary cf-form-button"
          disabled={loading || !!loginMessage}
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
              <span>Logging in...</span>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            "Login"
          )}
        </button>
        
        <p className="cf-separator cf-text">or</p> 
        
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="cf-google-btn cf-form-button"
          disabled={loading || !!loginMessage}
        >
          Sign in with <FcGoogle size={20} />
        </button>
      </form>
    </div>
  );
};

export default Login;