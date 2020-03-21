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

test("loading valid file works", async () => {
    const data = await import("./test_data/scripting.json");

    const scriptingDoc = expectValidDoc(data.default);

    expect(scriptingDoc.actions).toContain("On Splash Screen");
});
