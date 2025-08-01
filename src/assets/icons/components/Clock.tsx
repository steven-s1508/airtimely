import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgClock = (props: SvgProps) => (
	<Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
		<Path d="M13 11.6V8a.97.97 0 0 0-.287-.713A.97.97 0 0 0 12 7a.97.97 0 0 0-.713.287A.97.97 0 0 0 11 8v3.975q0 .2.075.388.075.187.225.337l3.3 3.3a.95.95 0 0 0 .7.275A.95.95 0 0 0 16 16a.95.95 0 0 0 .275-.7.95.95 0 0 0-.275-.7zM12 22a9.7 9.7 0 0 1-3.9-.788 10.1 10.1 0 0 1-3.175-2.137q-1.35-1.35-2.137-3.175A9.7 9.7 0 0 1 2 12q0-2.075.788-3.9a10.1 10.1 0 0 1 2.137-3.175q1.35-1.35 3.175-2.137A9.7 9.7 0 0 1 12 2q2.075 0 3.9.788a10.1 10.1 0 0 1 3.175 2.137q1.35 1.35 2.137 3.175A9.7 9.7 0 0 1 22 12a9.7 9.7 0 0 1-.788 3.9 10.1 10.1 0 0 1-2.137 3.175q-1.35 1.35-3.175 2.137A9.7 9.7 0 0 1 12 22m0-2q3.325 0 5.663-2.337T20 12t-2.337-5.662T12 4 6.338 6.338 4 12t2.338 5.663T12 20" />
	</Svg>
);
export default SvgClock;
