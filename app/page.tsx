import Chat from "@/app/components/Chat";
import Map from "@/app/components/Map";
export default function Home() {
  return (
    <div className="grid h-screen grid-cols-[70%_30%]">
      <div className="relative">
        <Map />
      </div>
      <div className="border-l border-gray-200">
        <Chat />
      </div>
    </div>
  );
}
