"use client"

import { useState } from "react"

const habits = [
  { name: "Study for 2 hours", tag: "Study", description: "Stay consistent with learning" },
  { name: "Morning Exercise", tag: "Health", description: "30 min workout" },
  { name: "Read 30 minutes", tag: "Personal", description: "Expand your knowledge" },
]

const motivationQuotes = [
  "Small steps every day lead to big changes every year.",
  "Progress, not perfection, is the goal.",
  "You are capable of amazing things.",
]

export default function Dashboard() {
  const [completed, setCompleted] = useState(Array(habits.length).fill(false))

  const toggle = (i) => {
    const copy = [...completed]
    copy[i] = !copy[i]
    setCompleted(copy)
  }

  const doneCount = completed.filter(Boolean).length
  const progress = Math.round((doneCount / habits.length) * 100)
  const currentQuote = motivationQuotes[Math.floor(Math.random() * motivationQuotes.length)]

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Good morning, Alex 🌸</h1>
          <p className="text-gray-600">
            You’ve completed {doneCount} of {habits.length} tasks today
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-500">Today's Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Habits List */}
        <div className="space-y-3">
          {habits.map((h, i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-lg shadow border flex items-start gap-3 hover:shadow-md transition"
            >
              <button
                onClick={() => toggle(i)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                  completed[i] ? "bg-green-500 border-green-500 text-white" : "border-gray-300"
                }`}
              >
                {completed[i] && <span className="text-xs">✔</span>}
              </button>
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    completed[i] ? "line-through text-gray-400" : "text-gray-800"
                  }`}
                >
                  {h.name}
                </h3>
                <p className="text-sm text-gray-500">{h.description}</p>
                <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  {h.tag}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Motivation */}
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-4 rounded-lg shadow text-center">
          <p className="italic text-sm text-gray-700">“{currentQuote}”</p>
        </div>
      </div>
    </div>
  )
}
