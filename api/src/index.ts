import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { schema } from "./schema.js";

const yoga = createYoga({
  schema,
  cors: { origin: "*" }, // tighten this before real users
});

const port = Number(process.env.PORT ?? 4000);
createServer(yoga).listen(port, "0.0.0.0", () => {
  console.log(`GraphQL API ready at http://localhost:${port}/graphql`);
});
