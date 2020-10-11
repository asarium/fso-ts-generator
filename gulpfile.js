const del = require("del");
const fs = require("fs");
const gulp = require("gulp");
const ts = require("gulp-typescript");
const sourcemaps = require('gulp-sourcemaps');
const { compileFromFile } = require("json-schema-to-typescript");

const tsProject = ts.createProject("./tsconfig.json");

gulp.task("schemaToTypes", async () => {
	const ts = await compileFromFile("src/schema/scripting.schema.json");

	await fs.promises.mkdir("build", { recursive: true });
	await fs.promises.writeFile("build/scripting.ts", ts);
});

gulp.task("copySchema", () => {
	return gulp.src("./src/schema/*.json").pipe(gulp.dest("./dist/src/schema/"));
});

gulp.task("ts", () => {
	return tsProject.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject())
		.pipe(sourcemaps.write(".", { includeContent: false, sourceRoot: '../src' }))
		.pipe(gulp.dest("dist"));
});

gulp.task("clean", () => {
	return del([
		"dist",
		"build",
	]);
});

gulp.task("default", gulp.series([gulp.parallel(["schemaToTypes", "copySchema"]), "ts"]));
