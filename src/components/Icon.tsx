// filepath: c:\webdev\airtimely\components\icons.tsx
import React from "react";
import { SvgProps } from "react-native-svg";

// Import your generated SVG components
// Adjust paths if your SVGR output directory is different
import AttractionIconComponent from "@/src/assets/icons/components/Attraction";
import ChevronLeftIconComponent from "@/src/assets/icons/components/ChevronLeft";
import ChevronRightIconComponent from "@/src/assets/icons/components/ChevronRight";
import ClockIconComponent from "@/src/assets/icons/components/Clock";
import CloseIconComponent from "@/src/assets/icons/components/Close";
import ClosedIconComponent from "@/src/assets/icons/components/Closed";
import CollapseIconComponent from "@/src/assets/icons/components/Collapse";
import DestinationIconComponent from "@/src/assets/icons/components/Destination";
import DownIconComponent from "@/src/assets/icons/components/Down";
import ExpandIconComponent from "@/src/assets/icons/components/Expand";
import FilterIconComponent from "@/src/assets/icons/components/Filter";
import InfoIconComponent from "@/src/assets/icons/components/Info";
import MapIconComponent from "@/src/assets/icons/components/Map";
import MapPinIconComponent from "@/src/assets/icons/components/MapPin";
import OpenIconComponent from "@/src/assets/icons/components/Open";
import ParkIconComponent from "@/src/assets/icons/components/Park";
import RefreshIconComponent from "@/src/assets/icons/components/Refresh";
import RefurbishmentIconComponent from "@/src/assets/icons/components/Refurbishment";
import RestaurantIconComponent from "@/src/assets/icons/components/Restaurant";
import SearchIconComponent from "@/src/assets/icons/components/Search";
import ShowIconComponent from "@/src/assets/icons/components/Show";
import SingleRiderIconComponent from "@/src/assets/icons/components/SingleRider";
import StatsIconComponent from "@/src/assets/icons/components/Stats";
import VirtualQueueIconComponent from "@/src/assets/icons/components/VirtualQueue";
import WaitTimeIconComponent from "@/src/assets/icons/components/WaitTime";
import FavoriteIconComponent from "@/src/assets/icons/components/Favorite";
import FavoriteFilledIconComponent from "@/src/assets/icons/components/FavoriteFilled";

export type IconName = "destination" | "park" | "attraction" | "restaurant" | "show" | "stats" | "waitTime" | "singleRider" | "virtualQueue" | "clock" | "open" | "down" | "closed" | "refurbishment" | "mapPin" | "filter" | "search" | "chevronRight" | "chevronLeft" | "map" | "refresh" | "expand" | "collapse" | "info" | "close" | "favorite" | "favoriteFilled";

interface IconProps extends SvgProps {
	name: IconName;
	size?: number;
	className?: string; // For compatibility with web/NativeWind, may not be used by react-native-svg directly
}

const iconComponentMap: Record<IconName, React.FC<SvgProps>> = {
	attraction: AttractionIconComponent,
	chevronLeft: ChevronLeftIconComponent,
	chevronRight: ChevronRightIconComponent,
	clock: ClockIconComponent,
	close: CloseIconComponent,
	closed: ClosedIconComponent,
	collapse: CollapseIconComponent,
	destination: DestinationIconComponent,
	down: DownIconComponent,
	expand: ExpandIconComponent,
	filter: FilterIconComponent,
	info: InfoIconComponent,
	map: MapIconComponent,
	mapPin: MapPinIconComponent,
	open: OpenIconComponent,
	park: ParkIconComponent,
	refresh: RefreshIconComponent,
	refurbishment: RefurbishmentIconComponent,
	restaurant: RestaurantIconComponent,
	search: SearchIconComponent,
	show: ShowIconComponent,
	singleRider: SingleRiderIconComponent,
	stats: StatsIconComponent,
	virtualQueue: VirtualQueueIconComponent,
	waitTime: WaitTimeIconComponent,
	favorite: FavoriteIconComponent,
	favoriteFilled: FavoriteFilledIconComponent,
};

export const Icon = React.memo(function Icon({ name, size = 24, className, style, ...props }: IconProps) {
	const SpecificIconComponent = iconComponentMap[name];

	if (!SpecificIconComponent) {
		console.warn(`Icon "${name}" not found.`);
		return null;
	}

	// `className` is passed for potential NativeWind usage, but `style` is standard for RN.
	// `fill`, `stroke`, etc., are passed via `...props`.
	return <SpecificIconComponent width={size} height={size} style={style} className={className} {...props} />;
});
