/**
 * Configuración de ESLint del frontal: TypeScript estricto, reglas de hooks de React,
 * JSDoc obligatorio en sintaxis TSDoc y ningún comentario dentro del cuerpo de una función.
 */
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import jsdoc from "eslint-plugin-jsdoc";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";
import noFunctionBodyComments from "./eslint-rules/no-function-body-comments.ts";

export default defineConfig(
  { ignores: ["node_modules", "dist"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  reactRefresh.configs.vite,
  jsdoc.configs["flat/recommended-typescript-error"],
  {
    languageOptions: { globals: globals.browser },
    plugins: { local: { rules: { "no-function-body-comments": noFunctionBodyComments } } },
    settings: { jsdoc: { tagNamePreference: { template: "typeParam" } } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "jsdoc/check-param-names": ["error", { disableMissingParamChecks: true }],
      "no-inline-comments": "error",
      "no-warning-comments": "error",
      "local/no-function-body-comments": "error",
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: false,
          require: { FunctionDeclaration: true, ClassDeclaration: true, MethodDefinition: true },
          contexts: [
            "Program > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression",
            "Program > ExportNamedDeclaration[declaration.type='VariableDeclaration']",
            "Program > TSInterfaceDeclaration",
            "Program > TSTypeAliasDeclaration",
            "Program > ExportNamedDeclaration > TSInterfaceDeclaration",
            "Program > ExportNamedDeclaration > TSTypeAliasDeclaration",
          ],
          checkConstructors: false,
        },
      ],
      "jsdoc/require-description": ["error", { contexts: ["any"] }],
      "jsdoc/informative-docs": "error",
      "jsdoc/no-blank-block-descriptions": "error",
      "jsdoc/require-throws-type": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/tag-lines": "off",
    },
  },
  {
    files: ["*.config.ts", "eslint-rules/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["tests/**/*.ts"],
    rules: { "jsdoc/require-jsdoc": "off" },
  },
);
