import type { CatHeroId, DogHeroId, HeroDefinition } from "./types";

export const CAT_HEROES: HeroDefinition<CatHeroId>[] = [
  { id: "blaze", name: "Blaze", role: "Tabby striker", trait: "Fearless", artPosition: "12% center", projectileType: "fishbone" },
  { id: "luna", name: "Luna", role: "Moon tactician", trait: "Focused", artPosition: "50% center", projectileType: "fishbone" },
  { id: "shadow", name: "Shadow", role: "Night trickster", trait: "Sneaky", artPosition: "88% center", projectileType: "fishbone" },
];

export const DOG_HEROES: HeroDefinition<DogHeroId>[] = [
  { id: "major", name: "Major Bark", role: "Yard captain", trait: "Brave", artPosition: "12% center", projectileType: "rubber-bone" },
  { id: "bruno", name: "Bruno", role: "Power bruiser", trait: "Stubborn", artPosition: "50% center", projectileType: "rubber-bone" },
  { id: "snow", name: "Snow", role: "Quick terrier", trait: "Playful", artPosition: "88% center", projectileType: "rubber-bone" },
];

export const DIFFICULTY_COPY = {
  easy: { label: "Easy", hint: "Wild guesses" },
  medium: { label: "Medium", hint: "Reads light wind" },
  hard: { label: "Hard", hint: "Sharp, still human" },
  expert: { label: "Expert", hint: "Very accurate" },
} as const;

export const getCatHero = (id: CatHeroId) => CAT_HEROES.find((hero) => hero.id === id) ?? CAT_HEROES[0];
export const getDogHero = (id: DogHeroId) => DOG_HEROES.find((hero) => hero.id === id) ?? DOG_HEROES[0];
