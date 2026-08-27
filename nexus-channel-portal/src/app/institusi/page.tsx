import { SegmentLanding } from "@/components/SegmentLanding";
import { getSegment } from "@/lib/segments";

export default function InstitusiPage() {
  return <SegmentLanding segment={getSegment("institusi")} />;
}
