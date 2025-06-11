import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgExpand = (props: SvgProps) => (
	<Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
		<Path d="m12 18.1 2.325-2.325q.3-.3.725-.3t.725.3.3.725-.3.725L12.7 20.3q-.15.15-.325.212a1.1 1.1 0 0 1-.375.063q-.2 0-.375-.063a.9.9 0 0 1-.325-.212l-3.075-3.075q-.3-.3-.3-.725t.3-.725.725-.3.725.3zM12 6 9.675 8.325q-.3.3-.725.3a.99.99 0 0 1-.725-.3q-.3-.3-.3-.725t.3-.725L11.3 3.8q.15-.15.325-.213.175-.062.375-.062t.375.062a.9.9 0 0 1 .325.213l3.075 3.075q.3.3.3.725t-.3.725-.725.3a.99.99 0 0 1-.725-.3z" />
	</Svg>
);
export default SvgExpand;
