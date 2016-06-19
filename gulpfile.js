var gulp = require("gulp");
var less = require("gulp-less");
gulp.task("less", function() {
    gulp.src("css/*.less").pipe(less()).pipe(gulp.dest("dist/css"));
});
gulp.task("watch", function() {
    gulp.watch("css/*.less", ["less"]);
});