import ts from 'typescript'

/** Select declarations and their local dependencies without maintaining another type definition. */
export function selectDeclarations(source, names) {
  const file = ts.createSourceFile('types.ts', source, ts.ScriptTarget.Latest, true)
  const declarations = new Map(
    file.statements
      .filter((node) => ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))
      .map((node) => [node.name.text, node]),
  )
  const selected = new Set()
  const referenced = new Set()
  const reexports = new Map()
  for (const statement of file.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements)
        reexports.set(element.name.text, statement)
    }
  }
  function select(name) {
    if (selected.has(name)) return
    const node = declarations.get(name)
    if (!node) {
      if (!reexports.has(name)) throw new Error(`Missing copied type declaration: ${name}`)
      selected.add(name)
      return
    }
    selected.add(name)
    function visit(child) {
      if (ts.isIdentifier(child)) {
        referenced.add(child.text)
        if (declarations.has(child.text)) select(child.text)
      }
      ts.forEachChild(child, visit)
    }
    visit(node)
  }
  names.forEach(select)
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  const statements = []
  for (const node of file.statements) {
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      const elements = node.exportClause.elements.filter((element) =>
        selected.has(element.name.text),
      )
      if (elements.length)
        statements.push(
          ts.factory.updateExportDeclaration(
            node,
            node.modifiers,
            node.isTypeOnly,
            ts.factory.createNamedExports(elements),
            node.moduleSpecifier,
            node.attributes,
          ),
        )
    }
    if (
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
      selected.has(node.name.text)
    ) {
      statements.push(node)
    } else if (
      ts.isImportDeclaration(node) &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      const elements = node.importClause.namedBindings.elements.filter((element) =>
        referenced.has(element.name.text),
      )
      if (elements.length)
        statements.push(
          ts.factory.updateImportDeclaration(
            node,
            node.modifiers,
            ts.factory.updateImportClause(
              node.importClause,
              node.importClause.isTypeOnly,
              undefined,
              ts.factory.createNamedImports(elements),
            ),
            node.moduleSpecifier,
            node.attributes,
          ),
        )
    }
  }
  return `${statements.map((node) => printer.printNode(ts.EmitHint.Unspecified, node, file)).join('\n\n')}\n`
}
