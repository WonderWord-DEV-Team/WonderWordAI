import { Button } from "@/components/shared/Button";

export default function ButtonTestPage() {
  return (
    <div className="min-h-screen bg-[#FDF8F2] flex flex-col items-center justify-center gap-6 p-10">
      <Button variant="coral">Start Free Trial</Button>
      <Button variant="teal">Log In</Button>
      <Button variant="black">Stop recording</Button>
      <Button variant="white">Try again</Button>
      <Button variant="amber">Get Started</Button>
      <Button as="a" href="#" variant="coral">
        Link styled as button
      </Button>
    </div>
  );
}