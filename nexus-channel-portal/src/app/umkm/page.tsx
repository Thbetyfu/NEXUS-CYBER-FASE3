import { SegmentLanding } from "@/components/SegmentLanding";
import { getSegment } from "@/lib/segments";

export default function UmkmPage() {
  return <SegmentLanding segment={getSegment("umkm")} />;
}
