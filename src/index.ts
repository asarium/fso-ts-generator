
import {
    ClassDeclarationGenerator,
    NamespaceDeclarationGenerator,
    RootDeclarationGenerator, typeSpecifierToTypeScriptType
} from "./DeclarationGenerator";
import Ajv from "ajv";
import betterAjvErrors, {IOutputError} from "better-ajv-errors";
import {
    CallElement, ClassElement,
    DocumentationElement, LibraryElement, PropertyElement,
    ScriptingDocumentation,
    TypeSpecifier
} from "scripting";

import scriptingSchema from "./schema/scripting.schema.json";

function writeLibraryElementDoc(generator: RootDeclarationGenerator | NamespaceDeclarationGenerator,
                                element: LibraryElement): void {
    let name = element.shortName;
    if (name == "") {
        name = element.name;
    }

    if (name == "hv" && generator instanceof RootDeclarationGenerator) {
        generator.declareConstant("hv", "{[index:string]: any;}")
    } else {
        let namespaceGen = generator.beginNamespace(name, element.description);

        for (const child of element.children) {
            writeNamespaceDoc(namespaceGen, child);
        }

        namespaceGen.finalize();
    }
}

function writeFunctionElementDoc(generator: NamespaceDeclarationGenerator | ClassDeclarationGenerator,
                                 element: CallElement): void {
    generator.function(element.returnType,
                       element.returnDocumentation,
                       element.description,
                       element.parameters,
                       element.name);
}

function writePropertyElementDoc(generator: ClassDeclarationGenerator,
                                 element: PropertyElement): void {
    // Accessors
    generator.getter(element.name, element.getterType, element.description, element.returnDocumentation);
}

function hasChild(el: DocumentationElement, name: string): boolean {
    return el.children.some(value => value.name === name);
}

function isArrayType(cls: ClassElement): boolean {
    return hasChild(cls, "__indexer") && hasChild(cls, "__len");
}

function getArrayElementType(cls: ClassElement): TypeSpecifier {
    const indexer = cls.children.find(el => el.name === "__indexer");

    if (indexer === undefined) {
        throw new Error("getArrayElementType called on type without an indexer!");
    }

    if (indexer.type !== "operator") {
        throw new Error("Indexer type is not an operator!");
    }

    return indexer.returnType;
}

function writeClassElementDoc(generator: RootDeclarationGenerator, element: ClassElement) {
    let classGen;
    if (isArrayType(element) && element.superClass.length == 0) {
        classGen = generator.beginClass(element.name,
                                        element.description,
                                        `Array<${typeSpecifierToTypeScriptType(getArrayElementType(element))}>`);
    } else {
        if (element.superClass.length == 0) {
            classGen = generator.beginClass(element.name, element.description)
        } else {
            classGen = generator.beginClass(element.name, element.description, element.superClass)
        }
    }

    for (const child of element.children) {
        writeClassDoc(classGen, child);
    }

    classGen.finalize();
}

function writeOperatorElementDoc(generator: ClassDeclarationGenerator, element: CallElement) {
    if (element.name == "__indexer") {
        generator.indexer(element.description, element.parameters, element.returnType, element.returnDocumentation);
    } else if (element.name == "__tostring") {
        generator.function(element.returnType,
                           element.returnDocumentation,
                           element.description,
                           element.parameters,
                           "toString");
    }
}

function writeClassDoc(generator: ClassDeclarationGenerator,
                       element: DocumentationElement): void {
    switch (element.type) {
        case "property":
            writePropertyElementDoc(generator, element);
            break;
        case "function":
            writeFunctionElementDoc(generator, element);
            break;
        case "operator":
            writeOperatorElementDoc(generator, element);
            break;
        default:
            throw new Error("Found invalid type in class!");
    }
}

function writeLibraryPropertyDoc(generator: NamespaceDeclarationGenerator, element: PropertyElement) {
    generator.declareProperty(element.name, element.getterType, element.description, element.returnDocumentation);
}

function writeNamespaceDoc(generator: NamespaceDeclarationGenerator,
                           element: DocumentationElement): void {
    switch (element.type) {
        case "library":
            writeLibraryElementDoc(generator, element);
            break;
        case "property":
            writeLibraryPropertyDoc(generator, element);
            break;
        case "function":
            writeFunctionElementDoc(generator, element);
            break;
        case "operator":
            break;
        default:
            throw new Error("Found invalid type in library!");
    }
}

function writeRootDoc(generator: RootDeclarationGenerator,
                      element: DocumentationElement): void {
    switch (element.type) {
        case "library":
            writeLibraryElementDoc(generator, element);
            break;
        case "class":
            writeClassElementDoc(generator, element);
            break;
        default:
            throw new Error("Found invalid type in root!");
    }
}

export class ValidationError extends Error {
    constructor(public validationErrors: IOutputError[]) {
        super("Validation error");
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

function validateScriptingDoc<T>(json_content: T): void {
    const ajv = new Ajv({jsonPointers: true});
    if (ajv.validate(scriptingSchema, json_content)) {
        return;
    }

    const output = betterAjvErrors(scriptingSchema, json_content, ajv.errors, {indent: 4});
    throw new ValidationError(output as IOutputError[]);
}

export function generateDefinitions(documentation_content: string): string {
    const scripting: ScriptingDocumentation = JSON.parse(documentation_content);

    validateScriptingDoc(scripting);

    const generator = new RootDeclarationGenerator();

    for (const e in scripting.enums) {
        generator.declareConstant(e, "enumeration");
    }
    for (const el of scripting.elements) {
        writeRootDoc(generator, el);
    }

    return generator.finalize();
}
