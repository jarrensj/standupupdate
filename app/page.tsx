import StandupInput from "../components/StandupInput";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-gray-100">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold">
          gmatcha
        </h1>
        <p className="text-lg">
          a simple tool to help you keep track of your standup updates
        </p>
        <StandupInput />
      </main>
      <Footer />
    </div>
  );
}
