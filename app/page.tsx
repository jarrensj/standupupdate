'use client'

import StandupInput from "../components/StandupInput"
import MatchaBackground from "../components/MatchaBackground"

export default function Home() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <MatchaBackground />
      </div>

      <h1 className="absolute top-6 left-6 text-3xl font-bold z-20">gmatcha</h1>

      <div className="relative z-10 w-full max-w-4xl px-4">
        <StandupInput />
      </div>
    </main>
  )
}