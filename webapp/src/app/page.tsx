import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Dashboard from "@/components/Dashboard";
import CircleScience from "@/components/CircleScience";
import MemoryWall from "@/components/MemoryWall";
import Differentiators from "@/components/Differentiators";
import Safety from "@/components/Safety";
import Vision from "@/components/Vision";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <HowItWorks />
      <Dashboard />
      <CircleScience />
      <MemoryWall />
      <Differentiators />
      <Safety />
      <Vision />
    </main>
  );
}