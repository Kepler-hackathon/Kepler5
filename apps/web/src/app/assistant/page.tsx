import { FullChat } from "@/components/assistant/full-chat";

export default async function AssistantPage(props: PageProps<"/assistant">) {
  const { lecture, slide } = await props.searchParams;
  const lectureNum = Number(Array.isArray(lecture) ? lecture[0] : lecture);
  const slideNum = Number(Array.isArray(slide) ? slide[0] : slide);
  const continuedFrom = lectureNum && slideNum ? { lecture: lectureNum, slide: slideNum } : undefined;

  return <FullChat courseId="cs201" continuedFrom={continuedFrom} />;
}
