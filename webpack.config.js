const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = () => {
    let config = {
        devServer: {
            contentBase: './dist',
            port: 80,
            host: '0.0.0.0',
            open: false
        },
        devtool: 'inline-source-map',
        entry: './src/js/index.js',
        mode: 'development',
        module: {
            rules: [
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        // Creates `style` nodes from JS strings
                        "style-loader",
                        // Translates CSS into CommonJS
                        "css-loader",
                        // Compiles Sass to CSS
                        "sass-loader",
                    ],
                },
                {
                    test: /\.(png|svg|jpg|jpeg|gif)$/i,
                    type: 'asset/resource',
                },
            ],
        },
        output: {
            filename: '[name].bundle.js',
            path: path.resolve(__dirname, 'dist'),
        },
        plugins: [
            new CleanWebpackPlugin(),
            new HtmlWebpackPlugin({
                favicon: './src/images/fox.ico',
                template: `./src/html/index.ejs`,
                filename: `index.html`,
                title: `Bluetooth Heartrate Over HTTP`,
            }),
        ],
    };

    return config;
};