// npx tsx lib/schema/src/run-converter.ts

import * as fs from "node:fs";
import * as path from "node:path";
import { type Config, convertJSONSchemaToTypeScript } from "./schema-to-ts";
import { convertJSONSchemaToValidator } from "./schema-to-validator";

const schemaPath = path.join(__dirname, "..", "pen.schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const version = schema.properties.version.const;

const configs: Config[] = ["public", "private"];
for (const config of configs) {
  const typescript = convertJSONSchemaToTypeScript(schema, "Document", config);

  const outputPath = path.join(__dirname, `generated-types-${config}.ts`);
  fs.writeFileSync(outputPath, typescript);

  console.log(`${config} output: ${outputPath}`);
}

const typescript = convertJSONSchemaToValidator(schema);
const outputPath = path.join(__dirname, `generated-validator.ts`);
fs.writeFileSync(outputPath, typescript);
console.log(`Validator output: ${outputPath}`);

const indexContent = `// Content of this file is generated from "npm run generate"

export * from "./generated-types-private";
export * from "./generated-validator";

export const CURRENT_SCHEMA_VERSION = "${version}";
`;
const indexPath = path.join(__dirname, `index.ts`);
fs.writeFileSync(indexPath, indexContent);
console.log(`Generated index.ts`);
