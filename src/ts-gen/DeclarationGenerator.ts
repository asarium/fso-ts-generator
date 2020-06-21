const INDENTATION = "    ";

export type AddLineCallback = (line: string) => void;
export type FinalizeCallback = () => void;

export interface DeclarationGenerator {
    finalize: () => void;
}

export function indentLine(line: string): string {
    return INDENTATION + line;
}

export abstract class BaseDeclarationGenerator implements DeclarationGenerator {
    private readonly _addLine: AddLineCallback;
    private readonly _finalize: FinalizeCallback;

    constructor(addLine: (line: string) => void, finalize: () => void) {
        this._addLine = addLine;
        this._finalize = finalize;
    }

    finalize(): void {
        this._finalize();
    }

    protected addLine(line: string): void {
        this._addLine(line);
    }
}
