/* eslint-disable no-console */
import {CommandLineAction, CommandLineChoiceParameter, CommandLineStringParameter} from "@rushstack/ts-command-line";
import {promises as fs} from "fs";
import {ScriptingDocumentation} from "../ScriptingDocumentation";
import {ValidationError} from "../ValidationError";

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

export class GenerateAction extends CommandLineAction {
    private _target?: CommandLineChoiceParameter;
    private _json?: CommandLineStringParameter;
    private _output?: CommandLineStringParameter;

    constructor() {
        super({
            actionName: "generate",
            summary: "Generates type definitions",
            documentation:
                "Reads the JSON definition of the FreeSpace Open scripting API documentation and generates type definitions for various targets",
        });
    }

    protected onDefineParameters(): void {
        this._target = this.defineChoiceParameter({
            parameterLongName: "--target",
            description: "Specify the target",
            alternatives: ["lua", "typescript"],
            environmentVariable: "GENERATOR_TARGET",
            defaultValue: "typescript",
        });
        this._json = this.defineStringParameter({
            argumentName: "JSON",
            parameterLongName: "--json",
            parameterShortName: "-j",
            description: "The path to the API definition",
            required: true,
        });
        this._output = this.defineStringParameter({
            argumentName: "OUTPUT",
            parameterLongName: "--output",
            parameterShortName: "-o",
            description: "The path to the file where to write the API definition",
            required: true,
        });
    }

    protected async onExecute(): Promise<void> {
        if (!this._json || !this._output || !this._target) {
            return;
        }
        if (!this._json.value || !this._output.value) {
            return;
        }

        try {
            await generateDefs(this._json.value, this._output.value, this._target.value === "lua");
        } catch (err) {
            if (err instanceof ValidationError) {
                console.log(err.validationErrors);
            } else if (err instanceof Error) {
                console.error(err.stack);
            } else {
                console.error(err);
            }
            process.exit(1);
        }
    }
}
