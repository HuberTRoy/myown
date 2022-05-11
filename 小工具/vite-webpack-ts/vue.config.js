const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      alias: {
        "@": "/src",
        store: "/src/store",
      },
    },
    plugins: [
      require("unplugin-auto-import/webpack")({
        imports: ["vue", "vue-router"],
        dts: false,
      }),
    ],
  },
});
