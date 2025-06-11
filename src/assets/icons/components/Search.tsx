import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgSearch = (props: SvgProps) => (
	<Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
		<Path d="M9.5 16q-2.725 0-4.612-1.887T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5a6.1 6.1 0 0 1-1.3 3.8l5.6 5.6a.95.95 0 0 1 .275.7.95.95 0 0 1-.275.7.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275l-5.6-5.6q-.75.6-1.725.95T9.5 16m0-2q1.875 0 3.188-1.312Q14 11.375 14 9.5t-1.312-3.187T9.5 5 6.313 6.313 5 9.5t1.313 3.188T9.5 14" />
	</Svg>
);
export default SvgSearch;
