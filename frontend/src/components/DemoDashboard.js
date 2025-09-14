"use client"

import { useState } from "react"
import "./DemoDashboard.css"

export default function DemoDashboard() {
  const [activeMood, setActiveMood] = useState(3)
  const moods = ["😢", "😐", "🙂", "😊", "😄"]

  return (
    <div className="demo-dashboard">
      {/* Header */}
      <nav className="header">
        <div className="logo">
          <div className="logo-icon">B</div>
          <span className="logo-text">BloomUp</span>
        </div>

        <div className="nav-buttons">
          <button
            className="primary-btn primary-btn-login"
            onClick={() => (window.location.href = "/login")}
          >
            Login
          </button>
          <button
            className="primary-btn primary-btn-signup"
            onClick={() => (window.location.href = "/signup")}
          >
            Sign Up
          </button>
        </div>
      </nav>


      <div className="container">
        {/* Hero Section */}
        <section className="hero">
          <h1>
            Transform Your Life with <span className="highlight">BloomUp</span>
          </h1>
          <p>Your personal growth companion that helps you build lasting habits, practice gratitude, and track your journey.</p>
          <div className="hero-buttons">
          <button
            className="secondary-btn px-8 py-2"
            onClick={() => window.location.href = '/signup'}
          >
            Start Your Journey
          </button>

          </div>
        </section>

        {/* Features */}
        <section className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Habit Tracking</h3>
            <p>Build and maintain positive habits with visual progress tracking</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon pink">❤️</div>
            <h3>Gratitude Journal</h3>
            <p>Cultivate positivity with daily gratitude practice</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon yellow">😊</div>
            <h3>Mood Tracking</h3>
            <p>Monitor your emotional well-being and identify patterns</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon blue">📊</div>
            <h3>Progress Analytics</h3>
            <p>Visualize your growth with detailed insights and streaks</p>
          </div>
        </section>

        {/* Demo Dashboard */}
        <h2 className="section-title">See BloomUp in Action</h2>
        <section className="demo-dashboard-grid">
          {/* Main */}
          <div className="demo-main">
            {/* Habits Card */}
            <div className="card">
              <div className="card-header">🎯 Today's Habits</div>
              <div className="card-content">
                <div className="progress-row">
                  <span>Daily Progress</span>
                  <span>75%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: "75%" }}></div>
                </div>
                <div className="habit-items">
                  <div className="habit-item completed">
                    ✅ Morning Exercise <span className="badge">🔥 12 days</span>
                  </div>
                  <div className="habit-item pending">
                    ⬜ Read for 30 minutes <span className="badge">🔥 8 days</span>
                  </div>
                  <div className="habit-item completed purple">
                    ✅ Study Session <span className="badge">🔥 15 days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gratitude Card */}
            <div className="card gratitude-card">
              <div className="card-header">❤️ Today's Gratitude</div>
              <div className="card-content">
                <p>"Grateful for learning something new every day and support from family."</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="demo-sidebar">
            {/* Streak Card */}
            <div className="card">
              <div className="card-header">⚡ Current Streak</div>
              <div className="card-content streak-display">
                <div className="streak-number">23</div>
                <div className="streak-label">days active</div>
                <div className="streak-status">🔥 On fire!</div>
              </div>
            </div>

            {/* Mood Card */}
            <div className="card">
              <div className="card-header">😊 Mood Check</div>
              <div className="card-content mood-selector">
                {moods.map((emoji, index) => (
                  <div
                    key={index}
                    className={`mood-emoji ${activeMood === index ? "active" : ""}`}
                    onClick={() => setActiveMood(index)}
                  >
                    {emoji}
                  </div>
                ))}
                <p className="text-center">Feeling great today! 😊</p>
              </div>
            </div>

            {/* Weather Card */}
            <div className="card">
              <div className="card-content weather-widget">
                ☀️
                <div>
                  <p>Perfect day ahead!</p>
                  <p>Clear skies, 72°F</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="dashboard-container">
      {/* Benefits Section */}
      <div className="benefits-section">
        <h2 className="section-title">Why Choose BloomUp?</h2>

        <div className="benefits-grid">
          <div className="benefit-item">
            <div className="benefit-icon purple">📈</div>
            <h3 className="benefit-title">Track Your Progress</h3>
            <p className="benefit-desc">
              Visualize your growth with detailed analytics, streak counters, and progress charts that keep you motivated.
            </p>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon pink">❤️</div>
            <h3 className="benefit-title">Build Positive Mindset</h3>
            <p className="benefit-desc">
              Cultivate gratitude and mindfulness with daily journaling and mood tracking features.
            </p>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon blue">👥</div>
            <h3 className="benefit-title">Stay Consistent</h3>
            <p className="benefit-desc">
              Smart reminders and gamification elements help you maintain consistency in your personal growth journey.
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="cta-section">
        <h2 className="cta-title">Ready to Start Your Transformation?</h2>
        <p className="cta-desc">
          Join thousands of users who have already transformed their lives with BloomUp. Start building better habits today!
        </p>
        <div className="cta-buttons">
          <button className="cta-button-primary" onClick={() => (window.location.href = "/signup")}>
            Get Started Free
          </button>
          <button className="cta-button-outline" onClick={() => (window.location.href = "/login")}>
            Already have an account?
          </button>
        </div>
      </div>
    </div>
    </div>
  )
}
