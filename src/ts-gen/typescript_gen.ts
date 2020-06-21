import {TypeSpecifier} from "../../build/scripting";
import {
    CallElement,
    ClassElement,
    DocumentationElement,
    LibraryElement,
    PropertyElement,
} from "../DocumentationElement";
import {ScriptingDocumentation} from "../ScriptingDocumentation";
import {ClassDeclarationGenerator} from "./ClassDeclarationGenerator";
import {NamespaceDeclarationGenerator} from "./NamespaceDeclarationGenerator";
import {RootDeclarationGenerator} from "./RootDeclarationGenerator";
import {typeSpecifierToTypeScriptType} from "./ts_utils";

function writeLibraryElementDoc(
    generator: RootDeclarationGenerator | NamespaceDeclarationGenerator,
    element: LibraryElement,
): void {
    let name = element.shortName;
    if (name === "") {
        name = element.name;
    }

    if (name === "hv" && generator instanceof RootDeclarationGenerator) {
        generator.declareConstant("hv", "{[index:string]: any;}");
    } else {
        const namespaceGen = generator.beginNamespace(name, element.description);

        for (const child of element.children) {
            writeNamespaceDoc(namespaceGen, child);
        }

        namespaceGen.finalize();
    }
}

function writeFunctionElementDoc(
    generator: NamespaceDeclarationGenerator | ClassDeclarationGenerator,
    element: CallElement,
): void {
    generator.function(
        element.returnType,
        element.returnDocumentation,
        element.description,
        element.parameters,
        element.name,
    );
}

function writePropertyElementDoc(generator: ClassDeclarationGenerator, element: PropertyElement): void {
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

function writeClassElementDoc(generator: RootDeclarationGenerator, element: ClassElement): void {
    let classGen;
    if (isArrayType(element) && element.superClass.length === 0) {
        classGen = generator.beginClass(
            element.name,
            element.description,
            `Array<${typeSpecifierToTypeScriptType(getArrayElementType(element))}>`,
        );
    } else {
        if (element.superClass.length === 0) {
            classGen = generator.beginClass(element.name, element.description);
        } else {
            classGen = generator.beginClass(element.name, element.description, element.superClass);
        }
    }

    for (const child of element.children) {
        writeClassDoc(classGen, child);
    }

    classGen.finalize();
}

function writeOperatorElementDoc(generator: ClassDeclarationGenerator, element: CallElement): void {
    if (element.name === "__indexer") {
        generator.indexer(element.description, element.parameters, element.returnType, element.returnDocumentation);
    } else if (element.name === "__tostring") {
        generator.function(
            element.returnType,
            element.returnDocumentation,
            element.description,
            element.parameters,
            "toString",
        );
    }
}

function writeClassDoc(generator: ClassDeclarationGenerator, element: DocumentationElement): void {
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
            throw new Error(`Unknown type ${element.type}`);
    }
}

function writeLibraryPropertyDoc(generator: NamespaceDeclarationGenerator, element: PropertyElement): void {
    generator.declareProperty(element.name, element.getterType, element.description, element.returnDocumentation);
}

function writeNamespaceDoc(generator: NamespaceDeclarationGenerator, element: DocumentationElement): void {
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

function writeRootDoc(generator: RootDeclarationGenerator, element: DocumentationElement): void {
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

export function generateDefinitions(docu: ScriptingDocumentation): string {
    const generator = new RootDeclarationGenerator();

    for (const e in docu.enums) {
        if (docu.enums.hasOwnProperty(e)) {
            generator.declareConstant(e, "enumeration");
        }
    }
    for (const el of docu.elements) {
        writeRootDoc(generator, el);
    }

    return generator.finalize();
}
