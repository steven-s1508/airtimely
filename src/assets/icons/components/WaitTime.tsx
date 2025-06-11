import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgWaitTime = (props: SvgProps) => (
	<Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
		<Path d="M8 20h8v-3q0-1.65-1.175-2.825T12 13t-2.825 1.175T8 17zm4-9q1.65 0 2.825-1.175T16 7V4H8v3q0 1.65 1.175 2.825T12 11M5 22a.97.97 0 0 1-.713-.288A.97.97 0 0 1 4 21q0-.424.287-.712A.97.97 0 0 1 5 20h1v-3q0-1.525.713-2.863A5.57 5.57 0 0 1 8.7 12a5.57 5.57 0 0 1-1.987-2.137A6 6 0 0 1 6 7V4H5a.97.97 0 0 1-.713-.288A.97.97 0 0 1 4 3q0-.424.287-.712A.97.97 0 0 1 5 2h14q.424 0 .712.288Q20 2.575 20 3q0 .424-.288.712A.97.97 0 0 1 19 4h-1v3q0 1.524-.712 2.863A5.57 5.57 0 0 1 15.3 12a5.57 5.57 0 0 1 1.988 2.137Q18 15.476 18 17v3h1q.424 0 .712.288.288.287.288.712 0 .424-.288.712A.97.97 0 0 1 19 22z" />
	</Svg>
);
export default SvgWaitTime;
