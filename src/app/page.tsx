import Link from "next/link";
import { supabase } from "../utils/supabase";
import WorkshopForm from "../components/WorkshopForm";
import ImageCarousel from "../components/ImageCarousel";
import EventCatalog from "../components/EventCatalog";

export const dynamic = 'force-dynamic';

export default async function Home() {
  
  // Obtenim totes les dades necessàries de la base de dades
  const { data: cars } = await supabase.from('rally_cars').select('*');
  const { data: events } = await supabase.from('rally_events').select('*').order('start_date', { ascending: true });
  const { data: bookings } = await supabase.rpc('get_public_booking_status');

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      
      {/* BARRA DE NAVEGACIÓ */}
      <header className="bg-white border-b-4 border-yellow-400 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
          <div className="text-3xl font-black text-red-600 tracking-tighter italic">
            VELOCI<span className="text-yellow-400">CAT</span>
          </div>
          <nav className="hidden md:flex space-x-8 font-bold text-gray-700 uppercase tracking-wide">
            {/* <Link href="#taller" className="hover:text-red-600 transition-colors">Taller</Link> */}
            <Link href="#flota" className="hover:text-red-600 transition-colors">La Flota</Link>
            <Link href="#calendari" className="hover:text-red-600 transition-colors">Reserves Rally</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* SECCIÓ HERO */}
        <section className="relative bg-red-600 text-white overflow-hidden">
          <div className="absolute inset-0 bg-red-700 opacity-50 mix-blend-multiply"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 flex flex-col items-center text-center">
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-6 italic">
              Portem la teva passió <br />
              <span className="text-yellow-400 underline decoration-8 underline-offset-8">al límit</span>
            </h1>
            <p className="text-lg md:text-2xl font-medium mb-12 max-w-3xl text-gray-100">
              Vehicles de pura raça preparats per devorar el crono al proper rally.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
              {/* <Link href="#taller" className="px-8 py-4 bg-yellow-400 text-red-700 font-black uppercase tracking-wider rounded shadow-lg hover:bg-yellow-300 transition-transform hover:scale-105 text-center">
                Demana Cita (Taller)
              </Link> */}
              <Link href="#calendari" className="px-8 py-4 bg-white text-red-600 font-black uppercase tracking-wider rounded shadow-lg hover:bg-gray-100 transition-transform hover:scale-105 border-2 border-transparent hover:border-red-600 text-center">
                Calendari de Curses
              </Link>
            </div>
          </div>
        </section>

        {/* SECCIÓ DIVISIÓ DE SERVEIS */}
        <section id="taller" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black uppercase text-gray-900 italic">Què necessites?</h2>
              <div className="w-24 h-2 bg-yellow-400 mx-auto mt-4"></div>
            </div>
            
            <div className="grid md:grid-cols-1 gap-12 max-w-3xl mx-auto">
              
              {/* === SECCIÓ TALLER AMAGADA TEMPORALMENT === 
              <div className="bg-white rounded-xl shadow-xl overflow-hidden border-t-8 border-red-600 flex flex-col h-full">
                <div className="p-10 text-center flex-grow flex flex-col">
                  <h3 className="text-3xl font-black text-red-600 uppercase italic mb-4">Taller Mecànic</h3>
                  <p className="text-gray-600 mb-6 font-medium">
                    Manteniment, revisions, preparació i reparacions generals. Tractem el teu cotxe de diari amb la mateixa exigència que un cotxe de competició.
                  </p>
                  <div className="mt-auto">
                    <WorkshopForm />
                  </div>
                </div>
              </div>
              */}

              <div className="bg-white rounded-xl shadow-xl overflow-hidden border-t-8 border-gray-900 flex flex-col h-full">
                <div className="p-10 text-center flex-grow flex flex-col">
                  <h3 className="text-3xl font-black text-gray-900 uppercase italic mb-4">Lloguer de Rally</h3>
                  <p className="text-gray-600 mb-8 font-medium text-lg">
                    Vehicles preparats segons normativa FIA, revisats peça a peça després de cada cursa. Llestos per pujar i córrer.
                  </p>
                  <Link href="#calendari" className="mt-auto inline-block px-6 py-4 bg-gray-900 text-white font-bold uppercase rounded hover:bg-yellow-400 hover:text-red-700 transition-colors w-full text-lg">
                    Veure Calendari i Reserves
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* L'APARADOR: LA NOSTRA FLOTA */}
        <section id="flota" className="py-24 bg-white border-t-2 border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black uppercase text-gray-900 italic">La Nostra Flota</h2>
              <div className="w-24 h-2 bg-red-600 mx-auto mt-4"></div>
              <p className="mt-4 text-gray-600 font-medium">Màquines preparades al mil·límetre pel nostre equip.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {cars && cars.length > 0 ? (
                cars.map((car) => (
                  <div key={car.id} className="bg-gray-50 rounded-xl overflow-hidden shadow-lg border-2 border-transparent hover:border-red-600 transition-all flex flex-col">
                    <div className="h-56 border-b-4 border-yellow-400 relative">
                      <ImageCarousel photos={car.photos} altText={car.model} />
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-2xl font-black italic text-gray-900 uppercase">{car.model}</h3>
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded uppercase">
                          {car.fia_group}
                        </span>
                      </div>
                      <div className="flex-grow">
                        <p className="text-3xl font-black text-gray-900">
                          {car.daily_rate}€ <span className="text-sm text-gray-500 font-medium">/ cursa</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 bg-gray-100 rounded-lg">
                  <p className="text-xl font-bold text-gray-500">Encara no hi ha vehicles al catàleg.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CALENDARI D'ESDEVENIMENTS I RESERVES */}
        <EventCatalog events={events || []} cars={cars || []} bookings={bookings || []} />

      </main>
    </div>
  );
}