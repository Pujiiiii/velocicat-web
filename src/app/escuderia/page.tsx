import PageShell from "../../components/PageShell";
import { supabase } from "../../utils/supabase";

export const revalidate = 60;

export default async function Page() {
  const [{ data: profile }, { data: team }] = await Promise.all([
    supabase.from("team_profile").select("*").limit(1).maybeSingle(),
    supabase.from("drivers").select("*").eq("published", true).order("name"),
  ]);

  return (
    <PageShell>
      <section className="relative overflow-hidden bg-gray-950 text-white">
        {profile?.hero_image && (
          <img
            src={profile.hero_image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/70 via-gray-950/80 to-gray-950" />
        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center">
          {profile?.logo_url && (
            <img
              src={profile.logo_url}
              alt={profile.name || "VelociCAT"}
              className="mx-auto mb-8 h-24 max-w-64 object-contain"
            />
          )}
          <p className="font-black uppercase tracking-[.3em] text-yellow-400">
            VELOCICAT RACING TEAM
          </p>
          <h1 className="mt-4 text-5xl font-black italic uppercase md:text-7xl">
            {profile?.name || "VelociCAT"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-300">
            {profile?.tagline || "Competició, precisió i passió pel rally."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-3xl">
          <p className="font-black uppercase tracking-[.25em] text-red-600">
            Una família
          </p>
          <h2 className="mt-2 text-4xl font-black uppercase italic md:text-5xl">
            Tothom que fa possible VelociCAT
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-700">
            Darrere de cada sortida hi ha molt més que un pilot. Som un equip:
            pilots, copilots, mecànics, coordinació i totes les persones que
            treballen perquè cada cotxe arribi a la sortida preparat.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(team || []).map((member: any) => (
            <div
              key={member.id}
              className="overflow-hidden rounded-2xl bg-gray-950 text-white shadow-xl"
            >
              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.name}
                  loading="lazy"
                  decoding="async"
                  className="h-72 w-full object-cover"
                />
              ) : (
                <div className="h-72 bg-gradient-to-br from-gray-800 to-gray-950" />
              )}
              <div className="p-6">
                <p className="text-sm font-black uppercase tracking-wider text-yellow-400">
                  {member.role || "Equip VelociCAT"}
                </p>
                <h3 className="mt-2 text-2xl font-black italic uppercase">
                  {member.name}
                </h3>
                {member.bio && (
                  <p className="mt-3 text-sm leading-6 text-gray-400">
                    {member.bio}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {(!team || team.length === 0) && (
          <div className="mt-10 rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
            <p className="font-bold text-gray-500">
              L'equip apareixerà aquí a mesura que es publiquin els seus membres des del CMS.
            </p>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <h2 className="text-4xl font-black uppercase italic">L'escuderia</h2>
        <p className="mt-8 whitespace-pre-line text-lg leading-8 text-gray-700">
          {profile?.story ||
            "Afegeix la història i filosofia de l'escuderia des del CMS."}
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            ["RALLY", "Competició i desenvolupament."],
            ["EQUIP", "Pilots, copilots, mecànics i tot l'equip."],
            ["PASSIÓ", "Una cultura construïda al voltant del crono."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl bg-gray-950 p-7 text-white">
              <b className="text-3xl text-yellow-400">{title}</b>
              <p className="mt-2 text-gray-300">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
