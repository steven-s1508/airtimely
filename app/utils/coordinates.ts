// Coordinates utility functions
// Map of coordinates for all included parks

/* Parks to include:
    [
  {
    "id": "altontowers",
    "name": "Alton Towers",
    "land": "Great Britain"
  },
  {
    "id": "bobbejaanland",
    "name": "Bobbejaanland",
    "land": "Belgium"
  },
  {
    "id": "caribeaquaticpark",
    "name": "Caribe Aquatic Park",
    "land": "Spain"
  },
  {
    "id": "chessingtonworld",
    "name": "Chessington World of Adventures",
    "land": "Great Britain"
  },
  {
    "id": "disneyadventureworld",
    "name": "Disney Adventure World",
    "land": "France"
  },
  {
    "id": "disneycaliforniaadventurepark",
    "name": "Disney California Adventure Park",
    "land": "United States"
  },
  {
    "id": "disneylandparis",
    "name": "Disneyland Paris",
    "land": "France"
  },
  {
    "id": "disneylandpark",
    "name": "Disneyland Park",
    "land": "Vereinigte Staaten"
  },
  {
    "id": "disneysanimalkingdomthemepark",
    "name": "Disney Animal Kingdom",
    "land": "United States"
  },
  {
    "id": "disneyshollywoodstudios",
    "name": "Disney Hollywood Studios",
    "land": "United States"
  },
  {
    "id": "djurssommerland",
    "name": "Djurs Sommerland",
    "land": "Denmark"
  },
  {
    "id": "efteling",
    "name": "Efteling",
    "land": "Netherlands"
  },
  {
    "id": "energylandia",
    "name": "Energylandia",
    "land": "Poland"
  },
  {
    "id": "epcot",
    "name": "EPCOT",
    "land": "United States"
  },
  {
    "id": "europapark",
    "name": "Europa-Park",
    "land": "Germany"
  },
  {
    "id": "familypark",
    "name": "Familypark",
    "land": "Austria"
  },
  {
    "id": "ferrariland",
    "name": "Ferrari Land",
    "land": "Spain"
  },
  {
    "id": "futuroscope",
    "name": "Futuroscope",
    "land": "France"
  },
  {
    "id": "gardaland",
    "name": "Gardaland",
    "land": "Italy"
  },
  {
    "id": "hansapark",
    "name": "HANSA-PARK",
    "land": "Germany"
  },
  {
    "id": "heidepark",
    "name": "Heide Park",
    "land": "Germany"
  },
  {
    "id": "holidaypark",
    "name": "Holiday Park",
    "land": "Germany"
  },
  {
    "id": "legoland",
    "name": "Legoland",
    "land": "Germany"
  },
  {
    "id": "legolandbillund",
    "name": "Legoland Billund",
    "land": "Denmark"
  },
  {
    "id": "legolandcalifornia",
    "name": "Legoland California",
    "land": "United States"
  },
  {
    "id": "legolandflorida",
    "name": "Legoland Florida",
    "land": "United States"
  },
  {
    "id": "legolandnewyork",
    "name": "Legoland New York",
    "land": "United States"
  },
  {
    "id": "legolandwindsor",
    "name": "Legoland Windsor",
    "land": "Great Britain"
  },
  {
    "id": "liseberg",
    "name": "Liseberg",
    "land": "Sweden"
  },
  {
    "id": "magickingdompark",
    "name": "Magic Kingdom Park",
    "land": "United States"
  },
  {
    "id": "movieparkgermany",
    "name": "Movie Park Germany",
    "land": "Germany"
  },
  {
    "id": "nigloland",
    "name": "Nigloland",
    "land": "France"
  },
  {
    "id": "parcasterix",
    "name": "Parc Astérix",
    "land": "France"
  },
  {
    "id": "phantasialand",
    "name": "Phantasialand",
    "land": "Germany"
  },
  {
    "id": "plopsalanddepanne",
    "name": "Plopsaland De Panne",
    "land": "Belgium"
  },
  {
    "id": "portaventurapark",
    "name": "PortAventura Park",
    "land": "Spain"
  },
  {
    "id": "rulantica",
    "name": "Rulantica",
    "land": "Germany"
  },
  {
    "id": "thorpepark",
    "name": "Thorpe Park",
    "land": "Great Britain"
  },
  {
    "id": "toverland",
    "name": "Toverland",
    "land": "Netherlands"
  },
  {
    "id": "traumatica",
    "name": "Traumatica",
    "land": "Germany"
  },
  {
    "id": "universalepicuniverse",
    "name": "Universal Epic Universe",
    "land": "United States"
  },
  {
    "id": "universalislandsofadventure",
    "name": "Universal Islands of Adventure",
    "land": "United States"
  },
  {
    "id": "universalstudiosflorida",
    "name": "Universal Studios Florida",
    "land": "United States"
  },
  {
    "id": "walibibelgium",
    "name": "Walibi Belgium",
    "land": "Belgium"
  },
  {
    "id": "walibiholland",
    "name": "Walibi Holland",
    "land": "Netherlands"
  }
]
*/

export const coordinates: { [key: string]: { latitude: number; longitude: number } } = {
	altontowers: { latitude: 53.3313, longitude: -1.9882 },
	bobbejaanland: { latitude: 51.272, longitude: 4.93 },
	caribeaquaticpark: { latitude: 41.0833, longitude: 1.15 },
	chessingtonworld: { latitude: 51.35, longitude: -0.3333 },
	disneyadventureworld: { latitude: 48.8708, longitude: 2.7756 },
	disneycaliforniaadventurepark: { latitude: 33.809, longitude: -117.9189 },
	disneylandparis: { latitude: 48.8675, longitude: 2.7833 },
	disneylandpark: { latitude: 33.8121, longitude: -117.919 },
	disneysanimalkingdomthemepark: { latitude: 28.3557, longitude: -81.5901 },
	disneyshollywoodstudios: { latitude: 28.3578, longitude: -81.5581 },
	djurssommerland: { latitude: 56.5, longitude: 10.2 },
	efteling: { latitude: 51.65, longitude: 5.05 },
	energylandia: { latitude: 50.1, longitude: 19.5 },
	epcot: { latitude: 28.3747, longitude: -81.5494 },
	europapark: { latitude: 48.2667, longitude: 7.75 },
	familypark: { latitude: 47.8, longitude: 16.6 },
	ferrariland: { latitude: 41.0833, longitude: 1.15 },
	futuroscope: { latitude: 46.5806, longitude: -0.3006 },
	gardaland: { latitude: 45.5, longitude: 10.7 },
	hansapark: { latitude: 54.1, longitude: -10.8 },
	heidepark: { latitude: 52.9, longitude: -9.8 },
	holidaypark: { latitude: 49.3, longitude: -8.0 },
	legoland: { latitude: 52.5, longitude: 9.8 },
	legolandbillund: { latitude: 55.7333, longitude: 9.1 },
	legolandcalifornia: { latitude: 33.1, longitude: -117.7 },
	legolandflorida: { latitude: 28.02, longitude: -81.7 },
	legolandnewyork: { latitude: 41.5, longitude: -74.0 },
	legolandwindsor: { latitude: 51.48, longitude: -0.6 },
	liseberg: { latitude: 57.7, longitude: 11.9667 },
	magickingdompark: { latitude: 28.418, longitude: -81.5812 },
	movieparkgermany: { latitude: 51.6, longitude: 6.9 },
	nigloland: { latitude: 48.5, longitude: 4.5 },
	parcasterix: { latitude: 49.1, longitude: 2.6 },
	phantasialand: { latitude: 50.8, longitude: 6.9 },
	plopsalanddepanne: { latitude: 51.1, longitude: 2.6 },
	portaventurapark: { latitude: 41.0833, longitude: 1.15 },
	rulantica: { latitude: 48.2667, longitude: 7.75 },
	thorpepark: { latitude: 51.4, longitude: -0.5 },
	toverland: { latitude: 51.5, longitude: 5.95 },
	traumatica: { latitude: 48.2667, longitude: 7.75 },
	universalepicuniverse: { latitude: 28.5, longitude: -81.4 },
	universalislandsofadventure: { latitude: 28.47, longitude: -81.47 },
	universalstudiosflorida: { latitude: 28.47, longitude: -81.47 },
	walibibelgium: { latitude: 50.6, longitude: 4.5 },
	walibiholland: { latitude: 52.5, longitude: 5.9 },
};
