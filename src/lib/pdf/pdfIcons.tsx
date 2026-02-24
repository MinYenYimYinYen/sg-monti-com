import { Svg, Path, Line, Polyline } from "@react-pdf/renderer";

type PDFIconProps = {
  size: number;
};

// Hash Icon
export const HashPDFIcon = ({ size }: PDFIconProps) => (
  <Svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ height: size, width: size }}
  >
    <Line x1="4" y1="9" x2="20" y2="9" />
    <Line x1="4" y1="15" x2="20" y2="15" />
    <Line x1="10" y1="3" x2="8" y2="21" />
    <Line x1="16" y1="3" x2="14" y2="21" />
  </Svg>
);

// LandPlot Icon
export const LandPlotPDFIcon = ({ size }: PDFIconProps) => (
  <Svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ height: size, width: size }}
  >
    <Path d="m12 8 6-3-6-3v10" />
    <Path d="m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12" />
    <Path d="m6.4 19.05 12.7-7.26" />
    <Path d="M3.1 15.5l1.43.82" />
    <Path d="m9.1 18.93 1.42.81" />
  </Svg>
);

// DollarSign Icon
export const DollarSignPDFIcon = ({ size }: PDFIconProps) => (
  <Svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ height: size, width: size }}
  >
    <Line x1="12" y1="1" x2="12" y2="23" />
    <Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </Svg>
);
