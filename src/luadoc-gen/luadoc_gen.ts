/* eslint-disable prettier/prettier */
import {
    FunctionOverload,
    FunctionParameter,
    OverloadList,
    SimpleParameterList,
    TupleType,
    TypeSpecifier,
} from "../../build/scripting";
import {
    CallElement,
    ClassElement,
    DocumentationElement,
    LibraryElement,
    PropertyElement,
} from "../DocumentationElement";
import {ScriptingDocumentation} from "../ScriptingDocumentation";
import {LuaDocGenerator} from "./LuaDocGenerator";

function isTuple(t: TypeSpecifier): t is TupleType {
    if (typeof t === "string") {
        return false;
    }

    return t.type === "tuple";
}

function isSimpleOverloadList(list: SimpleParameterList | OverloadList): list is SimpleParameterList {
    return typeof list === "string";
}

function typeToString(type: TypeSpecifier): string {
    if (typeof type === "string") {
        return type;
    }

    switch (type.type) {
        case "list":
            return `${typeToString(type.element)}[]`;
        case "tuple":
            return type.elements.map(x => typeToString(x)).join(", ");
        case "iterator":
            return `fun(state:any, last:${typeToString(type.element)}):${typeToString(
                type.element,
            )}, any, ${typeToString(type.element)}`;
        case "map":
            return `table<${typeToString(type.key)}, ${typeToString(type.value)}>`;
        case "alternative":
            return type.elements.map(typeToString).join("|");
        case "function":
            return `fun(${type.parameters.map(x => `${x.name}: ${typeToString(x.type)}`).join(", ")}): ${typeToString(
                type.returnType,
            )}`;
    }
}

function shortElName(el: DocumentationElement): string {
    if (el.shortName.length > 0) {
        return el.shortName;
    }

    return el.name;
}

function join(parent: string, child: string, parentEl?: DocumentationElement): string {
    if (parent.length > 0) {
        return `${parent}${parentEl && parentEl.type === "class" ? ":" : "."}${child}`;
    }
    return child;
}

function writeMultiLineString(str: string, gen: LuaDocGenerator): void {
    for (const desc of str.split("<br>")) {
        gen.addLine(`--- ${desc}`);
    }
}

function fillOutIncompleteParam(param: FunctionParameter, annonymousParameterGenerator: () => string): void {
    if (param.name.length <= 0) {
        param.name = annonymousParameterGenerator();
    }

    // Fix parameters that use lua keywords
    if (["if", "then", "else", "local", "while", "do", "end"].includes(param.name)) {
        param.name += "Arg";
    }
}

function generateOverloadList(
    gen: LuaDocGenerator,
    overload: FunctionOverload,
    returnType: TypeSpecifier,
    annonymousParameterGenerator: () => string,
    foundParameter: (param: FunctionParameter) => void,
): void {
    // Handle the easy case
    if (overload.length <= 0) {
        gen.addLine(`--- @overload fun():${typeToString(returnType)}`);
        return;
    }

    // If we have optional parameters we need to generate one overload with each additional optional parameter
    const actualOverloads = new Array<FunctionOverload>();

    for (const param of overload) {
        // Fill in a name in case this does not have one
        fillOutIncompleteParam(param, annonymousParameterGenerator);
        foundParameter(param);
    }

    if (overload.every(x => !x.optional)) {
        // If there are no optional params then we can simplify this a bit
        actualOverloads.push(overload);
    } else {
        // Now we know that we will see an optional parameter at some point
        const currentOverload: FunctionOverload = [];
        let sawOptional = false;
        for (const param of overload) {
            if (!sawOptional && param.optional) {
                // We just entered into the optional parameter section. We push the previous overload since that
                // contains all required parameters
                actualOverloads.push([...currentOverload]);
                sawOptional = true;
            }
            // Build up our overload
            currentOverload.push(param);
            if (param.optional) {
                // If we have optional parameters than every additional parameter is its own overload
                actualOverloads.push([...currentOverload]);
            }
        }
    }

    const paramToString = (param: FunctionParameter): string => {
        return `${param.name}:${typeToString(param.type)}`;
    };

    // Remove last element since that will be handled by the actually generated function
    actualOverloads.pop();

    for (const actualOverload of actualOverloads) {
        gen.addLine(`--- @overload fun(${actualOverload.map(paramToString).join(", ")}):${typeToString(returnType)}`);
    }

    return;
}

function writeFunctionElementWithSimpleParams(
    parentName: string,
    gen: LuaDocGenerator,
    func: CallElement,
    parent?: DocumentationElement,
): void {
    writeMultiLineString(func.description, gen);
    if (isSimpleOverloadList(func.parameters)) {
        if (func.parameters.length > 0) {
            gen.addLine(`--- @overload fun(${func.parameters}):${typeToString(func.returnType)}`);
        }
    }

    gen.addLine(`--- @return ${typeToString(func.returnType)} ${func.returnDocumentation}`);

    if (func.parameters.length > 0) {
        gen.addLine(`function ${join(parentName, func.name, parent)}(...) end`);
    } else {
        gen.addLine(`function ${join(parentName, func.name, parent)}() end`);
    }
}

function writeFunctionElement(
    parentName: string,
    gen: LuaDocGenerator,
    func: CallElement,
    parent?: DocumentationElement,
): void {
    if (isSimpleOverloadList(func.parameters)) {
        writeFunctionElementWithSimpleParams(parentName, gen, func, parent);
        return;
    }

    for (const overload of func.parameters) {
        writeMultiLineString(func.description, gen);
        const parameterDoc = new Map<String, FunctionParameter>();

        let unnamedArgCounter = 0;
        generateOverloadList(
            gen,
            overload,
            func.returnType,
            () => `arg${unnamedArgCounter++}`,
            param => parameterDoc.set(param.name, param),
        );

        const sortedParams = Array.from(parameterDoc.values()).sort((left, right) =>
            left.name.localeCompare(right.name),
        );
        for (const param of sortedParams) {
            if (param.default.length > 0) {
                gen.addLine(
                    `--- @param ${param.name} ${typeToString(param.type)} ${param.description} Default value: ${
                        param.default
                    }`,
                );
            } else {
                gen.addLine(`--- @param ${param.name} ${typeToString(param.type)} ${param.description}`);
            }
        }

        if (isTuple(func.returnType)) {
            for (const tupleEl of func.returnType.elements) {
                gen.addLine(`--- @return ${typeToString(tupleEl)} ${func.returnDocumentation}`);
            }
        } else {
            gen.addLine(`--- @return ${typeToString(func.returnType)} ${func.returnDocumentation}`);
        }

        gen.addLine(`function ${join(parentName, func.name, parent)}(${overload.map(x => x.name).join(", ")}) end`);
    }
}

function writePropertyElement(parentName: string, gen: LuaDocGenerator, prop: PropertyElement): void {
    writeMultiLineString(prop.description, gen);
    gen.addLine(`--- @type ${typeToString(prop.getterType)}`);
    gen.addLine(`${join(parentName, prop.name)} = nil`);
}

function writeChildren(parentName: string, element: DocumentationElement, gen: LuaDocGenerator): void {
    // Properties first
    for (const el of element.children.filter(x => x.type === "property")) {
        writeElement(join(parentName, shortElName(element)), gen, el, element);
    }
    for (const el of element.children.filter(x => x.type !== "property")) {
        writeElement(join(parentName, shortElName(element)), gen, el, element);
    }
}

function writeLibrary(parentName: string, gen: LuaDocGenerator, lib: LibraryElement): void {
    gen.addLine(`--- (${lib.name}) ${lib.description}`);
    gen.addLine(`${join(parentName, shortElName(lib))} = {}`);

    writeChildren(parentName, lib, gen);
}

function writeClass(parentName: string, gen: LuaDocGenerator, cls: ClassElement): void {
    writeMultiLineString(cls.description, gen);
    if (cls.superClass.length > 0) {
        gen.addLine(`--- @class ${cls.name} : ${cls.superClass}`);
    } else {
        gen.addLine(`--- @class ${cls.name}`);
    }
    gen.addLine(`local ${join(parentName, shortElName(cls))} = {}`);

    writeChildren(parentName, cls, gen);
}

function writeElement(
    parentName: string,
    gen: LuaDocGenerator,
    el: DocumentationElement,
    parent?: DocumentationElement,
): void {
    switch (el.type) {
        case "class":
            writeClass(parentName, gen, el);
            break;
        case "library":
            writeLibrary(parentName, gen, el);
            break;
        case "operator":
        case "function":
            writeFunctionElement(parentName, gen, el, parent);
            break;
        case "property":
            writePropertyElement(parentName, gen, el);
            break;
    }
}

function processTopLevelElements(gen: LuaDocGenerator, docu: ScriptingDocumentation): void {
    for (const lib of docu.elements.filter(el => el.type === "class")) {
        writeElement("", gen, lib);
    }
    for (const lib of docu.elements.filter(el => el.type === "library")) {
        writeElement("", gen, lib);
    }
}

function processEnums(docGen: LuaDocGenerator, docu: ScriptingDocumentation): void {
    for (const enumName in docu.enums) {
        docGen.addLine("--- @type enumeration");
        docGen.addLine(`${enumName} = nil`);
    }
}

export function generateDefinitions(docu: ScriptingDocumentation): string {
    const docGen = new LuaDocGenerator();

    processEnums(docGen, docu);

    processTopLevelElements(docGen, docu);

    return docGen.finalize();
}