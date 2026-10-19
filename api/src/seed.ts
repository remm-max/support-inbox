import { pool } from "./db.js";

const samples = [
  ["Refund for damaged order", "My order arrived with a torn box. Can I get a refund?", "amina@example.com"],
  ["Can't log in", "The reset link in my email says it expired.", "rahul@example.com"],
  ["Change shipping address", "I moved last week. Can you update my address?", "sara@example.com"],
  ["Invoice missing", "I need an invoice for my last purchase.", "omar@example.com"],
  ["Feature question", "Does the store plan support discount codes?", "lina@example.com"],
];

await pool.query("TRUNCATE tickets RESTART IDENTITY CASCADE");
for (const [subject, body, email] of samples) {
  await pool.query(
    "INSERT INTO tickets (subject, body, customer_email) VALUES ($1, $2, $3)",
    [subject, body, email],
  );
}
console.log(`Seeded ${samples.length} tickets`);
await pool.end();
