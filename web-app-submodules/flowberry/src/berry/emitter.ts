/**
 * IR + Berry-Emitter.
 *
 * Semantik der reduzierten Diagramme:
 *   - StartEvent ("Schiene")        → logisch true
 *   - Reihenschaltung (SequenceFlow-Kette) → UND
 *   - mehrere eingehende Kanten / Gateway  → ODER der Zweige
 *   - Task fb:kind=contact          → UND mit io_get("<Name>") (ggf. negiert)
 *   - Task fb:kind=ton|tof          → Timerausgang Q, Eingang = Logik davor
 *   - Task fb:kind=coil             → io_set("<Name>", <Logik davor>)
 *
 * Auswertung pro scan(): erst alle Timer (in stabiler Reihenfolge),
 * dann alle Spulen. Rückführungen (Selbsthaltung über den eigenen
 * Ausgangsnamen als Kontakt) lesen den Wert des vorherigen Zyklus —
 * klassisches SPS-Verhalten.
 */

interface IrNode {
  id: string;
  type: string;
  kind?: string;
  name?: string;
  negated?: boolean;
  preset?: number;
  incoming: string[]; // source element ids
}

export interface EmitResult {
  code: string;
  warnings: string[];
}

function sanitizeIdent(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[0-9]/.test(cleaned) ? '_' + cleaned : cleaned;
}

export function buildIr(elementRegistry: any): Map<string, IrNode> {
  const nodes = new Map<string, IrNode>();

  const elements = elementRegistry.getAll().filter((el: any) => {
    const t = el?.businessObject?.$type;
    return (
      !el.labelTarget &&
      (t === 'bpmn:StartEvent' || t === 'bpmn:ExclusiveGateway' || t === 'bpmn:Task')
    );
  });

  for (const el of elements) {
    const bo = el.businessObject;
    nodes.set(el.id, {
      id: el.id,
      type: bo.$type,
      kind: bo.get?.('fb:kind') ?? undefined,
      name: bo.name ?? undefined,
      negated: bo.get?.('fb:negated') === true,
      preset: parseInt(String(bo.get?.('fb:preset') ?? ''), 10) || 0,
      incoming: (el.incoming ?? [])
        .map((flow: any) => flow?.source?.id)
        .filter(Boolean),
    });
  }

  return nodes;
}

export function emitBerry(
  elementRegistry: any,
  options: {fileName?: string; scanMs?: number} = {}
): EmitResult {
  const nodes = buildIr(elementRegistry);
  const warnings: string[] = [];
  const scanMs = options.scanMs ?? 50;

  // stabile Reihenfolge: Position im Diagramm wäre schöner; Element-ID reicht
  const ordered = [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id));

  const timers = ordered.filter((n) => n.kind === 'ton' || n.kind === 'tof');
  const coils = ordered.filter((n) => n.kind === 'coil');

  const timerVar = new Map<string, string>();
  timers.forEach((t, i) => timerVar.set(t.id, `t${i + 1}_${sanitizeIdent(t.name || t.kind || 'timer')}`));

  const memo = new Map<string, string>();
  const visiting = new Set<string>();

  /** Ausdruck am Eingang eines Elements (ODER aller Quellen-Ausgänge). */
  function inExpr(node: IrNode): string {
    if (node.incoming.length === 0) {
      if (node.type !== 'bpmn:StartEvent') {
        warnings.push(`"${node.name || node.id}" hat keinen Eingang — wird als false ausgewertet.`);
      }
      return 'false';
    }
    const terms = node.incoming
      .map((srcId) => {
        const src = nodes.get(srcId);
        return src ? outExpr(src) : 'false';
      })
      .filter((t, i, arr) => arr.indexOf(t) === i);
    if (terms.length === 1) {
      return terms[0];
    }
    return '(' + terms.join(' || ') + ')';
  }

  /** Ausdruck am Ausgang eines Elements. */
  function outExpr(node: IrNode): string {
    const cached = memo.get(node.id);
    if (cached) {
      return cached;
    }
    if (visiting.has(node.id)) {
      warnings.push(
        `Zyklus über "${node.name || node.id}" — direkte Rückführung im Graphen wird als false ausgewertet. ` +
          `Selbsthaltung stattdessen über einen Kontakt mit dem Ausgangs-Signalnamen bauen.`
      );
      return 'false';
    }
    visiting.add(node.id);

    let expr: string;
    switch (node.type) {
      case 'bpmn:StartEvent':
        expr = 'true';
        break;
      case 'bpmn:ExclusiveGateway':
        expr = inExpr(node);
        break;
      case 'bpmn:Task': {
        if (node.kind === 'contact') {
          if (!node.name) {
            warnings.push(`Kontakt ${node.id} hat keinen Signalnamen (Doppelklick zum Benennen).`);
          }
          const lit = `io_get("${node.name || node.id}")`;
          const literal = node.negated ? `!${lit}` : lit;
          const upstream = inExpr(node);
          expr = upstream === 'true' ? literal : `${upstream} && ${literal}`;
        } else if (node.kind === 'ton' || node.kind === 'tof') {
          expr = `self.${timerVar.get(node.id)}.q`;
        } else if (node.kind === 'coil') {
          expr = inExpr(node); // Spulen sind terminal; falls doch verkettet: Durchreichen
        } else {
          warnings.push(`Element ${node.id} ohne fb:kind — ignoriert.`);
          expr = inExpr(node);
        }
        break;
      }
      default:
        expr = 'false';
    }

    visiting.delete(node.id);
    memo.set(node.id, expr);
    return expr;
  }

  const lines: string[] = [];
  lines.push(`class FlowBerryLogic`);
  const varNames = ['SCAN_MS', ...timers.map((t) => timerVar.get(t.id)!)];
  lines.push(`  var ${varNames.join(', ')}`);
  lines.push(`  def init()`);
  lines.push(`    self.SCAN_MS = ${scanMs}`);
  for (const t of timers) {
    const cls = t.kind === 'ton' ? 'FB_TON' : 'FB_TOF';
    lines.push(`    self.${timerVar.get(t.id)} = ${cls}(${t.preset})`);
  }
  lines.push(`  end`);
  lines.push(``);
  lines.push(`  def scan()`);
  if (timers.length > 0) {
    lines.push(`    # Timer zuerst`);
    for (const t of timers) {
      lines.push(`    self.${timerVar.get(t.id)}.update(${inExpr(t)}, self.SCAN_MS)`);
    }
    lines.push(``);
  }
  if (coils.length === 0) {
    warnings.push('Keine Spule im Diagramm — scan() schreibt keine Ausgänge.');
  }
  lines.push(`    # Ausgänge`);
  for (const c of coils) {
    if (!c.name) {
      warnings.push(`Spule ${c.id} hat keinen Signalnamen (Doppelklick zum Benennen).`);
    }
    lines.push(`    io_set("${c.name || c.id}", ${inExpr(c)})`);
  }
  lines.push(`  end`);
  lines.push(`end`);

  const header =
    `# Generiert von flowBerry` +
    (options.fileName ? ` aus ${options.fileName}` : '') +
    ` — Änderungen hier werden beim nächsten Export überschrieben.\n`;

  return {code: header + '\n%RUNTIME%\n%IO%\n' + lines.join('\n') + '\n', warnings};
}
