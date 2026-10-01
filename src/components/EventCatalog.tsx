"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function EventCatalog({ events, cars, bookings }: { events: any[], cars: any[], bookings: any[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedCar, setSelectedCar] = useState<any>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const obrirModal = (event: any, car: any) => {
    setSelectedEvent(event);
    setSelectedCar(car);
    setModalOpen(true);
    setStatus("idle");
    setName("");
    setPhone("");
  };

  const ferReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
    const { error } = await supabase.rpc("create_rally_booking", {
      p_name: name.trim(),
      p_phone: phone.trim(),
      p_event_id: selectedEvent.id,
      p_car_id: selectedCar.id,
    });

    if (error) {
      console.error("Error creant reserva:", error);
      setStatus("error");
      return;
    }

    setStatus("success");
    } catch (error) {
      console.error("Error creant reserva:", error);
      setStatus("error");
    }
  };

  return (
    <section id="calendari" className="py-24 bg-gray-100 border-t-2 border-gray-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black uppercase text-gray-900 italic">Pròxims Rallys</h2>
          <div className="w-24 h-2 bg-yellow-400 mx-auto mt-4"></div>
          <p className="mt-4 text-gray-600 font-medium">Tria la teva propera cursa i reserva la teva màquina.</p>
        </div>

        <div className="flex flex-col gap-12">
          {events && events.length > 0 ? (
            events.map((event) => {
              const assignedCarsIds = event.assigned_cars || [];
              const eventCars = cars?.filter((car) =>
                assignedCarsIds.map((id: any) => String(id)).includes(String(car.id))
              ) || [];

              return (
                <div key={event.id} className="bg-white rounded-2xl shadow-xl overflow-hidden border-t-8 border-gray-900">
                  <div className="bg-gray-900 text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-3xl font-black italic uppercase text-yellow-400">{event.name}</h3>
                      <p className="text-gray-300 font-medium mt-1 flex items-center gap-2">
                        Del {new Date(event.start_date).toLocaleDateString()} al {new Date(event.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 md:p-8">
                    <h4 className="text-lg font-bold uppercase text-gray-700 mb-6">Cotxes Disponibles:</h4>

                    {eventCars.length === 0 ? (
                      <div className="bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-200 text-center">
                        <p className="text-gray-500 font-bold uppercase">De moment no s'ha assignat cap vehicle de la flota per aquesta prova.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {eventCars.map((car) => {
                          const isBooked = bookings?.some((b) => String(b.event_id) === String(event.id) && String(b.car_id) === String(car.id));
                          const isMaintenance = car.status === "manteniment";\n                          const isPrivate = car.ownership === "particular";
                          const isAvailable = !isBooked && !isMaintenance && !isPrivate;

                          return (
                            <div key={car.id} className={`flex flex-col border-2 rounded-xl p-4 transition-all ${isAvailable ? "border-gray-200 bg-white shadow-sm hover:border-yellow-400" : "border-red-100 bg-red-50 opacity-80"}`}>
                              <div className="flex gap-4 items-center mb-4">
                                {car.photos && car.photos.length > 0 ? (
                                  <img src={car.photos[0]} alt={car.model} loading="lazy" decoding="async" className="w-20 h-20 object-cover rounded-lg shadow-sm" />
                                ) : (
                                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400">Sense foto</div>
                                )}
                                <div>
                                  <h5 className="font-black text-gray-900 uppercase italic leading-tight">{car.model}</h5>
                                  <div className="mt-1 flex flex-col items-start gap-1">
                                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">{car.fia_group}</span>
                                    {isPrivate ? <span className="text-gray-500 font-bold text-sm">Vehicle particular · no disponible per lloguer</span> : <span className="text-gray-700 font-bold text-sm">{car.daily_rate}€ / cursa</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-auto">
                                {isAvailable ? (
                                  <button onClick={() => obrirModal(event, car)} className="w-full py-3 bg-yellow-400 text-red-700 font-black uppercase rounded shadow hover:bg-yellow-500 transition-colors">
                                    Sol·licitar Reserva
                                  </button>
                                ) : isPrivate ? (<div className="w-full py-3 bg-gray-200 text-gray-600 font-bold uppercase rounded text-center text-sm">Vehicle particular · només participació</div>) : isMaintenance ? (
                                  <div className="w-full py-3 bg-gray-300 text-gray-600 font-bold uppercase rounded text-center text-sm">En Manteniment</div>
                                ) : (
                                  <div className="w-full py-3 bg-red-200 text-red-800 font-bold uppercase rounded text-center text-sm">Ocupat (Reservat)</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-xl font-bold text-gray-500">De moment no hi ha cap rally programat.</p>
            </div>
          )}
        </div>
      </div>

      {modalOpen && selectedEvent && selectedCar && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[100]" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="booking-dialog-title" className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border-t-8 border-yellow-400 relative">
            <button type="button" aria-label="Tancar la sol·licitud de reserva" onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-600 font-bold">Tancar</button>
            <h3 id="booking-dialog-title" className="text-2xl font-black italic uppercase mb-2 text-gray-900">Sol·licitud de Reserva</h3>
            <p className="text-gray-600 mb-6 font-medium">Estàs a punt de sol·licitar el <span className="font-bold text-gray-900">{selectedCar.model}</span> per al <span className="font-bold text-gray-900">{selectedEvent.name}</span>.</p>

            {status === "success" ? (
              <div role="status" aria-live="polite" className="bg-green-100 text-green-900 p-5 rounded-xl">
                <p className="text-center font-black uppercase">Sol·licitud rebuda!</p>
                <p className="mt-2 text-sm text-center">Hem registrat la teva sol·licitud per al rally. Aquí tens el resum:</p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4"><dt className="font-bold">Rally</dt><dd className="text-right">{selectedEvent.name}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="font-bold">Vehicle</dt><dd className="text-right">{selectedCar.model}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="font-bold">Preu</dt><dd className="text-right">{selectedCar.daily_rate}€ / cursa</dd></div>
                </dl>
                <p className="mt-4 text-xs text-center">La disponibilitat s’actualitzarà en tancar aquest resum.</p>
                <button type="button" onClick={() => { setModalOpen(false); router.refresh(); }} className="mt-5 w-full py-3 bg-gray-900 text-white font-black uppercase rounded hover:bg-yellow-400 hover:text-red-700 transition-colors">
                  Tancar i actualitzar disponibilitat
                </button>
              </div>
            ) : (
              <form onSubmit={ferReserva} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="booking-name" className="block text-sm font-bold text-gray-700 uppercase mb-1">El teu nom</label>
                  <input id="booking-name" type="text" required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-3 focus:border-red-600 outline-none" />
                </div>
                <div>
                  <label htmlFor="booking-phone" className="block text-sm font-bold text-gray-700 uppercase mb-1">Telèfon de contacte</label>
                  <input id="booking-phone" type="tel" required minLength={6} maxLength={30} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-3 focus:border-red-600 outline-none" />
                </div>
                {status === "error" && <p role="alert" className="text-red-600 font-bold text-sm">Hi ha hagut un error en enviar la sol·licitud.</p>}

                <button disabled={status === "loading"} type="submit" className="mt-4 w-full py-4 bg-gray-900 text-white font-black uppercase rounded shadow hover:bg-yellow-400 hover:text-red-700 transition-colors">
                  {status === "loading" ? "Enviant..." : "Confirmar Sol·licitud"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
