/**
 * Feste Bausteine des generierten Berry-Scripts: E/A-Anbindung und der
 * Hinweis zum zyklischen Aufruf.
 */

export function berryIoStubs(): string {
  return `# ---- E/A-Anbindung ----------------------------------------------------------
# Standard ist eine einfache Map – zum Testen sofort lauffähig. Für echte
# Hardware io_get/io_set ersetzen (gpio.digital_read, tasmota.get_power(),
# tasmota.set_power(), Register ...). Werte: true/false, Zähler als Zahl.
var FB_IO = {}

def io_get(name)
  return FB_IO.find(name, false)
end

def io_set(name, value)
  FB_IO[name] = value
end
`;
}

const TASMOTA_HOOKS: Record<number, string> = {
  50: 'every_50ms',
  100: 'every_100ms',
  250: 'every_250ms',
  1000: 'every_second',
};

export function berryUsageHint(scanMs: number): string {
  const hook = TASMOTA_HOOKS[scanMs];
  const tasmota = hook
    ? `# Unter Tasmota als Driver einbinden (${hook} passt zu SCAN_MS = ${scanMs}):
#   class FlowBerryDriver
#     var logic
#     def init() self.logic = FlowBerryLogic() end
#     def ${hook}() self.logic.scan() end
#   end
#   tasmota.add_driver(FlowBerryDriver())`
    : `# Unter Tasmota zyklisch alle ${scanMs} ms logic.scan() aufrufen, z. B. per tasmota.set_timer.`;
  return `# ---- Aufruf -----------------------------------------------------------------
${tasmota}
#
# Test am PC (Standard-Berry):
#   var logic = FlowBerryLogic()
#   FB_IO["START"] = true
#   for i: 1 .. 10  logic.scan()  end
#   print(FB_IO)
`;
}
