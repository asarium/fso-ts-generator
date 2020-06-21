import * as del from "del";
import * as fs from "fs";
import * as gulp from "gulp";
import * as ts from "gulp-typescript";
import {Gulpclass, SequenceTask, Task} from "gulpclass/Decorators";
import {compileFromFile} from "json-schema-to-typescript";

const tsProject = ts.createProject("./tsconfig.json");

@Gulpclass()
export class Gulpfile {

    @Task()
    async schemaToTypes() {
        const ts = await compileFromFile("src/schema/scripting.schema.json");

        await fs.promises.mkdir("build", {recursive: true});
        await fs.promises.writeFile("build/scripting.ts", ts);
    }

    @Task()
    ts() {
        return tsProject.src()
            .pipe(tsProject())
            .js.pipe(gulp.dest("dist"));
    }

    @Task()
    copySchema() {
        return gulp.src("./src/schema/*.json")
            .pipe(gulp.dest("./dist/schema/"));
    }

    @SequenceTask()
    default() {
        return ["schemaToTypes", "ts"];
    }

    @Task()
    clean() {
        return del([
            "dist",
            "build",
        ]);
    }
}
