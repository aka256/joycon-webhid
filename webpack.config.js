const path = require('path');

module.exports = {
    // production or development
    mode: 'development',

    // メインとなるJavaScriptファイル（エントリーポイント）
    entry: {
      operationTester: './src/optester_main.ts',
    },
    module: {
        rules: [{
            // 拡張子 .ts の場合
            test: /\.ts$/,
            // TypeScript をコンパイルする
            use: 'ts-loader',
        }, ],
    },

    resolve: {
        extensions: [
            '.ts', '.js',
        ],
    },
    /*
    output: {
        filaname: 'main.js',
        path: path.join(__dirname, 'build')
    }*/
};