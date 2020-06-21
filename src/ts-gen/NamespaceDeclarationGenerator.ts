import {OverloadList, SimpleParameterList, TypeSpecifier} from "../../build/scripting";
import {BaseDeclarationGenerator, indentLine} from "./DeclarationGenerator";
import {isTupleType} from "../utils";
import {typeSpecifierToTypeScriptType, getHtmlLines, outputFunction} from "./ts_utils";

export class NamespaceDeclarationGenerator extends BaseDeclarationGenerator {
    function(
        returnType: TypeSpecifier,
        returnDoc: string,
        description: string,
        params: SimpleParameterList | OverloadList,
        name: string,
    ): void {
        outputFunction((s: string) => this.addLine(s), returnType, returnDoc, description, params, name, true);
    }

    beginNamespace(name: string, doc: string): NamespaceDeclarationGenerator {
        this.addLine("/**");
        for (const line of getHtmlLines(doc)) {
            this.addLine(` * ${line}`);
        }
        this.addLine(" */");
        // Only top level namespaces need the "declare"
        this.addLine(`namespace ${name} {`);

        return new NamespaceDeclarationGenerator(
            line => this.addLine(indentLine(line)),
            () => this.addLine("}"),
        );
    }

    declareProperty(name: string, type: TypeSpecifier, documentation: string, returnDoc: string): void {
        this.addLine("/**");
        for (const line of getHtmlLines(documentation)) {
            this.addLine(` * ${line}`);
        }
        this.addLine(` * @type {${typeSpecifierToTypeScriptType(type)}} ${returnDoc}`);
        if (isTupleType(type)) {
            this.addLine(" * @tupleReturn");
        }
        this.addLine(" */");
        this.addLine(`export let ${name}: ${typeSpecifierToTypeScriptType(type)};`);
    }
}
