/**
 * Berry-Laufzeitbausteine, die jedem generierten Script vorangestellt werden.
 *
 * Die Timer zählen Scan-Zyklen statt einer Echtzeituhr: pro scan()-Aufruf
 * vergeht `period_ms`. Damit ist das Verhalten deterministisch und ohne
 * Plattform-Uhr lauffähig (Tasmota, eigene Firmware, Unit-Test am PC).
 */
export const BERRY_RUNTIME = `# ---- FlowBerry-Laufzeit (nicht editieren) -----------------------------------
class FB_TON
  var pt, acc, q
  def init(pt)
    self.pt = pt
    self.acc = 0
    self.q = false
  end
  def update(inp, period_ms)
    if inp
      if !self.q
        self.acc += period_ms
        if self.acc >= self.pt
          self.q = true
        end
      end
    else
      self.acc = 0
      self.q = false
    end
    return self.q
  end
end

class FB_TOF
  var pt, acc, q
  def init(pt)
    self.pt = pt
    self.acc = 0
    self.q = false
  end
  def update(inp, period_ms)
    if inp
      self.q = true
      self.acc = 0
    elif self.q
      self.acc += period_ms
      if self.acc >= self.pt
        self.q = false
      end
    end
    return self.q
  end
end
# -----------------------------------------------------------------------------
`;

export const BERRY_IO_STUBS = `# E/A-Anbindung: Standard ist eine einfache Map (gut zum Testen).
# Für echte Hardware io_get/io_set ersetzen (GPIO, Register, tasmota.get_power() ...).
var FB_IO = {}

def io_get(name)
  return FB_IO.find(name, false)
end

def io_set(name, value)
  FB_IO[name] = bool(value)
end
`;

export const BERRY_TASMOTA_HINT = `# Unter Tasmota z. B. so einbinden:
#   var logic = FlowBerryLogic()
#   tasmota.add_cron("*/1 * * * * *", def () logic.scan() end, "flowberry")
# oder feiner über einen Driver mit every_50ms; SCAN_MS unten dann anpassen.
`;
