import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgFilter = (props: SvgProps) => (
	<Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
		<Path d="M11 20a.97.97 0 0 1-.713-.288A.97.97 0 0 1 10 19v-6L4.2 5.6q-.375-.5-.113-1.05Q4.35 4 5 4h14q.65 0 .913.55.261.55-.113 1.05L14 13v6q0 .424-.287.712A.97.97 0 0 1 13 20zm1-7.7L16.95 6h-9.9z" />
	</Svg>
);
export default SvgFilter;
