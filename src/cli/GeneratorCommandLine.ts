import {CommandLineParser} from "@rushstack/ts-command-line";
import {GenerateAction} from "./GenerateAction";

export class GeneratorCommandLine extends CommandLineParser {
    constructor() {
        super({
            toolFilename: "fso-typings",
            toolDescription: "Generates type definitions for FreeSpace Open scripting API",
        });

        this.addAction(new GenerateAction());
    }

    protected onDefineParameters(): void {}
}
