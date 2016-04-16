'use strict';

var gulp = require('gulp'),
    ts = require('gulp-typescript'),
    sourcemaps = require('gulp-sourcemaps'),
    tslint = require('gulp-tslint'),
    del = require('del'),
    merge = require('merge2');  // Require separate installation

var tsProject = ts.createProject('tsconfig.json');

var tsSrc = 'src/**/*.ts';

gulp.task('clean-ts', function (cb) {
    // delete the files
    del(['dist/**/*.js', 'dist/**/*.js.map', 'dist/**/*.d.ts'], cb);
});

gulp.task('ts-lint', function () {
    return gulp.src([tsSrc]).pipe(tslint()).pipe(tslint.report('verbose'));
    //return gulp.src(tsSrc).pipe(tslint({ configuration: require("./tslint.json")})).pipe(tslint.report('prose'));
});

gulp.task('compile-ts', function () {
    var tsResults = gulp.src([tsSrc])
                        .pipe(sourcemaps.init())// This means sourcemaps will be generated
                        .pipe(ts(tsProject));
    return merge([
        tsResults.dts.pipe(gulp.dest('dist/definitions')),
        tsResults.js.pipe(sourcemaps.write())// Now the sourcemaps are added to the .js file
                    .pipe(gulp.dest('dist/js'))
    ]);
});

//TODO MGA: fix ts-lint step
gulp.task('default', ['clean-ts', 'compile-ts']);
//gulp.task('default', ['ts-lint', 'clean-ts', 'compile-ts']);
