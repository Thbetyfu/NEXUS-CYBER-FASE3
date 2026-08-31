import { SegmentLanding } from "@/components/SegmentLanding";
import { getSegment } from "@/lib/segments";

export default function CorporatPage() {
  return <SegmentLanding segment={getSegment("corporat")} />;
}
