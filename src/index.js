'use strict';

/* eslint new-cap: 0, dot-notation: 0, no-param-reassign: 0 */

// @TODO: add ability to have user-defined names for 'styles' variable via pragma comments for example
const stylesName = 'styles';


exports.__esModule = true;

function findClassNameAttr(node) {
  let classNameAttr = null;
  node.attributes = node.attributes.filter((attr) => {
    if (attr.name && attr.name.name == 'className') {
      classNameAttr = attr;
      return false;
    }
    return true;
  });

  return classNameAttr;
}

function getNodeValue(node) {
  return node.value.type == 'StringLiteral' ? node.value : node.value.expression;
}

function makeSumExpression(t, a, b, ...rest) {
  const e = t.binaryExpression('+', a, b);
  if (rest.length) {
    return makeSumExpression(t, e, ...rest);
  }
  return e;
}

function addSpaces(t, values) {
  const [a, ...rest] = values;
  if (values.length > 1) {
    return [
      a,
      t.stringLiteral(' '),
      ...addSpaces(t, rest)
    ];
  }
  return values;
}

exports['default'] = function (_ref) {
  const t = _ref.types;
  const {template} = _ref;

  return {
    visitor: {
      Program(path) {
        const cnname = 'classnames';
        let cnIdentifier = t.Identifier(cnname);
        if (!path.scope.hasBinding(cnname)) {
          cnIdentifier = path.scope.generateUidIdentifier(cnname);
          const code = template('var IMPORT_NAME = require(MODULE)')({
            IMPORT_NAME: cnIdentifier,
            MODULE: t.stringLiteral('classnames')
          });
          path.node.body.unshift(code);
        }
        this.cnIdentifier = cnIdentifier;
      },
      JSXAttribute(path) {
        const node = path.node;

        if (node.name.type == 'JSXIdentifier' && node.name.name == 'styleName') {
          if (!path.scope.hasBinding(stylesName)) {
            throw path.buildCodeFrameError(`You are using "styleName" attribute but there is no imported ${stylesName} variable`);
          }
          const classNameAttr = findClassNameAttr(path.parent);
          const nodeValue = getNodeValue(node);
          let styleValues = [];

          if (nodeValue.type == 'StringLiteral' && / /.test(nodeValue.value)) {
            const styleNameArr = nodeValue.value.split(/ /g);

            styleValues = styleNameArr.map(name => t.memberExpression(
              t.Identifier('styles'),
              t.stringLiteral(name),
              true
            ));

          } else {
            styleValues = [
              t.memberExpression(
                t.Identifier('styles'),
                nodeValue,
                true
              )
            ];
          }

          node.name.name = 'className';

          if (classNameAttr) {
            if (classNameAttr.value.type == 'StringLiteral') {
              path.node.value = t.JSXExpressionContainer(
                makeSumExpression(t,
                  getNodeValue(classNameAttr),
                  t.stringLiteral(' '),
                  ...addSpaces(t, styleValues)
                )
              )
            } else {
              path.node.value = t.JSXExpressionContainer(t.callExpression(
                this.cnIdentifier,
                [
                  getNodeValue(classNameAttr),
                  ...styleValues
                ]
              ))
            }
          } else {
            path.node.value = t.JSXExpressionContainer(
              makeSumExpression(t, ...addSpaces(t, styleValues))
            )
          }
        }
      },
    },
  };
};

module.exports = exports['default'];
