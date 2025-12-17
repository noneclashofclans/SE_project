import React from "react";
import { FaGithub, FaLinkedin, FaEnvelope } from "react-icons/fa";
import '../styles/codeforces.css'

const Footer = () => {
  return (
    <>
      <div className="cf-footer">
        {/* Social Icons */}
        <a
          href="https://github.com/noneclashofclans"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <FaGithub size={24} className="cf-footer-icon" /> 
        </a>
        <a
          href="https://www.linkedin.com/in/rishit-mohanty-620bbb284/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
        >
          <FaLinkedin size={24} className="cf-footer-icon" />
        </a>
        <a href="mailto:rishitmohanty3@gmail.com" aria-label="Email">
          <FaEnvelope size={24} className="cf-footer-icon" />
        </a>
        
        <span style={{ marginLeft: '40px', color: 'var(--text-secondary)' }}>
            | Place-it!
        </span>
      </div>
      <div className="cf-footer-info">
          &copy; {new Date().getFullYear()} Rishit Mohanty. All rights reserved.
      </div>
    </>
  );
};

export default Footer;