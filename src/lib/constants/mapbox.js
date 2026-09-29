/**
 * Standard Mapbox Configuration and Production Fallbacks
 * Ensures maps render reliably on production (e.g. Vercel deployments)
 * even if environment variables have not been configured yet in the Vercel dashboard.
 */

export const DEFAULT_MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";


export const DEFAULT_MAPBOX_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE ||
  "mapbox://styles/kitlin011/cmugz0j2u003101so6o0k7t1s";

export const DEFAULT_FLOOD_TILESET =
  process.env.NEXT_PUBLIC_FLOOD_TILESET ||
  "mapbox://apex-yoshi.pcfu74sslrtt";

export const DEFAULT_LANDSLIDE_TILESET =
  process.env.NEXT_PUBLIC_LANDSLIDE_TILESET ||
  "mapbox://apex-yoshi.fpxdxp858iuw";

export const DEFAULT_STORM_SURGE_TILESET =
  process.env.NEXT_PUBLIC_STORM_SURGE_COMBINE_TILESET_URL ||
  "mapbox://apex-yoshi.cwto3bl6xxlg";

export function getMapboxToken() {
  return DEFAULT_MAPBOX_TOKEN;
}

export function getMapboxStyle() {
  return DEFAULT_MAPBOX_STYLE;
}
