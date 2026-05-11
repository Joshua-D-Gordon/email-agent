import { Navbar } from "./(marketing)/_components/navbar";
import { Hero } from "./(marketing)/_components/hero";
import { Features } from "./(marketing)/_components/features";
import { HowItWorks } from "./(marketing)/_components/how-it-works";
import { Faq } from "./(marketing)/_components/faq";
import { FinalCta } from "./(marketing)/_components/cta";
import { Footer } from "./(marketing)/_components/footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <Hero />
        <Features />
        <HowItWorks />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
