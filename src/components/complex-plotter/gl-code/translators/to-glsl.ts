import lodash from 'lodash';
const { get } = lodash;

import * as math from 'mathjs';
import { ASTNode } from '../types';

function terminateFloat(x: number): string {
    const terminator = Number.isInteger(x) ? '.' : '';
    return x.toString() + terminator;
}

// Returns pair [ast_in_glsl, requires_parenthesis]
function toGLSL(ast: ASTNode, LOG_MODE: boolean): [string, boolean] {
    if (typeof ast === 'number' || !isNaN(ast as any)) {
        // GLSL floats must end in decimal point
        return [terminateFloat(Number(ast)), false];
    }
    if (!Array.isArray(ast)) {return [ast as string, false];}

    let infixOperators: Record<string, string> = {
        'add': '+',
        'sub': '-',
        'component_mul': '*',
    };
    if (LOG_MODE) {
        infixOperators = {};
    }

    const [operator, ...args] = ast as [string, ...any[]];

    if (operator === 'number') {
        const [real, imag] = args;
        if (LOG_MODE) {
            let length = math.hypot(real, imag);
            if (length === 0) {length = 1;}
            return [`vec3(${real/length}, ${imag/length}, ${math.log(length)})`, false];
        } else {
            if (real === 1 && imag === 0) {return ['ONE', false];}
            if (real === 0 && imag === 1) {return ['I', false];}
            return [`vec2(${real}, ${imag})`, false];
        }
    }

    if (operator === 'variable') {return [args[0], false];}
    if (operator === 'constant') {return ['C_' + args[0].toUpperCase(), false];}
    if (operator in infixOperators) {
        const op = infixOperators[operator];
        let operands = args.map(x => toGLSL(x as ASTNode, LOG_MODE));

        // Add parentheses where possibly necessary
        if (op === '-') {
            if (operands[1][1]) {
                operands[1][0] = '(' + operands[1][0] + ')';
            }
        } else {
            if (op !== '+') {
                operands = operands.map(x => [x[1] ? '(' + x[0] + ')' : x[0], false] as [string, boolean]);
            }
        }
        return [operands[0][0] + op + operands[1][0], operator !== 'mul'];
    }

    // Unary function
    const unaryFunctions: Record<string, string> = {
        'factorial': 'cfact',
    };
    const internalName = get(unaryFunctions, operator, 'c' + operator);

    return [internalName + '(' + args.map(x => toGLSL(x as ASTNode, LOG_MODE)[0]).join(', ') + ')', false];
}

export default toGLSL;
