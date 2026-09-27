import type { ComponentType } from "react"

import { CarDashboard } from "./car-dashboard"
import { Cockpit } from "./cockpit"
import { HealthDashboard } from "./health-dashboard"
import { MonitorDashboard } from "./monitor-dashboard"
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
      "A server monitor: load, temperature and fan on needle tiles, a CPU dial with a ring per core, memory and swap on one ring, network on a twin half dial, disk volumes and a top-style process list.",
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
    name: "Smart Home",
    description:
      "A smart home you can turn: a thermostat per room, dimmers for the lights, a volume knob beside what is playing, the car charging to its limit, the grid leaning between export and import, and tiles for air, water and the washer.",
    Component: SmartHomeDashboard,
  },
  {
    id: "car-dashboard",
    name: "Dashboard",
    description:
      "A twin-dial cluster: a tachometer with its redline band, and a speedometer with fuel closing its ring.",
    Component: CarDashboard,
  },
  {
    id: "cockpit",
    name: "Cockpit",
    description:
      "The six-pack of a light aircraft: airspeed, attitude, altitude, turn coordinator, heading and vertical speed, flown by a toy autopilot.",
    Component: Cockpit,
  },
]
