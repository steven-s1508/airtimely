import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgRefresh = (props: SvgProps) => (
	<Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
		<Path d="M12 20q-3.35 0-5.675-2.325T4 12t2.325-5.675T12 4q1.725 0 3.3.713A7.6 7.6 0 0 1 18 6.75V5q0-.424.288-.713A.97.97 0 0 1 19 4q.424 0 .712.287Q20 4.576 20 5v5q0 .424-.288.713A.97.97 0 0 1 19 11h-5a.97.97 0 0 1-.713-.287A.97.97 0 0 1 13 10q0-.424.287-.713A.97.97 0 0 1 14 9h3.2a5.84 5.84 0 0 0-2.187-2.2A5.93 5.93 0 0 0 12 6Q9.5 6 7.75 7.75T6 12t1.75 4.25T12 18q1.699 0 3.113-.863a5.95 5.95 0 0 0 2.187-2.312 1.07 1.07 0 0 1 .563-.487q.362-.138.737-.013a.9.9 0 0 1 .575.525q.175.4-.025.75a8.1 8.1 0 0 1-2.925 3.2Q14.325 20 12 20" />
	</Svg>
);
export default SvgRefresh;
