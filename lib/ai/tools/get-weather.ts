import { tool } from "ai";
import { z } from "zod";

// TODO CHAPTER 1: Implement the weather tool
//
// This tool should:
// 1. Accept a city name OR latitude/longitude coordinates
// 2. Geocode the city to coordinates using Open-Meteo Geocoding API
// 3. Fetch weather data from Open-Meteo Weather API
// 4. Return temperature and weather data
//
// Key implementation steps:
// - Create a geocodeCity() helper function
// - Handle both city and coordinate inputs
// - Return helpful error messages if geocoding fails
//
// See CHAPTER-1.md for the complete implementation.

/**
 * Weather Tool - Gets current weather for a location
 *
 * Accepts either:
 * - city: A city name like "San Francisco" or "London"
 * - latitude + longitude: Coordinates like 37.7749, -122.4194
 */
export const getWeather = tool({
  description:
    "Get the current weather at a location. You can provide either coordinates or a city name.",
  inputSchema: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    city: z
      .string()
      .describe("City name (e.g., 'San Francisco', 'New York', 'London')")
      .optional(),
  }),
  execute: async () => {
    // TODO: Implement in Chapter 1
    // 1. If city provided, geocode it to lat/long
    // 2. Fetch weather data from Open-Meteo API
    // 3. Return the weather data

    // Placeholder await to satisfy linter (remove when implementing)
    await Promise.resolve();

    return {
      todo: "Implement weather tool in Chapter 1",
      hint: "See CHAPTER-1.md for the complete implementation",
    };
  },
});
