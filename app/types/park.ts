import { RideStatusType } from "../constants/rideStatus";

export interface Park {
	id: string;
	name: string;
	land: string; // Country
}

export interface Ride {
	code: string;
	name: string;
	status: RideStatusType;
	waitingtime?: number; // In minutes
	datetime?: string; // "YYYY-MM-DD HH:MM:SS"
	date?: string; // "YYYY-MM-DD"
	time?: string; // "HH:MM:SS"
}

export interface RideWaitTimeData {
	data: Ride[];
	fetchedAt: string;
}

export interface ParkOpeningTime {
	park_id: string;
	date: string; // "YYYY-MM-DD"
	open_from: string | null; // "HH:MM:SS" or null
	closed_from: string | null; // "HH:MM:SS" or null
	opened_today: boolean;
}

export interface ParkOpeningTimesData {
	data: ParkOpeningTime[];
	fetchedAt: string;
}
