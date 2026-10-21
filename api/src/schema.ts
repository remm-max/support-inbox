import { createSchema } from "graphql-yoga";
import { GraphQLError } from "graphql";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";
import { signToken, type Ctx } from "./auth.js";
import { generateDraft, checkDraftRate } from "./ai.js";

type TicketRow = {
  id: number;
  subject: string;
  body: string;
  customer_email: string;
  status: "open" | "closed";
  created_at: Date;
};

type ReplyRow = {
  id: number;
  ticket_id: number;
  author: "customer" | "agent";
  body: string;
  created_at: Date;
};

const toTicket = (r: TicketRow) => ({
  id: String(r.id),
  subject: r.subject,
  body: r.body,
  customerEmail: r.customer_email,
  status: r.status === "open" ? "OPEN" : "CLOSED",
  createdAt: r.created_at.toISOString(),
});

const toReply = (r: ReplyRow) => ({
  id: String(r.id),
  author: r.author === "agent" ? "AGENT" : "CUSTOMER",
  body: r.body,
  createdAt: r.created_at.toISOString(),
});

// GraphQLError messages reach the client; plain Errors are masked by Yoga.
const bad = (message: string) => new GraphQLError(message);

function requireUser(ctx: Ctx) {
  if (!ctx.user) {
    throw new GraphQLError("Please log in.", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return ctx.user;
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const schema = createSchema<Ctx>({
  typeDefs: /* GraphQL */ `
    enum TicketStatus {
      OPEN
      CLOSED
    }

    enum ReplyAuthor {
      CUSTOMER
      AGENT
    }

    type User {
      id: ID!
      email: String!
    }

    type AuthPayload {
      token: String!
      user: User!
    }

    type Reply {
      id: ID!
      author: ReplyAuthor!
      body: String!
      createdAt: String!
    }

    type Ticket {
      id: ID!
      subject: String!
      body: String!
      customerEmail: String!
      status: TicketStatus!
      createdAt: String!
      replies: [Reply!]!
    }

    type Query {
      me: User
      tickets(status: TicketStatus): [Ticket!]!
      ticket(id: ID!): Ticket
    }

    type Mutation {
      signup(email: String!, password: String!, code: String): AuthPayload!
      login(email: String!, password: String!): AuthPayload!
      createTicket(subject: String!, body: String!, customerEmail: String!): Ticket!
      addReply(ticketId: ID!, body: String!): Reply!
      setTicketStatus(id: ID!, status: TicketStatus!): Ticket!
      draftReply(ticketId: ID!): String!
    }
  `,
  resolvers: {
    Ticket: {
      replies: async (parent: { id: string }, _args: unknown, ctx: Ctx) => {
        requireUser(ctx);
        const { rows } = await pool.query<ReplyRow>(
          "SELECT * FROM replies WHERE ticket_id = $1 ORDER BY created_at ASC, id ASC",
          [Number(parent.id)],
        );
        return rows.map(toReply);
      },
    },
    Query: {
      me: (_: unknown, _args: unknown, ctx: Ctx) =>
        ctx.user ? { id: String(ctx.user.id), email: ctx.user.email } : null,

      tickets: async (_: unknown, args: { status?: "OPEN" | "CLOSED" }, ctx: Ctx) => {
        requireUser(ctx);
        const { rows } = args.status
          ? await pool.query<TicketRow>(
              "SELECT * FROM tickets WHERE status = $1 ORDER BY created_at DESC LIMIT 50",
              [args.status.toLowerCase()],
            )
          : await pool.query<TicketRow>(
              "SELECT * FROM tickets ORDER BY created_at DESC LIMIT 50" ,
            );
        return rows.map(toTicket);
      },

      ticket: async (_: unknown, args: { id: string }, ctx: Ctx) => {
        requireUser(ctx);
        const id = Number(args.id);
        if (!Number.isInteger(id)) return null;
        const { rows } = await pool.query<TicketRow>(
          "SELECT * FROM tickets WHERE id = $1",
          [id],
        );
        return rows[0] ? toTicket(rows[0]) : null;
      },
    },
    Mutation: {
      signup: async (
        _: unknown,
        args: { email: string; password: string; code?: string | null },
      ) => {
        const required = process.env.SIGNUP_CODE;
        if (required && args.code !== required) throw bad("Invalid invite code.");
        const email = args.email.trim().toLowerCase();
        if (!EMAIL_RE.test(email)) throw bad("Enter a valid email address.");
        if (args.password.length < 8) throw bad("Password must be at least 8 characters.");
        const hash = await bcrypt.hash(args.password, 10);
        try {
          const { rows } = await pool.query<{ id: number; email: string }>(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            [email, hash],
          );
          const user = rows[0];
          return { token: signToken(user), user: { id: String(user.id), email: user.email } };
        } catch (e) {
          if ((e as { code?: string }).code === "23505") {
            throw bad("An account with that email already exists.");
          }
          throw e;
        }
      },

      login: async (_: unknown, args: { email: string; password: string }) => {
        const email = args.email.trim().toLowerCase();
        const { rows } = await pool.query<{ id: number; email: string; password_hash: string }>(
          "SELECT id, email, password_hash FROM users WHERE email = $1",
          [email],
        );
        const row = rows[0];
        // Same message either way, so the API doesn't reveal which emails exist.
        const ok = row ? await bcrypt.compare(args.password, row.password_hash) : false;
        if (!row || !ok) throw bad("Wrong email or password.");
        const user = { id: row.id, email: row.email };
        return { token: signToken(user), user: { id: String(user.id), email: user.email } };
      },

      // Public on purpose: customers submit tickets without an account.
      createTicket: async (
        _: unknown,
        args: { subject: string; body: string; customerEmail: string },
      ) => {
        const subject = args.subject.trim();
        const body = args.body.trim();
        const email = args.customerEmail.trim();
        if (!subject) throw bad("Add a subject.");
        if (!body) throw bad("Describe the problem.");
        if (!EMAIL_RE.test(email)) throw bad("Enter a valid email address.");
        const { rows } = await pool.query<TicketRow>(
          "INSERT INTO tickets (subject, body, customer_email) VALUES ($1, $2, $3) RETURNING *",
          [subject, body, email],
        );
        return toTicket(rows[0]);
      },

      addReply: async (_: unknown, args: { ticketId: string; body: string }, ctx: Ctx) => {
        requireUser(ctx);
        const body = args.body.trim();
        if (!body) throw bad("Write a reply first.");
        const ticketId = Number(args.ticketId);
        const exists = await pool.query("SELECT 1 FROM tickets WHERE id = $1", [ticketId]);
        if (exists.rowCount === 0) throw bad("That ticket doesn't exist.");
        const { rows } = await pool.query<ReplyRow>(
          "INSERT INTO replies (ticket_id, author, body) VALUES ($1, 'agent', $2) RETURNING *",
          [ticketId, body],
        );
        return toReply(rows[0]);
      },

      // Returns text only. Nothing is saved or sent until an agent edits and posts it.
      draftReply: async (_: unknown, args: { ticketId: string }, ctx: Ctx) => {
        const user = requireUser(ctx);
        checkDraftRate(user.id);
        const id = Number(args.ticketId);
        const t = await pool.query<TicketRow>("SELECT * FROM tickets WHERE id = $1", [id]);
        if (!t.rows[0]) throw bad("That ticket doesn't exist.");
        const r = await pool.query<ReplyRow>(
          "SELECT * FROM replies WHERE ticket_id = $1 ORDER BY created_at ASC, id ASC",
          [id],
        );
        const ticket = t.rows[0];
        const thread = r.rows
          .slice(-10)
          .map((x) => `${x.author === "agent" ? "Agent" : "Customer"}: ${x.body}`)
          .join("\n\n");
        const text =
          `Subject: ${ticket.subject}\nCustomer: ${ticket.customer_email}\n\nOriginal message:\n${ticket.body}` +
          (thread ? `\n\nConversation so far:\n${thread}` : "");
        return generateDraft(text);
      },

      setTicketStatus: async (
        _: unknown,
        args: { id: string; status: "OPEN" | "CLOSED" },
        ctx: Ctx,
      ) => {
        requireUser(ctx);
        const { rows } = await pool.query<TicketRow>(
          "UPDATE tickets SET status = $1 WHERE id = $2 RETURNING *",
          [args.status.toLowerCase(), Number(args.id)],
        );
        if (!rows[0]) throw bad("That ticket doesn't exist.");
        return toTicket(rows[0]);
      },
    },
  },
});
