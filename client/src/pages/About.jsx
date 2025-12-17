import React from "react";
import useTheme from "../context/useTheme"; 
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";

const About = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  return (
    // Apply the main page container class and theme class
    <div className={`cf-page-container ${theme}`}>
      <div className="cf-content-wrapper">
        
        {/* Hero Section */}
        <div className="cf-about-hero cf-section">
          <h1 className="cf-main-title">About <span className="cf-about-highlight" onClick={() => navigate('/')}>'Place-it!'</span></h1>
          <p className="cf-text cf-hero-subtitle">Smart and intuitive store placement system.</p>
        </div>

        {/* Main Content Section */}
        <div className="cf-about-section">
          
          <div className="cf-about-text">
            
            <h2 className="cf-sub-title">About Me!</h2>
            <p className="cf-text cf-bio-text">
              I'm <b>Rishit Mohanty</b>, a passionate <b>MERN Stack developer</b> with a keen interest in building smart solutions for everyday problems. This project is a testament to my dedication to creating user-friendly applications that leverage modern technology.
            </p>

            <h2 className="cf-sub-title">What Does This Website Do?</h2>
            <p className="cf-text">
              This website is designed to help <b>MNC's </b>, <b>E-commerce startups</b> and <b>private firms</b>, find the best places for placing their e-shops, whether it's shopping, dining, retail etc. Thanks to the advanced Machine Learning algorithms, we are able to analyze user's choice of placing the store and provide personalized recommendations.
            </p>
          </div>

          <div className="cf-about-image">
            <img className="cf-photo" src="/photo.jpg" alt="Rishit Mohanty" />
          </div>
        </div>
      </div>
      
      {/* Connect Section */}
      <h4 className="cf-connect-title">Connect with me on:</h4>
      
      <Footer />
    </div>
  );
};

export default About;