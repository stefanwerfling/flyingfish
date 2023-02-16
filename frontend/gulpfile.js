// eslint-disable-next-line @typescript-eslint/no-var-requires
const gulp = require('gulp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GetGoogleFonts = require('get-google-fonts');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpack = require('webpack');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpackConfig = require('./webpack.config.js');

const currentPath = './';
const assetsPath = `${currentPath}assets/`;

/**
 * copy-data
 * for frontend to assets
 */
gulp.task('copy-data', async function() {
    const downloadGoogleFont = async function() {
        const ggf = new GetGoogleFonts({
            outputDir: `${assetsPath}css/fonts`
        });

        console.log('Load Google fonts ...');

        await ggf.download('https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,400i,700&display=fallback');

        console.log('finish.');

        return true;
    };

    return gulp.src([
        `${currentPath}node_modules/admin-lte/plugins/**/*`
    ])
    .pipe(gulp.dest(`${assetsPath}plugins`))

    &&

    // single files
    gulp.src([
        `${currentPath}node_modules/admin-lte/dist/js/adminlte.js`
    ])
    .pipe(gulp.dest(assetsPath))

    &&

    gulp.src([
        `${currentPath}node_modules/ionicons-css/dist/**/*`
    ])
    .pipe(gulp.dest(`${assetsPath}ionicons-css`))

    &&

    gulp.src([
        `${currentPath}/node_modules/admin-lte/dist/css/**/*`
    ])
    .pipe(gulp.dest(`${assetsPath}css`))

    &&

    await downloadGoogleFont();
});

gulp.task('build-webpack', () => {
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line consistent-return
        webpack(webpackConfig, (err, stats) => {
            if (err) {
                return reject(err);
            }

            if (stats.hasErrors()) {
                return reject(new Error(stats.compilation.errors.join('\n')));
            }

            resolve();
        });
    });
});

// all builds
gulp.task('default', gulp.parallel('copy-data', 'build-webpack'));