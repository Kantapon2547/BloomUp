import React, { useState, useEffect } from "react";
import "./style/DemoDashboard.css";

export default function DemoDashboard() {
  const [activeMood, setActiveMood] = useState(3);
  const [habits, setHabits] = useState([
    { id: 1, name: "Morning Exercise", completed: true, streak: 12, category: "Health" },
    { id: 2, name: "Reading Novel", completed: false, streak: 8, category: "Personal" },
    { id: 3, name: "Study Session", completed: true, streak: 15, category: "Study" },
    { id: 4, name: "Meditation", completed: false, streak: 5, category: "Mind" } // Added this habit
  ]);

  const moods = ["😭", "😐", "🙂", "😊", "😁"];

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("demo-visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(".demo-animate-up");
    elements.forEach((el) => observer.observe(el));

    return () => elements.forEach((el) => observer.unobserve(el));
  }, []);

  // Toggle habit completion
  const toggleHabit = (id) => {
    setHabits(habits.map(h => h.id === id ? { ...h, completed: !h.completed } : h));
  };

  // Calculate stats
  const completedCount = habits.filter(h => h.completed).length;
  const progressPercent = Math.round((completedCount / habits.length) * 100);

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      'General': '#ede9ff',
      'Study': '#fff4cc',
      'Health': '#e9fcef',
      'Mind': '#fbefff',
      'Personal': '#e6e6f9'
    };
    return colors[category] || '#e6e6f9';
  };

  // Sort habits (completed at bottom)
  const sortedHabits = habits.sort((a, b) => a.completed - b.completed);

  return (
    <div className="demo-wrapper">
      <div className="demo-background-fixed"></div>

      {/* Header */}
      <nav className="demo-header">
        <div className="demo-logo">
          <div className="demo-logo-icon">B</div>
          <span className="demo-logo-text">BloomUp</span>
        </div>
        <div className="demo-nav-buttons">
          <button className="demo-primary-btn demo-btn-login" onClick={() => alert('Navigate to Login')}>
            Login
          </button>
          <button className="demo-primary-btn demo-btn-signup" onClick={() => alert('Navigate to Signup')}>
            Sign Up
          </button>
        </div>
      </nav>

      <div className="demo-container">
        {/* Hero Section */}
        <section className="demo-hero demo-animate-up">
          <h1>
            Transform Your Life with <span className="demo-highlight">BloomUp</span>
          </h1>
          <p>
            Your personal growth companion that helps you build lasting habits,<br />
            practice gratitude, and track your journey.
          </p>
          <div className="demo-hero-buttons">
            <button className="demo-secondary-btn" onClick={() => alert('Start Journey')}>
              Start Your Journey
            </button>
          </div>
        </section>

        {/* Features */}
        <section className="demo-features-grid">
          {[
            { icon: '🎯', title: 'Habit Tracking', desc: 'Build and maintain positive habits with visual progress tracking' },
            { icon: '❤️', title: 'Gratitude Journal', desc: 'Cultivate positivity with daily gratitude practice' },
            { icon: '😊', title: 'Mood Tracking', desc: 'Monitor your emotional well-being and identify patterns' },
            { icon: '📊', title: 'Progress Analytics', desc: 'Visualize your growth with detailed insights and streaks' }
          ].map((feature, i) => (
            <div key={i} className="demo-feature-card demo-animate-up" style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="demo-feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </section>

        {/* Demo Dashboard Section Title */}
        <h2 className="demo-section-title demo-animate-up">See BloomUp in Action</h2>

        {/* Dashboard Grid */}
        <section className="demo-dashboard-grid">
          {/* Left Column - Main Progress Card */}
          <div className="demo-main-col">
            <div className="demo-card demo-animate-up">
              <div className="demo-card-header">
                <div>
                  <h2 className="demo-card-title">Today's Habits</h2>
                  <p className="demo-card-subtitle">
                    Amazing finish! Keep the streak going — tomorrow's a new opportunity.
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="demo-progress-info">
                <span>Progress</span>
                <span className="demo-progress-percentage">{progressPercent}%</span>
              </div>
              <div className="demo-progress-track">
                <div className="demo-progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>

              {/* Habit List */}
              <div className="demo-habit-list">
                {sortedHabits.map((habit) => (
                  <div
                    key={habit.id}
                    className={`demo-habit-item ${habit.completed ? 'completed' : 'pending'}`}
                    onClick={() => toggleHabit(habit.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div className={`demo-custom-checkbox ${habit.completed ? 'checked' : ''}`}>
                        {habit.completed && (
                          <svg viewBox="0 0 24 24" className="demo-checkbox-icon">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <div className="demo-habit-text-col">
                        <h3 className={`demo-habit-title ${habit.completed ? 'done' : ''}`}>
                          {habit.name}
                        </h3>
                        <span 
                          className="demo-habit-tag"
                          style={{ backgroundColor: getCategoryColor(habit.category) }}
                        >
                          {habit.category}
                        </span>
                      </div>
                    </div>
                    <span className="demo-badge">🔥 {habit.streak} {habit.streak <= 1 ? 'day' : 'days'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="demo-sidebar-col">
            {/* Streak Card */}
            <div className="demo-card demo-animate-up" style={{ transitionDelay: '100ms' }}>
              <div className="demo-card-header" style={{ justifyContent: 'center' }}>Streak</div>
              <div className="demo-streak-display">
                <div className="demo-streak-number">23</div>
                <div className="demo-streak-status">Days Active 🔥</div>
              </div>
            </div>

            {/* Mood Card */}
            <div className="demo-card demo-animate-up" style={{ transitionDelay: '200ms' }}>
              <h3 className="demo-card-header" style={{ justifyContent: 'flex-start' }}>How are you feeling?</h3>
              <div className="demo-mood-selector">
                {moods.map((emoji, index) => (
                  <div
                    key={index}
                    className={`demo-mood-emoji ${activeMood === index ? "active" : ""}`}
                    onClick={() => setActiveMood(index)}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
              <p className="demo-mood-feedback">You're feeling {moods[activeMood]}</p>
            </div>

            {/* Gratitude Card - MOVED TO RIGHT COLUMN */}
            <div className="demo-card demo-gratitude-card demo-animate-up">
              <h3>Today's Gratitude 🙏</h3>
              <p>"Grateful for learning something new every day and support from family."</p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <div className="demo-benefits-section demo-animate-up">
          <h2 className="demo-section-title">Why Choose BloomUp?</h2>
          <div className="demo-benefits-grid">
            {[
              { icon: '📈', title: 'Track Your Progress', desc: 'Visualize your growth with detailed analytics, streak counters, and progress charts.' },
              { icon: '❤️', title: 'Build Positive Mindset', desc: 'Cultivate gratitude and mindfulness with daily journaling and mood tracking.' },
              { icon: '👥', title: 'Stay Consistent', desc: 'Smart reminders and gamification elements help you maintain consistency.' }
            ].map((benefit, i) => (
              <div key={i} className="demo-benefit-item demo-animate-up" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className={`demo-benefit-icon ${['purple', 'pink', 'blue'][i]}`}>{benefit.icon}</div>
                <h3 className="demo-benefit-title">{benefit.title}</h3>
                <p className="demo-benefit-desc">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="demo-cta-section demo-animate-up">
          <h2 className="demo-cta-title">Ready to Start Your Transformation?</h2>
          <p className="demo-cta-desc">
            Join thousands of users who have already transformed their lives with BloomUp.
          </p>
          <div className="demo-cta-buttons">
            <button className="demo-cta-button-primary" onClick={() => alert('Get Started')}>
              Get Started Free
            </button>
            <button className="demo-cta-button-outline" onClick={() => alert('Login')}>
              Already have an account?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}