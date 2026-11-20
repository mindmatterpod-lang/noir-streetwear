import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
process.on("uncaughtException", (e) => {
  console.log("ERROR:", e.message);
  process.exit(2);
});
const R = new URL("../", import.meta.url).pathname;
const db = new PGlite();
const run = (sql) => db.exec(sql);
await run(`
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid primary key default gen_random_uuid());
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text primary key, name text, public boolean);
CREATE TABLE storage.objects(id uuid default gen_random_uuid(), bucket_id text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role; GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
`);
for (const f of fs.readdirSync(R + "supabase/migrations").sort())
  await run(fs.readFileSync(R + "supabase/migrations/" + f, "utf8"));
await run(fs.readFileSync(R + "docs/shopify-parity.sql", "utf8"));
await run(fs.readFileSync(R + "docs/pakistan-pkr.sql", "utf8"));
// idempotency: running both files again must not error
await run(fs.readFileSync(R + "docs/shopify-parity.sql", "utf8"));
await run(fs.readFileSync(R + "docs/pakistan-pkr.sql", "utf8"));
console.log("migrations + parity + Pakistan SQL applied (twice)");

let pass = 0,
  fail = 0;
const ok = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS " : "FAIL ") + name + (cond ? "" : "  " + extra));
};
const q = async (sql, params) => (await db.query(sql, params)).rows;
const throws = async (sql, params) => {
  try {
    await db.query(sql, params);
    return null;
  } catch (e) {
    return e.message;
  }
};
const asRole = async (role, uid) => {
  await run(
    `RESET ROLE; SELECT set_config('request.jwt.claim.sub','${uid ?? ""}',false); SET ROLE ${role};`,
  );
};
const reset = () => run("RESET ROLE");

const prods = await q("select id, slug, price_cents, stock_quantity from products order by slug");
const P = (slug) => prods.find((p) => p.slug === slug);
const hoodie = P("studio-hoodie"),
  bomber = P("city-bomber");
const cust = "11111111-1111-1111-1111-111111111111",
  other = "22222222-2222-2222-2222-222222222222",
  admin = "33333333-3333-3333-3333-333333333333";
await run(
  `INSERT INTO auth.users(id) VALUES ('${cust}'),('${other}'),('${admin}'); INSERT INTO user_roles(user_id) VALUES ('${admin}');`,
);
const mk = (items, code = null, method = "cod", user = null) =>
  db.query(
    "select create_order_from_checkout($1,'Jane Doe','Jane@Example.com','0300-1234567','12 Main Street','Faisalabad','Punjab','38000',$2::jsonb,$3,$4) as r",
    [user, JSON.stringify(items), code, method],
  );
const it = (p, qty = 1, size = "M", color = "ink") => ({
  product_id: p.id,
  size,
  color,
  quantity: qty,
});

// 1 guest order, default settings: flat shipping, no tax
let r = (await mk([it(hoodie, 1)])).rows[0].r;
ok("guest order subtotal", r.subtotal_cents === hoodie.price_cents, JSON.stringify(r));
ok(
  "flat shipping below threshold",
  r.shipping_cents === 25000 && r.total_cents === r.subtotal_cents + 25000,
);
ok(
  "order has guest token + null user",
  !!r.guest_token &&
    (await q("select user_id from orders where id=$1", [r.id]))[0].user_id === null,
);
ok(
  "order_items created",
  (await q("select count(*)::int c from order_items where order_id=$1", [r.id]))[0].c === 1,
);
const row0 = (
  await q(
    "select currency, shipping_phone, shipping_province, shipping_country from orders where id=$1",
    [r.id],
  )
)[0];
ok(
  "order stored in PKR for Pakistan",
  row0.currency === "PKR" &&
    row0.shipping_country === "Pakistan" &&
    row0.shipping_province === "Punjab",
  JSON.stringify(row0),
);
ok("phone normalised to +92", row0.shipping_phone === "+923001234567", row0.shipping_phone);
ok("hoodie priced in rupees (Rs 6,499)", hoodie.price_cents === 649900, String(hoodie.price_cents));
const set0 = (await q("select * from store_settings"))[0];
ok(
  "Pakistan settings: Rs 250 shipping, free from Rs 7,500, no tax, COD on",
  set0.shipping_flat_cents === 25000 &&
    set0.free_shipping_threshold_cents === 750000 &&
    set0.tax_rate_bps === 0 &&
    set0.cod_enabled === true,
  JSON.stringify(set0),
);
const call = (phone, prov, postal = "") =>
  throws(
    "select create_order_from_checkout(null,'Jane Doe','a@b.co',$1,'12 Main Street','Lahore',$2,$3,$4::jsonb,null,'cod')",
    [phone, prov, postal, JSON.stringify([it(hoodie)])],
  );
for (const good of [
  "03001234567",
  "0300 1234567",
  "+92 300 1234567",
  "923001234567",
  "00923001234567",
  "(0300) 123-4567",
])
  ok("accepts phone " + good, (await call(good, "Sindh")) === null);
for (const bad2 of ["0211234567", "12345", "0400 1234567", "abc", ""])
  ok("rejects phone '" + bad2 + "'", /Pakistani mobile/.test((await call(bad2, "Sindh")) ?? ""));
ok("rejects unknown province", /province/.test((await call("03001234567", "Texas")) ?? ""));
ok(
  "blank postal stored as N/A",
  (await call("03001234567", "Sindh", "  ")) === null &&
    (await q("select shipping_postal_code p from orders order by created_at desc limit 1"))[0].p ===
      "N/A",
);
// 2 free shipping at threshold and tax
await run("UPDATE store_settings SET tax_rate_bps = 1000, free_shipping_threshold_cents = 20000");
r = (await mk([it(hoodie, 2)])).rows[0].r; // 236.00 >= 200.00
ok("free shipping over threshold", r.shipping_cents === 0, JSON.stringify(r));
ok(
  "10% tax on goods",
  r.tax_cents === Math.round(r.subtotal_cents * 0.1) &&
    r.total_cents === r.subtotal_cents + r.tax_cents,
  JSON.stringify(r),
);
await run("UPDATE store_settings SET tax_rate_bps = 0, free_shipping_threshold_cents = 750000");
// 3 discounts
await run(`INSERT INTO discount_codes(code, percent_off, min_subtotal_cents, max_uses) VALUES ('SAVE10', 10, 5000, 2);
 INSERT INTO discount_codes(code, amount_off_cents) VALUES ('FLAT50', 5000);
 INSERT INTO discount_codes(code, percent_off, expires_at) VALUES ('OLD', 20, now() - interval '1 day');
 INSERT INTO discount_codes(code, percent_off, active) VALUES ('OFF', 20, false);`);
r = (await mk([it(hoodie)], " save10 ")).rows[0].r;
ok(
  "percent discount (case/space-insensitive)",
  r.discount_cents === Math.floor(hoodie.price_cents * 0.1) &&
    r.total_cents === r.subtotal_cents - r.discount_cents + r.shipping_cents,
  JSON.stringify(r),
);
ok(
  "used_count incremented",
  (await q("select used_count from discount_codes where code='SAVE10'"))[0].used_count === 1,
);
r = (await mk([it(hoodie)], "FLAT50")).rows[0].r;
ok("fixed discount", r.discount_cents === 5000);
ok(
  "expired code rejected",
  /not valid/.test(
    (await throws(
      "select create_order_from_checkout(null,'Jane Doe','a@b.co','03001234567','12 Main Street','Fsd','Punjab','38000',$1::jsonb,'OLD','cod')",
      [JSON.stringify([it(hoodie)])],
    )) ?? "",
  ),
);
ok(
  "inactive code rejected",
  /not valid/.test(
    (await throws(
      "select create_order_from_checkout(null,'Jane Doe','a@b.co','03001234567','12 Main Street','Fsd','Punjab','38000',$1::jsonb,'OFF','cod')",
      [JSON.stringify([it(hoodie)])],
    )) ?? "",
  ),
);
await mk([it(hoodie)], "SAVE10");
ok(
  "max_uses enforced",
  /not valid/.test(
    (await throws(
      "select create_order_from_checkout(null,'Jane Doe','a@b.co','03001234567','12 Main Street','Fsd','Punjab','38000',$1::jsonb,'SAVE10','cod')",
      [JSON.stringify([it(hoodie)])],
    )) ?? "",
  ),
);
ok(
  "failed order did not consume a use",
  (await q("select used_count from discount_codes where code='SAVE10'"))[0].used_count === 2,
);
ok(
  "unknown code rejected",
  /not valid/.test(
    (await throws(
      "select create_order_from_checkout(null,'Jane Doe','a@b.co','03001234567','12 Main Street','Fsd','Punjab','38000',$1::jsonb,'NOPE','cod')",
      [JSON.stringify([it(hoodie)])],
    )) ?? "",
  ),
);
// 4 validation
const bad = (items, msg, label) =>
  throws(
    "select create_order_from_checkout(null,'Jane Doe','a@b.co','03001234567','12 Main Street','Fsd','Punjab','38000',$1::jsonb,null,'cod')",
    [JSON.stringify(items)],
  ).then((e) => ok(label, new RegExp(msg).test(e ?? "")));
await bad([it(hoodie, 99)], "color, and quantity", "quantity > 5 rejected");
await bad([it(hoodie, 1, "XS")], "color, and quantity", "bad size rejected");
await bad([it(hoodie, 1, "M", "fern")], "no longer available", "unavailable colour rejected");
await bad([it(hoodie), it(hoodie, 1, "L")], "only once", "duplicate product rejected");
await bad([], "between 1 and 20", "empty cart rejected");
await bad(
  [{ product_id: "00000000-0000-0000-0000-000000000000", size: "M", color: "ink", quantity: 1 }],
  "no longer available",
  "unknown product rejected",
);
await run(`UPDATE products SET stock_quantity = 1 WHERE id='${bomber.id}'`);
await bad([it(bomber, 2, "M", "ink")], "Insufficient stock", "insufficient stock rejected");
ok(
  "bad email rejected",
  /delivery details/.test(
    (await throws(
      "select create_order_from_checkout(null,'Jane Doe','nope','03001234567','12 Main Street','Fsd','Punjab','38000',$1::jsonb,null,'cod')",
      [JSON.stringify([it(hoodie)])],
    )) ?? "",
  ),
);
// 5 public lookup
const o = (await mk([it(hoodie)], null, "cod", cust)).rows[0].r;
ok(
  "get_order_public with token",
  (await q("select get_order_public($1,$2) r", [o.id, o.guest_token]))[0].r?.id === o.id,
);
ok(
  "get_order_public wrong token -> null",
  (await q("select get_order_public($1,gen_random_uuid()) r", [o.id]))[0].r === null,
);
// 6 privilege / RLS
await asRole("anon");
ok(
  "anon cannot create orders",
  /permission denied/.test(
    (await throws(
      "select create_order_from_checkout(null,'Jane Doe','a@b.co','03001234567','12 Main Street','Fsd','Punjab','38000','[]'::jsonb,null,'cod')",
    )) ?? "",
  ),
);
ok(
  "anon can preview a discount",
  (await q("select preview_discount('FLAT50', 20000) d"))[0].d === 5000,
);
ok(
  "anon cannot read discount_codes",
  /permission denied/.test((await throws("select * from discount_codes")) ?? ""),
);
ok("anon can read settings", (await q("select * from store_settings")).length === 1);
ok(
  "anon cannot insert orders directly",
  /permission denied/.test((await throws("insert into orders(shipping_name) values('x')")) ?? ""),
);
await asRole("authenticated", cust);
ok(
  "customer sees only own orders",
  (await q("select id from orders")).every((x) => x.id === o.id) &&
    (await q("select id from orders")).length === 1,
);
ok(
  "customer cannot update orders",
  (await db.query("update orders set status='delivered' returning id")).rows.length === 0,
);
ok("customer cannot read discount codes", (await q("select * from discount_codes")).length === 0);
ok(
  "customer cannot direct-insert order",
  /permission denied/.test((await throws("insert into orders(shipping_name) values('x')")) ?? ""),
);
// reviews: buyer vs non-buyer
const rv = (uid, pid) =>
  throws(
    "insert into reviews(product_id,user_id,author_name,rating,body) values($1,$2,'Jane',5,'Great hoodie')",
    [pid, uid],
  );
ok("buyer can review purchased product", (await rv(cust, hoodie.id)) === null);
ok(
  "buyer cannot review unpurchased product",
  /row-level security/.test((await rv(cust, bomber.id)) ?? ""),
);
ok("one review per product", /duplicate|unique/.test((await rv(cust, hoodie.id)) ?? ""));
await asRole("authenticated", other);
ok("non-buyer cannot review", /row-level security/.test((await rv(other, hoodie.id)) ?? ""));
ok("other customer cannot see my order", (await q("select id from orders")).length === 0);
ok(
  "non-admin cannot change settings",
  (await db.query("update store_settings set tax_rate_bps=500 returning id")).rows.length === 0,
);
await reset();
const stockBefore = (await q("select stock_quantity s from products where id=$1", [hoodie.id]))[0]
  .s;
await asRole("authenticated", admin);
ok("admin can read all orders", (await q("select id from orders")).length >= 5);
ok(
  "admin can create a discount code",
  (await throws("insert into discount_codes(code, percent_off) values ('ADMIN5', 5)")) === null,
);
ok(
  "admin can change settings",
  (await db.query("update store_settings set shipping_flat_cents=900 returning id")).rows.length ===
    1,
);
ok(
  "admin can set tracking",
  (await db.query("update orders set tracking_number='TRK1' where id=$1 returning id", [o.id])).rows
    .length === 1,
);
ok(
  "admin can move pending->processing",
  (await db.query("update orders set status='processing' where id=$1 returning id", [o.id])).rows
    .length === 1,
);
await reset();
ok(
  "processing reserved stock (-1 hoodie)",
  (await q("select stock_quantity s from products where id=$1", [hoodie.id]))[0].s ===
    stockBefore - 1,
);
ok(
  "invalid transition blocked",
  /Invalid order status transition/.test(
    (await throws("update orders set status='delivered' where id=$1", [o.id])) ?? "",
  ),
);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
