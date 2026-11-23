// Facebook page links that were hidden behind "Facebook page" link text in the old county sheets
// and didn't come through the import. Used once by the "Restore Facebook links" button on Today.
import type { Doc } from "../../convex/_generated/dataModel";
import { toUrl } from "./links";

const LINKS: Record<string, [string, string][]> = {
  "Union County": [
    ["Master Tech Plumbing", "https://www.facebook.com/MasterTechPlumbing"],
    ["Lowery Brothers Plumbing Company", "https://www.facebook.com/LoweryBrothersPlumbing/"],
    ["Power Plumbing, LLC", "https://www.facebook.com/powerplumbingnc/"],
    ["Roger Rooter Plumbing Service & Repair", "https://www.facebook.com/rogerrooterplumbing/"],
    ["All Good Plumbing, LLC", "https://www.facebook.com/profile.php?id=61572762476724"],
    ["RAM Electric Group, Inc", "https://www.facebook.com/1804143149621617"],
    ["Havana Electric Inc", "https://www.facebook.com/p/Havana-Electric-Inc-100077681605183/"],
    ["Stelco Electric LLC", "https://www.facebook.com/stelcoelectric/"],
    ["Matthew's Electrical Services LLC", "https://www.facebook.com/p/Matts-Electrical-Services-LLC-61575600821108/"],
    ["Arc Electric Company of Indian Trail Inc.", "https://www.facebook.com/people/ARC-Electric-Company-of-Indian-Trail-Inc/100065933132089/"],
    ["GB Electrical Services LLC", "https://www.facebook.com/GetTheBestElectric/"],
    ["Total Garage Works", "https://www.facebook.com/totalgarageworks/"],
    ["A Plus Garage Doors", "https://www.facebook.com/APlusDoorsNC/"],
    ["Neighborhood Garage Door", "https://www.facebook.com/neighborhoodgaragedoor/"],
    ["Garage Door and More", "https://www.facebook.com/GarageDoorMore/"],
    ["Mel's Tree Care (formerly Mandi's Tree Care)", "https://www.facebook.com/mandistreecare"],
    ["J.R. Morgan Tree Service, LLC", "https://www.facebook.com/jrmorgantreeservice"],
    ["Brothers Tree Service NC, LLC", "https://www.facebook.com/adalberto.carv/"],
    ["Bruno Tree Service LLC", "https://www.facebook.com/share/1BR7PdkPTp/"],
    ["Integrity Tree Care", "https://www.facebook.com/people/Integrity-Tree-Care-Inc/100081338877695/"],
    ["Axtraction Tree & Stump Grinding Service", "https://www.facebook.com/AxtractionTreeService/"],
    ["Queen City Tree Service", "https://www.facebook.com/QueenCityTreeServiceNC"],
    ["Apex Exterminating", "https://www.facebook.com/apexexterminatinginc"],
    ["Foremost Pest & Wildlife", "https://www.facebook.com/ForemostPestandWildlife/"],
    ["Tactical Pest and Termite Solutions", "https://www.facebook.com/tacticalpest"],
    ["Freedom Pest Services", "https://www.facebook.com/freedompestcontrolsc/"],
    ["Cardinal Environmental Solutions", "https://www.facebook.com/CardinalEnvironmentalSolutions"],
    ["Crown Pest Control", "https://www.facebook.com/crownpest1/"],
    ["Lookout Pest Control", "https://www.facebook.com/LookoutPestCharlotte/"],
    ["T&C Heating and Cooling", "https://www.facebook.com/110752991573281"],
    ["Home Town Heating and Air Conditioning", "https://www.facebook.com/hometownheatac/"],
    ["Next Hvac", "https://www.facebook.com/nexthvac/"],
    ["Air 72 HVAC", "https://www.facebook.com/air72andSolar"],
    ["Collins Comfort Solutions", "https://www.facebook.com/CollinsComfortNC/"],
    ["Longhorn Roofing Inc.", "https://www.facebook.com/162250647197559"],
    ["Old North Roofing & Sheet Metal, Inc.", "https://www.facebook.com/587865058220544"],
    ["Rumble Bee Roofing & Gutters", "https://www.facebook.com/RumbleBeeRoofing/"],
    ["McToolman Services LLC", "https://www.facebook.com/mctoolmanservices"],
    ["Jeff Freeman's Roofing Siding & Windows", "https://www.facebook.com/JeffFreemanRoofing/"],
    ["Shingles Roof Direct", "https://www.facebook.com/shinglesroofdirect/"],
    ["Carolina Elite Roofing", "https://facebook.com/carolinaeliteroofin"],
    ["Honeycutt Landscaping, Inc", "https://www.facebook.com/profile.php?id=100092252448509"],
    ["GreenView Lawn and Landscape", "http://facebook.com/greenviewlawncare"],
    ["Valhalla Lawnscapes", "https://facebook.com/profile.php?id=61561937861843"],
    ["Performance Lawn & Landscape", "https://www.facebook.com/PerformanceLawnLandscape"],
    ["King’s Lawn & Landscape, LLC", "https://www.facebook.com/profile.php?id=61554934425802"],
    ["Signature Lawn And Landscape", "https://www.facebook.com/people/Signature-Lawn-and-Landscape/61578097536728/"],
    ["Legacy Turf Care", "https://www.facebook.com/LEGACYTURFCARE/"],
    ["RK Preferred Landscaping", "https://www.facebook.com/rkpreferredlandscaping"],
    ["AG Professional Painting", "https://www.facebook.com/agprofessionalpaint/"],
    ["Anthony Meggs Painting LLC", "https://www.facebook.com/Anthony-M-Meggs-Painting-232389636929767"],
    ["Paint America", "https://www.facebook.com/profile.php?id=61550800652997"],
    ["Standard Painting & Maintenance", "https://www.facebook.com/standardpainting/"],
    ["Mk Fence LLC", "https://www.facebook.com/mk.fence.7"],
    ["Trinity Fence and Gate Inc.", "https://www.facebook.com/857868574083814"],
    ["Legacy Fence Company LLC", "https://www.facebook.com/pages/Waxhaw-NC/Legacy-Fence-Company/102896153100451"],
    ["Solis Fencing INC", "https://facebook.com/SolisFencingINC"],
    ["FenceItForU", "https://www.facebook.com/fenceitforucharlotte/"],
  ],
  "Cabarrus County": [
    ["Providence Plumbing & Restoration", "https://www.facebook.com/provplumbing/"],
    ["Sustainable Plumbing of NC", "https://www.facebook.com/SustainablePlumbingNC"],
    ["Service Pro Plumbing", "https://www.facebook.com/serviceproplumbingllc"],
    ["Three Way Plumbing", "https://www.facebook.com/3wayplumbing/"],
    ["JD Hall Electric", "https://www.facebook.com/101259104669847"],
    ["Family Electric LLC", "https://www.facebook.com/FAMthebetteroption/"],
    ["Halion Electric", "https://facebook.com/Halionelectric/"],
    ["Biggs Electrical", "http://www.facebook.com/biggselectrical/"],
    ["Mullis Garage Doors", "https://www.facebook.com/profile.php?id=100089388886016"],
    ["JTH Garage Doors", "https://www.facebook.com/JTH-Garage-Doors-984097551978781"],
    ["Pro One Garage Doors", "http://www.facebook.com/pro1garagedoorsnc"],
    ["Tip Top Garage Doors", "https://www.facebook.com/tiptopgaragedoors.charlotte.nc"],
    ["Hi Tree Service", "https://www.facebook.com/hitreeservice"],
    ["Carmona's Tree Services.", "https://www.facebook.com/people/Carmonas-Tree-Service/100063850689033/"],
    ["Hinson Tree Service", "https://facebook.com/hinsontreeservice"],
    ["Sidden Tree Service", "https://www.facebook.com/siddentreeservice"],
    ["Acme Pest Control Co Inc", "https://facebook.com/AcmePestControl"],
    ["Wise Pest Solutions", "https://www.facebook.com/profile.php?id=100091004345321"],
    ["Clint Miller Exterminating Inc", "https://www.facebook.com/clintmillerext"],
    ["City Wide Exterminating", "https://www.facebook.com/CityWideExterminating"],
    ["Concord Heating & Air Conditioning Inc.", "https://facebook.com/Concordheatingandac"],
    ["All Temp Co. Air Conditioning and Heating", "https://www.facebook.com/AllTempCoInc/"],
    ["Carolina Restoration Pro", "https://www.facebook.com/profile.php?id=61596556885990"],
    ["ROOF LIFE", "https://www.facebook.com/Rooflifenc"],
    ["JW Services Inc of NC", "https://www.facebook.com/jwconcordroofing/"],
    ["Dry Sky Roofing", "https://www.facebook.com/DrySkyRoofing/"],
    ["Ready Roofing", "https://www.facebook.com/readyroofingco"],
    ["The Groundsmen Landscaping", "https://www.facebook.com/thegroundsmenlandscaping/"],
    ["Colin Cutz and Landscaping", "https://www.facebook.com/ColinCutz/"],
    ["Carolina Turf Lawn and Landscape", "https://www.facebook.com/carolinasturf/"],
    ["Sunrise Painting Pros", "https://www.facebook.com/sunrisepaintingpros"],
    ["DJO HOME PAINTING", "https://www.facebook.com/DJOHomePainting/"],
    ["A & M Fence Solutions", "https://www.facebook.com/amfencesolutions"],
    ["JM Fence Crafters", "https://facebook.com/jmfencecrafters"],
  ],
  "Lancaster County": [
    ["Hinson Brothers Plumbing", "https://www.facebook.com/hinsonbrothersplumbing"],
    ["Cooper's Plumbing", "https://www.facebook.com/callcoopersplumbing"],
    ["Carter Quality Plumbing LLC", "https://www.facebook.com/CQPlumbing/"],
    ["Best Rate Plumbing", "https://www.facebook.com/bestrateplumbingcompany/"],
    ["Sabo Electric, Heating, & Air LLC", "https://www.facebook.com/saboelectricllc/"],
    ["Snipes Electrical Services", "https://www.facebook.com/p/Snipes-Electrical-Heating-Cooling-LLC-100059304504761/"],
    ["WTC Electric", "https://www.facebook.com/wtcelectricinc/"],
    ["PW Tree Service LLC", "https://www.facebook.com/p/PW-Tree-Service-LLC-100063532450464/"],
    ["CBC Lawn and Tree, LLC", "https://www.facebook.com/CBCLawnandTree/"],
    ["Top Notch Pest Defense", "https://www.facebook.com/topnotchpestdefense"],
    ["RPC Rollins Pest Control", "https://facebook.com/Rollins-Pest-Control-Inc-197654923596933/"],
    ["ProCore Pest Control", "https://www.facebook.com/procorepestcontrol/"],
    ["Hubbard Heating & Cooling", "https://www.facebook.com/hubbardcooling/"],
    ["Kevin Robinson's Heating and Cooling", "https://www.facebook.com/krobinsonhvac/"],
    ["Rodríguez Roofing Llc", "https://www.facebook.com/p/Rodriguez-Roofing-LLC-61582874124809/"],
    ["J Nissi Group Inc", "https://www.facebook.com/jnissigroupinc"],
    ["Advanced Roofing and Exteriors", "https://www.facebook.com/AdvancedRoofingandExteriors"],
    ["Super Roofing Company", "https://www.facebook.com/superroofingcompany"],
    ["H & S Roofing Co Inc", "https://www.facebook.com/HSroofingCLT"],
    ["Rivera’s Landscaping & Lawn care LLC", "https://www.facebook.com/p/Riveras-Landscaping-Lawncare-LLC-100063622508778/"],
    ["Aguilera’s lawn care", "https://www.facebook.com/p/Aguileras-lawn-care-100072166511894/"],
    ["Precision Turf and Irrigation", "https://www.facebook.com/p/Precision-Turf-Irrigation-LLC-100033197097001/"],
    ["R & B Lawn Care", "https://www.facebook.com/RBLawncarefortmill/"],
    ["StrongSkill Home Solutions LLC", "https://www.facebook.com/profile.php?id=61588242935824"],
    ["Southlands Fence - Charlotte, NC", "https://www.facebook.com/southlandsfence"],
    ["DC Fence Pros", "https://www.facebook.com/dcfencepros"],
  ],
};

export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Prospects whose Facebook field is still link text and that have a saved link to restore. */
export function pendingFacebookLinks(prospects: Doc<"prospects">[]): { id: Doc<"prospects">["_id"]; url: string }[] {
  const lookup = new Map<string, string>();
  for (const [county, rows] of Object.entries(LINKS)) {
    for (const [name, url] of rows) lookup.set(`${county}|${nameKey(name)}`, url);
  }
  const out: { id: Doc<"prospects">["_id"]; url: string }[] = [];
  for (const p of prospects) {
    if (toUrl(p.facebook)) continue;
    const url = lookup.get(`${p.county}|${nameKey(p.business)}`);
    if (url) out.push({ id: p._id, url });
  }
  return out;
}

export const FACEBOOK_LINK_COUNT = Object.values(LINKS).reduce((n, rows) => n + rows.length, 0);
