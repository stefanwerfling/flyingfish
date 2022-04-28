const gulp = require('gulp');
const GetGoogleFonts = require('get-google-fonts');

/**
 * copy-data
 * for frontend to assets
 */
gulp.task('copy-data', async function() {
    var downloadGoogleFont = async function() {
        const ggf = new GetGoogleFonts({
            outputDir: '../frontend/assets/css/fonts',
        });

        await ggf.download('https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,400i,700&display=fallback')

        return true;
    }

    return gulp.src([
            '../frontend/node_modules/admin-lte/plugins/**/*'
        ])
        .pipe(gulp.dest('../frontend/assets/plugins'))

        &&

        // single files
        gulp.src([
            '../frontend/node_modules/admin-lte/dist/js/adminlte.js',
            '../frontend/node_modules/requirejs/require.js'
        ])
        .pipe(gulp.dest('../frontend/assets'))

        &&

        gulp.src([
            '../frontend/node_modules/ionicons-css/dist/**/*',
        ])
        .pipe(gulp.dest('../frontend/assets/ionicons-css'))

        &&

        gulp.src([
            '../frontend/node_modules/admin-lte/dist/css/**/*',
        ])
        .pipe(gulp.dest('../frontend/assets/css'))

        &&

        await downloadGoogleFont()
        ;
});

gulp.task('default', gulp.parallel('copy-data'));