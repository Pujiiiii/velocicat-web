"use client";

import { useState, useMemo } from "react";
import {
  calculateEventRecommendations,
  sanitizePhone,
  VehicleRecommendation,
  EventRecord,
  CarRecord,
  BookingRecord,
  ContactRecord,
  RecommendedClient,
} from "../../utils/clientRecommendations";

interface EventRecommendationsModalProps {
  event: EventRecord;
  cars: CarRecord[];
  bookings: BookingRecord[];
  contacts?: ContactRecord[];
  onClose: () => void;
  onGoToBookings?: () => void;
}

export default function EventRecommendationsModal({
  event,
  cars,
  bookings,
  contacts = [],
  onClose,
  onGoToBookings,
}: EventRecommendationsModalProps) {
  // Simulació per a dades de prova si no hi ha prou reserves a la BD
  const [showDemoSimulation, setShowDemoSimulation] = useState(false);

  // Missatges editats per cada client (customerId -> string)
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  // Estat de contactats durant aquesta sessió (customerId -> boolean)
  const [contactedStatus, setContactedStatus] = useState<Record<string, boolean>>({});
  // Feedback visual de copiar
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Si l'usuari activa la simulació per veure com funciona amb historial ric
  const effectiveBookings = useMemo(() => {
    if (!showDemoSimulation || bookings.length >= 5) return bookings;

    const demoAssignedCars = event.assigned_cars || [];
    const car1Id = demoAssignedCars[0] || (cars[0]?.id ?? 1);
    const car2Id = demoAssignedCars[1] || (cars[1]?.id ?? 2);

    const demoBookings: BookingRecord[] = [
      {
        id: 991,
        event_id: 881,
        car_id: car1Id,
        customer_id: 101,
        status: "finalitzada",
        rental_rate: 1800,
        created_at: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
        customers: { name: "Marc Rovira Soler", phone: "622114455" },
        rally_cars: { model: cars.find((c) => c.id === car1Id)?.model || "Peugeot 208 Rally4", fia_group: "Rally4" },
        rally_events: { name: "Ral·li de la Terrissa", event_type: event.event_type || "rally" },
      },
      {
        id: 992,
        event_id: 882,
        car_id: car1Id,
        customer_id: 101,
        status: "confirmada",
        rental_rate: 1900,
        created_at: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString(),
        customers: { name: "Marc Rovira Soler", phone: "622114455" },
        rally_cars: { model: cars.find((c) => c.id === car1Id)?.model || "Peugeot 208 Rally4", fia_group: "Rally4" },
        rally_events: { name: "Ral·li Osona", event_type: event.event_type || "rally" },
      },
      {
        id: 993,
        event_id: 883,
        car_id: car2Id,
        customer_id: 102,
        status: "finalitzada",
        rental_rate: 2200,
        created_at: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
        customers: { name: "Jordi Pratdesaba", phone: "633887799" },
        rally_cars: { model: cars.find((c) => c.id === car2Id)?.model || "Renault Clio Rally5", fia_group: "Rally5" },
        rally_events: { name: "Rallysprint de Sant Julià", event_type: "rally_sprint" },
      },
      {
        id: 994,
        event_id: 884,
        car_id: car1Id,
        customer_id: 103,
        status: "finalitzada",
        rental_rate: 1850,
        created_at: new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString(),
        customers: { name: "Albert Vinyoles", phone: "644223311" },
        rally_cars: { model: cars.find((c) => c.id === car1Id)?.model || "Peugeot 208 Rally4", fia_group: "Rally4" },
        rally_events: { name: "Ral·li Empordà", event_type: event.event_type || "rally" },
      },
    ];

    return [...bookings, ...demoBookings];
  }, [bookings, cars, event, showDemoSimulation]);

  // Càlcul de recomanacions
  const recommendations: VehicleRecommendation[] = useMemo(() => {
    return calculateEventRecommendations({
      targetEvent: event,
      allCars: cars,
      allBookings: effectiveBookings,
      allContacts: contacts,
    });
  }, [event, cars, effectiveBookings, contacts]);

  // Tab del vehicle seleccionat (per defecte el primer)
  const [selectedCarIndex, setSelectedCarIndex] = useState(0);

  const activeRec = recommendations[selectedCarIndex] || recommendations[0];

  const handleCopyMessage = (clientId: string, message: string) => {
    navigator.clipboard.writeText(message);
    setCopiedId(clientId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenWhatsApp = (client: RecommendedClient, message: string) => {
    const cleanPhone = sanitizePhone(client.phone);
    if (!cleanPhone) {
      alert("Aquest client no té un número de telèfon vàlid registrat.");
      return;
    }
    setContactedStatus((prev) => ({ ...prev, [String(client.customerId)]: true }));
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const availableCarsCount = recommendations.filter((r) => !r.isBooked).length;
  const totalAssignedCars = recommendations.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-8 flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-100">
        {/* HEADER DE LA MODAL */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-950 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400 text-2xl shadow-md">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-yellow-400/20 px-2.5 py-0.5 text-[11px] font-black uppercase text-yellow-400 border border-yellow-400/30">
                  Human-in-the-Loop IA
                </span>
                <span className="text-xs font-bold text-gray-400">
                  {event.event_type === "rally_sprint"
                    ? "Rally-sprint"
                    : event.event_type === "pujada_costa"
                    ? "Pujada en costa"
                    : "Ral·li"}
                </span>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white mt-0.5">
                Recomanació de Millors Clients · {event.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDemoSimulation((prev) => !prev)}
              className={`rounded-xl px-3 py-1.5 text-xs font-black uppercase transition border ${
                showDemoSimulation
                  ? "bg-yellow-400 text-gray-950 border-yellow-300"
                  : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
              }`}
              title="Activa dades de prova per veure com l'algorisme prioritza pilots segons historial"
            >
              {showDemoSimulation ? "✨ Dades simulades actives" : "💡 Provar amb dades simulades"}
            </button>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition"
              aria-label="Tancar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* SUB-HEADER RESUM */}
        <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-gray-700 font-semibold">
            <span>
              🏎️ <b>{totalAssignedCars}</b> vehicles assignats a la cursa
            </span>
            <span>
              🟢 <b>{availableCarsCount}</b> disponibles per llogar
            </span>
            {totalAssignedCars - availableCarsCount > 0 && (
              <span className="text-amber-700">
                🔒 <b>{totalAssignedCars - availableCarsCount}</b> ja reservats
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-500 italic">
            Afinitat calculada segons historial de models, modalitats FIA i fidelitat
          </div>
        </div>

        {/* CONTINGUT PRINCIPAL */}
        {totalAssignedCars === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-100 text-3xl">
              🏁
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase">Cap vehicle assignat a aquesta cursa</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
              Per generar recomanacions de clients, primer edita aquesta cursa i assigna-li vehicles de la flota.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
            {/* BARRA LATERAL: SELECTOR DE VEHICLES */}
            <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50/80 p-4 space-y-2 overflow-y-auto">
              <p className="px-2 text-[11px] font-black uppercase text-gray-500 tracking-wider">
                Vehicles de la competició
              </p>
              {recommendations.map((rec, idx) => {
                const isSelected = idx === selectedCarIndex;
                return (
                  <button
                    key={rec.car.id}
                    onClick={() => setSelectedCarIndex(idx)}
                    className={`w-full text-left rounded-2xl p-3.5 transition-all flex flex-col gap-1 border ${
                      isSelected
                        ? "bg-white shadow-md border-gray-950 text-gray-950 ring-2 ring-yellow-400"
                        : "bg-white/60 hover:bg-white border-gray-200 text-gray-700 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm uppercase">{rec.car.model}</span>
                      {rec.isBooked ? (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">
                          Reservat
                        </span>
                      ) : (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-800">
                          {rec.topClients.length} candidats
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <span>Grup: <b>{rec.car.fia_group || "FIA"}</b></span>
                      <span>·</span>
                      <span>{rec.rateForEvent > 0 ? `${rec.rateForEvent} €` : "Sense tarifa"}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ZONA DE DETALL I CLIENTS RECOMANATS */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {activeRec && (
                <>
                  {/* TARGETA DEL VEHICLE SELECCIONAT */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900 p-5 text-white shadow-sm">
                    <div className="flex items-center gap-4">
                      {activeRec.car.photos?.[0] ? (
                        <img
                          src={activeRec.car.photos[0]}
                          alt={activeRec.car.model}
                          className="h-14 w-20 rounded-xl object-cover border border-gray-700"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-800 text-2xl font-black text-yellow-400">
                          🏎️
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-yellow-400">
                            {activeRec.car.fia_group}
                          </span>
                          <span className="text-gray-400 text-xs">·</span>
                          <span className="text-xs text-gray-300">
                            Tarifa: <b>{activeRec.rateForEvent > 0 ? `${activeRec.rateForEvent.toLocaleString("ca-ES")} €` : "A consultar"}</b>
                          </span>
                        </div>
                        <h3 className="text-2xl font-black uppercase text-white">{activeRec.car.model}</h3>
                      </div>
                    </div>

                    <div>
                      {activeRec.isBooked ? (
                        <div className="rounded-xl bg-red-950/80 border border-red-800 px-4 py-2 text-right">
                          <p className="text-[11px] font-bold uppercase text-red-300">Estat del vehicle</p>
                          <p className="text-sm font-black text-white">
                            Reservat per {activeRec.bookedBy?.name || "Client"}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-green-950/80 border border-green-800 px-4 py-2 text-right">
                          <p className="text-[11px] font-bold uppercase text-green-300">Disponible per a la cursa</p>
                          <p className="text-sm font-black text-white">
                            {activeRec.topClients.length} candidats recomanats
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SI JA ESTÀ RESERVAT */}
                  {activeRec.isBooked ? (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center space-y-3">
                      <div className="text-3xl">🔒</div>
                      <h4 className="text-base font-black uppercase text-gray-800">
                        Aquest vehicle ja té una reserva activa
                      </h4>
                      <p className="text-xs text-gray-600 max-w-md mx-auto">
                        El vehicle està assignat a <b>{activeRec.bookedBy?.name}</b> amb telèfon{" "}
                        <b>{activeRec.bookedBy?.phone}</b> (estat: {activeRec.bookedBy?.status}). No cal enviar noves recomanacions.
                      </p>
                      {onGoToBookings && (
                        <button
                          onClick={() => {
                            onClose();
                            onGoToBookings();
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-black uppercase text-white hover:bg-gray-800 transition"
                        >
                          Anar a la pestanya de Reserves ↗
                        </button>
                      )}
                    </div>
                  ) : activeRec.topClients.length === 0 ? (
                    /* SI NO HI HA CAP CLIENT ENCARA */
                    <div className="rounded-2xl border border-yellow-200 bg-yellow-50/70 p-8 text-center space-y-3">
                      <div className="text-3xl">👥</div>
                      <h4 className="text-base font-black uppercase text-gray-800">
                        Sense clients a la base de dades
                      </h4>
                      <p className="text-xs text-gray-600 max-w-md mx-auto">
                        Encara no s’han registrat clients o reserves prèvies. Pots prémer el botó superior{" "}
                        <b>&ldquo;💡 Provar amb dades simulades&rdquo;</b> per comprovar com calcula les afinitats quan hi hagi reserves.
                      </p>
                    </div>
                  ) : (
                    /* LLISTAT DE CLIENTS RECOMANATS */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                          Rànquing de candidats per afinitat (Top {activeRec.topClients.length})
                        </h4>
                        <span className="text-[11px] font-bold text-gray-400">
                          Recomanació Human-in-the-Loop: Revisa el text i clica per enviar
                        </span>
                      </div>

                      <div className="space-y-4">
                        {activeRec.topClients.map((client, cIdx) => {
                          const clientKey = String(client.customerId);
                          const currentMessage = editedMessages[clientKey] ?? client.personalizedMessage;
                          const isContacted = contactedStatus[clientKey];
                          const isCopied = copiedId === clientKey;

                          // Color segons afinitat
                          const scoreColor =
                            client.score >= 80
                              ? "bg-green-500 text-white"
                              : client.score >= 60
                              ? "bg-yellow-500 text-gray-950"
                              : "bg-blue-500 text-white";

                          return (
                            <div
                              key={clientKey}
                              className={`rounded-2xl border p-5 transition-all shadow-sm ${
                                isContacted
                                  ? "bg-green-50/50 border-green-200"
                                  : "bg-white border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              {/* CAPÇALERA CANDIDAT */}
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-950 text-xs font-black text-yellow-400">
                                    #{cIdx + 1}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-base font-black text-gray-900">{client.name}</h5>
                                      {isContacted && (
                                        <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-black uppercase text-green-800">
                                          ✓ Contactat
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                                      {client.phone ? (
                                        <a
                                          href={`tel:${client.phone}`}
                                          className="font-mono text-gray-700 hover:text-blue-600 transition"
                                        >
                                          📞 {client.phone}
                                        </a>
                                      ) : (
                                        <span className="text-gray-400">Sense telèfon</span>
                                      )}
                                      <span>·</span>
                                      <span>Reserves prèvies: <b>{client.stats.totalBookings}</b></span>
                                    </div>
                                  </div>
                                </div>

                                {/* SCORE BADGE */}
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <div className="text-[10px] font-bold uppercase text-gray-400">
                                      Afinitat {client.affinityLabel}
                                    </div>
                                    <div className="text-lg font-black text-gray-900 leading-tight">
                                      {client.score}%
                                    </div>
                                  </div>
                                  <div className={`h-10 w-2.5 rounded-full ${scoreColor}`} />
                                </div>
                              </div>

                              {/* MOTIUS DE LA RECOMANACIÓ (EXPLAINABLE AI) */}
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {client.reasons.map((r, rIdx) => (
                                  <span
                                    key={rIdx}
                                    className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-700"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>

                              {/* EDITOR DEL MISSATGE PERSONALITZAT */}
                              <div className="mt-4 rounded-xl bg-gray-50 p-3 border border-gray-200 space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-black uppercase text-gray-500">
                                  <span>Proposta de missatge personalitzat</span>
                                  <button
                                    onClick={() =>
                                      setEditedMessages((prev) => ({
                                        ...prev,
                                        [clientKey]: client.personalizedMessage,
                                      }))
                                    }
                                    className="text-gray-400 hover:text-gray-700 font-bold lowercase transition"
                                  >
                                    restablir text original
                                  </button>
                                </div>
                                <textarea
                                  rows={3}
                                  value={currentMessage}
                                  onChange={(e) =>
                                    setEditedMessages((prev) => ({
                                      ...prev,
                                      [clientKey]: e.target.value,
                                    }))
                                  }
                                  className="w-full resize-y rounded-lg border border-gray-200 bg-white p-2.5 text-xs font-medium text-gray-800 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                                  placeholder="Escriu o retoca el missatge abans d'enviar..."
                                />

                                {/* BOTONS D'ACCIÓ HUMAN-IN-THE-LOOP */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleCopyMessage(clientKey, currentMessage)}
                                      className="rounded-lg bg-white border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition shadow-sm flex items-center gap-1.5"
                                    >
                                      {isCopied ? "✓ Copiat al porta-retalls" : "📋 Copiar text"}
                                    </button>
                                    {client.phone && (
                                      <a
                                        href={`tel:${client.phone}`}
                                        className="rounded-lg bg-white border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition shadow-sm flex items-center gap-1.5"
                                      >
                                        📞 Trucar
                                      </a>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => handleOpenWhatsApp(client, currentMessage)}
                                    className="rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white px-4 py-2 text-xs font-black uppercase shadow-sm transition hover:shadow flex items-center gap-2"
                                  >
                                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    <span>Enviar per WhatsApp</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* FOOTER DE LA MODAL */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
          <p className="text-xs text-gray-500">
            Pots modificar qualsevol missatge abans d&apos;obrir WhatsApp. Les dades no s&apos;envien automàticament sense la teva confirmació.
          </p>
          <button
            onClick={onClose}
            className="rounded-xl bg-gray-900 px-5 py-2 text-xs font-black uppercase text-white hover:bg-gray-800 transition"
          >
            Tancar
          </button>
        </div>
      </div>
    </div>
  );
}
