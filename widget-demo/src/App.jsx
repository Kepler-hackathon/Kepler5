import BinarySearchWidget from "./widgets/BinarySearchWidget.jsx";
import SortingVisualizer from "./widgets/SortingVisualizer.jsx";
import BigOExplorer from "./widgets/BigOExplorer.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 flex flex-col gap-10">
      <h1 className="text-center text-2xl font-semibold text-slate-100">
        CS Course — Interactive Widgets
      </h1>

      <BinarySearchWidget />
      <SortingVisualizer />
      <BigOExplorer />
    </div>
  );
}
