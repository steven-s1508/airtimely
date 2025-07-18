import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgStats = (props: SvgProps) => (
	<Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
		<Path d="M1.75 13.4a.9.9 0 0 1-.387-.612 1.1 1.1 0 0 1 .137-.738l3.05-4.9q.55-.875 1.563-.937t1.662.712L9 8.35l2.375-3.85q.575-.95 1.662-.962 1.088-.014 1.688.912L16 6.35l2.8-4.45q.224-.375.662-.462a.93.93 0 0 1 .788.187.9.9 0 0 1 .387.613q.063.387-.137.737l-2.8 4.45q-.575.925-1.662.925-1.088 0-1.688-.9l-1.275-1.9L10.7 9.4q-.525.875-1.537.95T7.5 9.65L6.25 8.2 3.2 13.125a.96.96 0 0 1-.662.463.93.93 0 0 1-.788-.188M14.5 18q1.05 0 1.775-.725T17 15.5t-.725-1.775T14.5 13t-1.775.725T12 15.5t.725 1.775T14.5 18m0 2q-1.875 0-3.187-1.312Q10 17.375 10 15.5t1.313-3.187T14.5 11t3.188 1.313T19 15.5q0 .65-.175 1.263A4 4 0 0 1 18.3 17.9l2 2a.95.95 0 0 1 .275.7.95.95 0 0 1-.275.7.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275l-2-2q-.526.35-1.137.525Q15.15 20 14.5 20" />
	</Svg>
);
export default SvgStats;
