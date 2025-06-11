import { supabase } from "@/src/utils/supabase";
import type { Tables } from "@/src/types/database.types";

type Destination = Tables<"destinations">;

// The list of destination names and their websites.
const destinationWebsiteData: { name: string; website: string }[] = [
	{ name: "Mirabilandia", website: "https://www.mirabilandia.it/en" },
	{ name: "Universal Orlando Resort", website: "https://www.universalorlando.com/" },
	{ name: "Alton Towers Resort", website: "https://www.altontowers.com/" },
	{ name: "Hansa-Park", website: "https://www.hansapark.de/home?language=en" },
	{ name: "LEGOLAND Deutschland Resort", website: "https://www.legoland.de/en/" },
	{ name: "Walt Disney World Resort", website: "https://disneyworld.disney.go.com/" },
	{ name: "SeaWorld Orlando", website: "https://seaworld.com/orlando/" },
	{ name: "Kings Dominion", website: "https://www.kingsdominion.com/" },
	{ name: "Liseberg", website: "https://www.liseberg.com/" },
	{ name: "Canada's Wonderland", website: "https://www.canadaswonderland.com/" },
	{ name: "LEGOLAND California Resort", website: "https://www.legoland.com/california/" },
	{ name: "Paultons Park", website: "https://paultonspark.co.uk/" },
	{ name: "Efteling Themepark Resort", website: "https://www.efteling.com/en" },
	{ name: "California's Great America", website: "https://www.cagreatamerica.com/" },
	{ name: "Six Flags Great America", website: "https://www.sixflags.com/greatamerica" },
	{ name: "Kings Island", website: "https://www.visitkingsisland.com/" },
	{ name: "Cedar Point", website: "https://www.cedarpoint.com/" },
	{ name: "Bobbejaanland", website: "https://www.bobbejaanland.be/" },
	{ name: "LEGOLAND Florida Resort", website: "https://www.legoland.com/florida/" },
	{ name: "Six Flags Fiesta Texas", website: "https://www.sixflags.com/fiestatexas" },
	{ name: "Six Flags Discovery Kingdom", website: "https://www.sixflags.com/discoverykingdom" },
	{ name: "Gardaland Resort", website: "https://www.gardaland.it/en/" },
	{ name: "Michigan's Adventure", website: "https://www.miadventure.com/" },
	{ name: "Disneyland Paris", website: "https://www.disneylandparis.com/" },
	{ name: "Tokyo Disney Resort", website: "https://www.tokyodisneyresort.jp/" },
	{ name: "Six Flags Darien Lake", website: "https://www.sixflags.com/darienlake" },
	{ name: "Futuroscope", website: "https://www.futuroscope.com/en/" },
	{ name: "Chimelong International Ocean Tourist Resort (Zhuhai)", website: "https://www.chimelong.com/groupen/" },
	{ name: "Everland Resort", website: "https://www.everland.com/" },
	{ name: "Europa-Park Resort", website: "https://www.europapark.de/en" },
	{ name: "Phantasialand", website: "https://www.phantasialand.de/en/" },
	{ name: "Walibi Belgium", website: "https://www.walibi.be/en" },
	{ name: "Six Flags Great Adventure", website: "https://www.sixflags.com/greatadventure" },
	{ name: "Six Flags Frontier City", website: "https://www.sixflags.com/frontiercity" },
	{ name: "Six Flags Magic Mountain", website: "https://www.sixflags.com/magicmountain" },
	{ name: "Busch Gardens Tampa Bay", website: "https://buschgardens.com/tampa/" },
	{ name: "SeaWorld San Diego", website: "https://seaworld.com/san-diego/" },
	{ name: "Kennywood", website: "https://www.kennywood.com/" },
	{ name: "Carowinds", website: "https://www.carowinds.com/" },
	{ name: "The Great Escape & Hurricane Harbor", website: "https://www.sixflags.com/greatescape" },
	{ name: "Lotte World", website: "https://adventure.lotteworld.com/" },
	{ name: "Six Flags Over Georgia", website: "https://www.sixflags.com/overgeorgia" },
	{ name: "Six Flags America", website: "https://www.sixflags.com/america" },
	{ name: "Worlds of Fun", website: "https://www.worldsoffun.com/" },
	{ name: "LEGOLAND Billund Resort", website: "https://www.legoland.dk/en/" },
	{ name: "Six Flags St. Louis", website: "https://www.sixflags.com/stlouis" },
	{ name: "Busch Gardens Williamsburg", website: "https://buschgardens.com/williamsburg/" },
	{ name: "Valleyfair", website: "https://www.valleyfair.com/" },
	{ name: "Six Flags México", website: "https://www.sixflags.com.mx/" },
	{ name: "LEGOLAND Windsor Resort", website: "https://www.legoland.co.uk/" },
	{ name: "Dollywood Parks & Resorts", website: "https://www.dollywood.com/" },
	{ name: "Six Flags New England", website: "https://www.sixflags.com/newengland" },
	{ name: "Walibi Holland", website: "https://www.walibi.nl/en" },
	{ name: "Walibi Rhône-Alpes", website: "https://www.walibi.fr/en" },
	{ name: "Bellewaerde Park", website: "https://www.bellewaerde.be/" },
	{ name: "Attractiepark Toverland", website: "https://www.toverland.com/en/" },
	{ name: "Parque de Atracciones de Madrid", website: "https://www.parquedeatracciones.es/" },
	{ name: "Hong Kong Disneyland Resort", website: "https://www.hongkongdisneyland.com/" },
	{ name: "Universal Beijing Resort", website: "https://www.universalbeijingresort.com/" },
	{ name: "Disneyland Resort (Anaheim)", website: "https://disneyland.disney.go.com/" },
	{ name: "Parque Warner Madrid", website: "https://www.parquewarner.com/" },
	{ name: "Guangzhou Chimelong Tourist Resort", website: "https://gz.chimelong.com/" },
	{ name: "Universal Studios Hollywood", website: "https://www.universalstudioshollywood.com/" },
	{ name: "SeaWorld San Antonio", website: "https://seaworld.com/san-antonio/" },
	{ name: "Parc Astérix", website: "https://www.parcasterix.fr/en" },
	{ name: "Dorney Park & Wildwater Kingdom", website: "https://www.dorneypark.com/" },
	{ name: "La Ronde", website: "https://www.laronde.com/" },
	{ name: "Thorpe Park Resort", website: "https://www.thorpepark.com/" },
	{ name: "Heide Park Resort", website: "https://www.heide-park.de/en/" },
	{ name: "Knott's Berry Farm", website: "https://www.knotts.com/" },
	{ name: "Six Flags Over Texas", website: "https://www.sixflags.com/overtexas" },
	{ name: "PortAventura World", website: "https://www.portaventuraworld.com/" },
	{ name: "Shanghai Disney Resort", website: "https://www.shanghaidisneyresort.com/" },
	{ name: "Silver Dollar City", website: "https://www.silverdollarcity.com/" },
	{ name: "Holiday Park", website: "https://www.plopsa.com/en/plopsaland-deutschland" },
	{ name: "Plopsaland De Panne", website: "https://www.plopsa.com/en/plopsaland-de-panne" },
	{ name: "Movie Park Germany", website: "https://www.movieparkgermany.de/en" },
	{ name: "Chessington World of Adventures Resort", website: "https://www.chessington.com/" },
];

/**
 * Normalizes a name for comparison by converting to lowercase,
 * removing special characters (keeps alphanumeric and spaces),
 * trimming whitespace, and collapsing multiple spaces.
 */
function normalizeName(name: string | null | undefined): string {
	if (!name) return "";
	return name
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, "") // Remove non-alphanumeric characters (excluding space)
		.trim()
		.replace(/\s+/g, " "); // Collapse multiple spaces to single space
}

export default async function updateDestinationWebsites() {
	console.log("Starting to update destination websites...");

	const { data: destinations, error: fetchError } = await supabase.from("destinations").select("id, name, website");

	if (fetchError) {
		console.error("Error fetching destinations:", fetchError.message);
		return;
	}

	if (!destinations || destinations.length === 0) {
		console.log("No destinations found to process.");
		return;
	}

	let destinationsUpdatedCount = 0;
	let destinationsAlreadyUpToDateCount = 0;
	let destinationsNotFoundInListCount = 0;

	// Create a map of normalized names to websites for efficient lookup
	const websiteMap = new Map<string, string>();
	for (const item of destinationWebsiteData) {
		if (item.name && item.website) {
			websiteMap.set(normalizeName(item.name), item.website);
		}
	}

	for (const dest of destinations as Destination[]) {
		if (!dest.name) {
			console.warn(`Destination with ID ${dest.id} has no name, skipping.`);
			continue;
		}

		const normalizedDbDestName = normalizeName(dest.name);
		const foundWebsite = websiteMap.get(normalizedDbDestName);

		if (foundWebsite) {
			if (dest.website !== foundWebsite) {
				console.log(`Updating website for destination: "${dest.name}" (ID: ${dest.id}). New website: ${foundWebsite}`);
				const { error: updateError } = await supabase.from("destinations").update({ website: foundWebsite }).eq("id", dest.id);

				if (updateError) {
					console.error(`Error updating website for destination "${dest.name}" (ID: ${dest.id}): ${updateError.message}`);
				} else {
					destinationsUpdatedCount++;
				}
			} else {
				destinationsAlreadyUpToDateCount++;
			}
		} else {
			console.warn(`No website found in the predefined list for destination: "${dest.name}" (ID: ${dest.id}) (Normalized: "${normalizedDbDestName}")`);
			destinationsNotFoundInListCount++;
		}
	}

	console.log("Finished updating destination websites.");
	console.log(`Summary: 
    Destinations updated: ${destinationsUpdatedCount}
    Destinations already up-to-date: ${destinationsAlreadyUpToDateCount}
    Destinations not found in predefined list: ${destinationsNotFoundInListCount}`);
}

// Example of how you might call this function:
// updateDestinationWebsites().then(() => console.log("Destination website update process complete.")).catch(console.error);
