import Ajv from "ajv";
import betterAjvErrors, {IOutputError} from "better-ajv-errors";
import scriptingSchema from "./schema/scripting.schema.json";

import {
    DocumentationElement,
    ScriptingDocumentation as DocuSchema,
} from "../build/scripting";
import {generateDefinitions} from "./typescript_gen";

export class ValidationError extends Error {
    constructor(public validationErrors: IOutputError[]) {
        super("Validation error");
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

function validateScriptingDoc(json_content: unknown): DocuSchema {
    const ajv = new Ajv({jsonPointers: true});
    if (ajv.validate(scriptingSchema, json_content)) {
        return json_content as DocuSchema;
    }

    const output = betterAjvErrors(scriptingSchema, json_content, ajv.errors, {indent: 4});
    throw new ValidationError(output as IOutputError[]);
}

type ExtendedDocuElement = DocumentationElement & {
    parent: ExtendedDocuElement | null;
    children: ExtendedDocuElement[];
};

function createExtendedElements(
    baseEl: DocumentationElement,
    parent: ExtendedDocuElement | null): ExtendedDocuElement {

    const extended = {
        ...baseEl,
        parent,
        children: [],
    } as ExtendedDocuElement;

    extended.children = baseEl.children.map((el) => createExtendedElements(el, extended));

    return extended;
}

export class ScriptingDocumentation {
    actions: DocuSchema["actions"];
    conditions: DocuSchema["conditions"];
    enums: DocuSchema["enums"];
    elements: ExtendedDocuElement[];

    constructor(schemaData: DocuSchema) {
        this.actions = schemaData.actions;
        this.conditions = schemaData.conditions;
        this.enums = schemaData.enums;
        this.elements = schemaData.elements.map((el) => createExtendedElements(el, null));
    }

    generateTypings(): string {
        return generateDefinitions(this);
    }

    static parseAndValidate(scripting_json: unknown): ScriptingDocumentation {
        const validated = validateScriptingDoc(scripting_json);

        return new ScriptingDocumentation(validated);
    }
}
