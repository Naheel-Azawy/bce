const path                 = require("path");
const fs                   = require("fs");
const webpack              = require("webpack");
const HtmlWebpackPlugin    = require("html-webpack-plugin");
const WebpackPwaManifest   = require("webpack-pwa-manifest");
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

function buildString() {
    let d = new Date();
    let ret = d.getFullYear() +
        d.getMonth().toString().padStart(2, '0') +
        d.getDate().toString().padStart(2, '0') +
        "-" +
        d.getHours().toString().padStart(2, '0') +
        d.getMinutes().toString().padStart(2, '0');
    return JSON.stringify(ret);
}

function ex(f, arch, name) {
    return {
        src: JSON.stringify(fs.readFileSync(`./examples/${f}.bca`).toString()),
        arch: JSON.stringify(arch), name: JSON.stringify(name)
    };
}

module.exports = env => {
    return {
        target:  "node",
        mode:    env.production ? "production" : "development",
        devtool: env.production ? undefined : "inline-source-map",

        entry: {
            index: "./src/ui-web/main.js",
            sw:    "./src/ui-web/sw.js",
            cli:   "./src/ui-cli/main.js",
            test:  "./src/test.js"
        },

        output: {
            path:     path.resolve(__dirname, "dist"),
            filename: "[name].bundle.js",
            clean:    true
        },

        resolve: {
            extensions: [".ts", ".js"],
        },

        module: {
            rules: [
                {test: /\.ts$/, loader: "ts-loader"},
                {test: /\.css$/, use: ["style-loader", "css-loader"]}
            ]
        },

        plugins: [
            new webpack.DefinePlugin({
                BUILD: buildString(),
                EXAMPLES: [
                    ex("mano-add", "Mano", "Adding example"),
                    ex("mano-mul", "Mano", "Multiplication example"),
                    ex("mano-io",  "Mano", "I/O example"),
                    ex("ben-add",  "Ben",  "Adding example"),
                    ex("ben-mul",  "Ben",  "Multiplication example"),
                ]
            }),

            new HtmlWebpackPlugin({
                template: "./src/ui-web/index.html",
                chunks:   ["index"]
            }),

            new WebpackPwaManifest({
                name:             "BCE",
                short_name:       "BCE",
                description:      "Basic Computer Emulator, by Naheel",
                background_color: "black",
                display:          "standalone",
                orientation:      "omit",
                fingerprints:     false,
                icons: [
                    {
                        src: path.resolve("./src/ui-web/icon.png"),
                        sizes: [96, 128, 192, 256, 384, 512]
                    },
                    {
                        src: path.resolve("./src/ui-web/icon.png"),
                        size: "512x512",
                        purpose: "maskable"
                    }
                ]
            }),

            new webpack.BannerPlugin({
                banner:  "#!/usr/bin/env node",
                include: "cli",
                raw:     true
            }),

            // new BundleAnalyzerPlugin()
        ]
    };
};
