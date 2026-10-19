import { createSchema } from "graphql-yoga";
import { pool } from "./db.js";

type TicketRow = {
  id: number;
  subject: string;
  body: string;
  customer_email: string;
  status: "open" | "closed";
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

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    enum TicketStatus {
      OPEN
      CLOSED
    }

    type Ticket {
      id: ID!
      subject: String!
      body: String!
      customerEmail: String!
      status: TicketStatus!
      createdAt: String!
    }

    type Query {
      tickets(status: TicketStatus): [Ticket!]!
      ticket(id: ID!): Ticket
    }

    type Mutation {
      createTicket(subject: String!, body: String!, customerEmail: String!): Ticket!
    }
  `,
  resolvers: {
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
        const { rows } = await pool.query<TicketRow>(
          "SELECT * FROM tickets WHERE id = $1",
          [Number(args.id)],
        );
        return rows[0] ? toTicket(rows[0]) : null;
      },
    },
    Mutation: {
      createTicket: async (
        _: unknown,
        args: { subject: string; body: string; customerEmail: string },
      ) => {
        const { rows } = await pool.query<TicketRow>(
          "INSERT INTO tickets (subject, body, customer_email) VALUES ($1, $2, $3) RETURNING *",
          [args.subject.trim(), args.body.trim(), args.customerEmail.trim()],
        );
        return toTicket(rows[0]);
      },
    },
  },
});
