// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

// eslint-disable-next-line no-undef
module.exports = {

    devtool: 'source-map',

    // bundling mode
    mode: 'production',

    // entry files
    entry: {
        'index': './src/index.ts',
        'login': './src/login.ts',
        'service-worker': './src/service-worker.ts'
    },

    // output bundles (location)
    output: {
        // eslint-disable-next-line no-undef
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },

    // file resolutions
    resolve: {
        extensions: ['.ts', '.js'],
        extensionAlias: {
            '.js': ['.js', '.ts'],
        },
    },

    // loaders
    module: {
        rules: [
            {
                // eslint-disable-next-line require-unicode-regexp
                test: /\.tsx?/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true
                    }
                },
                exclude: '/node_modules/'
            },
            {
                test: /\.s[ac]ss$/iu,
                use: [
                    // Creates `style` nodes from JS strings
                    'style-loader',
                    // Translates CSS into CommonJS
                    'css-loader',
                    // Compiles Sass to CSS
                    'sass-loader',
                ],
                exclude: '/node_modules/'
            },
            {
                // Plain CSS (e.g. the Router UI stylesheet) — style-loader + css-loader
                // only, no sass parser (which would choke on modern CSS like color-mix()).
                test: /\.css$/iu,
                use: [
                    'style-loader',
                    'css-loader',
                ],
                exclude: '/node_modules/'
            }
        ]
    },

    // plugins
    plugins: [

        // run TSC on a separate thread
        new ForkTsCheckerWebpackPlugin()
    ],

    watch: false
};