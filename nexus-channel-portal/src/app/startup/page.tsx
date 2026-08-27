import { SegmentLanding } from "@/components/SegmentLanding";
import { getSegment } from "@/lib/segments";

export default function StartupPage() {
  return <SegmentLanding segment={getSegment("startup")} />;
}
