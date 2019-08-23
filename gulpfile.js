var gulp = require('gulp');
var less = require('gulp-less');
var browserSync = require('browser-sync').create();
var header = require('gulp-header');
var cleanCSS = require('gulp-clean-css');
var rename = require("gulp-rename");
var uglify = require('gulp-uglify');
var fs = require('fs');
var pkg = require('./package.json');
var jshint = require('gulp-jshint');
var requirejsOptimize = require('gulp-requirejs-optimize');
var sourcemaps = require('gulp-sourcemaps');

var jsFiles = 'src/js/*.js';

gulp.task('lint', function() {
  return gulp.src(jsFiles)
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

// Compile LESS files from /less into /css
gulp.task('less', function() {
    return gulp.src('src/less/main.less')
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/css'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

// Minify compiled CSS
gulp.task('minify-css', ['less'], function() {
    return gulp.src('dist/css/main.css')
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(cleanCSS({ compatibility: 'ie8' }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/css'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

gulp.task('minify-js', ['copy-lib'], function () {
    return gulp.src('src/js/app.js')
        .pipe(sourcemaps.init())
        .pipe(requirejsOptimize({
            wrap: true,
            name: '../../bower_components/almond/almond',
            include: 'app',
            paths: {
                text: '../../bower_components/requirejs-text/text',
                Ractive: '../../bower_components/ractive/ractive.min',
                signals: '../../bower_components/js-signals/dist/signals.min',
                hasher: '../../bower_components/hasher/dist/js/hasher.min',
                moment: '../../bower_components/moment/min/moment-with-locales.min',
                underscore: '../../bower_components/underscore/underscore-min',
            }
        }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/js'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

// Copy pages to dist
gulp.task('copy-html', function() {

    gulp.src(['*.html'])
        .pipe(gulp.dest('dist'))
})

// Copy pages to dist
gulp.task('copy-images', function() {
    gulp.src(['src/images/**/*'])
        .pipe(gulp.dest('dist/images'))
})

// Copy vendor libraries from /bower_components into /vendor
gulp.task('copy-lib', function() {

    gulp.src(['bower_components/bootstrap/dist/**/*', '!**/npm.js', '!**/bootstrap-theme.*', '!**/*.map'])
        .pipe(gulp.dest('dist/vendor/bootstrap'))

    gulp.src(['bower_components/font-awesome/advanced-options/use-with-node-js/fontawesome-free/css/all.min.css'])
        .pipe(gulp.dest('dist/vendor/font-awesome/css/'))

    gulp.src(['bower_components/font-awesome/advanced-options/use-with-node-js/fontawesome-free/webfonts/**/*'])
        .pipe(gulp.dest('dist/vendor/font-awesome/webfonts'))

    gulp.src(['bower_components/jquery/dist/jquery.js', 'bower_components/jquery/dist/jquery.min.js'])
        .pipe(gulp.dest('dist/vendor/jquery'))

    gulp.src(['node_modules/asciinema-player/resources/public/js/asciinema-player.js', 'node_modules/asciinema-player/resources/public/css/asciinema-player.css'])
        .pipe(gulp.dest('dist/vendor/asciinema'))
})

// Run everything
gulp.task('default', ['lint', 'copy-lib', 'minify-css', 'minify-js', 'copy-images', 'copy-html']);

// Configure the browserSync task
gulp.task('browserSync', function() {
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
})

// Dev task with browserSync
gulp.task('dev', ['default', 'browserSync'], function() {
    gulp.watch('src/less/*.less', ['less']);
    gulp.watch('src/images/*', ['copy-images']);
    gulp.watch('src/pages/*.html', ['minify-js']);
    gulp.watch('*.html', ['copy-html']);
    gulp.watch('src/js/*.js', ['minify-js']);

    gulp.watch('dist/css/*.css', ['minify-css']);

    // Reloads the browser whenever HTML or JS files change
    gulp.watch('dist/css/*.css', browserSync.reload);
    gulp.watch('dist/pages/*.html', browserSync.reload);
    gulp.watch('dist/*.html', browserSync.reload);
    gulp.watch('dist/js/*.js', browserSync.reload);
});
