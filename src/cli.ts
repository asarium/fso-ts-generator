import {promises as fs} from "fs";
import * as commandpost from "commandpost";
import {generateDefinitions, ValidationError} from "./index";

async function generateDefs(json_path: string, output_path: string): Promise<void> {
    console.log(`Generating definitions for ${json_path}.`);

    const jsonContent = await fs.readFile(json_path, {encoding: "utf-8"});

    const output = generateDefinitions(jsonContent);

    await fs.writeFile(output_path, output);
}

let root = commandpost
    .create<{ input: string[]; output: string[]; }, {}>("fso-ts-generator")
    .version("1.0.0", "-v, --version")
    .description("Generates TypeScript definitions from the FSO API documentation")
    .option("-i, --input <path>")
    .option("-o, --output <path>")
    .action((opts, _args) => {
        return generateDefs(opts.input[0], opts.output[0]);
    });

commandpost
    .exec(root, process.argv)
    .catch(err => {
        if (err instanceof ValidationError) {
            console.log(err.validationErrors);
        } else if (err instanceof Error) {
            console.error(err.stack);
        } else {
            console.error(err);
        }
        process.exit(1);
    });
