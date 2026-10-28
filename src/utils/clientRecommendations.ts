/**
 * Motor de Recomanació Predictiu de Clients (Human-in-the-Loop) per a VelociCAT.
 *
 * Avalua l'afinitat entre els clients (històric de reserves i contactes) i un vehicle
 * assignat a una nova competició/ral·li, calculant un Propensity Score (0-100%)
 * i explicant els motius clau per facilitar la decisió a l'administrador.
 */

export interface BookingRecord {
  id: number;
  event_id: number;
  car_id: number;
  customer_id: number;
  status: string;
  rental_rate?: number | null;
  created_at?: string;
  customers?: { name?: string | null; phone?: string | null } | null;
  rally_cars?: { model?: string | null; fia_group?: string | null } | null;
  rally_events?: { name?: string | null; start_date?: string | null; event_type?: string | null } | null;
}

export interface ContactRecord {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  subject?: string | null;
  message?: string | null;
  created_at?: string;
}

export interface CarRecord {
  id: number;
  model: string;
  fia_group: string;
  daily_rate: number;
  sprint_rate: number;
  rentable_rally?: boolean;
  rentable_sprint?: boolean;
  photos?: string[];
  status?: string;
  ownership?: string;
}

export interface EventRecord {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  event_type?: string;
  assigned_cars?: number[];
}

export interface RecommendedClient {
  customerId: number | string;
  name: string;
  phone: string;
  score: number; // 0 - 99%
  affinityLabel: "Molt Alta" | "Alta" | "Mitjana" | "Bàsica";
  reasons: string[];
  stats: {
    totalBookings: number;
    sameCarBookings: number;
    sameCategoryBookings: number;
    sameEventTypeBookings: number;
    lastBookingDate?: string;
  };
  personalizedMessage: string;
}

export interface VehicleRecommendation {
  car: CarRecord;
  isBooked: boolean;
  bookedBy?: {
    name: string;
    phone: string;
    status: string;
  };
  rateForEvent: number;
  topClients: RecommendedClient[];
}

/**
 * Neteja i normalitza el número de telèfon
 */
export function sanitizePhone(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9 && (digits.startsWith("6") || digits.startsWith("7"))) {
    return "34" + digits;
  }
  return digits;
}

/**
 * Formata un interval de dates en català
 */
export function formatDatesCatalan(startDateStr: string, endDateStr: string): string {
  try {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    const sStr = s.toLocaleDateString("ca-ES", { day: "numeric", month: "short" });
    const eStr = e.toLocaleDateString("ca-ES", { day: "numeric", month: "short" });
    if (sStr === eStr) return sStr;
    return `${sStr} - ${eStr}`;
  } catch {
    return `${startDateStr}`;
  }
}

/**
 * Genera el missatge personalitzat de WhatsApp / Contacte
 */
export function buildPersonalizedPitch({
  clientName,
  eventName,
  eventDates,
  carModel,
  rate,
  eventType,
}: {
  clientName: string;
  eventName: string;
  eventDates: string;
  carModel: string;
  rate: number;
  eventType?: string;
}): string {
  const firstName = clientName.split(" ")[0] || clientName;
  const eventLabel =
    eventType === "rally_sprint"
      ? "el Rally-sprint"
      : eventType === "pujada_costa"
      ? "la Pujada en costa"
      : "el Ral·li";

  let priceNote = "";
  if (rate > 0) {
    priceNote = ` amb tarifa oficial de ${rate.toLocaleString("ca-ES")} €`;
  }

  return (
    `Hola ${firstName}! 🏁 Des de l'equip de VelociCAT t'avisem en primícia que ja tenim obertes les places de competició per a ${eventLabel} "${eventName}" (${eventDates}).\n\n` +
    `Com que ets un dels nostres pilots de confiança i el ${carModel}${priceNote} està disponible, contactem amb tu abans d'obrir-lo al públic general per si t'interessa reservar-lo per a aquesta cursa.\n\n` +
    `Si vols que et guardem la plaça o vols comentar els detalls tècnics, respon-nos directament per aquí. Salut i gas! 🏎️💨`
  );
}

/**
 * Calcula les recomanacions per a cada vehicle d'un esdeveniment
 */
export function calculateEventRecommendations({
  targetEvent,
  allCars,
  allBookings,
  allContacts = [],
}: {
  targetEvent: EventRecord;
  allCars: CarRecord[];
  allBookings: BookingRecord[];
  allContacts?: ContactRecord[];
}): VehicleRecommendation[] {
  const assignedCarIds = targetEvent.assigned_cars || [];
  const eventCars = allCars.filter((c) => assignedCarIds.includes(c.id));
  const eventDates = formatDatesCatalan(targetEvent.start_date, targetEvent.end_date);

  // 1. Agrupar l'històric per client (identificat per telèfon net o customer_id)
  const clientMap = new Map<
    string,
    {
      customerId: number | string;
      name: string;
      phone: string;
      bookings: BookingRecord[];
      contacts: ContactRecord[];
    }
  >();

  for (const b of allBookings) {
    const rawPhone = b.customers?.phone || "";
    const cleanPhone = sanitizePhone(rawPhone) || `id-${b.customer_id}`;
    const clientName = b.customers?.name?.trim() || "Pilot Registrat";

    if (!clientMap.has(cleanPhone)) {
      clientMap.set(cleanPhone, {
        customerId: b.customer_id,
        name: clientName,
        phone: rawPhone,
        bookings: [],
        contacts: [],
      });
    }

    const entry = clientMap.get(cleanPhone)!;
    // Si tenim un nom més complet, l'actualitzem
    if (clientName && (!entry.name || entry.name === "Pilot Registrat")) {
      entry.name = clientName;
    }
    if (rawPhone && !entry.phone) {
      entry.phone = rawPhone;
    }
    entry.bookings.push(b);
  }

  // Afegir també contactes de contact_messages que tinguin telèfon
  for (const msg of allContacts) {
    if (!msg.phone) continue;
    const cleanPhone = sanitizePhone(msg.phone);
    if (!cleanPhone) continue;

    if (!clientMap.has(cleanPhone)) {
      clientMap.set(cleanPhone, {
        customerId: `msg-${msg.id}`,
        name: msg.name?.trim() || "Lead Contacte",
        phone: msg.phone,
        bookings: [],
        contacts: [],
      });
    }
    clientMap.get(cleanPhone)!.contacts.push(msg);
  }

  // 2. Per a cada vehicle assignat a la cursa
  return eventCars.map((car) => {
    // Comprovar si el vehicle ja està reservat en aquest esdeveniment
    const existingBooking = allBookings.find(
      (b) => b.event_id === targetEvent.id && b.car_id === car.id && b.status !== "cancel·lada" && b.status !== "rebutjada"
    );

    const isBooked = Boolean(existingBooking);
    const bookedBy = existingBooking
      ? {
          name: existingBooking.customers?.name || "Client",
          phone: existingBooking.customers?.phone || "",
          status: existingBooking.status,
        }
      : undefined;

    const rateForEvent =
      targetEvent.event_type === "rally"
        ? Number(car.daily_rate) || 0
        : Number(car.sprint_rate) || Number(car.daily_rate) || 0;

    // Si ja està reservat, no cal calcular rànquing d'oferta
    if (isBooked) {
      return {
        car,
        isBooked: true,
        bookedBy,
        rateForEvent,
        topClients: [],
      };
    }

    // 3. Avaluar cada client per a aquest vehicle
    const evaluatedClients: RecommendedClient[] = [];

    clientMap.forEach((client) => {
      let score = 15; // Base per ser client existent
      const reasons: string[] = [];

      let sameCarCount = 0;
      let sameCategoryCount = 0;
      let sameEventTypeCount = 0;
      let confirmedCount = 0;
      let lastBookingDate: string | undefined;

      // Analitzar reserves del client
      for (const b of client.bookings) {
        if (b.status === "confirmada" || b.status === "finalitzada") {
          confirmedCount++;
        }

        if (b.car_id === car.id) {
          sameCarCount++;
        }

        const bCarGroup = b.rally_cars?.fia_group?.toUpperCase() || "";
        const targetCarGroup = (car.fia_group || "").toUpperCase();
        if (bCarGroup && targetCarGroup && bCarGroup === targetCarGroup) {
          sameCategoryCount++;
        }

        const bEventType = b.rally_events?.event_type || "rally";
        const targetEventType = targetEvent.event_type || "rally";
        if (bEventType === targetEventType) {
          sameEventTypeCount++;
        }

        if (b.created_at) {
          if (!lastBookingDate || new Date(b.created_at) > new Date(lastBookingDate)) {
            lastBookingDate = b.created_at;
          }
        }
      }

      // 4. Aplicar ponderacions (Scoring Engine)

      // A) Afinitat amb el vehicle exacte (fins a 45 pts)
      if (sameCarCount >= 3) {
        score += 45;
        reasons.push(`⭐ Ha competit ${sameCarCount} vegades amb el ${car.model}`);
      } else if (sameCarCount === 2) {
        score += 35;
        reasons.push(`⭐ Ha competit 2 vegades amb el ${car.model}`);
      } else if (sameCarCount === 1) {
        score += 25;
        reasons.push(`🏎️ Ha pilotat anteriorment el ${car.model}`);
      } else if (sameCategoryCount > 0 && car.fia_group) {
        score += 18;
        reasons.push(`🎯 Especialista en categoria FIA ${car.fia_group}`);
      }

      // B) Afinitat de modalitat (fins a 25 pts)
      if (sameEventTypeCount > 0) {
        const modalityLabel =
          targetEvent.event_type === "rally_sprint"
            ? "Rally-sprint"
            : targetEvent.event_type === "pujada_costa"
            ? "Pujada en costa"
            : "Ral·li";
        score += 20;
        reasons.push(`📍 Habitual en proves de ${modalityLabel}`);
      }

      // C) Fidelització i fiabilitat (fins a 20 pts)
      if (confirmedCount >= 2) {
        score += 15;
        reasons.push(`✅ Pilot d'alta fiabilitat (${confirmedCount} reserves finalitzades)`);
      } else if (confirmedCount === 1) {
        score += 10;
        reasons.push(`✅ Històric de reserva confirmada amb èxit`);
      }

      // Recència: reserva en els darrers 12 mesos (+5 pts)
      if (lastBookingDate) {
        const monthsAgo = (Date.now() - new Date(lastBookingDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsAgo <= 12) {
          score += 5;
          reasons.push(`⏱️ Activitat recent (últims ${Math.round(monthsAgo)} mesos)`);
        }
      }

      // D) Consultes i missatges relacionats (+10 pts)
      if (client.contacts.length > 0) {
        const carKeywords = car.model.toLowerCase().split(" ");
        const hasVehicleInquiry = client.contacts.some((m) => {
          const text = `${m.subject || ""} ${m.message || ""}`.toLowerCase();
          return carKeywords.some((kw) => kw.length > 3 && text.includes(kw));
        });

        if (hasVehicleInquiry) {
          score += 12;
          reasons.push(`💬 Va fer una consulta directa interessant-se pel ${car.model}`);
        } else {
          score += 6;
          reasons.push(`💬 Ha contactat recentment amb l'equip`);
        }
      }

      // Capped a 98%
      const finalScore = Math.min(Math.max(score, 10), 98);

      let affinityLabel: "Molt Alta" | "Alta" | "Mitjana" | "Bàsica" = "Bàsica";
      if (finalScore >= 80) affinityLabel = "Molt Alta";
      else if (finalScore >= 60) affinityLabel = "Alta";
      else if (finalScore >= 35) affinityLabel = "Mitjana";

      if (reasons.length === 0) {
        reasons.push("👤 Client registrat a la base de dades");
      }

      const personalizedMessage = buildPersonalizedPitch({
        clientName: client.name,
        eventName: targetEvent.name,
        eventDates,
        carModel: car.model,
        rate: rateForEvent,
        eventType: targetEvent.event_type,
      });

      evaluatedClients.push({
        customerId: client.customerId,
        name: client.name,
        phone: client.phone,
        score: finalScore,
        affinityLabel,
        reasons,
        stats: {
          totalBookings: client.bookings.length,
          sameCarBookings: sameCarCount,
          sameCategoryBookings: sameCategoryCount,
          sameEventTypeBookings: sameEventTypeCount,
          lastBookingDate,
        },
        personalizedMessage,
      });
    });

    // Ordenar de més alta probabilitat a més baixa
    evaluatedClients.sort((a, b) => b.score - a.score);

    return {
      car,
      isBooked: false,
      rateForEvent,
      topClients: evaluatedClients.slice(0, 6), // Top 6 recomanacions
    };
  });
}
