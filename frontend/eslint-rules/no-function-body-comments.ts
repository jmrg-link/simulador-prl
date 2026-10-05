/**
 * Regla ESLint local: prohíbe cualquier comentario dentro del cuerpo de una función.
 * La documentación va en JSDoc encima de la declaración; si un tramo necesita explicación,
 * se extrae a una función con nombre. Ninguna regla del core ni de eslint-plugin-jsdoc lo cubre,
 * porque los comentarios no son nodos del AST y hay que cruzarlos con los rangos de función.
 */
import type { Rule } from "eslint";

/** Cuerpo de una función con el rango de caracteres que ocupa en el fuente. */
type FunctionBody = { range?: [number, number] };

/** Indica si la posición `offset` cae estrictamente dentro de algún cuerpo de función. */
const isInsideAny = (offset: number, bodies: FunctionBody[]): boolean =>
  bodies.some(({ range }) => range !== undefined && offset > range[0] && offset < range[1]);

/** Devuelve un visitante que guarda en `bodies` el cuerpo de cada función que recorra. */
const collectBodiesInto =
  (bodies: FunctionBody[]) =>
  (node: Rule.Node & { body?: unknown }): void => {
    if (node.body && typeof node.body === "object") bodies.push(node.body as FunctionBody);
  };

/** Recorre el fichero, acumula los cuerpos de función y reporta cada comentario que caiga dentro. */
const create = (context: Rule.RuleContext): Rule.RuleListener => {
  const bodies: FunctionBody[] = [];
  const collect = collectBodiesInto(bodies);
  return {
    FunctionDeclaration: collect,
    FunctionExpression: collect,
    ArrowFunctionExpression: collect,
    "Program:exit"() {
      for (const comment of context.sourceCode.getAllComments()) {
        const start = comment.range?.[0];
        if (start !== undefined && isInsideAny(start, bodies)) {
          context.report({ loc: comment.loc ?? { line: 1, column: 0 }, messageId: "forbidden" });
        }
      }
    },
  };
};

/** Definición de la regla `local/no-function-body-comments`. */
const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: { description: "Prohíbe comentarios dentro del cuerpo de una función" },
    schema: [],
    messages: {
      forbidden: "Sin comentarios dentro de funciones: extrae una función con nombre o documenta con JSDoc encima.",
    },
  },
  create,
};

export default rule;
