import * as fs from "node:fs";
import * as path from "node:path";

// Generate generated-schema.md for use as raw import in tool handlers
const publicTypes = fs.readFileSync(
  path.join(__dirname, "generated-types-public.ts"),
  "utf8",
);
const penSchemaMd = `# .pen File Schema\n\n\`\`\`typescript\n${publicTypes}\n\`\`\``;
const penSchemaPath = path.join(__dirname, "..", "generated-schema.md");
fs.writeFileSync(penSchemaPath, penSchemaMd);
console.log(`Pen schema markdown: ${penSchemaPath}`);
