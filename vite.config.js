import vue from "@vitejs/plugin-vue2"
import { defineConfig } from "vite"
import WindiCSS from "vite-plugin-windicss"

export default () => {
  return defineConfig({
    base: "./",

    root: "demo",

    build: {
      target: "esnext",
    },

    plugins: [vue(), WindiCSS()],

    server: {
      port: 5173,
    },
  })
}
