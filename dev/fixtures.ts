// Sample data for `vite --mode mock`. Rows copied from the Union County prospect sheet.
const base = {
  _creationTime: 0, followUpDue: "", switchChannelOn: "", secondChannel: "", importKey: "", conceptUrl: "", callNotes: "",
  callStatus: "new", attempts: 0, nextCallAt: 0, updatedAt: 0, county: "Union County", facebook: "", lastReview: "Nov 2026",
};
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toLocaleDateString("en-CA");
const now = Date.now();

export const fixtures = {
  prospects: [
    { ...base, _id: "p1", business: "Harvey's Plumbing", industry: "Plumbing", town: "Waxhaw", fit: "Strong", sheetStatus: "Email F1 sent", dateSent: "Nov 17, 2026", followUpDue: "Nov 23, 2026", switchChannelOn: "Dec 1, 2026", firstChannel: "Email", email: "harvey7w@aol.com", phone: "(704) 843-4783", website: "harveysplumbingnc.com", builtWith: "Weebly", whatToMention: "Free Weebly site, about 120 words: town names and keywords run together, with a Weebly ad at the bottom. It does load over HTTPS.", googleRating: "5.0", reviews: "49", sheetNotes: "Email drafted in the outreach doc (Harvey's Plumbing tab). Rechecked Nov 17: the site has SSL, so the old Not secure note was wrong.\nNov 17, 2026: Email sent. email 1A", ownerName: "Harvey", conceptBuilt: true, conceptUrl: "harveys-plumbing-concept.netlify.app", attempts: 1, callStatus: "calling" },
    { ...base, _id: "p2", business: "Master Tech Plumbing", industry: "Plumbing", town: "Monroe", fit: "Strong", sheetStatus: "Not contacted", dateSent: "", firstChannel: "", email: "", phone: "(704) 776-4922", website: "mastertechplumber.com", builtWith: "Site broken", whatToMention: "The website on their Google listing (mastertechplumber.com) won't load.", googleRating: "5.0", reviews: "34", sheetNotes: "Facebook page has no email listed (checked Nov 17).", ownerName: "", conceptBuilt: true },
    { ...base, _id: "p3", business: "Boatwright Electric Co", industry: "Electrical", town: "Indian Trail", fit: "Strong", sheetStatus: "Not contacted", dateSent: "", firstChannel: "", email: "", phone: "(704) 557-5799", website: "", builtWith: "No website", whatToMention: "No website on their Google listing.", googleRating: "5.0", reviews: "25", sheetNotes: "", ownerName: "", conceptBuilt: false },
    { ...base, _id: "p4", business: "Waxhaw Electric", industry: "Electrical", town: "Waxhaw", fit: "Strong", sheetStatus: "Emailed", dateSent: "Nov 18, 2026", firstChannel: "Email", email: "wax1954@aol.com", phone: "(704) 843-5495", website: "waxhawelectric.com", builtWith: "Custom (older HTML)", whatToMention: "Very old site: copyright 2013 and no SSL (Not secure).", googleRating: "5.0", reviews: "6", sheetNotes: "Email sent Nov 18.", ownerName: "", conceptBuilt: false },
    { ...base, _id: "p5", business: "Lowery Brothers Plumbing Company", industry: "Plumbing", town: "Waxhaw", fit: "Strong", sheetStatus: "Emailed", dateSent: "Nov 18, 2026", firstChannel: "Email", followUpDue: "Nov 25, 2026", switchChannelOn: "Dec 2, 2026", facebook: "https://www.facebook.com/lowerybrothersplumbing", conceptUrl: "lowery-brothers-concept.netlify.app", attempts: 2, lastCalledAt: Date.now() - 2 * 86400000, lastOutcome: "booked", email: "lowerybrothersplumbing@gmail.com", phone: "(704) 243-1149", website: "lowerybrothersplumbingcompany.com", builtWith: "Wix", whatToMention: "Wix site. Footer copyright still says 2020.", googleRating: "5.0", reviews: "75", sheetNotes: "Email sent Nov 18.", ownerName: "Mike Lowery", conceptBuilt: true, callStatus: "booked" },
    { ...base, _id: "p6", business: "Gentry Plumbing and Home Services, LLC", industry: "Plumbing", town: "Kannapolis", county: "Cabarrus County", fit: "Strong", sheetStatus: "Not contacted", dateSent: "", firstChannel: "", email: "gentryplumbingandhomeservices@outlook.com", phone: "(704) 840-5007", website: "ndg455.wixsite.com/website", builtWith: "Wix (free)", whatToMention: "Free Wix subdomain with a 2021 footer and about 290 words.", googleRating: "4.9", reviews: "37", sheetNotes: "", ownerName: "", conceptBuilt: false },
    { ...base, _id: "p7", business: "Elite Plumbing of the Carolinas", industry: "Plumbing", town: "Charlotte area", fit: "Strong", sheetStatus: "Emailed", dateSent: "Nov 13, 2026", followUpDue: "Nov 20, 2026", switchChannelOn: "Nov 27, 2026", firstChannel: "Email", email: "leo.r@epcarolinas.com", phone: "(704) 776-8280", website: "epcarolinas.com", builtWith: "Wix", whatToMention: "Wix site with about 380 words. No service area, reviews or licensing listed.", googleRating: "", reviews: "", sheetNotes: "", ownerName: "", conceptBuilt: false },
    { ...base, _id: "p8", business: "Hinson Brothers Plumbing", industry: "Plumbing", town: "Lancaster", county: "Lancaster County", fit: "Good", sheetStatus: "Messaged on Facebook", dateSent: "Nov 6, 2026", followUpDue: "Nov 13, 2026", switchChannelOn: "Nov 20, 2026", firstChannel: "Facebook", email: "hinsonbrothersplumbing@gmail.com", phone: "(803) 285-4961", facebook: "Facebook page", website: "hinsonbrothersplumbingllc.com", builtWith: "Duda", whatToMention: "Page title has no town.", googleRating: "4.9", reviews: "233", sheetNotes: "Facebook message sent Nov 6, template B.", ownerName: "", conceptBuilt: false },
    { ...base, _id: "p9", business: "Sustainable Plumbing of NC", industry: "Plumbing", town: "Concord", county: "Cabarrus County", fit: "Strong", sheetStatus: "Not contacted", dateSent: "", firstChannel: "", email: "", phone: "(704) 555-0101", facebook: "https://www.facebook.com/SustainablePlumbingNC", website: "sustainableplumbingnc.com", builtWith: "WordPress", whatToMention: "Thin homepage.", googleRating: "4.8", reviews: "61", sheetNotes: "", ownerName: "", conceptBuilt: false },
    { ...base, _id: "p10", business: "Halion Electric", industry: "Electrical", town: "Concord", county: "Cabarrus County", fit: "Good", sheetStatus: "Not contacted", dateSent: "", firstChannel: "", email: "info@halion.com", phone: "(704) 555-0102", facebook: "https://facebook.com/Halionelectric/", website: "", builtWith: "No website", whatToMention: "No website on their Google listing.", googleRating: "5.0", reviews: "18", sheetNotes: "", ownerName: "", conceptBuilt: false },
    { ...base, _id: "p11", business: "Power Plumbing, LLC", industry: "Plumbing", town: "Waxhaw", fit: "Good", sheetStatus: "Not contacted", dateSent: "", firstChannel: "", email: "powerplumbingnc@gmail.com", phone: "(704) 256-4853", facebook: "Facebook page", website: "powerplumbingnc.com", builtWith: "Weebly", whatToMention: "Weebly site with a keyword-stuffed page title.", googleRating: "5.0", reviews: "62", sheetNotes: "", ownerName: "", conceptBuilt: false },
  ] as any[],
  calls: [
    { _id: "c1", prospectId: "p1", outcome: "no_answer", note: "", at: now - 86400000, day: day(-1) },
    {
      _id: "c0", prospectId: "p1", outcome: "callback", note: "", at: now - 2 * 86400000, day: day(-2), reviewStatus: "done", durationSec: 128,
      transcript: [
        { who: "me", start: 0, text: "Hey Harvey, this is Chris calling from Beyond Belief Web Design, how's it going?" },
        { who: "them", start: 4, text: "Doing alright, kind of in the middle of something. What's this about?" },
        { who: "me", start: 8, text: "I'm a web designer right here in Monroe and I help local businesses maybe get more calls from Google and AI search." },
        { who: "them", start: 18, text: "I'm on a job right now. Call me after four." },
      ],
      review: {
        summary: "Harvey was on a job and asked for a call back after 4. Chris got through the opener and set a callback.",
        notes: ["Owner is Harvey.", "Best reached after 4 pm."],
        nextStep: "Call Harvey back today after 4 pm and go straight to the ask.",
        score: 6,
        grades: [
          { area: "Opener", score: 4, note: "Clean and friendly." },
          { area: "Why them (relevance)", score: 3, note: "Generic. Mention his site or his town." },
          { area: "The ask", score: null, note: "Didn't come up, he asked for a callback first." },
          { area: "Objection handling", score: 4, note: "Took the bad-time cue without pitching." },
          { area: "Listening", score: 4, note: "Let him talk." },
          { area: "Confidence", score: 2, note: "Hedged with \"maybe\"." },
        ],
        wentWell: ["You didn't pitch when he said it was a bad time.", "You got a specific callback window."],
        fixes: [{ said: "maybe get more calls", better: "I help local businesses get more calls from Google and AI search.", why: "Hedges make the offer sound unsure." }],
        myShare: 58,
        fillers: { maybe: 1 },
      },
    },
    ...Array.from({ length: 6 }, (_, i) => ({ _id: `t${i}`, prospectId: "px", outcome: i === 2 ? "front_desk" : i === 4 ? "not_now" : "no_answer", note: "", at: now - i * 600000, day: day(0) })),
    ...Array.from({ length: 15 }, (_, i) => ({ _id: `y${i}`, prospectId: "px", outcome: i === 3 ? "booked" : i % 4 === 0 ? "callback" : "voicemail", note: "", at: now - 86400000, day: day(-1) })),
  ] as any[],
  touches: [
    { _id: "t1", prospectId: "p1", at: now - 3 * 86400000 + 3600000, channel: "Email", kind: "followup", step: 1 },
    { _id: "t2", prospectId: "p5", at: now - 2 * 86400000, channel: "Facebook", kind: "switch", note: "" },
  ],
  meetings: [
    { _id: "m1", _creationTime: 0, prospectId: "p5", startsAt: new Date(new Date(now + 86400000).setHours(14, 0, 0, 0)).getTime(), durationMin: 15, format: "video", email: "lowerybrothersplumbing@gmail.com", inviteSent: true, accepted: false, prepCallDone: false, status: "scheduled", note: "", createdAt: now },
  ] as any[],
};
