import { SegmentLanding } from "@/components/SegmentLanding";
import { getSegment } from "@/lib/segments";

export default function SekolahPage() {
  return <SegmentLanding segment={getSegment("sekolah")} />;
}
