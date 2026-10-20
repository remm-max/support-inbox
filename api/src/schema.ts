import { createSchema } from "graphql-yoga";
import { GraphQLError } from "graphql";
import { pool } from "./db.js";

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

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    enum TicketStatus {
      OPEN
      CLOSED
    }

    enum ReplyAuthor {
      CUSTOMER
      AGENT
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
      tickets(status: TicketStatus): [Ticket!]!
      ticket(id: ID!): Ticket
    }

    type Mutation {
      createTicket(subject: String!, body: String!, customerEmail: String!): Ticket!
      addReply(ticketId: ID!, body: String!): Reply!
      setTicketStatus(id: ID!, status: TicketStatus!): Ticket!
    }
  `,
  resolvers: {
    Ticket: {
      replies: async (parent: { id: string }) => {
        const { rows } = await pool.query<ReplyRow>(
          "SELECT * FROM replies WHERE ticket_id = $1 ORDER BY created_at ASC, id ASC",
          [Number(parent.id)],
        );
        return rows.map(toReply);
      },
    },
    Query: {
      tickets: async (_: unknown, args: { status?: "OPEN" | "CLOSED" }) => {
        const { rows } = args.status
          ? await pool.query<TicketRow>(
              "SELECT * FROM tickets WHERE status = $1 ORDER BY created_at DESC",
              [args.status.toLowerCase()],
            )
          : await pool.query<TicketRow>(
              "SELECT * FROM tickets ORDER BY created_at DESC",
            );
        return rows.map(toTicket);
      },
      ticket: async (_: unknown, args: { id: string }) => {
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
      createTicket: async (
        _: unknown,
        args: { subject: string; body: string; customerEmail: string },
      ) => {
        const subject = args.subject.trim();
        const body = args.body.trim();
        const email = args.customerEmail.trim();
        if (!subject) throw bad("Add a subject.");
        if (!body) throw bad("Describe the problem.");
        if (!/^\S+@\S+\.\S+$/.test(email)) throw bad("Enter a valid email address.");
        const { rows } = await pool.query<TicketRow>(
          "INSERT INTO tickets (subject, body, customer_email) VALUES ($1, $2, $3) RETURNING *",
          [subject, body, email],
        );
        return toTicket(rows[0]);
      },
      addReply: async (_: unknown, args: { ticketId: string; body: string }) => {
        const body = args.body.trim();
        if (!body) throw bad("Write a reply first.");
        const ticketId = Number(args.ticketId);
        const exists = await pool.query("SELECT 1 FROM tickets WHERE id = $1", [ticketId]);
        if (exists.rowCount === 0) throw bad("That ticket doesn't exist.");
        // Auth comes in Drop 2; until then every reply is from an agent.
        const { rows } = await pool.query<ReplyRow>(
          "INSERT INTO replies (ticket_id, author, body) VALUES ($1, 'agent', $2) RETURNING *",
          [ticketId, body],
        );
        return toReply(rows[0]);
      },
      setTicketStatus: async (_: unknown, args: { id: string; status: "OPEN" | "CLOSED" }) => {
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
