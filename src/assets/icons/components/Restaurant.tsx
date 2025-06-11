import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgRestaurant = (props: SvgProps) => (
	<Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
		<Path d="M7 9V3q0-.424.287-.712A.97.97 0 0 1 8 2q.424 0 .713.288Q9 2.575 9 3v6h1V3q0-.424.287-.712A.97.97 0 0 1 11 2q.424 0 .713.288Q12 2.575 12 3v6q0 1.4-.863 2.45A4.12 4.12 0 0 1 9 12.85V21q0 .424-.287.712A.97.97 0 0 1 8 22a.97.97 0 0 1-.713-.288A.97.97 0 0 1 7 21v-8.15a4.12 4.12 0 0 1-2.137-1.4Q4 10.4 4 9V3q0-.424.287-.712A.97.97 0 0 1 5 2q.424 0 .713.288Q6 2.575 6 3v6zm10 5h-2a.97.97 0 0 1-.713-.287A.97.97 0 0 1 14 13V7q0-1.75 1.287-3.375Q16.575 2 17.95 2q.45 0 .75.35t.3.825V21q0 .424-.288.712A.97.97 0 0 1 18 22a.97.97 0 0 1-.712-.288A.97.97 0 0 1 17 21z" />
	</Svg>
);
export default SvgRestaurant;
