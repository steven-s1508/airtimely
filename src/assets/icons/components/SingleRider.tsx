import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgSingleRider = (props: SvgProps) => (
	<Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
		<Path d="M6 14H4a.97.97 0 0 1-.712-.287A.97.97 0 0 1 3 13q0-.424.288-.713A.97.97 0 0 1 4 12h2v-2q0-.424.287-.713A.97.97 0 0 1 7 9q.424 0 .713.287Q8 9.576 8 10v2h2q.424 0 .713.287.287.288.287.713 0 .424-.287.713A.97.97 0 0 1 10 14H8v2q0 .424-.287.712A.97.97 0 0 1 7 17a.97.97 0 0 1-.713-.288A.97.97 0 0 1 6 16zm9.75-5.95-1.425 1.025a.93.93 0 0 1-.787.188 1.04 1.04 0 0 1-.688-.463q-.225-.35-.15-.763a1 1 0 0 1 .425-.662L16.2 5.15a.75.75 0 0 1 .45-.15h.55q.35 0 .575.225T18 5.8v12.075q0 .475-.325.8a1.09 1.09 0 0 1-.8.325q-.475 0-.8-.325a1.09 1.09 0 0 1-.325-.8z" />
	</Svg>
);
export default SvgSingleRider;
