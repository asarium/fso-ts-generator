import {TupleType, TypeSpecifier} from "../../build/scripting";

const INDENTATION = "    ";

export type AddLineCallback = (line: string) => void;
export type FinalizeCallback = () => void;

export interface DeclarationGenerator {
    finalize: () => void;
}

export function fixTypeName(typeName: string): string {
    if (typeName === "object") {
        // Can't name a class "object"
        return "object_fso";
    }

    if (typeName.includes("function")) {
        return "(...args: any[]) => any";
    }

    return typeName;
}

export function* getHtmlLines(text: string) {
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
    }
}

export function isTuple(t: TypeSpecifier): t is TupleType {
    if (typeof t === "string") {
        return false;
    }

    return t.type === "tuple";
}

export function indentLine(line: string): string {
    return INDENTATION + line;
}

export abstract class BaseDeclarationGenerator implements DeclarationGenerator {
    private readonly _addLine: AddLineCallback;
    private readonly _finalize: FinalizeCallback;

    constructor(addLine: (line: string) => void, finalize: () => void) {
        this._addLine = addLine;
        this._finalize = finalize;
    }

    finalize() {
        return this._finalize();
    }

    protected addLine(line: string) {
        this._addLine(line);
    }
}

