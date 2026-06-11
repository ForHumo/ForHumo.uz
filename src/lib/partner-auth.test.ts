import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import { authPartner } from "./partner-auth";

const KEY = "shk_current";
const OLD = "shk_old";

beforeAll(() => {
  process.env.SEVINCH_PARTNER_KEY = KEY;
  process.env.SEVINCH_PARTNER_KEY_OLD = OLD;
});

function req(headers: Record<string, string>) {
  return new Request("https://x/api/partner/sweet-id/resolve", { method: "POST", headers });
}
function sign(key: string, body: string, ts = Date.now()) {
  return { ts: String(ts), sig: createHmac("sha256", key).update(`${ts}.${body}`).digest("hex") };
}

describe("authPartner", () => {
  const body = '{"telegramId":"1"}';

  it("accepts a valid HMAC signature", () => {
    const { ts, sig } = sign(KEY, body);
    expect(authPartner(req({ "x-partner-timestamp": ts, "x-partner-signature": sig }), body)).toBe("sevinch");
  });

  it("rejects a tampered body (sig over different body)", () => {
    const { ts, sig } = sign(KEY, body);
    expect(authPartner(req({ "x-partner-timestamp": ts, "x-partner-signature": sig }), body + "x")).toBeNull();
  });

  it("rejects an expired timestamp", () => {
    const { ts, sig } = sign(KEY, body, Date.now() - 6 * 60 * 1000);
    expect(authPartner(req({ "x-partner-timestamp": ts, "x-partner-signature": sig }), body)).toBeNull();
  });

  it("accepts a valid Bearer key", () => {
    expect(authPartner(req({ authorization: `Bearer ${KEY}` }), body)).toBe("sevinch");
  });

  it("accepts the OLD key during rotation", () => {
    expect(authPartner(req({ authorization: `Bearer ${OLD}` }), body)).toBe("sevinch");
  });

  it("rejects no / wrong credentials", () => {
    expect(authPartner(req({}), body)).toBeNull();
    expect(authPartner(req({ authorization: "Bearer wrong" }), body)).toBeNull();
  });
});
