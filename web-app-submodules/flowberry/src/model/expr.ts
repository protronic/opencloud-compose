/**
 * Ausdrücke in Bedingungen und Zuweisungen.
 *
 *   Signale       MPS, Motor_1, E0.1, %IX0.1
 *   Werte         0, 1, 42, true/false (wahr/falsch)
 *   Logik         !A  nicht A  not A      A & B  A && B  A und B  A and B
 *                 A | B  A || B  A oder B  A or B
 *   Vergleich     A = 1  A == 1  A != 0  A <> 0  N < 5  N <= 5  N > 5  N >= 5
 *   Rechnen       N + 1  N - 1   (für Zähler)
 *
 * Rangfolge (stark → schwach): nicht, + -, Vergleich, und, oder.
 */

export type CmpOp = '==' | '!=' | '<' | '<=' | '>' | '>=';

export type Expr =
  | {k: 'num'; v: number}
  | {k: 'bool'; v: boolean}
  | {k: 'sig'; name: string}
  | {k: 'not'; a: Expr}
  | {k: 'neg'; a: Expr}
  | {k: 'and' | 'or' | 'add' | 'sub'; a: Expr; b: Expr}
  | {k: 'cmp'; op: CmpOp; a: Expr; b: Expr};

export interface Assignment {
  target: string;
  expr: Expr;
}

export class ExprError extends Error {}

interface Token {
  t: 'id' | 'num' | 'op' | 'end';
  v: string;
}

const KEYWORDS: Record<string, Token> = {
  und: {t: 'op', v: '&&'},
  and: {t: 'op', v: '&&'},
  oder: {t: 'op', v: '||'},
  or: {t: 'op', v: '||'},
  nicht: {t: 'op', v: '!'},
  not: {t: 'op', v: '!'},
  true: {t: 'num', v: 'true'},
  wahr: {t: 'num', v: 'true'},
  false: {t: 'num', v: 'false'},
  falsch: {t: 'num', v: 'false'},
};

const OPERATORS = ['&&', '||', '==', '!=', '<>', '<=', '>=', ':=', '&', '|', '!', '=', '<', '>', '+', '-', '(', ')'];

const IDENT = /^[\p{L}_%][\p{L}\p{N}_.%]*/u;

export const SIGNAL_NAME = /^[\p{L}_%][\p{L}\p{N}_.%]*$/u;

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    const space = /^\s+/.exec(rest);
    if (space) {
      i += space[0].length;
      continue;
    }
    const num = /^\d+/.exec(rest);
    if (num) {
      tokens.push({t: 'num', v: num[0]});
      i += num[0].length;
      continue;
    }
    const ident = IDENT.exec(rest);
    if (ident) {
      tokens.push(KEYWORDS[ident[0].toLowerCase()] ?? {t: 'id', v: ident[0]});
      i += ident[0].length;
      continue;
    }
    const op = OPERATORS.find((o) => rest.startsWith(o));
    if (!op) {
      throw new ExprError(`unerwartetes Zeichen "${rest[0]}"`);
    }
    tokens.push({t: 'op', v: op === '<>' ? '!=' : op === '=' ? '==' : op});
    i += op.length;
  }
  tokens.push({t: 'end', v: ''});
  return tokens;
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  peek(): Token {
    return this.tokens[this.pos];
  }

  next(): Token {
    return this.tokens[this.pos++];
  }

  accept(...ops: string[]): string | undefined {
    const tok = this.peek();
    if (tok.t === 'op' && ops.includes(tok.v)) {
      this.pos++;
      return tok.v;
    }
    return undefined;
  }

  expectEnd() {
    const tok = this.peek();
    if (tok.t !== 'end') {
      throw new ExprError(`unerwartet "${tok.v}"`);
    }
  }

  parseOr(): Expr {
    let left = this.parseAnd();
    while (this.accept('||', '|')) {
      left = {k: 'or', a: left, b: this.parseAnd()};
    }
    return left;
  }

  parseAnd(): Expr {
    let left = this.parseCmp();
    while (this.accept('&&', '&')) {
      left = {k: 'and', a: left, b: this.parseCmp()};
    }
    return left;
  }

  parseCmp(): Expr {
    const left = this.parseSum();
    const op = this.accept('==', '!=', '<', '<=', '>', '>=');
    if (!op) {
      return left;
    }
    return {k: 'cmp', op: op as CmpOp, a: left, b: this.parseSum()};
  }

  parseSum(): Expr {
    let left = this.parseUnary();
    for (;;) {
      const op = this.accept('+', '-');
      if (!op) {
        return left;
      }
      left = {k: op === '+' ? 'add' : 'sub', a: left, b: this.parseUnary()};
    }
  }

  parseUnary(): Expr {
    if (this.accept('!')) {
      return {k: 'not', a: this.parseUnary()};
    }
    if (this.accept('-')) {
      return {k: 'neg', a: this.parseUnary()};
    }
    return this.parsePrimary();
  }

  parsePrimary(): Expr {
    const tok = this.next();
    if (tok.t === 'num') {
      if (tok.v === 'true' || tok.v === 'false') {
        return {k: 'bool', v: tok.v === 'true'};
      }
      return {k: 'num', v: parseInt(tok.v, 10)};
    }
    if (tok.t === 'id') {
      return {k: 'sig', name: tok.v};
    }
    if (tok.t === 'op' && tok.v === '(') {
      const inner = this.parseOr();
      if (!this.accept(')')) {
        throw new ExprError('")" fehlt');
      }
      return inner;
    }
    throw new ExprError(tok.t === 'end' ? 'Ausdruck unvollständig' : `unerwartet "${tok.v}"`);
  }
}

/** Bedingung parsen; ein abschließendes "?" ist erlaubt ("MPS = 1 ?"). */
export function parseExpr(src: string): Expr {
  const text = src.trim().replace(/\?\s*$/, '').trim();
  if (!text) {
    throw new ExprError('Bedingung fehlt');
  }
  const parser = new Parser(tokenize(text));
  const expr = parser.parseOr();
  parser.expectEnd();
  return expr;
}

/** Eine Zeile "ZIEL = Ausdruck" bzw. "ZIEL := Ausdruck". */
export function parseAssignment(src: string): Assignment {
  const tokens = tokenize(src.trim());
  const [target, op] = tokens;
  if (target?.t !== 'id') {
    throw new ExprError('Zuweisung muss mit einem Signalnamen beginnen, z. B. "SPS = 1"');
  }
  if (op?.t !== 'op' || (op.v !== '==' && op.v !== ':=')) {
    throw new ExprError(`"=" nach ${target.v} fehlt`);
  }
  const parser = new Parser(tokens.slice(2));
  const expr = parser.parseOr();
  parser.expectEnd();
  return {target: target.v, expr};
}

/** Zeilen einer Aktion: je Zeile (oder durch ";" getrennt) eine Zuweisung. */
export function splitLines(text: string | undefined): string[] {
  return (text ?? '')
    .split(/[\n;]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function collectSignals(expr: Expr, into: Set<string>): Set<string> {
  switch (expr.k) {
    case 'sig':
      into.add(expr.name);
      break;
    case 'not':
    case 'neg':
      collectSignals(expr.a, into);
      break;
    case 'and':
    case 'or':
    case 'add':
    case 'sub':
    case 'cmp':
      collectSignals(expr.a, into);
      collectSignals(expr.b, into);
      break;
  }
  return into;
}

/** Liefert der Ausdruck eine Zahl (Zähler) statt eines Wahrheitswerts? */
export function isNumeric(expr: Expr): boolean {
  return (
    expr.k === 'add' || expr.k === 'sub' || expr.k === 'neg' || (expr.k === 'num' && expr.v !== 0 && expr.v !== 1)
  );
}

/**
 * Signale, die als Zahl benutzt werden: Operanden von + / - / Größenvergleichen
 * oder Vergleichen mit Zahlen außer 0/1. "MPS = 1" macht MPS nicht numerisch.
 */
export function collectNumericSignals(expr: Expr, into: Set<string>): Set<string> {
  const markOperand = (operand: Expr) => {
    if (operand.k === 'sig') {
      into.add(operand.name);
    }
  };
  switch (expr.k) {
    case 'add':
    case 'sub':
      markOperand(expr.a);
      markOperand(expr.b);
      break;
    case 'neg':
      markOperand(expr.a);
      break;
    case 'cmp': {
      const isBit = (e: Expr) => e.k === 'bool' || (e.k === 'num' && (e.v === 0 || e.v === 1));
      const equality = expr.op === '==' || expr.op === '!=';
      if (!equality || !(isBit(expr.a) || isBit(expr.b))) {
        markOperand(expr.a);
        markOperand(expr.b);
      }
      break;
    }
  }
  if ('a' in expr) {
    collectNumericSignals(expr.a, into);
  }
  if ('b' in expr) {
    collectNumericSignals(expr.b, into);
  }
  return into;
}
