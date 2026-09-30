export type ThemeId =
  "sunny" | "sunset" | "night" | "sakura" | "rooftop" | "rainy";
export type ArenaTheme = {
  id: ThemeId;
  name: string;
  description: string;
  environment: "yard" | "garden" | "roof" | "alley";
  particles: "leaves" | "birds" | "fireflies" | "petals" | "rain";
  palette: {
    skyTop: string;
    skyBottom: string;
    sun: string;
    hill: string;
    grass: string;
    grassDark: string;
    soil: string;
    fence: string;
    fenceDark: string;
    house: string;
    roof: string;
    window: string;
    leaf: string;
    leafLight: string;
    cloud: string;
  };
};
const base = {
  skyTop: "#a9e0e9",
  skyBottom: "#e4f0dc",
  sun: "#ffd365",
  hill: "#a2bca8",
  grass: "#a4bf70",
  grassDark: "#789653",
  soil: "#e4c793",
  fence: "#d9b885",
  fenceDark: "#b38f65",
  house: "#e6d5bf",
  roof: "#bca296",
  window: "#96bec4",
  leaf: "#819c7b",
  leafLight: "#acc38d",
  cloud: "#fff9e9",
};
export const THEMES: Record<ThemeId, ArenaTheme> = {
  sunny: {
    id: "sunny",
    name: "Sunny Backyard",
    description: "Laundry flaps. Rivalry brews.",
    environment: "yard",
    particles: "leaves",
    palette: base,
  },
  sunset: {
    id: "sunset",
    name: "Golden Hour",
    description: "One last throw before dinner.",
    environment: "yard",
    particles: "birds",
    palette: {
      ...base,
      skyTop: "#a187ae",
      skyBottom: "#f5c392",
      sun: "#ffe08d",
      hill: "#aaab93",
      grass: "#aba66c",
      grassDark: "#828051",
      soil: "#dbb38a",
      cloud: "#fce7d8",
    },
  },
  night: {
    id: "night",
    name: "Moonlight Yard",
    description: "Quiet streets. Not-so-quiet pets.",
    environment: "yard",
    particles: "fireflies",
    palette: {
      ...base,
      skyTop: "#263957",
      skyBottom: "#668398",
      sun: "#fff1c2",
      hill: "#6a8787",
      grass: "#789279",
      grassDark: "#557262",
      soil: "#b0a08c",
      fence: "#a89780",
      fenceDark: "#7c7164",
      house: "#a5a0aa",
      roof: "#807c94",
      window: "#f8d381",
      leaf: "#638379",
      leafLight: "#8ba494",
      cloud: "#d5e1e3",
    },
  },
  sakura: {
    id: "sakura",
    name: "Sakura Garden",
    description: "Soft petals. Sharp aim.",
    environment: "garden",
    particles: "petals",
    palette: {
      ...base,
      skyTop: "#c1e2e6",
      skyBottom: "#f8e0e7",
      hill: "#b4c5af",
      leaf: "#d6a5bb",
      leafLight: "#f2bfd0",
      fence: "#d9b2a0",
      soil: "#dfcbb0",
    },
  },
  rooftop: {
    id: "rooftop",
    name: "Rooftop Rumble",
    description: "Above the city. Over the wall.",
    environment: "roof",
    particles: "birds",
    palette: {
      ...base,
      skyTop: "#95c9df",
      skyBottom: "#d7dce4",
      hill: "#a1adbf",
      grass: "#aba8a5",
      grassDark: "#7e888e",
      soil: "#b7b5af",
      fence: "#bbc0c2",
      fenceDark: "#8c9ba2",
      house: "#b5bac7",
      roof: "#8d9fb0",
      window: "#dae4df",
    },
  },
  rainy: {
    id: "rainy",
    name: "Rainy Alley",
    description: "Puddle weather. Perfect mischief.",
    environment: "alley",
    particles: "rain",
    palette: {
      ...base,
      skyTop: "#8299aa",
      skyBottom: "#b8cacc",
      sun: "#cfdadc",
      hill: "#9aaeb0",
      grass: "#91a7a1",
      grassDark: "#667e7b",
      soil: "#9eaaa9",
      fence: "#b1b9b3",
      fenceDark: "#83918e",
      house: "#adb7b7",
      roof: "#819598",
      cloud: "#c2d1d3",
    },
  },
};
