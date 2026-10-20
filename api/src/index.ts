import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { schema } from "./schema.js";
import { userFromRequest, type Ctx } from "./auth.js";

const yoga = createYoga<Record<string, never>, Ctx>({
  schema,
  context: ({ request }) => ({ user: userFromRequest(request) }),
  cors: {
    origin: "*", // tighten to your deployed web origin before real users
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

const port = Number(process.env.PORT ?? 4000);
createServer(yoga).listen(port, "0.0.0.0", () => {
  console.log(`GraphQL API ready at http://localhost:${port}/graphql`);
});
