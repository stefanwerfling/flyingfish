// eslint-disable-next-line @typescript-eslint/no-var-requires
const gulp = require('gulp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GetGoogleFonts = require('get-google-fonts');
// eslint-disable-next-line @typescript-eslint/no-var-requires
//const download = require('gulp-download-files');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpack = require('webpack');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpackConfig = require('./webpack.config.js');
const fs = require('fs');


const currentPath = './';
const collectionPath = './../';
const assetsPath = `${currentPath}assets/`;

const funcFindNodeModules = (nodesModuleName, subdir) => {
    const pathIn =  `${currentPath}node_modules/${nodesModuleName}`;

    try {
        // Query the entry
        const stats = fs.lstatSync(pathIn);

        // Is it a directory?
        if (stats.isDirectory()) {
            console.log(`Return path: ${pathIn}/${subdir}`);
            return `${pathIn}/${subdir}`;
        }
    }
    catch (e) {
        // ...
    }

    const pathOut =  `${collectionPath}node_modules/${nodesModuleName}`;

    try {
        // Query the entry
        const stats = fs.lstatSync(pathOut);

        // Is it a directory?
        if (stats.isDirectory()) {
            console.log(`Return path: ${pathOut}/${subdir}`);
            return `${pathOut}/${subdir}`;
        }
    }
    catch (e) {
        // ...
    }

    console.log(`Error: Path not found for module: ${nodesModuleName}`);
    throw new Error(`Path not found for module: ${nodesModuleName}`);
};

/**
 * copy-data
 * for frontend to assets
 */
gulp.task('copy-data', async() => {
    const downloadGoogleFont = async() => {
        const ggf = new GetGoogleFonts({
            outputDir: `${assetsPath}css/fonts`
        });

        console.log('Load Google fonts ...');

        await ggf.download('https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,400i,700&display=fallback');

        console.log('finish.');

        return true;
    };

    return gulp.src([
        funcFindNodeModules('admin-lte', 'plugins/**/*')
    ])
    .pipe(gulp.dest(`${assetsPath}plugins`))

    &&

    // single files
    gulp.src([
        funcFindNodeModules('admin-lte', 'dist/js/adminlte.js')
    ])
    .pipe(gulp.dest(assetsPath))

    &&

    gulp.src([
        funcFindNodeModules('ionicons-css', 'dist/**/*')
    ])
    .pipe(gulp.dest(`${assetsPath}ionicons-css`))

    &&

    gulp.src([
        funcFindNodeModules('admin-lte', 'dist/css/**/*'),
        funcFindNodeModules('ol', 'ol.css')
    ])
    .pipe(gulp.dest(`${assetsPath}css`))

    &&

    // await download('https://cablemap.info/cablemap.info.aspx').pipe(gulp.dest(assetsPath))

    // &&

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

// ---------------------------------------------------------------------------------------------------------------------

// all builds
gulp.task('default', gulp.parallel('copy-data', 'build-webpack'));