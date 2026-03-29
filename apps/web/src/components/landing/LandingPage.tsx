import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import Differentiators from "./Differentiators";
import Safety from "./Safety";
import Vision from "./Vision";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Differentiators />
      <Safety />
      <Vision />
    </main>
  );
}
