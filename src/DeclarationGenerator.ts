import {TupleType, TypeSpecifier} from "./scripting";

const INDENTATION = "    ";

type AddLineCallback = (line: string) => void;
type FinalizeCallback = () => void;

export interface DeclarationGenerator {
    finalize: () => void;
}

function fixTypeName(typeName: string): string {
    if (typeName == "object") {
        // Can't name a class "object"
        return "object_fso";
    }

    if (typeName.includes("function")) {
        return "(...args: any[]) => any";
    }

    return typeName;
}

function* getHtmlLines(text: string) {
    for (const line of text.split("<br>")) {
        yield line;
    }
}

export function typeSpecifierToTypeScriptType(type: TypeSpecifier): string {
    if (typeof type === "string") {
        return fixTypeName(type);
    }
    switch (type.type) {
        case "map":
            return `Map<${typeSpecifierToTypeScriptType(type.key)}, ${typeSpecifierToTypeScriptType(type.value)}>`;
        case "iterator":
            return `Iterable<${typeSpecifierToTypeScriptType(type.element)}>`;
        case "tuple":
            return `[${type.elements.map(element => typeSpecifierToTypeScriptType(element)).join(", ")}]`;
        case "list":
            return `Array<${typeSpecifierToTypeScriptType(type.element)}>`;
        default:
            throw new Error(`Unhandled type "${type.type}"`);
    }
}

function isTuple(t: TypeSpecifier): t is TupleType {
    if (typeof t === "string") {
        return false;
    }

    return t.type == "tuple";
}

export class ClassDeclarationGenerator implements DeclarationGenerator {
    private readonly _addLine: AddLineCallback;
    private readonly _finalize: FinalizeCallback;

    constructor(addLine: (line: string) => void, finalize: () => void) {
        this._addLine = addLine;
        this._finalize = finalize;
    }

    function(returnType: TypeSpecifier,
             returnDoc: string,
             description: string,
             params: string,
             name: string): void {
        this._addLine("/**");
        for (const line of getHtmlLines(description)) {
            this._addLine(` * ${line}`);
        }

        if (params.length !== 0) {
            // Handle the simple case of no parameters
            this._addLine(` * @param {any[]} args ${params}`);
        }
        this._addLine(` * @return {${typeSpecifierToTypeScriptType(returnType)}} ${returnDoc}`);
        if (isTuple(returnType)) {
            this._addLine(" * @tupleReturn");
        }
        this._addLine(" */");
        if (name === "read" && isTuple(returnType) && returnType.elements[1] === "...") {
            // This is a very special case for file.read since we can't really express the return type in the
            // documentation
            this._addLine(`${name}<T>(arg: T): T;`);
        } else {
            if (params.length === 0) {
                // We can handle no parameters just fine without proper parameter list support
                this._addLine(`${name}(): ${typeSpecifierToTypeScriptType(returnType)};`);
            } else {
                this._addLine(`${name}(...args: any[]): ${typeSpecifierToTypeScriptType(returnType)};`);
            }
        }
    }

    getter(name: string, type: TypeSpecifier, description: string, returnDoc: string): void {
        this._addLine("/**");
        for (const line of getHtmlLines(description)) {
            this._addLine(` * ${line}`);
        }
        this._addLine(` * @type {${typeSpecifierToTypeScriptType(type)}} ${returnDoc}`);
        if (isTuple(type)) {
            this._addLine(" * @tupleReturn");
        }
        this._addLine(" */");
        // Accessors are not supported in declaration files for some reason...
        this._addLine(`${name}: ${typeSpecifierToTypeScriptType(type)};`);
    }

    indexer(description: string, params: string, returnType: TypeSpecifier, returnDoc: string): void {
        this._addLine("/**");
        for (const line of getHtmlLines(description)) {
            this._addLine(` * ${line}`);
        }

        this._addLine(` * @param {${params}} index Index value`);

        this._addLine(` * @return {${typeSpecifierToTypeScriptType(returnType)}} ${returnDoc}`);
        this._addLine(" */");
        this._addLine(`[index: string]: any;`);
    }

    finalize() {
        return this._finalize();
    }
}

export class NamespaceDeclarationGenerator implements DeclarationGenerator {
    private readonly _addLine: AddLineCallback;
    private readonly _finalize: FinalizeCallback;


    constructor(addLine: (line: string) => void, finalize: () => void) {
        this._addLine = addLine;
        this._finalize = finalize;
    }

    function(returnType: TypeSpecifier,
             returnDoc: string,
             description: string,
             params: string,
             name: string): void {
        this._addLine("/**");
        for (const line of getHtmlLines(description)) {
            this._addLine(` * ${line}`);
        }

        this._addLine(` * @param {any[]} args ${params}`);
        this._addLine(` * @return {${typeSpecifierToTypeScriptType(returnType)}} ${returnDoc}`);
        if (isTuple(returnType)) {
            this._addLine(" * @tupleReturn");
        }
        this._addLine(" */");
        this._addLine(`export function ${name}(...args: any[]): ${typeSpecifierToTypeScriptType(returnType)};`);
    }

    beginNamespace(name: string, doc: string): NamespaceDeclarationGenerator {
        this._addLine("/**");
        for (const line of getHtmlLines(doc)) {
            this._addLine(` * ${line}`);
        }
        this._addLine(" */");
        // Only top level namespaces need the "declare"
        this._addLine(`namespace ${name} {`);

        return new NamespaceDeclarationGenerator((line) => this._addLine(INDENTATION + line), () => this._addLine("}"));
    }

    declareProperty(name: string, type: TypeSpecifier, documentation: string, returnDoc: string): void {
        this._addLine("/**");
        for (const line of getHtmlLines(documentation)) {
            this._addLine(` * ${line}`);
        }
        this._addLine(` * @type {${typeSpecifierToTypeScriptType(type)}} ${returnDoc}`);
        if (isTuple(type)) {
            this._addLine(" * @tupleReturn");
        }
        this._addLine(" */");
        this._addLine(`export let ${name}: ${typeSpecifierToTypeScriptType(type)};`)
    }

    finalize() {
        this._finalize();
    }
}

export class RootDeclarationGenerator implements DeclarationGenerator {
    private _lines: Array<string> = ["/** @noSelfInFile */"];

    constructor() {
    }

    private addLine(line: string) {
        this._lines.push(line)
    }

    declareConstant(name: string, type: string): void {
        this.addLine(`declare const ${name}: ${type};`)
    }

    beginNamespace(name: string, doc: string): NamespaceDeclarationGenerator {
        this.addLine("/**");
        for (const line of getHtmlLines(doc)) {
            this.addLine(` * ${line}`);
        }
        this.addLine(" */");
        // Only top level namespaces need the "declare"
        this.addLine(`declare namespace ${name} {`);

        return new NamespaceDeclarationGenerator((line) => this.addLine(INDENTATION + line), () => this.addLine("}"));
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

        return new ClassDeclarationGenerator((line) => this.addLine(INDENTATION + line), () => this.addLine("}"));
    }

    finalize(): string {
        return this._lines.join("\n");
    }
}
