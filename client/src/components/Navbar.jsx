import React, { useState } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import useTheme from "../context/useTheme";
import { Sun, Moon } from "lucide-react";

const Navbar = ({ onLogout, user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (path) => { 
    navigate(path);
    setIsOpen(false);
  };

  const getActiveClassName = ({ isActive }) =>
    isActive ? "cf-nav-link active" : "cf-nav-link";

  const isAuthPage = ["/", "/login", "/register"].includes(location.pathname);
  
  const isHomePage = location.pathname === "/home";

  return (
    <>
      <nav
        className="navbar navbar-expand-lg cf-navbar shadow-none"
        style={{ position: "sticky", top: 0, zIndex: 1000 }}
      >
        <div className="container-fluid px-0">
          <span
            className="navbar-brand cf-brand"
            onClick={() => handleNavigate(user && isHomePage ? "/" : user ? "/home" : "/")}
            style={{ cursor: "pointer" }}
          >
            Place-it<span style={{color: "var(--accent)"}}>&lt;/&gt;</span>
          </span>

          <button
            className="navbar-toggler cf-navbar-toggler me-3"
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-controls="navbarNav"
            aria-expanded={isOpen}
            aria-label="Toggle navigation"
          >
            <span className="cf-navbar-toggler-icon"></span>
          </button>

          <div
            className={`collapse navbar-collapse ${isOpen ? "show" : ""}`}
            id="navbarNav"
          >
            <ul className="navbar-nav cf-nav-list">
              {user && (
                <>
                  <li className="nav-item" key="home">
                    <NavLink
                      to="/home"
                      className={getActiveClassName}
                      onClick={() => setIsOpen(false)}
                    >
                      Home
                    </NavLink>
                  </li>
                  <li className="nav-item" key="about">
                    <NavLink
                      to="/about"
                      className={getActiveClassName}
                      onClick={() => setIsOpen(false)}
                    >
                      About
                    </NavLink>
                  </li>
                </>
              )}

              {!user && isAuthPage && (
                <>
                  <li className="nav-item" key="login">
                    <NavLink
                      to="/login"
                      className={getActiveClassName}
                      onClick={() => setIsOpen(false)}
                    >
                      Login
                    </NavLink>
                  </li>
                  <li className="nav-item" key="register">
                    <NavLink
                      to="/register"
                      className={getActiveClassName}
                      onClick={() => setIsOpen(false)}
                    >
                      Register
                    </NavLink>
                  </li>
                </>
              )}
            </ul>

            <div className="d-flex ms-auto cf-right-side-group align-items-center">
              {user && (
                <>
                  <span className="cf-user-info me-3">
                    {user.displayName || user.email}
                  </span>
                  <button
                    className="btn btn-sm cf-logout-btn"
                    onClick={onLogout}
                  >
                    Logout
                  </button>
                </>
              )}

              <button
                className="btn btn-sm cf-theme-toggle"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div style={{height: '2px', backgroundColor: 'var(--bg-secondary)'}}></div> 
    </>
  );
};

export default Navbar;