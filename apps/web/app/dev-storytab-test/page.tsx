import { StoryTab } from "@/components/child/StoryTab";

export default function StoryTabTestPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <StoryTab
          storyText="The enormous elephant walked through the tall green grass."
          imageStatus="ready"
          imageUrl="https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400"
        />
      </div>
    </div>
  );
}