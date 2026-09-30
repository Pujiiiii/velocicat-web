import {ReactNode} from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import {supabase} from "../utils/supabase";
export default async function PageShell({children}:{children:ReactNode}){const {data}=await supabase.from("team_profile").select("*").limit(1).maybeSingle();return <><SiteHeader/><main>{children}</main><SiteFooter profile={data}/></>;}