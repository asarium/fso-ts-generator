import {FunctionParameter, OverloadList, SimpleParameterList, TypeSpecifier} from "../../build/scripting";
import {isSimpleParameterList, isTupleType} from "../utils";

export function fixTypeName(typeName: string): string {
    if (typeName === "object") {
        // Can't name a class "object"
        return "object_fso";
    }

    if (typeName === "nil") {
        return "null";
    }

    if (typeName.includes("function")) {
        return "(...args: any[]) => any";
    }

    return typeName;
}

export function* getHtmlLines(text: string): Generator<string> {
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
        case "alternative":
            return type.elements.map(typeSpecifierToTypeScriptType).join("|");
        case "function":
            return `(${type.parameters.map(
                x => `${x.name}:${typeSpecifierToTypeScriptType(x.type)}`,
            )}) => ${typeSpecifierToTypeScriptType(type.returnType)}`;
    }
}

export function functionParamToString(param: FunctionParameter): string {
    return `${param.name}${param.optional ? "?" : ""}: ${typeSpecifierToTypeScriptType(param.type)}`;
}

function fixParameter(param: FunctionParameter): void {
    if (param.name === "class") {
        param.name = "clazz";
    }
}

export function outputFunction(
    addLine: (line: string) => void,
    returnType: TypeSpecifier,
    returnDoc: string,
    description: string,
    params: SimpleParameterList | OverloadList,
    name: string,
    addExport: boolean,
): void {
    if (isSimpleParameterList(params)) {
        outputSimpleFunction(addLine, returnType, returnDoc, description, params, name, addExport);
    } else {
        for (const overload of params) {
            let argCounter = 0;
            for (const param of overload) {
                if (param.name === "") {
                    param.name = `arg${argCounter}`;
                    ++argCounter;
                }
                fixParameter(param);
            }

            outputDescription(addLine, description);

            for (const param of overload) {
                addLine(` * @param ${param.name} ${param.description}`);
            }

            outputReturnType(addLine, returnType, returnDoc);

            addLine(
                `${addExport ? "export function " : ""}${name}(${overload
                    .map(p => functionParamToString(p))
                    .join(", ")}): ${typeSpecifierToTypeScriptType(returnType)};`,
            );
        }
    }
}

function outputReturnType(addLine: (line: string) => void, returnType: TypeSpecifier, returnDoc: string): void {
    addLine(` * @return ${returnDoc}`);
    if (isTupleType(returnType)) {
        addLine(" * @tupleReturn");
    }
    addLine(" */");
}

function outputDescription(addLine: (line: string) => void, description: string): void {
    addLine("/**");
    for (const line of getHtmlLines(description)) {
        addLine(` * ${line}`);
    }
}

function outputSimpleFunction(
    addLine: (line: string) => void,
    returnType: TypeSpecifier,
    returnDoc: string,
    description: string,
    params: string,
    name: string,
    addExport: boolean,
): void {
    outputDescription(addLine, description);

    addLine(` * @param {any[]} args ${params}`);

    outputReturnType(addLine, returnType, returnDoc);

    addLine(
        `${addExport ? "export function " : ""}${name}(...args: any[]): ${typeSpecifierToTypeScriptType(returnType)};`,
    );
}
