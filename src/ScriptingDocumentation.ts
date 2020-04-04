
if (!process.versions.node) {
    // Hack to make better-ajv-errors work in browsers
    process.versions.node = "8.0";
}

import Ajv from "ajv";
import betterAjvErrors, {IOutputError} from "better-ajv-errors";

import {ScriptingDocumentation as DocuSchema} from "../build/scripting";
import {convertSchemaElement, DocumentationElement} from "./DocumentationElement";
import scriptingSchema from "./schema/scripting.schema.json";
import {generateDefinitions} from "./ts-gen/typescript_gen";
import {ValidationError} from "./ValidationError";


function validateScriptingDoc(jsonContent: unknown): DocuSchema {
    const ajv = new Ajv({jsonPointers: true});
    if (ajv.validate(scriptingSchema, jsonContent)) {
        return jsonContent as DocuSchema;
    }

    const output = betterAjvErrors(scriptingSchema, jsonContent, ajv.errors, {indent: 4});
    throw new ValidationError(output as IOutputError[]);
}

export class ScriptingDocumentation {
    actions: DocuSchema["actions"];
    conditions: DocuSchema["conditions"];
    enums: DocuSchema["enums"];
    elements: DocumentationElement[];

    _schemaData: DocuSchema;

    constructor(schemaData: DocuSchema) {
        this.actions = schemaData.actions;
        this.conditions = schemaData.conditions;
        this.enums = schemaData.enums;
        this.elements = schemaData.elements.map((el) => convertSchemaElement(el, "root"));

        this._schemaData = schemaData;
    }

    static parseAndValidate(scriptingJson: unknown): ScriptingDocumentation {
        const validated = validateScriptingDoc(scriptingJson);

        return new ScriptingDocumentation(validated);
    }

    generateTypings(): string {
        return generateDefinitions(this);
    }

    serialize(): any {
        return this._schemaData;
    }
}
