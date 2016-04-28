'use strict';

var gulp = require('gulp'),
    ts = require('gulp-typescript'),
    sourcemaps = require('gulp-sourcemaps'),
    tslint = require('gulp-tslint'),
    del = require('del'),
    merge = require('merge2'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    ngAnnotate = require('gulp-ng-annotate');




var tsProject = ts.createProject('tsconfig.json');

var tsSrc = 'src/**/*.ts',
    tsExternalDefinitions = 'typings/**/*.d.ts';

gulp.task('clean-ts', function (cb) {
    // delete the files
    del(['dist/**/*.js', 'dist/**/*.js.map', 'dist/**/*.d.ts'], cb);
});

//TODO MGA: fix ts-lint task
gulp.task('ts-lint', function () {
    return gulp.src([tsSrc]).pipe(tslint()).pipe(tslint.report('verbose'));
    //return gulp.src(tsSrc).pipe(tslint({ configuration: require("./tslint.json")})).pipe(tslint.report('prose'));
});

gulp.task('compile-ts', function () {
    var tsResults = gulp.src([tsSrc, tsExternalDefinitions])
                        .pipe(sourcemaps.init())// This means sourcemaps will be generated
                        .pipe(ts(tsProject));
    return merge([
        tsResults.dts.pipe(concat('ng-http-wrapper.d.ts'))
                     .pipe(gulp.dest('dist/definitions')),
                     
        tsResults.js.pipe(sourcemaps.write())// Now the sourcemaps are added to the .js file //TODO MGA: sourcemaps too early ? or keep file separation in sourcemaps ?
                    //.pipe(concat('ng-http-wrapper.min.js'))
                    .pipe(concat('ng-http-wrapper.js'))//Comment uglify to get un-minified sources
                    .pipe(ngAnnotate())//TODO MGA : if done now, breaks sourcemaps ?
                    //.pipe(rename({ suffix: '.min' }))
                    //.pipe(uglify()) //Uncomment to activate minification TODO MGA: minification breaks ng-annotate & source-mappings. TOFIX.
                    .pipe(gulp.dest('dist/js'))
    ]);
});

//TODO MGA: fix ts-lint step
gulp.task('default', ['clean-ts', 'compile-ts']);
//gulp.task('default', ['ts-lint', 'clean-ts', 'compile-ts']);
