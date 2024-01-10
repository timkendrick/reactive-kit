// packages/types/vitest.config.ts
import { join, resolve as resolve2 } from "path";
import { defineConfig as defineConfig5, mergeConfig as mergeConfig4 } from "file:///Users/tim/Sites/trigger/node_modules/.pnpm/vite@4.4.9_@types+node@20.5.9/node_modules/vite/dist/node/index.js";

// packages/types/vite.config.ts
import { resolve } from "path";
import { defineConfig as defineConfig4, mergeConfig as mergeConfig3 } from "file:///Users/tim/Sites/trigger/node_modules/.pnpm/vite@4.4.9_@types+node@20.5.9/node_modules/vite/dist/node/index.js";

// packages/build-config/templates/vite/lib.vite.config.ts
import { defineConfig as defineConfig3, mergeConfig as mergeConfig2 } from "file:///Users/tim/Sites/trigger/node_modules/.pnpm/vite@4.4.9_@types+node@20.5.9/node_modules/vite/dist/node/index.js";
import dts from "file:///Users/tim/Sites/trigger/node_modules/.pnpm/vite-plugin-dts@3.5.3_@types+node@20.5.9_typescript@5.2.2_vite@4.4.9/node_modules/vite-plugin-dts/dist/index.mjs";

// packages/build-config/templates/vite/node.vite.config.ts
import { defineConfig as defineConfig2, mergeConfig } from "file:///Users/tim/Sites/trigger/node_modules/.pnpm/vite@4.4.9_@types+node@20.5.9/node_modules/vite/dist/node/index.js";

// packages/build-config/templates/vite/base.vite.config.ts
import { defineConfig } from "file:///Users/tim/Sites/trigger/node_modules/.pnpm/vite@4.4.9_@types+node@20.5.9/node_modules/vite/dist/node/index.js";
var base_vite_config_default = defineConfig({
  build: {
    sourcemap: true
  }
});

// packages/build-config/templates/vite/node.vite.config.ts
var NODE_MODULES = [
  "assert",
  "buffer",
  "child_process",
  "constants",
  "crypto",
  "events",
  "fs",
  "fs/promises",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "stream",
  "url",
  "util"
];
var node_vite_config_default = mergeConfig(
  base_vite_config_default,
  defineConfig2({
    build: {
      rollupOptions: {
        external: [...NODE_MODULES, /^node:/]
      }
    }
  })
);

// packages/build-config/templates/vite/lib.vite.config.ts
var lib_vite_config_default = mergeConfig2(
  node_vite_config_default,
  defineConfig3({
    plugins: [
      dts({
        exclude: ["node_modules/**", "*.config.ts", "**/*.test.ts"]
      })
    ]
  })
);

// packages/types/package.json
var package_default = {
  private: true,
  name: "@trigger/types",
  version: "0.0.1",
  license: "MIT",
  description: "Shared type definitions",
  author: "Tim Kendrick <timkendrick@gmail.com>",
  type: "module",
  main: "./lib.ts",
  module: "./lib.ts",
  scripts: {
    build: "pnpm run build:lib && pnpm run build:docs && pnpm run build:pkg",
    "build:lib": "vite build",
    "build:docs": "typedoc",
    "build:pkg": "pnpm run --filter build-tools pkg $PWD $PWD/dist/package.json",
    lint: "pnpm run '/^lint:.*/'",
    "lint:eslint": "eslint --ext js,cjs,mjs,ts .",
    "lint:typescript": "tsc --noEmit"
  },
  pkg: {
    type: "module",
    main: "./lib/lib.cjs",
    module: "/lib/lib.js",
    types: "./lib.d.ts",
    exports: {
      ".": {
        import: "./lib/lib.js",
        require: "./lib/lib.cjs"
      }
    }
  },
  dependencies: {
    "@trigger/utils": "workspace:*"
  },
  devDependencies: {
    "@trigger/build-config": "workspace:*"
  },
  peerDependencies: {
    eslint: "^8",
    typedoc: "^0.25",
    typescript: "^5",
    vite: "^4"
  }
};

// packages/types/vite.config.ts
var __vite_injected_original_dirname = "/Users/tim/Sites/trigger/packages/types";
var vite_config_default = mergeConfig3(
  lib_vite_config_default,
  defineConfig4({
    build: {
      lib: {
        entry: resolve(__vite_injected_original_dirname, package_default.module),
        name: package_default.name,
        formats: ["es", "cjs"],
        fileName: "lib/lib"
      }
    }
  })
);

// packages/types/vitest.config.ts
var __vite_injected_original_dirname2 = "/Users/tim/Sites/trigger/packages/types";
var vitest_config_default = mergeConfig4(
  vite_config_default,
  defineConfig5({
    test: {
      root: resolve2(__vite_injected_original_dirname2, "..", ".."),
      include: [join(__vite_injected_original_dirname2, "**/*.{test,spec}.?(c|m)[jt]s?(x)")]
    }
  })
);
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsicGFja2FnZXMvdHlwZXMvdml0ZXN0LmNvbmZpZy50cyIsICJwYWNrYWdlcy90eXBlcy92aXRlLmNvbmZpZy50cyIsICJwYWNrYWdlcy9idWlsZC1jb25maWcvdGVtcGxhdGVzL3ZpdGUvbGliLnZpdGUuY29uZmlnLnRzIiwgInBhY2thZ2VzL2J1aWxkLWNvbmZpZy90ZW1wbGF0ZXMvdml0ZS9ub2RlLnZpdGUuY29uZmlnLnRzIiwgInBhY2thZ2VzL2J1aWxkLWNvbmZpZy90ZW1wbGF0ZXMvdml0ZS9iYXNlLnZpdGUuY29uZmlnLnRzIiwgInBhY2thZ2VzL3R5cGVzL3BhY2thZ2UuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy90aW0vU2l0ZXMvdHJpZ2dlci9wYWNrYWdlcy90eXBlc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3RpbS9TaXRlcy90cmlnZ2VyL3BhY2thZ2VzL3R5cGVzL3ZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3RpbS9TaXRlcy90cmlnZ2VyL3BhY2thZ2VzL3R5cGVzL3ZpdGVzdC5jb25maWcudHNcIjsvLy8gPHJlZmVyZW5jZSB0eXBlcz1cInZpdGVzdFwiIC8+XG5pbXBvcnQgeyBqb2luLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcsIG1lcmdlQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5cbmltcG9ydCBiYXNlIGZyb20gJy4vdml0ZS5jb25maWcnO1xuXG5leHBvcnQgZGVmYXVsdCBtZXJnZUNvbmZpZyhcbiAgYmFzZSxcbiAgZGVmaW5lQ29uZmlnKHtcbiAgICB0ZXN0OiB7XG4gICAgICByb290OiByZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJy4uJyksXG4gICAgICBpbmNsdWRlOiBbam9pbihfX2Rpcm5hbWUsICcqKi8qLnt0ZXN0LHNwZWN9Lj8oY3xtKVtqdF1zPyh4KScpXSxcbiAgICB9LFxuICB9KSxcbik7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy90aW0vU2l0ZXMvdHJpZ2dlci9wYWNrYWdlcy90eXBlc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3RpbS9TaXRlcy90cmlnZ2VyL3BhY2thZ2VzL3R5cGVzL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy90aW0vU2l0ZXMvdHJpZ2dlci9wYWNrYWdlcy90eXBlcy92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbWVyZ2VDb25maWcgfSBmcm9tICd2aXRlJztcblxuaW1wb3J0IGJhc2UgZnJvbSAnLi4vYnVpbGQtY29uZmlnL3RlbXBsYXRlcy92aXRlL2xpYi52aXRlLmNvbmZpZyc7XG5cbmltcG9ydCBwa2cgZnJvbSAnLi9wYWNrYWdlLmpzb24nIGFzc2VydCB7IHR5cGU6ICdqc29uJyB9O1xuXG5leHBvcnQgZGVmYXVsdCBtZXJnZUNvbmZpZyhcbiAgYmFzZSxcbiAgZGVmaW5lQ29uZmlnKHtcbiAgICBidWlsZDoge1xuICAgICAgbGliOiB7XG4gICAgICAgIGVudHJ5OiByZXNvbHZlKF9fZGlybmFtZSwgcGtnLm1vZHVsZSksXG4gICAgICAgIG5hbWU6IHBrZy5uYW1lLFxuICAgICAgICBmb3JtYXRzOiBbJ2VzJywgJ2NqcyddLFxuICAgICAgICBmaWxlTmFtZTogJ2xpYi9saWInLFxuICAgICAgfSxcbiAgICB9LFxuICB9KSxcbik7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy90aW0vU2l0ZXMvdHJpZ2dlci9wYWNrYWdlcy9idWlsZC1jb25maWcvdGVtcGxhdGVzL3ZpdGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy90aW0vU2l0ZXMvdHJpZ2dlci9wYWNrYWdlcy9idWlsZC1jb25maWcvdGVtcGxhdGVzL3ZpdGUvbGliLnZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy90aW0vU2l0ZXMvdHJpZ2dlci9wYWNrYWdlcy9idWlsZC1jb25maWcvdGVtcGxhdGVzL3ZpdGUvbGliLnZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBtZXJnZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IGR0cyBmcm9tICd2aXRlLXBsdWdpbi1kdHMnO1xuXG5pbXBvcnQgYmFzZSBmcm9tICcuL25vZGUudml0ZS5jb25maWcnO1xuXG5leHBvcnQgZGVmYXVsdCBtZXJnZUNvbmZpZyhcbiAgYmFzZSxcbiAgZGVmaW5lQ29uZmlnKHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICBkdHMoe1xuICAgICAgICBleGNsdWRlOiBbJ25vZGVfbW9kdWxlcy8qKicsICcqLmNvbmZpZy50cycsICcqKi8qLnRlc3QudHMnXSxcbiAgICAgIH0pLFxuICAgIF0sXG4gIH0pLFxuKTtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3RpbS9TaXRlcy90cmlnZ2VyL3BhY2thZ2VzL2J1aWxkLWNvbmZpZy90ZW1wbGF0ZXMvdml0ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3RpbS9TaXRlcy90cmlnZ2VyL3BhY2thZ2VzL2J1aWxkLWNvbmZpZy90ZW1wbGF0ZXMvdml0ZS9ub2RlLnZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy90aW0vU2l0ZXMvdHJpZ2dlci9wYWNrYWdlcy9idWlsZC1jb25maWcvdGVtcGxhdGVzL3ZpdGUvbm9kZS52aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZywgbWVyZ2VDb25maWcgfSBmcm9tICd2aXRlJztcblxuaW1wb3J0IGJhc2UgZnJvbSAnLi9iYXNlLnZpdGUuY29uZmlnJztcblxuY29uc3QgTk9ERV9NT0RVTEVTID0gW1xuICAnYXNzZXJ0JyxcbiAgJ2J1ZmZlcicsXG4gICdjaGlsZF9wcm9jZXNzJyxcbiAgJ2NvbnN0YW50cycsXG4gICdjcnlwdG8nLFxuICAnZXZlbnRzJyxcbiAgJ2ZzJyxcbiAgJ2ZzL3Byb21pc2VzJyxcbiAgJ21vZHVsZScsXG4gICduZXQnLFxuICAnb3MnLFxuICAncGF0aCcsXG4gICdwZXJmX2hvb2tzJyxcbiAgJ3Byb2Nlc3MnLFxuICAnc3RyZWFtJyxcbiAgJ3VybCcsXG4gICd1dGlsJyxcbl07XG5cbmV4cG9ydCBkZWZhdWx0IG1lcmdlQ29uZmlnKFxuICBiYXNlLFxuICBkZWZpbmVDb25maWcoe1xuICAgIGJ1aWxkOiB7XG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIGV4dGVybmFsOiBbLi4uTk9ERV9NT0RVTEVTLCAvXm5vZGU6L10sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pLFxuKTtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3RpbS9TaXRlcy90cmlnZ2VyL3BhY2thZ2VzL2J1aWxkLWNvbmZpZy90ZW1wbGF0ZXMvdml0ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3RpbS9TaXRlcy90cmlnZ2VyL3BhY2thZ2VzL2J1aWxkLWNvbmZpZy90ZW1wbGF0ZXMvdml0ZS9iYXNlLnZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy90aW0vU2l0ZXMvdHJpZ2dlci9wYWNrYWdlcy9idWlsZC1jb25maWcvdGVtcGxhdGVzL3ZpdGUvYmFzZS52aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBidWlsZDoge1xuICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgfSxcbn0pO1xuIiwgIntcbiAgXCJwcml2YXRlXCI6IHRydWUsXG4gIFwibmFtZVwiOiBcIkB0cmlnZ2VyL3R5cGVzXCIsXG4gIFwidmVyc2lvblwiOiBcIjAuMC4xXCIsXG4gIFwibGljZW5zZVwiOiBcIk1JVFwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiU2hhcmVkIHR5cGUgZGVmaW5pdGlvbnNcIixcbiAgXCJhdXRob3JcIjogXCJUaW0gS2VuZHJpY2sgPHRpbWtlbmRyaWNrQGdtYWlsLmNvbT5cIixcbiAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gIFwibWFpblwiOiBcIi4vbGliLnRzXCIsXG4gIFwibW9kdWxlXCI6IFwiLi9saWIudHNcIixcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImJ1aWxkXCI6IFwicG5wbSBydW4gYnVpbGQ6bGliICYmIHBucG0gcnVuIGJ1aWxkOmRvY3MgJiYgcG5wbSBydW4gYnVpbGQ6cGtnXCIsXG4gICAgXCJidWlsZDpsaWJcIjogXCJ2aXRlIGJ1aWxkXCIsXG4gICAgXCJidWlsZDpkb2NzXCI6IFwidHlwZWRvY1wiLFxuICAgIFwiYnVpbGQ6cGtnXCI6IFwicG5wbSBydW4gLS1maWx0ZXIgYnVpbGQtdG9vbHMgcGtnICRQV0QgJFBXRC9kaXN0L3BhY2thZ2UuanNvblwiLFxuICAgIFwibGludFwiOiBcInBucG0gcnVuICcvXmxpbnQ6LiovJ1wiLFxuICAgIFwibGludDplc2xpbnRcIjogXCJlc2xpbnQgLS1leHQganMsY2pzLG1qcyx0cyAuXCIsXG4gICAgXCJsaW50OnR5cGVzY3JpcHRcIjogXCJ0c2MgLS1ub0VtaXRcIlxuICB9LFxuICBcInBrZ1wiOiB7XG4gICAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gICAgXCJtYWluXCI6IFwiLi9saWIvbGliLmNqc1wiLFxuICAgIFwibW9kdWxlXCI6IFwiL2xpYi9saWIuanNcIixcbiAgICBcInR5cGVzXCI6IFwiLi9saWIuZC50c1wiLFxuICAgIFwiZXhwb3J0c1wiOiB7XG4gICAgICBcIi5cIjoge1xuICAgICAgICBcImltcG9ydFwiOiBcIi4vbGliL2xpYi5qc1wiLFxuICAgICAgICBcInJlcXVpcmVcIjogXCIuL2xpYi9saWIuY2pzXCJcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkB0cmlnZ2VyL3V0aWxzXCI6IFwid29ya3NwYWNlOipcIlxuICB9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAdHJpZ2dlci9idWlsZC1jb25maWdcIjogXCJ3b3Jrc3BhY2U6KlwiXG4gIH0sXG4gIFwicGVlckRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJlc2xpbnRcIjogXCJeOFwiLFxuICAgIFwidHlwZWRvY1wiOiBcIl4wLjI1XCIsXG4gICAgXCJ0eXBlc2NyaXB0XCI6IFwiXjVcIixcbiAgICBcInZpdGVcIjogXCJeNFwiXG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLE1BQU0sV0FBQUEsZ0JBQWU7QUFDOUIsU0FBUyxnQkFBQUMsZUFBYyxlQUFBQyxvQkFBbUI7OztBQ0Y2UCxTQUFTLGVBQWU7QUFDL1QsU0FBUyxnQkFBQUMsZUFBYyxlQUFBQyxvQkFBbUI7OztBQ0R1VSxTQUFTLGdCQUFBQyxlQUFjLGVBQUFDLG9CQUFtQjtBQUMzWixPQUFPLFNBQVM7OztBQ0RtVyxTQUFTLGdCQUFBQyxlQUFjLG1CQUFtQjs7O0FDQTFDLFNBQVMsb0JBQW9CO0FBRWhaLElBQU8sMkJBQVEsYUFBYTtBQUFBLEVBQzFCLE9BQU87QUFBQSxJQUNMLFdBQVc7QUFBQSxFQUNiO0FBQ0YsQ0FBQzs7O0FERkQsSUFBTSxlQUFlO0FBQUEsRUFDbkI7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0Y7QUFFQSxJQUFPLDJCQUFRO0FBQUEsRUFDYjtBQUFBLEVBQ0FDLGNBQWE7QUFBQSxJQUNYLE9BQU87QUFBQSxNQUNMLGVBQWU7QUFBQSxRQUNiLFVBQVUsQ0FBQyxHQUFHLGNBQWMsUUFBUTtBQUFBLE1BQ3RDO0FBQUEsSUFDRjtBQUFBLEVBQ0YsQ0FBQztBQUNIOzs7QUQ1QkEsSUFBTywwQkFBUUM7QUFBQSxFQUNiO0FBQUEsRUFDQUMsY0FBYTtBQUFBLElBQ1gsU0FBUztBQUFBLE1BQ1AsSUFBSTtBQUFBLFFBQ0YsU0FBUyxDQUFDLG1CQUFtQixlQUFlLGNBQWM7QUFBQSxNQUM1RCxDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0YsQ0FBQztBQUNIOzs7QUdkQTtBQUFBLEVBQ0UsU0FBVztBQUFBLEVBQ1gsTUFBUTtBQUFBLEVBQ1IsU0FBVztBQUFBLEVBQ1gsU0FBVztBQUFBLEVBQ1gsYUFBZTtBQUFBLEVBQ2YsUUFBVTtBQUFBLEVBQ1YsTUFBUTtBQUFBLEVBQ1IsTUFBUTtBQUFBLEVBQ1IsUUFBVTtBQUFBLEVBQ1YsU0FBVztBQUFBLElBQ1QsT0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsY0FBYztBQUFBLElBQ2QsYUFBYTtBQUFBLElBQ2IsTUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLElBQ2YsbUJBQW1CO0FBQUEsRUFDckI7QUFBQSxFQUNBLEtBQU87QUFBQSxJQUNMLE1BQVE7QUFBQSxJQUNSLE1BQVE7QUFBQSxJQUNSLFFBQVU7QUFBQSxJQUNWLE9BQVM7QUFBQSxJQUNULFNBQVc7QUFBQSxNQUNULEtBQUs7QUFBQSxRQUNILFFBQVU7QUFBQSxRQUNWLFNBQVc7QUFBQSxNQUNiO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWdCO0FBQUEsSUFDZCxrQkFBa0I7QUFBQSxFQUNwQjtBQUFBLEVBQ0EsaUJBQW1CO0FBQUEsSUFDakIseUJBQXlCO0FBQUEsRUFDM0I7QUFBQSxFQUNBLGtCQUFvQjtBQUFBLElBQ2xCLFFBQVU7QUFBQSxJQUNWLFNBQVc7QUFBQSxJQUNYLFlBQWM7QUFBQSxJQUNkLE1BQVE7QUFBQSxFQUNWO0FBQ0Y7OztBSjNDQSxJQUFNLG1DQUFtQztBQU96QyxJQUFPLHNCQUFRQztBQUFBLEVBQ2I7QUFBQSxFQUNBQyxjQUFhO0FBQUEsSUFDWCxPQUFPO0FBQUEsTUFDTCxLQUFLO0FBQUEsUUFDSCxPQUFPLFFBQVEsa0NBQVcsZ0JBQUksTUFBTTtBQUFBLFFBQ3BDLE1BQU0sZ0JBQUk7QUFBQSxRQUNWLFNBQVMsQ0FBQyxNQUFNLEtBQUs7QUFBQSxRQUNyQixVQUFVO0FBQUEsTUFDWjtBQUFBLElBQ0Y7QUFBQSxFQUNGLENBQUM7QUFDSDs7O0FEbkJBLElBQU1DLG9DQUFtQztBQU16QyxJQUFPLHdCQUFRQztBQUFBLEVBQ2I7QUFBQSxFQUNBQyxjQUFhO0FBQUEsSUFDWCxNQUFNO0FBQUEsTUFDSixNQUFNQyxTQUFRQyxtQ0FBVyxNQUFNLElBQUk7QUFBQSxNQUNuQyxTQUFTLENBQUMsS0FBS0EsbUNBQVcsa0NBQWtDLENBQUM7QUFBQSxJQUMvRDtBQUFBLEVBQ0YsQ0FBQztBQUNIOyIsCiAgIm5hbWVzIjogWyJyZXNvbHZlIiwgImRlZmluZUNvbmZpZyIsICJtZXJnZUNvbmZpZyIsICJkZWZpbmVDb25maWciLCAibWVyZ2VDb25maWciLCAiZGVmaW5lQ29uZmlnIiwgIm1lcmdlQ29uZmlnIiwgImRlZmluZUNvbmZpZyIsICJkZWZpbmVDb25maWciLCAibWVyZ2VDb25maWciLCAiZGVmaW5lQ29uZmlnIiwgIm1lcmdlQ29uZmlnIiwgImRlZmluZUNvbmZpZyIsICJfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSIsICJtZXJnZUNvbmZpZyIsICJkZWZpbmVDb25maWciLCAicmVzb2x2ZSIsICJfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSJdCn0K
