const fs = require('fs');
const path = require('path');
require('reflect-metadata');
require('ts-node').register({ transpileOnly: true });
require('tsconfig-paths/register');
const { DataSource } = require('typeorm');

const root = path.resolve(__dirname, '..');
async function main() {
  // Build ORM metadata without connecting, synchronizing or reading records.
  const source = new DataSource({
    type: 'mysql',
    database: 'databasetoro',
    entities: [path.join(root, 'src/**/*.entity.ts')],
    synchronize: false,
  });
  await source.buildMetadatas();
  const tables = source.entityMetadatas.map((table) => ({
    name: table.tableName,
    columns: table.columns.map((column) => ({
      name: column.databaseName,
      type: typeof column.type === 'string' ? column.type : column.type.name,
      primary: column.isPrimary,
      nullable: column.isNullable,
      foreign: table.relations.some((relation) => relation.joinColumns.includes(column)),
    })),
  })).sort((a, b) => a.name.localeCompare(b.name));
  const relations = source.entityMetadatas.flatMap((table) =>
    table.relations.filter((relation) => relation.isOwning).flatMap((relation) => relation.joinColumns.map((column) => ({
      from: table.tableName, field: column.databaseName,
      to: relation.inverseEntityMetadata.tableName,
      target: column.referencedColumn.databaseName,
      constrained: relation.createForeignKeyConstraints,
    }))),
  );
  const template = fs.readFileSync(path.join(__dirname, 'database-diagram.html'), 'utf8');
  const data = JSON.stringify({ tables, relations }).replace(/</g, '\\u003c');
  const output = path.join(root, 'docs/database-diagram.html');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, template.replace('/*DATABASE_DATA*/', data));
  console.log(`Diagrama generado: ${tables.length} tablas, ${relations.length} relaciones.\n${output}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
