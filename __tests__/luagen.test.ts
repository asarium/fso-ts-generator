import {ScriptingDocumentation, ValidationError} from "../src";

function expectValidDoc(data: unknown): ScriptingDocumentation {
    try {
        return ScriptingDocumentation.parseAndValidate(data);
    } catch (e) {
        if (e instanceof ValidationError) {
            console.log(e.validationErrors);
        }

        throw e;
    }
}

test("generate Lua docs works", async () => {
    const data = await import("./test_data/scripting.json");

    const scriptingDoc = expectValidDoc(data.default);

    console.log(scriptingDoc.generateLuaDoc());
});
