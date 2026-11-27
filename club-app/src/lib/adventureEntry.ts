// Public QR/join intent selects display only, never household or entitlement.
export type AdventureSection = "home" | "bible" | "books" | "activities" | "trophies";
const destinations = new Set<AdventureSection>(["home","bible","books","activities","trophies"]);
export function parseAdventureEntry(pathname:string, search:string):{join:boolean;section:AdventureSection}{
  const join=pathname==="/join"||pathname==="/join/";
  if(!join)return {join:false,section:"home"};
  const value=new URLSearchParams(search).get("next")??"";
  return {join:true,section:destinations.has(value as AdventureSection)?value as AdventureSection:"home"};
}
export function adventureJoinUrl(origin:string, section:AdventureSection="books"){
  const url=new URL("/join",origin);
  url.searchParams.set("next",section);
  return url.toString();
}
