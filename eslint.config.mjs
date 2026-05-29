import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/", "__mocks__/", "scripts/*.js"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "fs",
              message: 'Importing "fs" is only allowed in main.ts',
            },
            {
              name: "child_process",
              message: 'Importing "child_process" is only allowed in main.ts',
            },
          ],
        },
      ],
    },
  },
);
