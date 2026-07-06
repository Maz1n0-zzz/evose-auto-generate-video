import { Composition } from "remotion";
import { ChartDemo } from "./ChartDemo";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="ChartDemo"
        component={ChartDemo}
        durationInFrames={330}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
}
