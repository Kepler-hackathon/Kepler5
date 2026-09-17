import { SlideViewer } from "@/components/slide-viewer/slide-viewer";

export default async function LecturePage(props: PageProps<"/lecture/[lectureId]">) {
  const { lectureId } = await props.params;
  const { slide } = await props.searchParams;

  const requested = Array.isArray(slide) ? slide[0] : slide;
  // null (no ?slide= given, e.g. "Start"/"Resume Lecture") tells SlideViewer to look up saved
  // progress and resume there, instead of always opening at slide 1.
  const initialSlide = requested ? Number(requested) || 1 : null;

  return <SlideViewer lectureId={lectureId} initialSlide={initialSlide} />;
}
