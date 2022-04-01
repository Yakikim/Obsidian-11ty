var gulp = require('gulp'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    umd = require('gulp-umd');

gulp.task('default', function() {
    return gulp.src('source/*.js')
        .pipe(umd({
            exports: function () {
                return 'hash';
            },
            namespace: function () {
                return 'hash';
            }
        }))
        .pipe(gulp.dest('build'))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(uglify())
        .pipe(gulp.dest('build'));
});