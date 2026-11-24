// @vitest-environment node
import { describe, expect, test } from "vitest";
import { emailDraft, emailFollowUp, facebookMessage, facebookFollowUp } from "../src/lib/outreach";
import { laterMonthWords, nextMondayWords } from "../src/lib/templates";
import { FACEBOOK_LINK_COUNT, pendingFacebookLinks } from "../src/lib/facebookLinks";

let n = 0;
function p(over: Record<string, unknown> = {}) {
  n++;
  return {
    _id: `id${n}`, _creationTime: 0, business: `Biz ${n}`, industry: "Plumbing", town: "Monroe", county: "Union County",
    fit: "Strong", sheetStatus: "Not contacted", dateSent: "", followUpDue: "", firstChannel: "", switchChannelOn: "",
    secondChannel: "", email: "", phone: "7045550000", facebook: "", website: "biz.com", builtWith: "Wix", whatToMention: "",
    googleRating: "5.0", reviews: "40", lastReview: "", sheetNotes: "", importKey: "", ownerName: "", conceptBuilt: false,
    conceptUrl: "", callNotes: "", callStatus: "new", attempts: 0, nextCallAt: 0, updatedAt: 0, ...over,
  } as any;
}
const now = new Date(2026, 10, 23, 8, 30); // Mon Nov 23, 2026

describe("message text", () => {
  test("facebook messages fit with or without a site and never link out", () => {
    const list = [
      p({ business: "Stanly One", county: "Stanly County", facebook: "https://facebook.com/one", industry: "HVAC" }),
      p({ business: "Cab One", county: "Cabarrus County", facebook: "https://facebook.com/cab1", industry: "HVAC", website: "", builtWith: "No website" }),
      p({ business: "Cab Two", county: "Cabarrus County", facebook: "https://facebook.com/cab2", industry: "Roofing" }),
      p({ business: "No link", county: "Cabarrus County", facebook: "Facebook page", industry: "Fencing" }),
      p({ business: "Union FB", facebook: "https://facebook.com/u" }),
      p({ business: "No messages", county: "Lancaster County", facebook: "https://facebook.com/x", sheetNotes: "Their Facebook page doesn't accept messages." }),
    ];
    const noSite = facebookMessage(list[1], now);
    expect(noSite).toMatch(/^Hey man, good morning! I'm Chris, a web designer over in Monroe\./);
    expect(noSite).toContain("I noticed you don't have a website yet");
    expect(noSite).toContain("let me show you a new homepage: what that could look like for you guys");
    expect(facebookMessage(list[2], now)).toContain("let me show you a homepage redesign:");
    expect(facebookMessage(list[4], now)).toContain("here in Monroe");
    expect(facebookFollowUp(list[2])).toContain("show you a homepage redesign for you guys");
    for (const x of list) expect(facebookMessage(x, now)).not.toMatch(/[—–]|https?:/);
  });

  test("first email fits with or without a site and never has dashes or unfilled fields", () => {
    const withSite = p({ business: "Harvey's Plumbing", ownerName: "Harvey Smith" });
    const noSite = p({ business: "Bob's Roofing", industry: "Roofing", website: "", builtWith: "No website" });

    const d = emailDraft(withSite, undefined, now);
    expect(d.subject).toBe("Harvey // Chris | Intro");
    expect(emailDraft(p({ business: "No Name Co" }), undefined, now).subject).toBe("No Name Co | Standing out online");
    expect(d.body).toMatch(/^Good morning Harvey,/);
    expect(d.body).toContain("Beyond Belief Web Design here in Monroe, where I work with local businesses a lot like yours");
    expect(d.body).toContain("show you what a homepage redesign could look like for Harvey's Plumbing, and walk through how it can bring you more business");
    expect(d.body).toContain("What does your availability look like next week?");
    expect(d.body).toContain("P.S.");
    expect(d.body).not.toContain("I also sent you");

    const b = emailDraft(noSite, undefined, now);
    expect(b.body).toMatch(/^Good morning,/);
    expect(b.body).toContain("with no money down");
    expect(b.body).toContain("show you what a homepage could look like for Bob's Roofing");

    for (const e of [d, b]) {
      expect(e.subject + e.body).not.toMatch(/[—–]/);
      expect(e.subject + e.body).not.toMatch(/\[[a-zA-Z]+\]|\{|\}/);
      expect(e.body).toContain("Chris Nervegna\nBeyond Belief Web Design");
    }
  });

  test("email follow-ups: value add by site, direct request, close the loop", () => {
    const a = p({ ownerName: "Harvey", sheetStatus: "Emailed" });
    const b = p({ website: "", builtWith: "No website", sheetStatus: "Email F1 sent" });
    expect(emailFollowUp(a, 1, undefined, now)).toContain("- More calls from the homepage:");
    expect(emailFollowUp(b, 1, undefined, now)).toContain("- Calls from a phone:");
    expect(emailFollowUp(b, 1, undefined, now)).not.toContain("More calls from the homepage");
    expect(emailFollowUp(a, 2, undefined, now)).toBe("Hi Harvey,\n\nPlease let me know your thoughts on a quick walkthrough when you have a moment.\n\nThanks,\nChris Nervegna\nBeyond Belief Web Design\n(980) 290-7034\n5107 Whisper Ridge Lane, Monroe, NC 28110");
    expect(emailFollowUp(a, 3, undefined, now)).toContain("or would January be better?");
    for (const step of [1, 2, 3] as const) expect(emailFollowUp(b, step, undefined, now)).not.toMatch(/[—–]/);

    expect(nextMondayWords(new Date(2026, 10, 20, 9))).toBe("November 23");
    expect(laterMonthWords(new Date(2026, 10, 20, 9))).toBe("January");

  });
});

describe("facebook link restore", () => {
  test("matches by county and name, ignores ones already restored", () => {
    const list = [
      p({ business: "King's Lawn & Landscape, LLC", facebook: "Facebook page" }),
      p({ business: "Rodriguez Roofing LLC", county: "Lancaster County", facebook: "Facebook page" }),
      p({ business: "Power Plumbing, LLC", facebook: "https://www.facebook.com/powerplumbingnc/" }),
      p({ business: "Lookout Pest Control", county: "Stanly County", facebook: "" }),
    ];
    const pending = pendingFacebookLinks(list);
    expect(pending.map((x) => x.url)).toEqual([
      "https://www.facebook.com/profile.php?id=61554934425802",
      "https://www.facebook.com/p/Rodriguez-Roofing-LLC-61582874124809/",
    ]);
    console.log("FB link total", FACEBOOK_LINK_COUNT);
  });
});
