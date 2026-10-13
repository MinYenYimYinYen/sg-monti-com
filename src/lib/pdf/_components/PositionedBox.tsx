import { View } from "@react-pdf/renderer";

const POINTS_PER_INCH = 72;

type PositionedBoxProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  children: React.ReactNode;
};

/**
 * Places content at an absolute position on a PDF page using inch-based coordinates.
 * Converts inches to points internally (72 pts/inch).
 *
 * Origin (0, 0) is the top-left corner of the page.
 * X increases to the right; Y increases downward.
 */
export function PositionedBox({ x, y, width, height, children }: PositionedBoxProps) {
  return (
    <View
      style={{
        position: "absolute",
        left: x * POINTS_PER_INCH,
        top: y * POINTS_PER_INCH,
        width: width * POINTS_PER_INCH,
        height: height * POINTS_PER_INCH,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}
