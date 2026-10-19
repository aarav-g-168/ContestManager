import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// This is a local source check: it never reads credentials or contacts a service.
const root = process.cwd();
const normalize = (value) => value.split(path.sep).join("/");
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [normalize(file)];
  });
const errors = new Set();
const fail = (message) => errors.add(message);
const allowedRoots = new Set([
  "app",
  "components",
  "features",
  "hooks",
  "lib",
  "styles",
]);
for (const entry of fs.readdirSync("src", { withFileTypes: true })) {
  if (!entry.isDirectory() || !allowedRoots.has(entry.name))
    fail(
      `src/${entry.name}: put code in an established source folder (see docs/project-structure.md).`,
    );
}
for (const file of walk("src/components")) {
  if (!/^src\/components\/(layout|feedback|theme|ui)\//.test(file))
    fail(
      `${file}: shared components belong in layout/, feedback/, theme/ or ui/.`,
    );
}
for (const file of walk("src/features")) {
  if (
    !/^src\/features\/[^/]+\/(?:(?:components|hooks|lib|server)\/.+\.(?:tsx?|css)|(?:types\.ts|styles\.css))$/.test(
      file,
    )
  )
    fail(
      `${file}: use components/, hooks/, lib/, server/, types.ts or styles.css inside a feature.`,
    );
  if (
    /\/components\/.*\.tsx$/.test(file) &&
    !/\/[A-Z][A-Za-z0-9]*\.tsx$/.test(file)
  )
    fail(`${file}: feature React components use PascalCase filenames.`);
  if (/\/hooks\//.test(file) && !/\/use[A-Z][A-Za-z0-9]*\.ts$/.test(file))
    fail(`${file}: hooks use useName.ts filenames.`);
}
const source = walk("src").filter((file) => /\.(ts|tsx)$/.test(file));
for (const [folder, allowed] of [
  ["scripts", ["checks", "setup", "legacy"]],
  ["tests", ["integration", "unit", "e2e", "fixtures"]],
]) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true }))
    if (
      (entry.isDirectory() && !allowed.includes(entry.name)) ||
      (entry.isFile() && entry.name !== "README.md")
    )
      fail(`${folder}/${entry.name}: follow the documented ${folder} folders.`);
}
for (const entry of fs.readdirSync("src/lib", { withFileTypes: true }))
  if (entry.isFile() && !["date.ts", "utils.ts"].includes(entry.name))
    fail(
      `src/lib/${entry.name}: put infrastructure in a named folder, or move product logic to its feature.`,
    );
for (const file of walk("src/hooks"))
  if (!/\/use[A-Z][A-Za-z0-9]*\.ts$/.test(file))
    fail(`${file}: generic hooks use useName.ts filenames.`);
const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile).config;
const options = ts.convertCompilerOptionsFromJson(
  config.compilerOptions,
  root,
).options;
const graph = new Map();
const clientRoots = [];
const serverPath = (file) =>
  file.includes("/server/") ||
  file.startsWith("src/lib/db/") ||
  file === "src/lib/http/account-request.ts";
for (const file of [...source, ...walk("scripts"), ...walk("tests")].filter(
  (file) => /\.(ts|tsx|mts|mjs)$/.test(file),
)) {
  const content = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  if (
    ast.statements.some(
      (node) =>
        ts.isExpressionStatement(node) &&
        ts.isStringLiteral(node.expression) &&
        node.expression.text === "use client",
    )
  )
    clientRoots.push(file);
  const edges = [];
  const inspect = (specifier, runtime) => {
    if (specifier.endsWith(".css")) {
      const target = specifier.startsWith("@/")
        ? path.join("src", specifier.slice(2))
        : path.join(path.dirname(file), specifier);
      if (
        (specifier.startsWith("@/") || specifier.startsWith(".")) &&
        !fs.existsSync(target)
      )
        fail(`${file}: missing stylesheet ${specifier}.`);
      return;
    }
    if (!specifier.startsWith("@/") && !specifier.startsWith(".")) {
      if (
        runtime &&
        (specifier.startsWith("node:") ||
          ["pg", "sharp", "resend", "next/headers"].includes(specifier))
      )
        edges.push({ target: specifier, external: true });
      return;
    }
    const resolved = ts.resolveModuleName(
      specifier,
      path.resolve(file),
      options,
      ts.sys,
    ).resolvedModule;
    if (!resolved) {
      fail(`${file}: cannot resolve ${specifier}.`);
      return;
    }
    const target = normalize(path.relative(root, resolved.resolvedFileName));
    if (file.startsWith("src/features/") && target.startsWith("src/app/"))
      fail(`${file}: features must not import route modules (${target}).`);
    if (
      file.startsWith("src/components/ui/") &&
      target.startsWith("src/features/")
    )
      fail(
        `${file}: UI primitives must remain independent of product features.`,
      );
    if (runtime) edges.push({ target, external: false });
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const allNamedTypes =
        clause?.namedBindings &&
        ts.isNamedImports(clause.namedBindings) &&
        clause.namedBindings.elements.length > 0 &&
        clause.namedBindings.elements.every((item) => item.isTypeOnly);
      inspect(
        node.moduleSpecifier.text,
        !clause?.isTypeOnly && !(allNamedTypes && !clause?.name),
      );
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const allNamedTypes =
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.length > 0 &&
        node.exportClause.elements.every((item) => item.isTypeOnly);
      inspect(node.moduleSpecifier.text, !node.isTypeOnly && !allNamedTypes);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      inspect(node.arguments[0].text, true);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  graph.set(file, edges);
}
// Follow runtime imports, not type-only imports. Type sharing must not bundle server credentials.
for (const origin of clientRoots) {
  const visited = new Set();
  const visit = (file, chain) => {
    if (visited.has(file)) return;
    visited.add(file);
    for (const edge of graph.get(file) ?? []) {
      if (edge.external || serverPath(edge.target))
        fail(`Client/server boundary: ${[...chain, edge.target].join(" -> ")}`);
      else visit(edge.target, [...chain, edge.target]);
    }
  };
  visit(origin, [origin]);
}
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const [name, command] of Object.entries(pkg.scripts)) {
  for (const match of command.matchAll(
    /(?:tsx|node)\s+((?:tests|scripts)\/[^\s]+)/g,
  ))
    if (!fs.existsSync(match[1]))
      fail(`npm run ${name}: missing entry point ${match[1]}.`);
}
if (errors.size) {
  console.error([...errors].join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Structure checks passed: ${source.length} source modules, ${clientRoots.length} client entry points, valid imports and client/server boundaries.`,
  );
