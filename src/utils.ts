import {TupleType, TypeSpecifier} from "../build/scripting";

export function isTupleType(t: TypeSpecifier): t is TupleType {
    if (typeof t === "string") {
        return false;
    }

    return t.type === "tuple";
}
