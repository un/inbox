/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure that every mysql table has org_id column',
      category: 'Best Practices',
      recommended: true
    },
    schema: []
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'mysqlTable' &&
          node.arguments.length >= 2 &&
          node.arguments[1].type === 'ObjectExpression'
        ) {
          const schemaProperties = node.arguments[1].properties;
          const orgIdColumn = schemaProperties.find(
            (property) =>
              property.type === 'Property' &&
              property.key.type === 'Identifier' &&
              property.key.name === 'orgId'
          );
          if (
            !orgIdColumn ||
            orgIdColumn.type !== 'Property' ||
            orgIdColumn.value.type !== 'CallExpression' ||
            orgIdColumn.value.callee.type !== 'MemberExpression' ||
            orgIdColumn.value.callee.object.callee.name !== 'foreignKey' ||
            orgIdColumn.value.callee.object.arguments[0].value !== 'org_id' ||
            orgIdColumn.value.callee.property.name !== 'notNull'
          ) {
            context.report({
              node: orgIdColumn ? orgIdColumn.value : node.arguments[1],
              message:
                'Every mysql table should have orgId column with foreign key to orgs table which is not null'
            });
          }
        }
      }
    };
  }
};
