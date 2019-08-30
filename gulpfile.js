var gulp = require('gulp');
var less = require('gulp-less');
var browserSync = require('browser-sync').create();
var cleanCSS = require('gulp-clean-css');
var rename = require("gulp-rename");
var fs = require('fs');
var pkg = require('./package.json');
var jshint = require('gulp-jshint');
var requirejsOptimize = require('gulp-requirejs-optimize');
var sourcemaps = require('gulp-sourcemaps');

var jsFiles = 'src/js/*.js';

function lint() {
    return gulp.src(jsFiles)
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
}
gulp.task('lint', lint);

// Compile LESS files from /less into /css
function less_css() {
    return gulp.src('src/less/main.less')
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/css'))
}
gulp.task('less', less_css);

// Minify compiled CSS
function minify_css() {
    return gulp.src('dist/css/main.css')
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(cleanCSS({ compatibility: 'ie8' }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/css'))
}
gulp.task('minify-css', gulp.series(less_css, minify_css));

function optimize_js() {
    return gulp.src('src/js/app.js')
        .pipe(sourcemaps.init())
        .pipe(requirejsOptimize({
            wrap: true,
            name: '../../node_modules/almond/almond',
            include: 'app',
            paths: {
                text: '../../node_modules/requirejs-text/text',
                Ractive: '../../node_modules/ractive/ractive.min',
                signals: '../../node_modules/signals/dist/signals.min',
                hasher: '../../node_modules/hasher/dist/js/hasher.min',
                moment: '../../node_modules/moment/min/moment-with-locales.min',
                underscore: '../../node_modules/underscore/underscore-min',
            }
        }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/js'))
}
gulp.task('minify-js', gulp.series(copy_lib, optimize_js));

// Copy pages to dist
function copy_html() {
    return gulp.src(['*.html'])
        .pipe(gulp.dest('dist'))
}

gulp.task('copy-html', copy_html)

// Copy vendor libraries from /node_modules into /vendor
function copy_lib(done) {
    gulp.src(['node_modules/bootstrap/dist/**/*', '!**/npm.js', '!**/bootstrap-theme.*', '!**/*.map'])
        .pipe(gulp.dest('dist/vendor/bootstrap'))

    gulp.src(['node_modules/@fortawesome/fontawesome-free/css/all.min.css'])
        .pipe(gulp.dest('dist/vendor/font-awesome/css/'))

    gulp.src(['node_modules/@fortawesome/fontawesome-free/webfonts/**/*'])
        .pipe(gulp.dest('dist/vendor/font-awesome/webfonts'))

    gulp.src(['node_modules/jquery/dist/jquery.js', 'node_modules/jquery/dist/jquery.min.js'])
        .pipe(gulp.dest('dist/vendor/jquery'))

    gulp.src(['node_modules/asciinema-player/resources/public/js/asciinema-player.js', 'node_modules/asciinema-player/resources/public/css/asciinema-player.css'])
        .pipe(gulp.dest('dist/vendor/asciinema'))
    done()
}
gulp.task('copy-lib', copy_lib)

// Run everything
gulp.task('default', gulp.parallel(lint, gulp.series(less_css, minify_css), gulp.series(copy_lib, optimize_js), copy_html))

//Browser sync init
function browser_sync() {
    browserSync.init({
        ui: {
            port: 3001,
        },
        port: 3000,
        server: {
            baseDir: 'dist'
        },
        open: false,
        logLevel: "debug",
        middleware: [
            function (req, res, next) {
                console.log("Requested :: ", req.method, req.url);
                next();
            },
        ]
    })
}

//Browser sync reload function
function reload(done) {
    browserSync.reload()
    done()
}

// Watch for changes
function watch_files() {
    gulp.watch('src/less/*.less', gulp.series(less_css, minify_css));
    gulp.watch('*.html', copy_html);
    gulp.watch('src/pages/*.html', optimize_js);
    gulp.watch('src/js/*.js', optimize_js);

    // Reloads the browser whenever HTML or JS files change
    gulp.watch('dist/css/*.css', reload);
    gulp.watch('dist/*.html', reload);
    gulp.watch('dist/js/*.js', reload);
}

// Dev task with browserSync
//gulp.task('dev', gulp.parallel(lint, gulp.series(less_css, minify_css), gulp.series(copy_lib, optimize_js), copy_html, watch_files, browser_sync))
gulp.task('dev', gulp.series('default', gulp.parallel(watch_files, browser_sync)))

