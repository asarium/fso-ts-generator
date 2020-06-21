import {OverloadList, SimpleParameterList, TupleType, TypeSpecifier} from "../build/scripting";

export function isTupleType(t: TypeSpecifier): t is TupleType {
    if (typeof t === "string") {
        return false;
    }

    return t.type === "tuple";
}

export function isSimpleParameterList(params: SimpleParameterList | OverloadList): params is SimpleParameterList {
    return typeof params === "string";
}
