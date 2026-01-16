import React, { useState, useEffect, useMemo } from "react";
import { View } from "react-native";
import { Text, Pressable, HStack, VStack } from "@components/ui";
import { useParkSchedule } from "@/src/hooks/api/useParkSchedule";
import { ParkScheduleItem } from "@/src/utils/api/getParkSchedule";
import { Icon } from "@/src/components/Icon";
import { base, colors } from "@/src/styles/styles";
import { formatTime } from "@/src/utils/formatTime";
import { DateTime } from "luxon";
import { SkeletonParkInfo } from "@components/skeletons/skeletonParkInfo";
import getParkTimezone from "../utils/helpers/getParkTimezone";

interface ParkInfoProps {
	parkId: string;
}

function getCurrentDateInTimezone(timezone: string): string {
	return DateTime.now().setZone(timezone).toFormat("yyyy-MM-dd");
}

export const ParkInfo = React.memo(function ParkInfo({ parkId }: ParkInfoProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [timezone, setTimezone] = useState("UTC");
	const { data, isLoading: loading } = useParkSchedule(parkId);

	useEffect(() => {
		const loadTimezone = async () => {
			const tz = await getParkTimezone(parkId);
			setTimezone(tz);
		};
		loadTimezone();
	}, [parkId]);

	const scheduleData = useMemo<ParkScheduleItem[]>(() => {
		if (!data) return [];
		const currentDate = getCurrentDateInTimezone(timezone);
		return data.schedule.filter((item) => item.date === currentDate);
	}, [data, timezone]);

	const toggleAccordion = () => {
		setIsOpen(!isOpen);
	};

	const operatingHours = scheduleData.find((item: ParkScheduleItem) => item.type === "OPERATING");
	const infoItems = scheduleData.filter((item: ParkScheduleItem) => item.type === "INFO" || item.type === "EXTRA_HOURS");
	const ticketedEvents = scheduleData.filter((item: ParkScheduleItem) => item.type === "TICKETED_EVENT");
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
				backgroundColor: base.primary[50],
				borderWidth: 1,
				borderColor: base.primary[500],
				borderRadius: 100,
				marginHorizontal: 16,
				marginBottom: 8,
			}}
		>
			<Text style={{ color: base.primary[700] }}>Show Info</Text>
			<Icon name="expand" fill={base.primary[700]} height={16} width={16} />
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
				backgroundColor: base.primary[100],
				borderWidth: 1,
				borderColor: base.primary[500],
				borderRadius: 100,
				marginHorizontal: 16,
				marginBottom: 8,
			}}
		>
			<Text style={{ color: base.primary[700] }}>Hide Info</Text>
			<Icon name="collapse" fill={base.primary[700]} height={16} width={16} />
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
				{loading && <SkeletonParkInfo />}

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
});
