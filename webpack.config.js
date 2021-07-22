const path               = require("path");
const fs                 = require("fs");
const webpack            = require("webpack");
const HtmlWebpackPlugin  = require("html-webpack-plugin");
const WebpackPwaManifest = require("webpack-pwa-manifest");

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

function ex(f) {
    return JSON.stringify(fs.readFileSync(`./examples/${f}.bca`).toString());
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
                BUILD:           buildString(),
                EXAMPLE_AC_ADD:  ex("ac-add"),
                EXAMPLE_AC_MUL:  ex("ac-mul"),
                EXAMPLE_AC_IO:   ex("ac-io"),
                EXAMPLE_BEN_ADD: ex("ben-add"),
                EXAMPLE_BEN_MUL: ex("ben-mul"),
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
            })
        ]
    };
};
