// Shared by web, iOS and Android: this is your "one codebase" data layer.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/graphql";

export type Ticket = {
  id: string;
  subject: string;
  body: string;
  customerEmail: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
};

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

export async function fetchTickets(): Promise<Ticket[]> {
  const data = await gql<{ tickets: Ticket[] }>(`
    query {
      tickets { id subject body customerEmail status createdAt }
    }
  `);
  return data.tickets;
}
