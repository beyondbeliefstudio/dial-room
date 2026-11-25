// @vitest-environment node
import { describe, expect, test } from "vitest";
import { parseTsv, toSheetRows } from "../src/lib/tsv";
import { autoScript, buildScript, fill, objections, scriptVars } from "../src/lib/script";
import { DEFAULT_SCRIPTS, makeLibrary } from "../src/lib/scriptDefaults";
import { renderPlain, buildVars } from "../src/lib/templates";
const OBJECTIONS = objections();
import { nextBusinessDays, sinceWords, ymd, googleCalendarUrl } from "../src/lib/dates";
import { byDay, streak } from "../src/lib/stats";

const header = ["Business","Industry","Town","Fit","Status","Date sent","Follow-up due","First channel","Switch channel on","Second channel","Email","Phone","Facebook","Website","Built with","What to mention","Google rating","Reviews","Last review","Notes"].join("\t");

describe("paste parsing", () => {
  test("handles quoted multi-line cells and doubled quotes", () => {
    const rows = parseTsv('a\t"line one\nline two"\tc\n"say ""hi"""\tb\t\n');
    expect(rows).toEqual([["a", "line one\nline two", "c"], ['say "hi"', "b", ""]]);
  });

  test("maps the county sheet headers, skips repeated headers and blank rows", () => {
    const row1 = ["Harvey's Plumbing","Plumbing","Waxhaw","Strong","Emailed","Nov 17, 2026","Nov 24, 2026","Email","Dec 1, 2026","","harvey7w@aol.com","(704) 843-4783","Linked on their site","harveysplumbingnc.com","Weebly","Free Weebly site","5.0","49","Nov 2026","Email drafted"].join("\t");
    const row2 = ["Boatwright Electric Co","Electrical","Indian Trail","Strong","Not contacted","","","","","","","(704) 557-5799","","","No website","No website on their Google listing.","5.0","25","Nov 2025"].join("\t");
    const r = toSheetRows([header, row1, "", header, row2, "\t\t"].join("\n"));
    expect(r.headerFound).toBe(true);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ business: "Harvey's Plumbing", sheetStatus: "Emailed", phone: "(704) 843-4783", sheetNotes: "Email drafted" });
    expect(r.rows[1]).toMatchObject({ business: "Boatwright Electric Co", builtWith: "No website", sheetNotes: "" });
    const noHeader = toSheetRows(row2);
    expect(noHeader.headerFound).toBe(false);
    expect(noHeader.rows[0].phone).toBe("(704) 557-5799");
  });
});

function prospect(over: Record<string, unknown> = {}) {
  return {
    _id: "x", _creationTime: 0, business: "Harvey's Plumbing", industry: "Plumbing", town: "Waxhaw", county: "Union County",
    fit: "Strong", sheetStatus: "Emailed", dateSent: "Nov 17, 2026", followUpDue: "", firstChannel: "Email", switchChannelOn: "",
    secondChannel: "", email: "harvey7w@aol.com", phone: "(704) 843-4783", facebook: "", website: "harveysplumbingnc.com",
    builtWith: "Weebly", whatToMention: "Free Weebly site", googleRating: "5.0", reviews: "49", lastReview: "", sheetNotes: "",
    importKey: "", ownerName: "", conceptBuilt: true, conceptUrl: "", callNotes: "", callStatus: "new", attempts: 0,
    nextCallAt: 0, updatedAt: 0, ...over,
  } as any;
}

describe("scripts", () => {
  test("picks the script from prior touch only", () => {
    expect(autoScript(prospect())).toBe("followup");
    expect(autoScript(prospect({ sheetStatus: "Not contacted", dateSent: "" }))).toBe("cold");
    expect(autoScript(prospect({ conceptBuilt: false }))).toBe("followup");
    expect(autoScript(prospect({ conceptBuilt: false, sheetStatus: "Not contacted", dateSent: "" }))).toBe("cold");
  });

  test("no script claims you already work with their trade in their county", () => {
    for (const s of DEFAULT_SCRIPTS) {
      for (const t of [s.body, s.body2 ?? "", s.subject ?? ""]) {
        // Naming their trade is fine ("comparing three or four roofers"); claiming you work with it isn't
        expect(t).not.toMatch(/(work|working|specialize|partner) with (local )?\{trade\}|\{trade\} (in|across) \{(county|area|town)\}/i);
      }
    }
    const v = scriptVars(prospect(), new Date(2026, 10, 23, 9));
    const opener = buildScript("cold", prospect(), new Date(2026, 10, 23, 9))
      .map((l) => ("segs" in l ? l.segs.map((s) => s.text).join("") : l.text))
      .join("\n");
    expect(opener).toContain("Hey [Name], this is Chris calling from Beyond Belief Web Design, how's it going?");
    expect(opener).toContain("Good! I'm reaching out because I'm a web designer right here in Monroe that works with local businesses like yours across the Charlotte area.");
    expect(opener).toContain(`when someone's comparing three or four ${v.trade} online`);
  });

  test("the follow-up and cold scripts are identical except the line about what you sent", () => {
    const at = new Date(2026, 10, 23, 9);
    const say = (id: "followup" | "cold", p: Parameters<typeof buildScript>[1]) =>
      buildScript(id, p, at).map((l) => ("segs" in l ? l.segs.map((s) => s.text).join("") : l.text));
    for (const p of [prospect(), prospect({ website: "", builtWith: "No website" })]) {
      const follow = say("followup", p);
      const cold = say("cold", p);
      expect(follow.length).toBe(cold.length);
      const diff = follow.filter((line, i) => line !== cold[i]);
      expect(diff).toEqual([follow[2]]);
      expect(follow[2]).toBe(cold[2].replace("Good! ", `Good! I sent you an email ${scriptVars(p, at).since}. `));
    }
  });

  test("call openers: who, why, what in about 20 seconds, design-first, two mornings, no permission asks", () => {
    for (const id of ["cold", "followup"] as const) {
      for (const p of [prospect(), prospect({ website: "", builtWith: "No website" })]) {
        const text = buildScript(id, p, new Date(2026, 10, 23, 9))
          .map((l) => ("segs" in l ? l.segs.map((s) => s.text).join("") : l.text))
          .join("\n");
        expect(text).toContain("I'm a web designer right here in Monroe");
        expect(text).toContain("And when someone's comparing three or four plumbing companies online, they almost always call the one that looks the most trustworthy. That's what I fix. I design a custom site that makes you the obvious pick, and then I handle all of it, so you never have to touch it again.");
        expect(text).toMatch(/Fifteen minutes, nothing to prep\. Does \w+ or \w+ morning work better\?$/);
        expect(text).not.toMatch(/Google|ChatGPT|Gemini|AI search|rank/);
        expect(text).not.toMatch(/30 seconds|can I take|would you be open|bad time|is that okay|if that's alright/i);
      }
    }
  });

  test("no script ever claims the homepage is already built, and every one asks for the walkthrough", () => {
    for (const s of DEFAULT_SCRIPTS.filter((d) => d.category !== "other")) {
      for (const t of [s.body, s.body2 ?? "", s.note ?? ""]) {
        expect(t).not.toMatch(/already (built|done)|built out|I built|went ahead|put together a (new )?homepage|screen recording|homepage I designed/i);
      }
    }
    const text = (id: "followup" | "cold") =>
      buildScript(id, prospect({ ownerName: "Harvey" }), new Date(2026, 10, 23, 9))
        .map((l) => ("segs" in l ? l.segs.map((s) => s.text).join("") : l.text))
        .join("\n");
    for (const id of ["followup", "cold"] as const) {
      expect(text(id)).toContain(
        "I'd love to show you what that could look like for Harvey's Plumbing. Fifteen minutes, nothing to prep. Does tomorrow or Wednesday morning work better?",
      );
    }
  });

  test("fills everything but the owner name, and skips Thanksgiving", () => {
    const wed = new Date(2026, 10, 25, 9); // Wed Nov 25, 2026
    const v = scriptVars(prospect(), wed);
    expect(v.day1).toBe("Monday");
    expect(v.day2).toBe("Tuesday");
    expect(v.window).toBe("Monday or later in the week");
    expect(v.channel).toBe("email");
    expect(v.since).toBe("last week"); // 8 days before Nov 25
    expect(v.monroe).toBe("right here in Monroe");
    expect(v.trade).toBe("plumbing companies");
    for (const id of ["followup", "cold", "quick"] as const) {
      const lines = buildScript(id, prospect(), wed);
      const missing = lines.flatMap((l) => ("segs" in l ? l.segs.filter((s) => s.missing).map((s) => s.text) : []));
      // Both scripts open with the owner's name (flagged until known)
      expect(new Set(missing)).toEqual(new Set(["[Name]"]));
    }
    const named = buildScript("followup", prospect({ ownerName: "Harvey Smith" }), wed);
    expect(named[0].kind === "say" && named[0].segs.map((s) => s.text).join("")).toBe(
      "Hey Harvey, this is Chris calling from Beyond Belief Web Design, how's it going?",
    );
    for (const o of OBJECTIONS) {
      for (const t of [o.body, o.body2 ?? "", o.note ?? ""]) expect(fill(t, v).some((s) => s.missing)).toBe(false);
    }
  });

  test("tomorrow wording on a normal weekday, other counties get 'down the road'", () => {
    const mon = new Date(2026, 10, 30, 9);
    const v = scriptVars(prospect({ county: "Cabarrus County" }), mon);
    expect(v.day1Ask).toBe("tomorrow afternoon");
    expect(v.window).toBe("tomorrow or later this week");
    expect(v.monroe).toBe("just down the road in Monroe");
  });

  test("no em dashes anywhere in the scripts", () => {
    const all = [
      ...(["followup", "cold"] as const).flatMap((id) => buildScript(id, prospect())),
    ].map((l) => ("segs" in l ? l.segs.map((s) => s.text).join("") : l.text));
    const objs = DEFAULT_SCRIPTS.flatMap((o) => [o.title, o.subject ?? "", o.body, o.body2 ?? "", o.note ?? ""]);
    for (const t of [...all, ...objs]) expect(t).not.toMatch(/[—–]/);
  });
});

describe("editable scripts", () => {
  test("saved edits override defaults, conditions pick the right lines", () => {
    const lib = makeLibrary([
      { key: "facebook.first", category: "facebook", title: "First message", body: "{if:union} Yo {business}, here in Monroe\n{if:!union} Yo {business}, over in Monroe", order: 1 },
      { key: "facebook.A", category: "facebook", title: "Old template A", body: "Retired", order: 1 },
    ]);
    const { vars, flags } = buildVars(prospect({ county: "Cabarrus County" }));
    expect(renderPlain(lib.get("facebook.first").body, vars, flags)).toBe("Yo Harvey's Plumbing, over in Monroe");
    expect(lib.get("facebook.followup").title).toBe("Follow-up");
    // Saved edits to scripts that were retired don't come back
    expect(lib.list("facebook").map((x) => x.key)).toEqual(["facebook.first", "facebook.followup"]);
    const custom = makeLibrary([{ key: "custom.objection.x", category: "objection", title: "Bad experience", body: "Hmm", order: 9, custom: true }]);
    expect(custom.list("objection").map((o) => o.title).at(-1)).toBe("Bad experience");
    expect(custom.list("objection")).toHaveLength(16);
  });
});

describe("links", () => {
  test("turns sheet text into URLs only when it is one", async () => {
    const { toUrl, emails, prettyUrl } = await import("../src/lib/links");
    expect(toUrl("harveysplumbingnc.com")).toBe("https://harveysplumbingnc.com");
    expect(toUrl("kozmogaragedoors.com/locations/waxhaw-nc")).toBe("https://kozmogaragedoors.com/locations/waxhaw-nc");
    expect(toUrl("https://www.facebook.com/deesdraincleaning/")).toBe("https://www.facebook.com/deesdraincleaning/");
    expect(toUrl("Facebook page")).toBe("");
    expect(toUrl("Linked on their site")).toBe("");
    expect(toUrl("")).toBe("");
    expect(emails("leo.r@epcarolinas.com, amber@epcarolinas.com")).toEqual(["leo.r@epcarolinas.com", "amber@epcarolinas.com"]);
    expect(prettyUrl("https://www.facebook.com/deesdraincleaning/")).toBe("facebook.com/deesdraincleaning");
  });
});

describe("dates and stats", () => {
  test("business days skip weekends and holidays", () => {
    const days = nextBusinessDays(new Date(2026, 10, 24, 12), 3).map(ymd);
    expect(days).toEqual(["2026-11-25", "2026-11-30", "2026-12-01"]);
  });
  test("since words", () => {
    const now = new Date(2026, 10, 20);
    expect(sinceWords("Nov 17, 2026", now)).toBe("the other day");
    expect(sinceWords("Nov 10, 2026", now)).toBe("last week");
    expect(sinceWords("", now)).toBe("a little while back");
  });
  test("calendar link includes the guest", () => {
    const url = googleCalendarUrl({ title: "T", startsAt: new Date(2026, 11, 1, 14).getTime(), durationMin: 15, details: "D", location: "L", guest: "a@b.com" });
    expect(url).toContain("add=a%40b.com");
    expect(url).toContain("dates=20261201T140000%2F20261201T141500");
  });
  test("streak skips weekends", () => {
    const calls = [
      ...Array(3).fill({ outcome: "no_answer", at: 0, day: "2026-11-20" }), // Fri
      ...Array(3).fill({ outcome: "booked", at: 0, day: "2026-11-23" }), // Mon
    ];
    const days = byDay(calls);
    expect(days.get("2026-11-23")?.booked).toBe(3);
    expect(streak(days, 3, new Date(2026, 10, 23, 18))).toBe(2);
  });
});

describe("objections", () => {
  test("every first answer goes back to the calendar, and none quote a price", () => {
    for (const o of OBJECTIONS.filter((x) => x.key !== "objection.bad-time")) {
      for (const line of o.body.split("\n")) expect(line.trim(), o.title).toMatch(/What's your calendar like \{day1\} or \{day2\}\?$/);
      expect(o.body, o.title).not.toMatch(/\$\d/);
    }
  });

  test("no rebuttal asks permission for time", () => {
    for (const o of OBJECTIONS) for (const t of [o.body, o.body2 ?? ""]) expect(t).not.toMatch(/30 seconds|can I take|would you be open/i);
  });
});

describe("spoken business names", () => {
  test("drops legal suffixes and asides you wouldn't say out loud", async () => {
    const { spokenBusiness } = await import("../src/lib/templates");
    expect(spokenBusiness("McToolman Services LLC")).toBe("McToolman Services");
    expect(spokenBusiness("J.R. Morgan Tree Service, LLC")).toBe("J.R. Morgan Tree Service");
    expect(spokenBusiness("Mel's Tree Care (formerly Mandi's Tree Care)")).toBe("Mel's Tree Care");
    expect(spokenBusiness("Southlands Fence - Charlotte, NC")).toBe("Southlands Fence");
    expect(spokenBusiness("Boatwright Electric Co")).toBe("Boatwright Electric");
    expect(spokenBusiness("Harvey's Plumbing")).toBe("Harvey's Plumbing");
  });
});
