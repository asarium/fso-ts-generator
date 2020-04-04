import {TypeSpecifier} from "../../build/scripting";
import {
    AddLineCallback,
    BaseDeclarationGenerator,
    FinalizeCallback,
    getHtmlLines,
    indentLine,
    isTuple,
    typeSpecifierToTypeScriptType,
} from "./DeclarationGenerator";

export class NamespaceDeclarationGenerator extends BaseDeclarationGenerator {
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

        this.addLine(` * @param {any[]} args ${params}`);
        this.addLine(` * @return {${typeSpecifierToTypeScriptType(returnType)}} ${returnDoc}`);
        if (isTuple(returnType)) {
            this.addLine(" * @tupleReturn");
        }
        this.addLine(" */");
        this.addLine(`export function ${name}(...args: any[]): ${typeSpecifierToTypeScriptType(returnType)};`);
    }

    beginNamespace(name: string, doc: string): NamespaceDeclarationGenerator {
        this.addLine("/**");
        for (const line of getHtmlLines(doc)) {
            this.addLine(` * ${line}`);
        }
        this.addLine(" */");
        // Only top level namespaces need the "declare"
        this.addLine(`namespace ${name} {`);

        return new NamespaceDeclarationGenerator((line) => this.addLine(indentLine(line)),
            () => this.addLine("}"));
    }

    declareProperty(name: string, type: TypeSpecifier, documentation: string, returnDoc: string): void {
        this.addLine("/**");
        for (const line of getHtmlLines(documentation)) {
            this.addLine(` * ${line}`);
        }
        this.addLine(` * @type {${typeSpecifierToTypeScriptType(type)}} ${returnDoc}`);
        if (isTuple(type)) {
            this.addLine(" * @tupleReturn");
        }
        this.addLine(" */");
        this.addLine(`export let ${name}: ${typeSpecifierToTypeScriptType(type)};`);
    }
}
