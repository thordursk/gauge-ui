import type { ComponentType } from "react"

import { Cockpit } from "./cockpit"
import { EspressoMachine } from "./espresso-machine"
import { HealthDashboard } from "./health-dashboard"
import { MonitorDashboard } from "./monitor-dashboard"
import { MusicStudio } from "./music-studio"
import { RaceTelemetry } from "./race-telemetry"
import { RocketLaunch } from "./rocket-launch"
import { SmartHomeDashboard } from "./smart-home-dashboard"
import { TimeDashboard } from "./time-dashboard"
import { WeatherDashboard } from "./weather-dashboard"

export type Example = {
  id: string
  name: string
  description: string
  Component: ComponentType | null
}

/** Whole scenes built from the gauge primitives, one tab each. */
export const examples: Example[] = [
  {
    id: "monitor",
    name: "Monitor",
    description:
      "A server monitor: load, temperature and fan on needle tiles, a CPU dial with a ring per core, memory and swap on one ring, network on a twin half dial, disk volumes, a top-style process list, and ninety days of uptime per service.",
    Component: MonitorDashboard,
  },
  {
    id: "health",
    name: "Health",
    description:
      "A day in a health app: activity rings with the week beside them, live heart rate over its training zones, last night's sleep round a 24-hour dial, steps and water filling to their goals, and vitals on their normal ranges.",
    Component: HealthDashboard,
  },
  {
    id: "time",
    name: "Time",
    description:
      "World clocks for six cities, a chronograph stopwatch with laps, alarms on a 24-hour dial, and a bank of countdown timers.",
    Component: TimeDashboard,
  },
  {
    id: "weather",
    name: "Weather",
    description:
      "A Reykjavík afternoon: temperature over the hours ahead, a live wind vane, the sun's path, an aneroid barometer with its set hand, air quality and condition tiles.",
    Component: WeatherDashboard,
  },
  {
    id: "smart-home",
    name: "Home",
    description:
      "A smart home you can turn: a thermostat per room, dimmers for the lights, a volume knob beside what is playing, the car charging to its limit, the grid leaning between export and import, and tiles for air, water and the washer.",
    Component: SmartHomeDashboard,
  },
  {
    id: "music-studio",
    name: "Studio",
    description:
      "A music studio session: a mixer of channel faders with pan knobs and meters, a graphic EQ over a live analyser, a bus compressor's knobs and gain reduction, and the transport with its tempo knob and step lights, all played by a toy sequencer.",
    Component: MusicStudio,
  },
  {
    id: "race-telemetry",
    name: "Telemetry",
    description:
      "A race car on a flying lap: shift lights, pedals, gear, revs and steering, the lap timed against the best one, tyre temperatures against their window, the hybrid and fuel, and the car's place on the circuit sector by sector.",
    Component: RaceTelemetry,
  },
  {
    id: "launch",
    name: "Launch",
    description:
      "A rocket launch laid out like a webcast, from T−5 to orbit: the mission clock over its timeline of events, each stage's speed, altitude and g-force on thin rings beside its engines from below, the booster turning back and landing once the stages part, and the throttles, the air on the stack and the tanks on bars.",
    Component: RocketLaunch,
  },
  {
    id: "espresso",
    name: "Espresso",
    description:
      "An espresso machine pulling shots on a loop: the group's pressure on a manometer with the shot timer set into its foot, the cup filling to its target and the flow on bars, the boilers and the water tank, and a grinder slider and knobs for the recipe that speed the next shot up or slow it down.",
    Component: EspressoMachine,
  },
  {
    id: "cockpit",
    name: "Cockpit",
    description:
      "The six-pack of a light aircraft: airspeed, attitude, altitude, turn coordinator, heading and vertical speed, flown by a toy autopilot.",
    Component: Cockpit,
  },
]
