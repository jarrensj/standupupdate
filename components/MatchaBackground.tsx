'use client'

import React, { useEffect, useRef, useState } from 'react'

export default function MatchaBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [prevMousePos, setPrevMousePos] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const particlesRef = useRef<Particle[]>([])
  const fluidVelocityRef = useRef<FluidCell[][]>([])
  const animationRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const isInitializedRef = useRef(false)
  const isCleaningUpRef = useRef(false)

  // fluid simulation cell
  class FluidCell {
    vx: number
    vy: number

    constructor() {
      this.vx = 0
      this.vy = 0
    }
  }

  // particle class for matcha powder
  class Particle {
    x: number
    y: number
    size: number
    baseY: number
    vx: number
    vy: number
    mass: number
    mixLevel: number
    color: string
    alpha: number
    settled: boolean
    noiseOffset: number
    clusterIndex: number

    constructor(x: number, y: number, size: number, clusterIndex = 0) {
      this.x = x
      this.y = y
      this.baseY = y
      this.size = size
      this.vx = (Math.random() - 0.5) * 0.1
      this.vy = (Math.random() - 0.5) * 0.1
      this.mass = size * size * 0.1
      this.mixLevel = 0
      this.clusterIndex = clusterIndex

      // vary the green color for more natural powder look
      const greenVariation = Math.floor(80 + Math.random() * 40)
      this.color = `rgba(30, ${greenVariation}, 30`
      this.alpha = 0.4 + Math.random() * 0.6
      this.settled = true
      this.noiseOffset = Math.random() * 1000
    }

    draw(ctx: CanvasRenderingContext2D, time: number) {
      try {
        // apply subtle noise to size for more organic look
        const noiseTime = time * 0.001 + this.noiseOffset
        const sizeVariation = Math.sin(noiseTime) * 0.15 + 1
        const drawSize = this.size * sizeVariation

        // matcha color gets darker and more saturated as it mixes
        // adjust to maintain rich green instead of gray
        const green = Math.floor(120 - this.mixLevel * 40)
        // reduce red component for more vibrant green
        const red = Math.floor(30 - this.mixLevel * 15)
        // reduce blue component for more vibrant green
        const blue = Math.floor(20 - this.mixLevel * 10)
        const alpha = this.alpha - this.mixLevel * 0.1 // less transparency reduction

        // use a radial gradient for softer edges with richer green
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, drawSize)
        gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${alpha})`)
        gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(this.x, this.y, drawSize * 1.5, 0, Math.PI * 2)
        ctx.fill()
      } catch (error) {
        console.error("Error drawing particle:", error)
      }
    }

    update(
      dt: number,
      fluidGrid: FluidCell[][],
      gridSize: number,
      canvasWidth: number,
      mouseX: number,
      mouseY: number,
      isHovering: boolean,
      particles: Particle[],
    ) {
      try {
        // get fluid velocity at particle position
        const cellX = Math.floor(this.x / gridSize)
        const cellY = Math.floor(this.y / gridSize)

        // check if mouse is near the particle for direct stirring effect
        const dx = mouseX - this.x
        const dy = mouseY - this.y
        const distanceToMouse = Math.sqrt(dx * dx + dy * dy)

        // direct stirring effect - increase mix level when mouse is near
        if (isHovering && distanceToMouse < 80) {
          // calculate stirring intensity based on distance
          const stirIntensity = 1 - distanceToMouse / 80

          // increase mix level more when closer to mouse
          this.mixLevel = Math.min(1, this.mixLevel + 0.01 * stirIntensity * dt * 0.1)

          // add some velocity based on mouse movement
          const angle = Math.atan2(dy, dx)
          this.vx += Math.cos(angle) * 0.02 * stirIntensity
          this.vy += Math.sin(angle) * 0.02 * stirIntensity

          this.settled = false
        }

        if (cellX >= 0 && cellX < fluidGrid.length && cellY >= 0 && cellY < fluidGrid[0]?.length) {
          const cell = fluidGrid[cellX][cellY]
          if (!cell) return

          // apply fluid velocity to particle
          this.vx += cell.vx * 0.08
          this.vy += cell.vy * 0.08

          // if fluid is moving significantly, increase mix level
          const fluidSpeed = Math.sqrt(cell.vx * cell.vx + cell.vy * cell.vy)
          if (fluidSpeed > 0.05) {
            this.mixLevel = Math.min(1, this.mixLevel + fluidSpeed * 0.01 * dt * 0.1)
            this.settled = false
          }
        }

        // cluster behavior - particles in the same cluster tend to stay together
        if (this.clusterIndex > 0 && this.settled) {
          let clusterCenterX = 0
          let clusterCenterY = 0
          let clusterCount = 0

          // check if particles is an array before iterating
          if (Array.isArray(particles)) {
            // find center of this cluster
            for (const particle of particles) {
              if (particle.clusterIndex === this.clusterIndex && particle !== this) {
                clusterCenterX += particle.x
                clusterCenterY += particle.y
                clusterCount++
              }
            }
          }

          if (clusterCount > 0) {
            clusterCenterX /= clusterCount
            clusterCenterY /= clusterCount

            // gentle attraction to cluster center
            const toCenterX = clusterCenterX - this.x
            const toCenterY = clusterCenterY - this.y
            const distToCenter = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY)

            if (distToCenter > 5) {
              this.vx += toCenterX * 0.0001
              this.vy += toCenterY * 0.0001
            }
          }
        }

        // apply gravity if not mixed
        if (this.mixLevel < 0.2) {
          this.vy += 0.004 * (1 - this.mixLevel * 5)
        }

        // apply buoyancy if mixed (matcha rises when mixed)
        if (this.mixLevel > 0) {
          this.vy -= this.mixLevel * 0.01
        }

        // apply drag (resistance)
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
        if (speed > 0) {
          const drag = 0.97 - this.mixLevel * 0.1
          this.vx *= drag
          this.vy *= drag
        }

        // update position
        this.x += this.vx * dt
        this.y += this.vy * dt

        // boundary checks
        if (this.x < 0) {
          this.x = 0
          this.vx *= -0.5
        }
        if (this.x > canvasWidth) {
          this.x = canvasWidth
          this.vx *= -0.5
        }

        // bottom boundary - settle particles
        if (this.y > this.baseY && this.mixLevel < 0.2) {
          this.y = this.baseY
          this.vy *= -0.1

          // gradually come to rest
          if (Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1) {
            this.settled = true
            this.vx *= 0.8
            this.vy *= 0.8
          }
        }

        // top boundary
        if (this.y < 0) {
          this.y = 0
          this.vy *= -0.5
        }

        // reset if it goes too high and is mixed
        if (this.y < 50 && this.mixLevel > 0.5) {
          this.y = this.baseY
          this.mixLevel = Math.max(0, this.mixLevel - 0.3)
          this.vx = (Math.random() - 0.5) * 0.2
          this.vy = (Math.random() - 0.5) * 0.2
        }

        // random movement for unsettled particles
        if (!this.settled && Math.random() < 0.03) {
          this.vx += (Math.random() - 0.5) * 0.05
          this.vy += (Math.random() - 0.5) * 0.05
        }
      } catch (error) {
        console.error("Error updating particle:", error)
      }
    }
  }

  // update fluid simulation
  const updateFluid = (
    fluidGrid: FluidCell[][],
    mouseX: number,
    mouseY: number,
    prevMouseX: number,
    prevMouseY: number,
    isHovering: boolean,
    gridSize: number,
  ) => {
    try {
      if (!fluidGrid || !fluidGrid.length || !fluidGrid[0]?.length) return

      // mouse force
      if (isHovering) {
        const mouseVelX = (mouseX - prevMouseX) * 0.02
        const mouseVelY = (mouseY - prevMouseY) * 0.02

        // Apply force in a radius around mouse
        const radius = 5
        const cellX = Math.floor(mouseX / gridSize)
        const cellY = Math.floor(mouseY / gridSize)

        for (let i = Math.max(0, cellX - radius); i < Math.min(fluidGrid.length, cellX + radius); i++) {
          for (let j = Math.max(0, cellY - radius); j < Math.min(fluidGrid[0].length, cellY + radius); j++) {
            if (!fluidGrid[i] || !fluidGrid[i][j]) continue

            const dx = i - cellX
            const dy = j - cellY
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < radius) {
              const factor = (1 - distance / radius) * 2
              fluidGrid[i][j].vx += mouseVelX * factor
              fluidGrid[i][j].vy += mouseVelY * factor
            }
          }
        }
      }

      // create a new grid with the same dimensions
      const gridWidth = fluidGrid.length
      const gridHeight = fluidGrid[0].length

      // diffuse velocity
      const newGrid: FluidCell[][] = Array(gridWidth)
        .fill(null)
        .map(() =>
          Array(gridHeight)
            .fill(null)
            .map(() => new FluidCell()),
        )

      for (let i = 1; i < gridWidth - 1; i++) {
        for (let j = 1; j < gridHeight - 1; j++) {
          if (!fluidGrid[i - 1] || !fluidGrid[i + 1] || !fluidGrid[i][j - 1] || !fluidGrid[i][j + 1]) continue

          // average velocity of neighbors
          newGrid[i][j].vx =
            (fluidGrid[i - 1][j].vx + fluidGrid[i + 1][j].vx + fluidGrid[i][j - 1].vx + fluidGrid[i][j + 1].vx) * 0.2 +
            fluidGrid[i][j].vx * 0.2

          newGrid[i][j].vy =
            (fluidGrid[i - 1][j].vy + fluidGrid[i + 1][j].vy + fluidGrid[i][j - 1].vy + fluidGrid[i][j + 1].vy) * 0.2 +
            fluidGrid[i][j].vy * 0.2

          // apply drag
          newGrid[i][j].vx *= 0.99
          newGrid[i][j].vy *= 0.99
        }
      }

      // copy back
      for (let i = 1; i < gridWidth - 1; i++) {
        for (let j = 1; j < gridHeight - 1; j++) {
          if (fluidGrid[i] && fluidGrid[i][j] && newGrid[i] && newGrid[i][j]) {
            fluidGrid[i][j].vx = newGrid[i][j].vx
            fluidGrid[i][j].vy = newGrid[i][j].vy
          }
        }
      }
    } catch (error) {
      console.error("Error updating fluid:", error)
    }
  }

  // create a cluster of particles
  const createCluster = (
    x: number,
    y: number,
    radius: number,
    particleCount: number,
    clusterIndex: number,
    minSize = 0.3,
    maxSize = 1.5,
  ) => {
    const particles: Particle[] = []

    try {
      for (let i = 0; i < particleCount; i++) {
        // use gaussian-like distribution for more natural clustering
        const r = radius * Math.pow(Math.random(), 0.5)
        const angle = Math.random() * Math.PI * 2

        const px = x + Math.cos(angle) * r
        const py = y + Math.sin(angle) * r

        // vary particle size
        const size = minSize + Math.random() * (maxSize - minSize)

        particles.push(new Particle(px, py, size, clusterIndex))
      }
    } catch (error) {
      console.error("Error creating cluster:", error)
    }

    return particles
  }

  const initializeElements = (width: number, height: number) => {
    try {
      if (width <= 0 || height <= 0) {
        console.error("Invalid dimensions for initialization:", width, height)
        return
      }

      // create matcha powder particles with clustering for more realistic powder look
      const particles: Particle[] = []

      // create a more concentrated powder area at the bottom
      const powderHeight = 80 // Height of the powder area from bottom

      // create several clusters of powder
      const clusterCount = 15
      for (let i = 0; i < clusterCount; i++) {
        // ensure clusters are distributed across the full width
        // by dividing the width into sections and placing clusters within each section
        const sectionWidth = width / clusterCount
        const sectionStart = i * sectionWidth
        const clusterX = sectionStart + Math.random() * sectionWidth
        const clusterY = height - Math.random() * (powderHeight * 0.7)
        const clusterRadius = 10 + Math.random() * 30
        const particleCount = 50 + Math.floor(Math.random() * 100)

        const clusterParticles = createCluster(
          clusterX,
          clusterY,
          clusterRadius,
          particleCount,
          i + 1,
          0.2, // min size
          1.2, // max size
        )

        particles.push(...clusterParticles)
      }

      // add some very fine particles scattered throughout
      const dustCount = Math.floor((width * height) / 500)
      for (let i = 0; i < dustCount; i++) {
        const size = 0.1 + Math.random() * 0.3
        const x = Math.random() * width
        const y = height - Math.random() * powderHeight
        particles.push(new Particle(x, y, size))
      }

      // addd some larger particles for texture
      const largeCount = Math.floor((width * height) / 10000)
      for (let i = 0; i < largeCount; i++) {
        const size = 1.5 + Math.random() * 1.5
        const x = Math.random() * width
        const y = height - Math.random() * powderHeight
        particles.push(new Particle(x, y, size))
      }

      particlesRef.current = particles
    } catch (error) {
      console.error("Error initializing elements:", error)
      particlesRef.current = []
    }
  }

  // safe cleanup function
  const cleanup = () => {
    try {
      isCleaningUpRef.current = true
      window.removeEventListener("resize", handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = 0
      }
    } catch (error) {
      console.error("Error during cleanup:", error)
    }
  }

  // safe resize handler
  const handleResize = () => {
    try {
      if (isCleaningUpRef.current) return
      if (!canvasRef.current) return

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()

      // set dimensions with integer values
      const intWidth = Math.max(1, Math.floor(rect.width))
      const intHeight = Math.max(1, Math.floor(rect.height))

      setDimensions({ width: intWidth, height: intHeight })

      // set canvas dimensions
      canvas.width = intWidth
      canvas.height = intHeight

      // initialize fluid grid
      const gridSize = 20
      const gridWidth = Math.max(2, Math.ceil(intWidth / gridSize))
      const gridHeight = Math.max(2, Math.ceil(intHeight / gridSize))

      const fluidGrid: FluidCell[][] = Array(gridWidth)
        .fill(null)
        .map(() =>
          Array(gridHeight)
            .fill(null)
            .map(() => new FluidCell()),
        )

      fluidVelocityRef.current = fluidGrid

      // reinitialize particles when resized
      initializeElements(intWidth, intHeight)
      isInitializedRef.current = true
    } catch (error) {
      console.error("Error in resize handler:", error)
    }
  }

  useEffect(() => {
    // initial setup
    handleResize()

    // add resize listener
    window.addEventListener("resize", handleResize)

    return cleanup
  }, [])

  useEffect(() => {
    // safety check to prevent animation before initialization
    if (
      isCleaningUpRef.current ||
      !isInitializedRef.current ||
      !canvasRef.current ||
      !fluidVelocityRef.current ||
      !fluidVelocityRef.current.length ||
      !fluidVelocityRef.current[0]?.length
    ) {
      return () => {}
    }

    let isActive = true
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      console.error("Could not get canvas context")
      return () => {}
    }

    let lastTime = performance.now()
    const gridSize = 20

    const animate = (currentTime: number) => {
      if (!isActive || isCleaningUpRef.current) return

      try {
        // safety check for canvas and context
        if (!canvasRef.current) return
        const ctx = canvasRef.current.getContext("2d")
        if (!ctx) return

        const deltaTime = Math.min(30, currentTime - lastTime)
        lastTime = currentTime
        timeRef.current += deltaTime

        const timeScale = 0.5
        const scaledDeltaTime = deltaTime * timeScale

        ctx.clearRect(0, 0, dimensions.width, dimensions.height)

        // update fluid simulation if initialized
        if (fluidVelocityRef.current && fluidVelocityRef.current.length > 0) {
          updateFluid(
            fluidVelocityRef.current,
            mousePos.x,
            mousePos.y,
            prevMousePos.x,
            prevMousePos.y,
            isHovering,
            gridSize
          )
        }

        setPrevMousePos({ x: mousePos.x, y: mousePos.y })

        // calculate average mix level for background color
        let totalMixLevel = 0
        let mixedParticles = 0

        if (particlesRef.current && particlesRef.current.length > 0) {
          particlesRef.current.forEach((particle) => {
            if (particle.mixLevel > 0) {
              totalMixLevel += particle.mixLevel
              mixedParticles++
            }
          })
        }

        // calculate average mix level, with a minimum to ensure color change
        const avgMixLevel = mixedParticles > 0 ? totalMixLevel / mixedParticles : 0

        // add a base mix level to make the background greener even without mixing
        const baseMixLevel = 0.05
        const effectiveMixLevel = baseMixLevel + avgMixLevel * (1 - baseMixLevel)

        // draw background gradient with more green that spreads throughout the canvas
        const bgGradient = ctx.createLinearGradient(0, 0, 0, dimensions.height)

        // top color - starts much lighter
        const topRedValue = Math.floor(250 - effectiveMixLevel * 210)
        const topGreenValue = Math.floor(250 - effectiveMixLevel * 90)
        const topBlueValue = Math.floor(250 - effectiveMixLevel * 210)
        bgGradient.addColorStop(0, `rgb(${topRedValue}, ${topGreenValue}, ${topBlueValue})`)

        // upper middle - starts less lighter
        const upperMidRedValue = Math.floor(245 - effectiveMixLevel * 225)
        const upperMidGreenValue = Math.floor(250 - effectiveMixLevel * 90)
        const upperMidBlueValue = Math.floor(245 - effectiveMixLevel * 225)
        bgGradient.addColorStop(0.3, `rgb(${upperMidRedValue}, ${upperMidGreenValue}, ${upperMidBlueValue})`)

        // lower middle - light but with some green
        const lowerMidRedValue = Math.floor(230 - effectiveMixLevel * 210)
        const lowerMidGreenValue = Math.floor(240 - effectiveMixLevel * 120)
        const lowerMidBlueValue = Math.floor(230 - effectiveMixLevel * 210)
        bgGradient.addColorStop(0.6, `rgb(${lowerMidRedValue}, ${lowerMidGreenValue}, ${lowerMidBlueValue})`)

        // bottom color - more green
        const bottomRedValue = Math.floor(200 - effectiveMixLevel * 190)
        const bottomGreenValue = Math.floor(230 - effectiveMixLevel * 190)
        const bottomBlueValue = Math.floor(200 - effectiveMixLevel * 190)
        bgGradient.addColorStop(1, `rgb(${bottomRedValue}, ${bottomGreenValue}, ${bottomBlueValue})`)

        ctx.fillStyle = bgGradient
        ctx.fillRect(0, 0, dimensions.width, dimensions.height)

        // update and draw particles
        if (particlesRef.current && particlesRef.current.length > 0 && fluidVelocityRef.current) {
          particlesRef.current.forEach((particle) => {
            particle.update(
              scaledDeltaTime,
              fluidVelocityRef.current,
              gridSize,
              dimensions.width,
              mousePos.x,
              mousePos.y,
              isHovering,
              particlesRef.current,
            )
            particle.draw(ctx, timeRef.current)
          })
        }

        if (isActive && !isCleaningUpRef.current) {
          animationRef.current = requestAnimationFrame(animate)
        }
      } catch (error) {
        console.error("Error in animation loop:", error)
        // try to recover by requesting next frame if still active
        if (isActive && !isCleaningUpRef.current) {
          animationRef.current = requestAnimationFrame(animate)
        }
      }
    }

    // start animation
    if (!isCleaningUpRef.current) {
      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      isActive = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = 0
      }
    }
  }, [dimensions, mousePos, prevMousePos, isHovering])

  const handleMouseMove = (e: React.MouseEvent) => {
    try {
      if (!canvasRef.current || isCleaningUpRef.current) return

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    } catch (error) {
      console.error("Error in mouse move handler:", error)
    }
  }

  return (
    <div className="w-full h-full absolute top-0 left-0 bottom-0 right-0">
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute top-0 left-0"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      />
    </div>
  )
}