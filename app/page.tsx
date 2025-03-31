'use client'

import StandupInput from "../components/StandupInput"
import MatchaBackground from "../components/MatchaBackground"
import Footer from "../components/Footer"

export default function Home() {
  return (
    <main className="relative min-h-screen w-full flex flex-col">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <MatchaBackground key="home-background" />
      </div>

      <h1 className="absolute top-6 left-6 text-3xl font-bold z-20">gmatcha</h1>

      <div className="flex-grow flex items-center justify-center">
        <div className="relative z-10 w-full max-w-4xl px-4">
          <StandupInput />
        </div>
      </div>

      <div className="relative z-20 w-full py-4">
        <Footer />
      </div>
    </main>
  )
}