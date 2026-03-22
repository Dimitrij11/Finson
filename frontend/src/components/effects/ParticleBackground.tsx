import { useEffect, useMemo, useState } from "react"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import type { ISourceOptions } from "@tsparticles/engine"
import { loadSlim } from "tsparticles-slim"

let engineInitPromise: Promise<void> | null = null

const ensureEngineInit = () => {
  if (!engineInitPromise) {
    engineInitPromise = initParticlesEngine(async (engine) => {
      // tsparticles-slim and @tsparticles/react are on different major versions in this repo.
      // Runtime is compatible for our use-case, so we bridge the type gap intentionally.
      await loadSlim(engine as never)
    })
  }

  return engineInitPromise
}

type ParticleBackgroundProps = {
  className?: string
  id?: string
}

export function ParticleBackground({ className, id = "particle-bg" }: ParticleBackgroundProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    ensureEngineInit().then(() => {
      if (mounted) {
        setReady(true)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  const options = useMemo<ISourceOptions>(
    () => ({
      fullScreen: {
        enable: false,
      },
      fpsLimit: 60,
      detectRetina: true,
      particles: {
        number: {
          value: 90,
          density: {
            enable: true,
            area: 900,
          },
        },
        color: {
          value: "#ffffff",
        },
        links: {
          enable: false,
        },
        opacity: {
          value: {
            min: 0.2,
            max: 0.4,
          },
          animation: {
            enable: false,
          },
        },
        size: {
          value: {
            min: 1,
            max: 3,
          },
        },
        move: {
          enable: true,
          speed: 0.5,
          direction: "none",
          random: true,
          straight: false,
          outModes: {
            default: "out",
          },
        },
      },
      interactivity: {
        detectsOn: "window",
        events: {
          onHover: {
            enable: true,
            mode: "parallax",
          },
          resize: {
            enable: true,
          },
        },
        modes: {
          parallax: {
            enable: true,
            force: 30,
            smooth: 20,
          },
        },
      },
      pauseOnOutsideViewport: true,
      background: {
        color: "transparent",
      },
    }),
    []
  )

  if (!ready) {
    return null
  }

  return <Particles id={id} className={className} options={options} />
}
