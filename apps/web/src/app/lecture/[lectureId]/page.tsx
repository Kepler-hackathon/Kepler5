import { SlideViewer } from "@/components/slide-viewer/slide-viewer";

export default async function LecturePage(props: PageProps<"/lecture/[lectureId]">) {
  const { lectureId } = await props.params;
  const { slide } = await props.searchParams;

  const requested = Array.isArray(slide) ? slide[0] : slide;
  const initialSlide = Number(requested) || 1;

  return <SlideViewer lectureId={lectureId} initialSlide={initialSlide} />;
}
