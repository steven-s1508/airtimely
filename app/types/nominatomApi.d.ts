export interface NominatimAddress {
	house_number?: string;
	road?: string;
	quarter?: string;
	village?: string;
	town?: string;
	city?: string;
	municipality?: string;
	county?: string;
	state?: string;
	"ISO3166-2-lvl4"?: string;
	postcode?: string;
	country?: string;
	country_code?: string; // This is what we need
}

export interface NominatimResponse {
	place_id: number;
	licence: string;
	osm_type: string;
	osm_id: number;
	lat: string;
	lon: string;
	display_name: string;
	address: NominatimAddress;
	boundingbox: string[];
}
