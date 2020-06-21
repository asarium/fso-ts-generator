import {ClassDeclarationGenerator} from "./ClassDeclarationGenerator";
import {DeclarationGenerator, indentLine} from "./DeclarationGenerator";
import {NamespaceDeclarationGenerator} from "./NamespaceDeclarationGenerator";
import {fixTypeName, getHtmlLines} from "./ts_utils";

export class RootDeclarationGenerator implements DeclarationGenerator {
    private _lines: string[] = ["/** @noSelfInFile */"];

    declareConstant(name: string, type: string): void {
        this.addLine(`declare const ${name}: ${type};`);
    }

    beginNamespace(name: string, doc: string): NamespaceDeclarationGenerator {
        this.addLine("/**");
        for (const line of getHtmlLines(doc)) {
            this.addLine(` * ${line}`);
        }
        this.addLine(" */");
        // Only top level namespaces need the "declare"
        this.addLine(`declare namespace ${name} {`);

        return new NamespaceDeclarationGenerator(
            line => this.addLine(indentLine(line)),
            () => this.addLine("}"),
        );
    }

    beginClass(name: string, documentation: string, superClass?: string): ClassDeclarationGenerator {
        this.addLine("/**");
        for (const line of getHtmlLines(documentation)) {
            this.addLine(` * ${line}`);
        }
        this.addLine(" */");
        if (superClass !== undefined) {
            this.addLine(`declare interface ${fixTypeName(name)} extends ${fixTypeName(superClass)} {`);
        } else {
            this.addLine(`declare interface ${fixTypeName(name)} {`);
        }

        return new ClassDeclarationGenerator(
            line => this.addLine(indentLine(line)),
            () => this.addLine("}"),
        );
    }

    finalize(): string {
        return this._lines.join("\n");
    }

    private addLine(line: string): void {
        this._lines.push(line);
    }
}
