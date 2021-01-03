import {OverloadList, TypeSpecifier} from "../../build/scripting";
import {isTupleType} from "../utils";
import {BaseDeclarationGenerator} from "./DeclarationGenerator";
import {getHtmlLines, outputFunction, typeSpecifierToTypeScriptType} from "./ts_utils";

export class ClassDeclarationGenerator extends BaseDeclarationGenerator {
    function(
        returnType: TypeSpecifier,
        returnDoc: string,
        description: string,
        params: OverloadList,
        name: string,
    ): void {
        if (name === "read" && isTupleType(returnType) && returnType.elements[1] === "...") {
            // This is a very special case for file.read since we can't really express the return type in the
            // documentation
            this.addLine("/**");
            for (const line of getHtmlLines(description)) {
                this.addLine(` * ${line}`);
            }
            this.addLine(` * @param arg ${params}`);
            this.addLine(` * @return ${returnDoc}`);
            if (isTupleType(returnType)) {
                this.addLine(" * @tupleReturn");
            }
            this.addLine(" */");
            this.addLine(`${name}<T>(arg: T): T;`);
        } else {
            outputFunction((s: string) => this.addLine(s), returnType, returnDoc, description, params, name, false);
        }
    }

    getter(name: string, type: TypeSpecifier, description: string, returnDoc: string): void {
        this.addLine("/**");
        for (const line of getHtmlLines(description)) {
            this.addLine(` * ${line}`);
        }
        this.addLine(` * @type {${typeSpecifierToTypeScriptType(type)}} ${returnDoc}`);
        if (isTupleType(type)) {
            this.addLine(" * @tupleReturn");
        }
        this.addLine(" */");
        // Accessors are not supported in declaration files for some reason...
        this.addLine(`${name}: ${typeSpecifierToTypeScriptType(type)};`);
    }

    indexer(
        description: string,
        params: OverloadList,
        returnType: TypeSpecifier,
        returnDoc: string,
    ): void {
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
