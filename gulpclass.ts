import {Gulpclass, SequenceTask, Task} from "gulpclass/Decorators";
import {compileFromFile} from 'json-schema-to-typescript'
import * as fs from "fs";
import * as ts from "gulp-typescript";
import * as gulp from "gulp";
import * as del from "del";

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
                        .js.pipe(gulp.dest('dist'));
    }

    @Task()
    copySchema() {
        return gulp.src('./src/schema/*.json')
                   .pipe(gulp.dest('./dist/schema/'));
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
