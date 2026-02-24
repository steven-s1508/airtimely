import React from "react";
import { Pressable, StyleSheet, Modal, View, Text, TouchableWithoutFeedback } from "react-native";
import { colors } from "@src/styles/styles";
import { DestinationSortOption, usePreferencesStore } from "@src/stores/preferencesStore";
import { Icon } from "./Icon";

const SORT_OPTIONS: { value: DestinationSortOption; label: string }[] = [
	{ value: "name", label: "Park Name" },
	{ value: "country", label: "Country" },
	{ value: "status", label: "Status" },
];

interface SortButtonProps {
	onPress: () => void;
}

export const SortButton: React.FC<SortButtonProps> = ({ onPress }) => {
	return (
		<Pressable
			android_ripple={{ color: colors.primaryTransparent, foreground: true }}
			style={styles.sortButton}
			onPress={onPress}
		>
			<Icon name="sort" fill={colors.primaryLight} height={24} width={24} />
		</Pressable>
	);
};

interface SortActionsheetProps {
	visible: boolean;
	onClose: () => void;
}

export const SortActionsheet: React.FC<SortActionsheetProps> = ({ visible, onClose }) => {
	const { destinationSortBy, setDestinationSortBy } = usePreferencesStore();

	const handleSelect = (option: DestinationSortOption) => {
		setDestinationSortBy(option);
		onClose();
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			<TouchableWithoutFeedback onPress={onClose}>
				<View style={styles.modalOverlay}>
					<TouchableWithoutFeedback>
						<View style={styles.actionsheetContainer}>
							{/* Drag Indicator */}
							<View style={styles.dragIndicator} />

							{/* Title */}
							<Text style={styles.titleText}>Sort by</Text>

							{/* Options */}
							{SORT_OPTIONS.map((option) => (
								<Pressable
									key={option.value}
									style={styles.optionItem}
									onPress={() => handleSelect(option.value)}
								>
									<Text style={styles.optionText}>{option.label}</Text>
									{destinationSortBy === option.value && (
										<Icon name="check" size={18} fill={colors.primaryLight} />
									)}
								</Pressable>
							))}
						</View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

// Combined component for convenience (uses local state)
export const SortControl: React.FC = () => {
	const [isOpen, setIsOpen] = React.useState(false);

	return (
		<>
			<SortButton onPress={() => setIsOpen(true)} />
			<SortActionsheet visible={isOpen} onClose={() => setIsOpen(false)} />
		</>
	);
};

const styles = StyleSheet.create({
	sortButton: {
		backgroundColor: colors.primaryVeryDark,
		borderWidth: 1,
		borderColor: colors.primaryDark,
		borderRadius: 8,
		padding: 8,
		overflow: "hidden",
	},
	modalOverlay: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0, 0, 0, 0.5)",
	},
	actionsheetContainer: {
		backgroundColor: colors.primaryVeryDark,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		borderTopWidth: 1,
		borderTopColor: colors.primaryLight,
		paddingHorizontal: 16,
		paddingBottom: 32,
		paddingTop: 8,
	},
	dragIndicator: {
		width: 40,
		height: 4,
		backgroundColor: colors.primaryLight,
		borderRadius: 2,
		alignSelf: "center",
		marginBottom: 16,
	},
	titleText: {
		color: colors.primaryVeryLight,
		fontFamily: "Bebas Neue Pro",
		fontSize: 20,
		fontWeight: "800",
		marginBottom: 16,
	},
	optionItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
	},
	optionText: {
		color: colors.primaryVeryLight,
		fontSize: 16,
	},
});
