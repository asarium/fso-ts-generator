export class LuaDocGenerator {
    private _lines: string[] = [];

    finalize(): string {
        return this._lines.join("\n");
    }

    addLine(line: string) {
        this._lines.push(line);
    }
}
