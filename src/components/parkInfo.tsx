import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { Text, Pressable, HStack, VStack } from "@components/ui";
import { getParkSchedule, ParkScheduleItem } from "@/app/api/get/getParkSchedule";
import { Icon } from "@/src/components/Icon";
import { colors } from "@/src/styles/styles";

interface ParkInfoProps {
	parkId: string;
	timezone?: string;
}

// return HH:mm format for the given date string without timezone conversion
function formatTime(dateString: string): string {
	const timeMatch = dateString.match(/T(\d{2}):(\d{2})/);

	if (timeMatch) {
		const [, hours, minutes] = timeMatch;
		return `${hours}:${minutes}`;
	}

	return dateString; // Fallback if no match found
}

function getCurrentDateInTimezone(timezone: string): string {
	const now = new Date();
	const options: Intl.DateTimeFormatOptions = {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	};

	const formatter = new Intl.DateTimeFormat("en-CA", options);
	return formatter.format(now);
}

export function ParkInfo({ parkId, timezone = "America/Los_Angeles" }: ParkInfoProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [scheduleData, setScheduleData] = useState<ParkScheduleItem[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const fetchSchedule = async () => {
			setLoading(true);
			const data = await getParkSchedule(parkId);
			if (data) {
				const currentDate = getCurrentDateInTimezone(data.timezone || timezone);
				const todaySchedule = data.schedule.filter((item) => item.date === currentDate);
				setScheduleData(todaySchedule);
			}
			setLoading(false);
		};

		if (parkId) {
			fetchSchedule();
		}
	}, [parkId, timezone]);

	const toggleAccordion = () => {
		setIsOpen(!isOpen);
	};

	const operatingHours = scheduleData.find((item) => item.type === "OPERATING");
	const infoItems = scheduleData.filter((item) => item.type === "INFO" || item.type === "EXTRA_HOURS");
	const ticketedEvents = scheduleData.filter((item) => item.type === "TICKETED_EVENT");
	const purchases = operatingHours?.purchases || [];

	const buttonClosed = (
		<Pressable
			onPress={toggleAccordion}
			style={{
				flexDirection: "row",
				justifyContent: "center",
				alignItems: "center",
				gap: 4,
				paddingHorizontal: 12,
				paddingVertical: 4,
				borderWidth: 1,
				borderColor: colors.primaryDark,
				borderRadius: 100,
				marginHorizontal: 16,
				marginBottom: 8,
			}}
		>
			<Text style={{ color: colors.primary }}>Show Info</Text>
			<Icon name="expand" fill={colors.primary} height={16} width={16} />
		</Pressable>
	);

	const buttonOpen = (
		<Pressable
			onPress={toggleAccordion}
			style={{
				flexDirection: "row",
				justifyContent: "center",
				alignItems: "center",
				gap: 4,
				paddingHorizontal: 12,
				paddingVertical: 4,
				backgroundColor: colors.primaryVeryDark,
				borderWidth: 1,
				borderColor: colors.primaryDark,
				borderRadius: 100,
				marginHorizontal: 16,
				marginBottom: 8,
			}}
		>
			<Text style={{ color: colors.primaryLight }}>Hide Info</Text>
			<Icon name="collapse" fill={colors.primaryLight} height={16} width={16} />
		</Pressable>
	);

	const parkInfoContent = (
		<View
			style={{
				padding: 16,
				backgroundColor: colors.primaryVeryDark,
				borderRadius: 6,
				borderWidth: 1,
				borderColor: colors.primaryDark,
				marginHorizontal: 16,
				marginBottom: 8,
			}}
		>
			<VStack style={{ gap: 8 }}>
				{/* Operating Hours */}
				{operatingHours && (
					<>
						<HStack style={{ flexDirection: "row", justifyContent: "space-between" }}>
							<Text style={{ fontFamily: "Noto Sans", fontWeight: 700, fontStyle: "italic", color: colors.primaryVeryLight }}>Operating Hours:</Text>
							<Text style={{ fontFamily: "Noto Sans", fontSize: 14, color: colors.primaryVeryLight }}>
								{formatTime(operatingHours.openingTime!)}–{formatTime(operatingHours.closingTime!)}
							</Text>
						</HStack>
					</>
				)}

				{/* Info Items (like Park Hopping) */}
				{infoItems.length > 0 && (
					<>
						<View style={{ paddingVertical: 1, backgroundColor: colors.primaryDark }}></View>
						<VStack style={{ gap: 8 }}>
							<Text style={{ fontFamily: "Noto Sans", fontWeight: 700, fontStyle: "italic", fontSize: 14, color: colors.primaryVeryLight }}>Information:</Text>
							{infoItems.map((item, index) => (
								<HStack key={index} style={{ flexDirection: "row", justifyContent: "space-between" }}>
									<Text style={{ fontFamily: "Noto Sans", fontSize: 14, color: colors.primaryVeryLight }}>{item.description}:</Text>
									<Text style={{ fontFamily: "Noto Sans", fontSize: 14, flexShrink: 1, color: colors.primaryVeryLight }}>{item.openingTime && item.closingTime ? `${formatTime(item.openingTime)}–${formatTime(item.closingTime)}` : "Available"}</Text>
								</HStack>
							))}
						</VStack>
						{(purchases.length > 0 || ticketedEvents.length > 0) && <View style={{ paddingVertical: 1, backgroundColor: colors.primaryDark }}></View>}
					</>
				)}

				{/* Lightning Lane Purchases */}
				{purchases.length > 0 && (
					<>
						<VStack style={{ gap: 8 }}>
							<Text style={{ fontFamily: "Noto Sans", fontWeight: 700, fontStyle: "italic", fontSize: 14, color: colors.primaryVeryLight }}>Lightning Lane:</Text>
							<VStack style={{ gap: 4 }}>
								{purchases.map((purchase, index) => (
									<HStack key={index} style={{ flexDirection: "row", justifyContent: "space-between" }}>
										<Text style={{ fontFamily: "Noto Sans", fontSize: 14, color: colors.primaryVeryLight }}>{purchase.name}</Text>
										<Text style={{ fontFamily: "Noto Sans", fontSize: 14, color: colors.primaryVeryLight }}>{purchase.price.formatted}</Text>
									</HStack>
								))}
							</VStack>
						</VStack>
						{ticketedEvents.length > 0 && <View style={{ paddingVertical: 1, backgroundColor: colors.primaryDark }}></View>}
					</>
				)}

				{/* Ticketed Events */}
				{ticketedEvents.length > 0 && (
					<VStack style={{ gap: 8 }}>
						<Text style={{ fontFamily: "Noto Sans", fontWeight: 700, fontStyle: "italic", fontSize: 14, color: colors.primaryVeryLight }}>Special Events:</Text>
						<VStack style={{ gap: 4 }}>
							{ticketedEvents.map((event, index) => (
								<HStack key={index} style={{ flexDirection: "row", justifyContent: "space-between" }}>
									<Text style={{ fontFamily: "Noto Sans", fontSize: 14, color: colors.primaryVeryLight }}>{event.description}:</Text>
									<Text style={{ fontFamily: "Noto Sans", fontSize: 14, color: colors.primaryVeryLight }}>{event.openingTime && event.closingTime ? `${formatTime(event.openingTime)}–${formatTime(event.closingTime)}` : "Available"}</Text>
								</HStack>
							))}
						</VStack>
					</VStack>
				)}

				{/* Loading or No Data States */}
				{loading && <Text style={{ fontFamily: "Noto Sans", fontSize: 14, color: colors.primaryVeryLight, textAlign: "center" }}>Loading schedule...</Text>}

				{!loading && scheduleData.length === 0 && <Text style={{ fontFamily: "Noto Sans", fontSize: 14, color: colors.primaryVeryLight, textAlign: "center" }}>No schedule information available for today.</Text>}
			</VStack>
		</View>
	);

	return (
		<>
			{isOpen ? buttonOpen : buttonClosed}
			{isOpen && parkInfoContent}
		</>
	);
}
