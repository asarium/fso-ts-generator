import {TypeSpecifier} from "../../build/scripting";
import {
    AddLineCallback,
    BaseDeclarationGenerator,
    FinalizeCallback,
    getHtmlLines,
    isTuple,
    typeSpecifierToTypeScriptType,
} from "./DeclarationGenerator";

export class ClassDeclarationGenerator extends BaseDeclarationGenerator {
    constructor(addLine: AddLineCallback, finalize: FinalizeCallback) {
        super(addLine, finalize);
    }

    function(
        returnType: TypeSpecifier,
        returnDoc: string,
        description: string,
        params: string,
        name: string): void {
        this.addLine("/**");
        for (const line of getHtmlLines(description)) {
            this.addLine(` * ${line}`);
        }

        if (params.length !== 0) {
            // Handle the simple case of no parameters
            this.addLine(` * @param {any[]} args ${params}`);
        }
        this.addLine(` * @return {${typeSpecifierToTypeScriptType(returnType)}} ${returnDoc}`);
        if (isTuple(returnType)) {
            this.addLine(" * @tupleReturn");
        }
        this.addLine(" */");
        if (name === "read" && isTuple(returnType) && returnType.elements[1] === "...") {
            // This is a very special case for file.read since we can't really express the return type in the
            // documentation
            this.addLine(`${name}<T>(arg: T): T;`);
        } else {
            if (params.length === 0) {
                // We can handle no parameters just fine without proper parameter list support
                this.addLine(`${name}(): ${typeSpecifierToTypeScriptType(returnType)};`);
            } else {
                this.addLine(`${name}(...args: any[]): ${typeSpecifierToTypeScriptType(returnType)};`);
            }
        }
    }

    getter(name: string, type: TypeSpecifier, description: string, returnDoc: string): void {
        this.addLine("/**");
        for (const line of getHtmlLines(description)) {
            this.addLine(` * ${line}`);
        }
        this.addLine(` * @type {${typeSpecifierToTypeScriptType(type)}} ${returnDoc}`);
        if (isTuple(type)) {
            this.addLine(" * @tupleReturn");
        }
        this.addLine(" */");
        // Accessors are not supported in declaration files for some reason...
        this.addLine(`${name}: ${typeSpecifierToTypeScriptType(type)};`);
    }

    indexer(description: string, params: string, returnType: TypeSpecifier, returnDoc: string): void {
        this.addLine("/**");
        for (const line of getHtmlLines(description)) {
            this.addLine(` * ${line}`);
        }

        this.addLine(` * @param {${params}} index Index value`);

        this.addLine(` * @return {${typeSpecifierToTypeScriptType(returnType)}} ${returnDoc}`);
        this.addLine(" */");
        this.addLine(`[index: string]: any;`);
    }
}
