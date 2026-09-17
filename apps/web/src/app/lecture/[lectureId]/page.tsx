import { notFound } from "next/navigation";
import { lecture8 } from "@/lib/data/lecture-8";
import { SlideViewer } from "@/components/slide-viewer/slide-viewer";

export default async function LecturePage(props: PageProps<"/lecture/[lectureId]">) {
  const { lectureId } = await props.params;
  const { slide } = await props.searchParams;

  if (lectureId !== String(lecture8.number)) {
    notFound();
  }

  const requested = Array.isArray(slide) ? slide[0] : slide;
  const initialSlide = Number(requested) || 1;

  return <SlideViewer lecture={lecture8} initialSlide={initialSlide} />;
}
