import React from "react";
import { useNavigate } from "react-router-dom";
import useTheme from "../context/useTheme";
import Footer from "../components/Footer";
import "../styles/codeforces.css";

const Landing = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isRegistered = !!localStorage.getItem("user");

  return (
    <div className={`cf-page-container`}>
      <div className="cf-content-wrapper">

        {/* Header */}
        <header className="cf-header">
          <h1 className="cf-main-title">Place-it</h1>
          <p className="cf-text">
            A data-driven platform for analyzing and validating retail store locations
            using geographic and demand-based insights.
          </p>
        </header>

        <div className="cf-action-bar">
          {!isRegistered && (
            <button
              className="btn cf-btn-primary"
              onClick={() => navigate("/register")}
            >
              Register
            </button>
          )}

          <button
            className="btn cf-btn-outline"
            onClick={() => navigate("/about")}
          >
            About
          </button>

          {isRegistered && (
            <button
              className="btn cf-btn-primary"
              onClick={() => navigate("/home")}
            >
              Let’s go
            </button>
          )}
        </div>

        <hr className="cf-hr" />

        <section className="cf-section">
          <h2 className="cf-sub-title">Overview</h2>
          <p className="cf-text">
            Choosing the right location is critical for any physical business.
            Place-it assists users in evaluating potential locations by combining
            spatial data, nearby facilities, and demand indicators into a single
            analytical workflow.
          </p>
        </section>

        {/* What is Place-it */}
        <section className="cf-section">
          <h2 className="cf-sub-title">What is Place-it?</h2>
          <p className="cf-text">
            Place-it is a location analysis tool that helps determine whether a
            specific area is suitable for opening a new store. Users can search
            for locations, define an analysis radius, and receive feasibility
            feedback based on surrounding data.
          </p>
        </section>

        {/* Who is it for */}
        <section className="cf-section">
          <h2 className="cf-sub-title">Who is this platform for?</h2>
          <ul className="cf-list">
            <li>Retail business owners planning expansion</li>
            <li>Entrepreneurs evaluating new store locations</li>
            <li>Students and researchers working on location analytics</li>
            <li>Analysts exploring geographic demand patterns</li>
          </ul>
        </section>

        {/* Features */}
        <section className="cf-section">
          <h2 className="cf-sub-title">Key Features</h2>
          <ul className="cf-list">
            <li>Location-based feasibility analysis</li>
            <li>Radius-based filtering of nearby entities</li>
            <li>Heatmap visualization for demand density</li>
            <li>Interactive map-based exploration</li>
          </ul>
        </section>

        {/* How it works */}
        <section className="cf-section">
          <h2 className="cf-sub-title">How it works</h2>
          <ol className="cf-list">
            <li>Select or search for a geographic location</li>
            <li>Define the radius for analysis</li>
            <li>Run the analysis to obtain feasibility insights</li>
          </ol>
        </section>

        {/* Methodology */}
        <section className="cf-section">
          <h2 className="cf-sub-title">Data & Methodology</h2>
          <p className="cf-text">
            The analysis is based on publicly available geographic data,
            nearby infrastructure, and heuristic scoring methods. Heatmaps
            are generated to visualize concentration and relative suitability
            of regions within the selected radius.
          </p>
        </section>

        {/* Limitations */}
        <section className="cf-section">
          <h2 className="cf-sub-title">Assumptions and limitations</h2>
          <ul className="cf-list">
            <li>Results are indicative and not definitive business guarantees</li>
            <li>Data accuracy depends on external sources</li>
            <li>Local regulations and market dynamics are not fully modeled</li>
          </ul>
        </section>

        {/* Why use */}
        <section className="cf-section">
          <h2 className="cf-sub-title">Why use Place-it?</h2>
          <ul className="cf-list">
            <li>Encourages data-backed decision making</li>
            <li>Reduces uncertainty during site selection</li>
            <li>Saves time during preliminary analysis</li>
            <li>Provides clear visual and geographic context</li>
          </ul>
        </section>

        <hr className="cf-hr" />

        {/* CTA */}
        <div className="cf-action-bar">
          <button
            className="btn cf-btn-primary"
            onClick={() => navigate("/register")}
          >
            Start analyzing locations
          </button>
        </div>

      </div>

      <Footer />
    </div>
  );
};

export default Landing;
