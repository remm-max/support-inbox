// Shared by web, iOS and Android: this is the "one codebase" data layer.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/graphql";

export type Status = "OPEN" | "CLOSED";

export type User = { id: string; email: string };
export type AuthPayload = { token: string; user: User };

export type Reply = {
  id: string;
  author: "CUSTOMER" | "AGENT";
  body: string;
  createdAt: string;
};

export type Ticket = {
  id: string;
  subject: string;
  body: string;
  customerEmail: string;
  status: Status;
  createdAt: string;
};

export type TicketDetail = Ticket & { replies: Reply[] };

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) {
    if (json.errors[0].extensions?.code === "UNAUTHENTICATED") onUnauthorized?.();
    throw new Error(json.errors[0].message);
  }
  return json.data as T;
}

const TICKET_FIELDS = "id subject body customerEmail status createdAt";

export async function fetchTickets(status?: Status): Promise<Ticket[]> {
  const data = await gql<{ tickets: Ticket[] }>(
    `query ($status: TicketStatus) { tickets(status: $status) { ${TICKET_FIELDS} } }`,
    { status: status ?? null },
  );
  return data.tickets;
}

export async function fetchTicket(id: string): Promise<TicketDetail | null> {
  const data = await gql<{ ticket: TicketDetail | null }>(
    `query ($id: ID!) {
      ticket(id: $id) {
        ${TICKET_FIELDS}
        replies { id author body createdAt }
      }
    }`,
    { id },
  );
  return data.ticket;
}

export async function createTicket(input: {
  subject: string;
  body: string;
  customerEmail: string;
}): Promise<Ticket> {
  const data = await gql<{ createTicket: Ticket }>(
    `mutation ($subject: String!, $body: String!, $customerEmail: String!) {
      createTicket(subject: $subject, body: $body, customerEmail: $customerEmail) { ${TICKET_FIELDS} }
    }`,
    input,
  );
  return data.createTicket;
}

export async function addReply(ticketId: string, body: string): Promise<Reply> {
  const data = await gql<{ addReply: Reply }>(
    `mutation ($ticketId: ID!, $body: String!) {
      addReply(ticketId: $ticketId, body: $body) { id author body createdAt }
    }`,
    { ticketId, body },
  );
  return data.addReply;
}

export async function setTicketStatus(id: string, status: Status): Promise<Ticket> {
  const data = await gql<{ setTicketStatus: Ticket }>(
    `mutation ($id: ID!, $status: TicketStatus!) {
      setTicketStatus(id: $id, status: $status) { ${TICKET_FIELDS} }
    }`,
    { id, status },
  );
  return data.setTicketStatus;
}

export async function fetchMe(): Promise<User | null> {
  const data = await gql<{ me: User | null }>(`query { me { id email } }`);
  return data.me;
}

export async function login(email: string, password: string): Promise<AuthPayload> {
  const data = await gql<{ login: AuthPayload }>(
    `mutation ($email: String!, $password: String!) {
      login(email: $email, password: $password) { token user { id email } }
    }`,
    { email, password },
  );
  return data.login;
}

export async function signup(
  email: string,
  password: string,
  code?: string,
): Promise<AuthPayload> {
  const data = await gql<{ signup: AuthPayload }>(
    `mutation ($email: String!, $password: String!, $code: String) {
      signup(email: $email, password: $password, code: $code) { token user { id email } }
    }`,
    { email, password, code: code || null },
  );
  return data.signup;
}

export async function draftReply(ticketId: string): Promise<string> {
  const data = await gql<{ draftReply: string }>(
    `mutation ($ticketId: ID!) { draftReply(ticketId: $ticketId) }`,
    { ticketId },
  );
  return data.draftReply;
}
