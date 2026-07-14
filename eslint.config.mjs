import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

const PLATFORM_ONLY =
  "OS-dependent logic must live in src/platform. Add an eslint-disable only if you have a documented reason.";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "__mocks__/",
      "scripts/*.js",
      "website/.astro/",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    ignores: ["src/platform/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "os", message: PLATFORM_ONLY },
            { name: "node:os", message: PLATFORM_ONLY },
            { name: "child_process", message: PLATFORM_ONLY },
            { name: "node:child_process", message: PLATFORM_ONLY },
            { name: "fs", message: PLATFORM_ONLY },
            { name: "node:fs", message: PLATFORM_ONLY },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='process'][property.name=/^(platform|arch)$/]",
          message: `process.platform / process.arch: ${PLATFORM_ONLY}`,
        },
        {
          selector: "CallExpression[callee.object.name='os']",
          message: `os.* calls: ${PLATFORM_ONLY}`,
        },
      ],
    },
  },
);
