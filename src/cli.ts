/* eslint-disable no-console */
import * as commandpost from "commandpost";
import {promises as fs} from "fs";
import {ScriptingDocumentation} from "./ScriptingDocumentation";
import {ValidationError} from "./ValidationError";

async function generateDefs(jsonPath: string, outputPath: string, lua: boolean): Promise<void> {
    console.log(`Generating ${lua ? "Lua" : "TypeScript"} definitions for ${jsonPath}.`);

    const jsonContent = await fs.readFile(jsonPath, {encoding: "utf-8"});

    const docObject = JSON.parse(jsonContent);

    const doc = ScriptingDocumentation.parseAndValidate(docObject);

    let output;
    if (lua) {
        output = doc.generateLuaDoc();
    } else {
        output = doc.generateTypings();
    }

    await fs.writeFile(outputPath, output);
}

const root = commandpost
    .create<{input: string[]; output: string[]; lua: boolean}, {}>("fso-ts-generator")
    .version("1.0.0", "-v, --version")
    .description("Generates TypeScript definitions from the FSO API documentation")
    .option("-l, --lua")
    .option("-i, --input <path>")
    .option("-o, --output <path>")
    .action(async opts => {
        return generateDefs(opts.input[0], opts.output[0], opts.lua);
    });

commandpost.exec(root, process.argv).catch(err => {
    if (err instanceof ValidationError) {
        console.log(err.validationErrors);
    } else if (err instanceof Error) {
        console.error(err.stack);
    } else {
        console.error(err);
    }
    process.exit(1);
});
