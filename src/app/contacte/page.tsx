import PageShell from "../../components/PageShell";
import ContactForm from "../../components/ContactForm";

export default function Page() {
  return (
    <PageShell>
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:py-16 md:grid-cols-2 md:gap-12">
        <section className="self-center">
          <p className="font-black uppercase tracking-widest text-red-600">Parlem</p>
          <h1 className="mt-2 text-4xl font-black italic uppercase sm:text-5xl">
            Contacte
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
            Reserves, competició, patrocinis, premsa o qualsevol consulta relacionada amb
            VelociCAT.
          </p>
        </section>

        
        <ContactForm />
      </main>
    </PageShell>
  );
}
