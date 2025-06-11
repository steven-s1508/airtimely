import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgMap = (props: SvgProps) => (
	<Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
		<Path d="M14.35 20.775 9 18.9l-4.65 1.8a.9.9 0 0 1-.487.063 1.2 1.2 0 0 1-.438-.163.87.87 0 0 1-.312-.338A1 1 0 0 1 3 19.776V5.75q0-.325.188-.575A1.13 1.13 0 0 1 3.7 4.8l4.65-1.575a2 2 0 0 1 .313-.075 2.2 2.2 0 0 1 .987.075L15 5.1l4.65-1.8a.9.9 0 0 1 .488-.062q.237.038.437.162a.87.87 0 0 1 .313.337q.111.213.112.488V18.25a.93.93 0 0 1-.187.575 1.13 1.13 0 0 1-.513.375l-4.65 1.575q-.15.05-.312.075a2.2 2.2 0 0 1-.988-.075M14 18.55V6.85l-4-1.4v11.7zm2 0 3-1V5.7l-3 1.15zM5 18.3l3-1.15V5.45l-3 1z" />
	</Svg>
);
export default SvgMap;
