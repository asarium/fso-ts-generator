import {
    DocumentationElement as SchemaDocumentationElement,
    OverloadList,
    TypeSpecifier,
} from "../build/scripting";

export type DocumentationElement = ClassElement | LibraryElement | CallElement | PropertyElement;

export interface BaseDocumentationElement {
    id: string;
    shortName: string;
    name: string;
    description: string;
    children: DocumentationElement[];
}

export interface ClassElement extends BaseDocumentationElement {
    type: "class";

    superClass: string;
}

export interface LibraryElement extends BaseDocumentationElement {
    type: "library";
}

export interface CallElement extends BaseDocumentationElement {
    type: "function" | "operator";

    parameters: OverloadList;
    returnDocumentation: string;
    returnType: TypeSpecifier;
}

export interface PropertyElement extends BaseDocumentationElement {
    type: "property";

    returnDocumentation: string;
    getterType: TypeSpecifier;
    setterType: TypeSpecifier;
}

export function convertSchemaElement(schemaEl: SchemaDocumentationElement, parentId: string): DocumentationElement {
    const id = `${parentId}-${schemaEl.name}`;
    const base = {
        id,

        shortName: schemaEl.shortName,
        name: schemaEl.name,
        description: schemaEl.description,

        children: schemaEl.children.map(e => convertSchemaElement(e, id)),
    };

    switch (schemaEl.type) {
        case "class":
            return {
                ...base,
                type: schemaEl.type,
                superClass: schemaEl.superClass,
            };
        case "library":
            return {
                ...base,
                type: schemaEl.type,
            };
        case "function":
        case "operator":
            return {
                ...base,
                type: schemaEl.type,
                parameters: schemaEl.parameters,
                returnDocumentation: schemaEl.returnDocumentation,
                returnType: schemaEl.returnType,
            };
        case "property":
            return {
                ...base,
                type: schemaEl.type,
                returnDocumentation: schemaEl.returnDocumentation,
                getterType: schemaEl.getterType,
                setterType: schemaEl.setterType,
            };
    }
}
